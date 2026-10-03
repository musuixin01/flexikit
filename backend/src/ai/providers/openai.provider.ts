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

export const OPENAI_PROVIDER_ID = 'openai';
export const DEFAULT_OPENAI_MODEL_ID = 'gpt-6-sol';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

const OPENAI_ADAPTER_CAPABILITIES = adapterCapabilityRecord([
  'textGeneration',
  'maxOutputTokens',
]);

const CURRENT_OPENAI_MODELS: readonly AiModelDefinition[] = [
  {
    id: 'gpt-6-astra',
    displayName: 'GPT-6 Astra',
    capabilities: {
      native: capabilityRecord({
        textGeneration: 'supported',
        vision: 'supported',
        streaming: 'supported',
        toolCalling: 'supported',
        structuredOutput: 'supported',
        reasoningControl: 'supported',
        temperature: 'unsupported',
        maxOutputTokens: 'supported',
      }),
      adapter: OPENAI_ADAPTER_CAPABILITIES,
      reasoningControls: [{
        kind: 'effort',
        values: ['low', 'medium', 'high', 'xhigh', 'max'],
      }],
    },
  },
  {
    id: 'gpt-6-sol',
    displayName: 'GPT-6 Sol',
    capabilities: {
      native: capabilityRecord({
        textGeneration: 'supported',
        vision: 'supported',
        streaming: 'supported',
        toolCalling: 'supported',
        structuredOutput: 'supported',
        reasoningControl: 'supported',
        temperature: 'conditional',
        maxOutputTokens: 'supported',
      }),
      adapter: OPENAI_ADAPTER_CAPABILITIES,
      reasoningControls: [{
        kind: 'effort',
        values: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
      }],
    },
  },
  {
    id: 'gpt-6-luna',
    displayName: 'GPT-6 Luna',
    capabilities: {
      native: capabilityRecord({
        textGeneration: 'supported',
        vision: 'supported',
        streaming: 'supported',
        toolCalling: 'supported',
        structuredOutput: 'supported',
        reasoningControl: 'supported',
        temperature: 'conditional',
        maxOutputTokens: 'supported',
      }),
      adapter: OPENAI_ADAPTER_CAPABILITIES,
      reasoningControls: [{
        kind: 'effort',
        values: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
      }],
    },
  },
];

type OpenAiFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

interface OpenAiProviderOptions {
  apiKey: string;
  defaultModelId?: string;
  fetchImpl?: OpenAiFetch;
}

interface JsonRecord {
  [key: string]: unknown;
}

const NON_RETRYABLE_OPENAI_LIMIT_CODES = new Set([
  'credit_balance_exhausted',
  'organization_usage_limit_exceeded',
  'organization_spend_limit_exceeded',
  'project_spend_limit_exceeded',
  'insufficient_quota',
]);

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function isNonRetryableLimitResponse(response: Response): Promise<boolean> {
  if (response.status !== 429) return false;

  try {
    const payload: unknown = await response.clone().json();
    if (!isRecord(payload) || !isRecord(payload.error)) return false;
    const code = typeof payload.error.code === 'string'
      ? payload.error.code
      : undefined;
    const type = typeof payload.error.type === 'string'
      ? payload.error.type
      : undefined;
    return (
      (code !== undefined && NON_RETRYABLE_OPENAI_LIMIT_CODES.has(code))
      || type === 'insufficient_quota'
    );
  } catch {
    return false;
  }
}

function modelDefinitions(defaultModelId: string): AiModelDefinition[] {
  const models = CURRENT_OPENAI_MODELS.map(cloneAiModelDefinition);
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

function collectOutputText(payload: JsonRecord): string {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text;
  }

  if (!Array.isArray(payload.output)) return '';

  const chunks: string[] = [];
  for (const item of payload.output) {
    if (!isRecord(item) || item.type !== 'message' || !Array.isArray(item.content)) {
      continue;
    }

    for (const content of item.content) {
      if (
        isRecord(content)
        && content.type === 'output_text'
        && typeof content.text === 'string'
      ) {
        chunks.push(content.text);
      }
    }
  }

  return chunks.join('');
}

function finishReason(payload: JsonRecord): AiFinishReason {
  if (payload.status === 'completed') return 'stop';

  if (payload.status === 'incomplete' && isRecord(payload.incomplete_details)) {
    const reason = payload.incomplete_details.reason;
    if (reason === 'max_output_tokens') return 'length';
    if (reason === 'content_filter') return 'content_filter';
  }

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
      'OpenAI Provider 返回了无效 Token usage',
      OPENAI_PROVIDER_ID,
    );
  }
  return value as number;
}

function usage(payload: JsonRecord): AiTokenUsage | undefined {
  if (payload.usage === undefined) return undefined;
  if (!isRecord(payload.usage)) {
    throw new AiProviderExecutionError(
      'INVALID_RESPONSE',
      'OpenAI Provider 返回了无效 Token usage',
      OPENAI_PROVIDER_ID,
    );
  }

  const inputDetails = isRecord(payload.usage.input_tokens_details)
    ? payload.usage.input_tokens_details
    : {};
  const outputDetails = isRecord(payload.usage.output_tokens_details)
    ? payload.usage.output_tokens_details
    : {};
  const inputTokens = tokenCount(payload.usage, 'input_tokens');
  const outputTokens = tokenCount(payload.usage, 'output_tokens');

  return {
    inputTokens,
    outputTokens,
    totalTokens: tokenCount(
      payload.usage,
      'total_tokens',
      inputTokens + outputTokens,
    ),
    cachedInputTokens: tokenCount(inputDetails, 'cached_tokens'),
    cacheWriteInputTokens: tokenCount(inputDetails, 'cache_write_tokens'),
    cacheWrite5mInputTokens: 0,
    cacheWrite1hInputTokens: 0,
    reasoningTokens: tokenCount(outputDetails, 'reasoning_tokens'),
  };
}

function errorForStatus(
  statusCode: number,
  retryAfterMs?: number,
): AiProviderExecutionError {
  if (statusCode === 401 || statusCode === 403) {
    return new AiProviderExecutionError(
      'AUTHENTICATION_FAILED',
      'OpenAI Provider 认证失败',
      OPENAI_PROVIDER_ID,
      statusCode,
      retryAfterMs,
    );
  }

  if (statusCode === 429) {
    return new AiProviderExecutionError(
      'RATE_LIMITED',
      'OpenAI Provider 请求频率受限',
      OPENAI_PROVIDER_ID,
      statusCode,
      retryAfterMs,
    );
  }

  if (statusCode === 408 || statusCode === 504) {
    return new AiProviderExecutionError(
      'UPSTREAM_TIMEOUT',
      'OpenAI Provider 请求超时',
      OPENAI_PROVIDER_ID,
      statusCode,
      retryAfterMs,
    );
  }

  if (statusCode >= 500) {
    return new AiProviderExecutionError(
      'UPSTREAM_UNAVAILABLE',
      'OpenAI Provider 暂时不可用',
      OPENAI_PROVIDER_ID,
      statusCode,
      retryAfterMs,
    );
  }

  return new AiProviderExecutionError(
    'UPSTREAM_REJECTED',
    'OpenAI Provider 拒绝了当前请求',
    OPENAI_PROVIDER_ID,
    statusCode,
    retryAfterMs,
  );
}

export class OpenAiProvider implements AiProvider {
  readonly definition: AiProviderDefinition;
  private readonly apiKey: string;
  private readonly fetchImpl: OpenAiFetch;

  constructor(options: OpenAiProviderOptions) {
    const apiKey = options.apiKey.trim();
    if (!apiKey) {
      throw new AiProviderExecutionError(
        'AUTHENTICATION_FAILED',
        'OpenAI Provider 缺少服务端认证配置',
        OPENAI_PROVIDER_ID,
      );
    }

    const defaultModelId = options.defaultModelId?.trim() || DEFAULT_OPENAI_MODEL_ID;
    this.definition = {
      id: OPENAI_PROVIDER_ID,
      displayName: 'OpenAI',
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
        'OpenAI Provider 至少需要一条消息',
        OPENAI_PROVIDER_ID,
      );
    }

    if (request.parameters?.temperature !== undefined) {
      throw new AiProviderExecutionError(
        'UNSUPPORTED_PARAMETER',
        '当前 OpenAI GPT-6 Provider 暂不映射 temperature 参数',
        OPENAI_PROVIDER_ID,
      );
    }

    const maxOutputTokens = request.parameters?.maxOutputTokens;
    if (
      maxOutputTokens !== undefined
      && (!Number.isInteger(maxOutputTokens) || maxOutputTokens <= 0)
    ) {
      throw new AiProviderExecutionError(
        'INVALID_REQUEST',
        'maxOutputTokens 必须是正整数',
        OPENAI_PROVIDER_ID,
      );
    }

    const body = {
      model: request.modelId,
      input: request.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      store: false,
      ...(maxOutputTokens !== undefined
        ? { max_output_tokens: maxOutputTokens }
        : {}),
    };

    let response: Response;
    try {
      response = await this.fetchImpl(OPENAI_RESPONSES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: request.signal,
      });
    } catch {
      if (request.signal?.aborted) {
        throw new AiProviderExecutionError(
          'UPSTREAM_TIMEOUT',
          'OpenAI Provider 请求超时',
          OPENAI_PROVIDER_ID,
        );
      }
      throw new AiProviderExecutionError(
        'UPSTREAM_UNAVAILABLE',
        '无法连接 OpenAI Provider',
        OPENAI_PROVIDER_ID,
      );
    }

    if (!response.ok) {
      if (await isNonRetryableLimitResponse(response)) {
        throw new AiProviderExecutionError(
          'UPSTREAM_REJECTED',
          'OpenAI Provider 当前额度或消费限制阻止了请求',
          OPENAI_PROVIDER_ID,
          response.status,
        );
      }
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
        'OpenAI Provider 返回了无效响应',
        OPENAI_PROVIDER_ID,
        response.status,
      );
    }

    if (!isRecord(payload)) {
      throw new AiProviderExecutionError(
        'INVALID_RESPONSE',
        'OpenAI Provider 返回结构不符合预期',
        OPENAI_PROVIDER_ID,
        response.status,
      );
    }

    if (payload.status === 'failed') {
      throw new AiProviderExecutionError(
        'UPSTREAM_REJECTED',
        'OpenAI Provider 未能完成当前请求',
        OPENAI_PROVIDER_ID,
        response.status,
      );
    }

    const text = collectOutputText(payload);
    if (!text && payload.status !== 'incomplete') {
      throw new AiProviderExecutionError(
        'INVALID_RESPONSE',
        'OpenAI Provider 响应中没有可用文本',
        OPENAI_PROVIDER_ID,
        response.status,
      );
    }

    const normalizedUsage = usage(payload);
    return {
      text,
      finishReason: finishReason(payload),
      ...(normalizedUsage ? { usage: normalizedUsage } : {}),
    };
  }
}
