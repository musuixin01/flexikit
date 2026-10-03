import type {
  AiFinishReason,
  AiModelDefinition,
  AiProvider,
  AiProviderDefinition,
  AiProviderGenerateRequest,
  AiProviderGenerateResult,
  AiTokenUsage,
} from '../contracts/ai-provider';
import { AiProviderExecutionError } from '../ai-provider.errors';
import { retryAfterMsFromHeaders } from '../ai-resilience';
import {
  adapterCapabilityRecord,
  capabilityRecord,
  cloneAiModelDefinition,
  unknownModelCapabilities,
} from '../model-capabilities';

export const ANTHROPIC_PROVIDER_ID = 'anthropic';
export const DEFAULT_ANTHROPIC_MODEL_ID = 'claude-sonnet-5';
export const DEFAULT_ANTHROPIC_MAX_OUTPUT_TOKENS = 4096;

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_VERSION = '2023-06-01';

const ANTHROPIC_ADAPTER_CAPABILITIES = adapterCapabilityRecord([
  'textGeneration',
  'maxOutputTokens',
]);

function currentClaudeCapabilities(
  temperature: 'supported' | 'unsupported',
  reasoningKind: 'effort' | 'manual-budget',
) {
  return {
    native: capabilityRecord({
      textGeneration: 'supported',
      vision: 'supported',
      streaming: 'supported',
      toolCalling: 'supported',
      structuredOutput: 'supported',
      reasoningControl: 'supported',
      temperature,
      maxOutputTokens: 'supported',
    }),
    adapter: ANTHROPIC_ADAPTER_CAPABILITIES,
    reasoningControls: [{ kind: reasoningKind }],
  };
}

const CURRENT_ANTHROPIC_MODELS: readonly AiModelDefinition[] = [
  {
    id: 'claude-sonnet-5',
    displayName: 'Claude Sonnet 5',
    capabilities: currentClaudeCapabilities('unsupported', 'effort'),
  },
  {
    id: 'claude-opus-5',
    displayName: 'Claude Opus 5',
    capabilities: currentClaudeCapabilities('unsupported', 'effort'),
  },
  {
    id: 'claude-fable-5',
    displayName: 'Claude Fable 5',
    capabilities: currentClaudeCapabilities('unsupported', 'effort'),
  },
  {
    id: 'claude-haiku-4-5-20251001',
    displayName: 'Claude Haiku 4.5',
    capabilities: currentClaudeCapabilities('supported', 'manual-budget'),
  },
];

type AnthropicFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

interface AnthropicProviderOptions {
  apiKey: string;
  defaultModelId?: string;
  fetchImpl?: AnthropicFetch;
}

interface JsonRecord {
  [key: string]: unknown;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function modelDefinitions(defaultModelId: string): AiModelDefinition[] {
  const models = CURRENT_ANTHROPIC_MODELS.map(cloneAiModelDefinition);
  if (!models.some((model) => model.id === defaultModelId)) {
    models.push({
      id: defaultModelId,
      displayName: defaultModelId,
      capabilities: unknownModelCapabilities([
        'textGeneration',
        'maxOutputTokens',
      ]),
    });
  }
  return models;
}

function collectSystemPrompt(request: AiProviderGenerateRequest): string | undefined {
  const systemMessages = request.messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content);

  return systemMessages.length > 0
    ? systemMessages.join('\n\n')
    : undefined;
}

function conversationMessages(request: AiProviderGenerateRequest): JsonRecord[] {
  return request.messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

function collectText(payload: JsonRecord): string {
  if (!Array.isArray(payload.content)) return '';

  const chunks: string[] = [];
  for (const block of payload.content) {
    if (
      isRecord(block)
      && block.type === 'text'
      && typeof block.text === 'string'
    ) {
      chunks.push(block.text);
    }
  }
  return chunks.join('');
}

function finishReason(value: unknown): AiFinishReason {
  if (value === 'end_turn' || value === 'stop_sequence') return 'stop';
  if (value === 'max_tokens' || value === 'model_context_window_exceeded') {
    return 'length';
  }
  if (value === 'refusal') return 'content_filter';
  return 'other';
}

function tokenCount(
  record: JsonRecord,
  key: string,
  fallback = 0,
): number {
  const value = record[key];
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new AiProviderExecutionError(
      'INVALID_RESPONSE',
      'Anthropic Provider 返回了无效 Token usage',
      ANTHROPIC_PROVIDER_ID,
    );
  }
  return value as number;
}

function usage(payload: JsonRecord): AiTokenUsage | undefined {
  if (payload.usage === undefined) return undefined;
  if (!isRecord(payload.usage)) {
    throw new AiProviderExecutionError(
      'INVALID_RESPONSE',
      'Anthropic Provider 返回了无效 Token usage',
      ANTHROPIC_PROVIDER_ID,
    );
  }

  const cacheCreation = isRecord(payload.usage.cache_creation)
    ? payload.usage.cache_creation
    : {};
  const outputDetails = isRecord(payload.usage.output_tokens_details)
    ? payload.usage.output_tokens_details
    : {};
  const ordinaryInputTokens = tokenCount(payload.usage, 'input_tokens');
  const cachedInputTokens = tokenCount(payload.usage, 'cache_read_input_tokens');
  const cacheWriteInputTokens = tokenCount(
    payload.usage,
    'cache_creation_input_tokens',
  );
  const cacheWrite5mInputTokens = tokenCount(
    cacheCreation,
    'ephemeral_5m_input_tokens',
  );
  const cacheWrite1hInputTokens = tokenCount(
    cacheCreation,
    'ephemeral_1h_input_tokens',
  );
  const outputTokens = tokenCount(payload.usage, 'output_tokens');
  const inputTokens = ordinaryInputTokens
    + cachedInputTokens
    + cacheWriteInputTokens;

  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    cachedInputTokens,
    cacheWriteInputTokens,
    cacheWrite5mInputTokens,
    cacheWrite1hInputTokens,
    reasoningTokens: tokenCount(outputDetails, 'thinking_tokens'),
  };
}

function errorForStatus(
  statusCode: number,
  retryAfterMs?: number,
): AiProviderExecutionError {
  if (statusCode === 401 || statusCode === 403) {
    return new AiProviderExecutionError(
      'AUTHENTICATION_FAILED',
      'Anthropic Provider 认证失败',
      ANTHROPIC_PROVIDER_ID,
      statusCode,
      retryAfterMs,
    );
  }

  if (statusCode === 429) {
    return new AiProviderExecutionError(
      'RATE_LIMITED',
      'Anthropic Provider 请求频率受限',
      ANTHROPIC_PROVIDER_ID,
      statusCode,
      retryAfterMs,
    );
  }

  if (statusCode === 408 || statusCode === 504) {
    return new AiProviderExecutionError(
      'UPSTREAM_TIMEOUT',
      'Anthropic Provider 请求超时',
      ANTHROPIC_PROVIDER_ID,
      statusCode,
      retryAfterMs,
    );
  }

  if (statusCode >= 500) {
    return new AiProviderExecutionError(
      'UPSTREAM_UNAVAILABLE',
      'Anthropic Provider 暂时不可用',
      ANTHROPIC_PROVIDER_ID,
      statusCode,
      retryAfterMs,
    );
  }

  return new AiProviderExecutionError(
    'UPSTREAM_REJECTED',
    'Anthropic Provider 拒绝了当前请求',
    ANTHROPIC_PROVIDER_ID,
    statusCode,
    retryAfterMs,
  );
}

export class AnthropicProvider implements AiProvider {
  readonly definition: AiProviderDefinition;
  private readonly apiKey: string;
  private readonly fetchImpl: AnthropicFetch;

  constructor(options: AnthropicProviderOptions) {
    const apiKey = options.apiKey.trim();
    if (!apiKey) {
      throw new AiProviderExecutionError(
        'AUTHENTICATION_FAILED',
        'Anthropic Provider 缺少服务端认证配置',
        ANTHROPIC_PROVIDER_ID,
      );
    }

    const defaultModelId = (
      options.defaultModelId?.trim()
      || DEFAULT_ANTHROPIC_MODEL_ID
    );
    this.definition = {
      id: ANTHROPIC_PROVIDER_ID,
      displayName: 'Anthropic Claude',
      defaultModelId,
      models: modelDefinitions(defaultModelId),
    };
    this.apiKey = apiKey;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  async generateText(
    request: AiProviderGenerateRequest,
  ): Promise<AiProviderGenerateResult> {
    if (request.messages.length === 0) {
      throw new AiProviderExecutionError(
        'INVALID_REQUEST',
        'Anthropic Provider 至少需要一条消息',
        ANTHROPIC_PROVIDER_ID,
      );
    }

    const messages = conversationMessages(request);
    if (messages.length === 0) {
      throw new AiProviderExecutionError(
        'INVALID_REQUEST',
        'Anthropic Provider 至少需要一条非 system 消息',
        ANTHROPIC_PROVIDER_ID,
      );
    }

    const lastMessage = request.messages
      .filter((message) => message.role !== 'system')
      .at(-1);
    if (lastMessage?.role !== 'user') {
      throw new AiProviderExecutionError(
        'INVALID_REQUEST',
        'Anthropic Provider 当前请求必须以 user 消息结束',
        ANTHROPIC_PROVIDER_ID,
      );
    }

    if (request.parameters?.temperature !== undefined) {
      throw new AiProviderExecutionError(
        'UNSUPPORTED_PARAMETER',
        'Anthropic Provider 当前基线不支持通用 temperature 参数',
        ANTHROPIC_PROVIDER_ID,
      );
    }

    const maxOutputTokens = (
      request.parameters?.maxOutputTokens
      ?? DEFAULT_ANTHROPIC_MAX_OUTPUT_TOKENS
    );
    if (!Number.isInteger(maxOutputTokens) || maxOutputTokens <= 0) {
      throw new AiProviderExecutionError(
        'INVALID_REQUEST',
        'maxOutputTokens 必须是正整数',
        ANTHROPIC_PROVIDER_ID,
      );
    }

    const system = collectSystemPrompt(request);
    const body = {
      model: request.modelId,
      max_tokens: maxOutputTokens,
      messages,
      ...(system ? { system } : {}),
    };

    let response: Response;
    try {
      response = await this.fetchImpl(ANTHROPIC_MESSAGES_URL, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': ANTHROPIC_API_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: request.signal,
      });
    } catch {
      if (request.signal?.aborted) {
        throw new AiProviderExecutionError(
          'UPSTREAM_TIMEOUT',
          'Anthropic Provider 请求超时',
          ANTHROPIC_PROVIDER_ID,
        );
      }
      throw new AiProviderExecutionError(
        'UPSTREAM_UNAVAILABLE',
        '无法连接 Anthropic Provider',
        ANTHROPIC_PROVIDER_ID,
      );
    }

    if (!response.ok) {
      throw errorForStatus(
        response.status,
        retryAfterMsFromHeaders(response.headers),
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new AiProviderExecutionError(
        'INVALID_RESPONSE',
        'Anthropic Provider 返回了无效响应',
        ANTHROPIC_PROVIDER_ID,
        response.status,
      );
    }

    if (
      !isRecord(payload)
      || !Array.isArray(payload.content)
      || typeof payload.stop_reason !== 'string'
    ) {
      throw new AiProviderExecutionError(
        'INVALID_RESPONSE',
        'Anthropic Provider 返回结构不符合预期',
        ANTHROPIC_PROVIDER_ID,
        response.status,
      );
    }

    const mappedFinishReason = finishReason(payload.stop_reason);
    const text = collectText(payload);
    if (
      !text
      && mappedFinishReason !== 'content_filter'
      && mappedFinishReason !== 'length'
    ) {
      throw new AiProviderExecutionError(
        'INVALID_RESPONSE',
        'Anthropic Provider 响应中没有可用文本',
        ANTHROPIC_PROVIDER_ID,
        response.status,
      );
    }

    const normalizedUsage = usage(payload);
    return {
      text,
      finishReason: mappedFinishReason,
      ...(normalizedUsage ? { usage: normalizedUsage } : {}),
    };
  }
}
