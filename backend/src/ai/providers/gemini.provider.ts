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

export const GEMINI_PROVIDER_ID = 'gemini';
export const DEFAULT_GEMINI_MODEL_ID = 'gemini-3.8-flash';

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const GEMINI_ADAPTER_CAPABILITIES = adapterCapabilityRecord([
  'textGeneration',
  'temperature',
  'maxOutputTokens',
]);

function geminiCapabilities(thinkingLevels: readonly string[]) {
  return {
    native: capabilityRecord({
      textGeneration: 'supported',
      vision: 'supported',
      streaming: 'supported',
      toolCalling: 'supported',
      structuredOutput: 'supported',
      reasoningControl: 'supported',
      temperature: 'supported',
      maxOutputTokens: 'supported',
    }),
    adapter: GEMINI_ADAPTER_CAPABILITIES,
    reasoningControls: [{
      kind: 'thinking-level' as const,
      values: thinkingLevels,
    }],
  };
}

const CURRENT_GEMINI_MODELS: readonly AiModelDefinition[] = [
  {
    id: 'gemini-3.8-flash',
    displayName: 'Gemini 3.8 Flash',
    capabilities: geminiCapabilities(['low', 'medium', 'high']),
  },
  {
    id: 'gemini-3.5-flash',
    displayName: 'Gemini 3.5 Flash',
    capabilities: geminiCapabilities(['minimal', 'low', 'medium', 'high']),
  },
  {
    id: 'gemini-3.5-flash-lite',
    displayName: 'Gemini 3.5 Flash-Lite',
    capabilities: geminiCapabilities(['minimal', 'low', 'medium', 'high']),
  },
];

type GeminiFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

interface GeminiProviderOptions {
  apiKey: string;
  defaultModelId?: string;
  fetchImpl?: GeminiFetch;
}

interface JsonRecord {
  [key: string]: unknown;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function modelDefinitions(defaultModelId: string): AiModelDefinition[] {
  const models = CURRENT_GEMINI_MODELS.map(cloneAiModelDefinition);
  if (!models.some((model) => model.id === defaultModelId)) {
    models.push({
      id: defaultModelId,
      displayName: defaultModelId,
      capabilities: unknownModelCapabilities([
        'textGeneration',
        'temperature',
        'maxOutputTokens',
      ]),
    });
  }
  return models;
}

function collectSystemInstruction(
  request: AiProviderGenerateRequest,
): JsonRecord | undefined {
  const systemMessages = request.messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content);

  if (systemMessages.length === 0) return undefined;

  return {
    parts: systemMessages.map((text) => ({ text })),
  };
}

function contents(request: AiProviderGenerateRequest): JsonRecord[] {
  return request.messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }));
}

function collectCandidateText(candidate: JsonRecord): string {
  if (!isRecord(candidate.content) || !Array.isArray(candidate.content.parts)) {
    return '';
  }

  const chunks: string[] = [];
  for (const part of candidate.content.parts) {
    if (isRecord(part) && typeof part.text === 'string') {
      chunks.push(part.text);
    }
  }
  return chunks.join('');
}

function finishReason(value: unknown): AiFinishReason {
  if (value === 'STOP') return 'stop';
  if (value === 'MAX_TOKENS') return 'length';
  if (
    value === 'SAFETY'
    || value === 'PROHIBITED_CONTENT'
    || value === 'BLOCKLIST'
    || value === 'IMAGE_SAFETY'
  ) {
    return 'content_filter';
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
      'Gemini Provider 返回了无效 Token usage',
      GEMINI_PROVIDER_ID,
    );
  }
  return value as number;
}

function usage(payload: JsonRecord): AiTokenUsage | undefined {
  if (payload.usageMetadata === undefined) return undefined;
  if (!isRecord(payload.usageMetadata)) {
    throw new AiProviderExecutionError(
      'INVALID_RESPONSE',
      'Gemini Provider 返回了无效 Token usage',
      GEMINI_PROVIDER_ID,
    );
  }

  const inputTokens = tokenCount(payload.usageMetadata, 'promptTokenCount');
  const cachedInputTokens = tokenCount(
    payload.usageMetadata,
    'cachedContentTokenCount',
  );
  const visibleOutputTokens = tokenCount(
    payload.usageMetadata,
    'candidatesTokenCount',
  );
  const reasoningTokens = tokenCount(
    payload.usageMetadata,
    'thoughtsTokenCount',
  );
  const outputTokens = visibleOutputTokens + reasoningTokens;

  return {
    inputTokens,
    outputTokens,
    totalTokens: tokenCount(
      payload.usageMetadata,
      'totalTokenCount',
      inputTokens + outputTokens,
    ),
    cachedInputTokens,
    cacheWriteInputTokens: 0,
    cacheWrite5mInputTokens: 0,
    cacheWrite1hInputTokens: 0,
    reasoningTokens,
  };
}

function errorForStatus(
  statusCode: number,
  retryAfterMs?: number,
): AiProviderExecutionError {
  if (statusCode === 401 || statusCode === 403) {
    return new AiProviderExecutionError(
      'AUTHENTICATION_FAILED',
      'Gemini Provider 认证失败',
      GEMINI_PROVIDER_ID,
      statusCode,
      retryAfterMs,
    );
  }

  if (statusCode === 429) {
    return new AiProviderExecutionError(
      'RATE_LIMITED',
      'Gemini Provider 请求频率受限',
      GEMINI_PROVIDER_ID,
      statusCode,
      retryAfterMs,
    );
  }

  if (statusCode === 408 || statusCode === 504) {
    return new AiProviderExecutionError(
      'UPSTREAM_TIMEOUT',
      'Gemini Provider 请求超时',
      GEMINI_PROVIDER_ID,
      statusCode,
      retryAfterMs,
    );
  }

  if (statusCode >= 500) {
    return new AiProviderExecutionError(
      'UPSTREAM_UNAVAILABLE',
      'Gemini Provider 暂时不可用',
      GEMINI_PROVIDER_ID,
      statusCode,
      retryAfterMs,
    );
  }

  return new AiProviderExecutionError(
    'UPSTREAM_REJECTED',
    'Gemini Provider 拒绝了当前请求',
    GEMINI_PROVIDER_ID,
    statusCode,
    retryAfterMs,
  );
}

export class GeminiProvider implements AiProvider {
  readonly definition: AiProviderDefinition;
  private readonly apiKey: string;
  private readonly fetchImpl: GeminiFetch;

  constructor(options: GeminiProviderOptions) {
    const apiKey = options.apiKey.trim();
    if (!apiKey) {
      throw new AiProviderExecutionError(
        'AUTHENTICATION_FAILED',
        'Gemini Provider 缺少服务端认证配置',
        GEMINI_PROVIDER_ID,
      );
    }

    const defaultModelId = options.defaultModelId?.trim() || DEFAULT_GEMINI_MODEL_ID;
    this.definition = {
      id: GEMINI_PROVIDER_ID,
      displayName: 'Google Gemini',
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
        'Gemini Provider 至少需要一条消息',
        GEMINI_PROVIDER_ID,
      );
    }

    const mappedContents = contents(request);
    if (mappedContents.length === 0) {
      throw new AiProviderExecutionError(
        'INVALID_REQUEST',
        'Gemini Provider 至少需要一条非 system 消息',
        GEMINI_PROVIDER_ID,
      );
    }

    const temperature = request.parameters?.temperature;
    if (
      temperature !== undefined
      && (!Number.isFinite(temperature) || temperature < 0)
    ) {
      throw new AiProviderExecutionError(
        'INVALID_REQUEST',
        'temperature 必须是非负有限数值',
        GEMINI_PROVIDER_ID,
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
        GEMINI_PROVIDER_ID,
      );
    }

    const systemInstruction = collectSystemInstruction(request);
    const generationConfig = {
      ...(temperature !== undefined ? { temperature } : {}),
      ...(maxOutputTokens !== undefined ? { maxOutputTokens } : {}),
    };

    const body = {
      contents: mappedContents,
      ...(systemInstruction ? { systemInstruction } : {}),
      ...(Object.keys(generationConfig).length > 0 ? { generationConfig } : {}),
      store: false,
    };

    const url = `${GEMINI_API_BASE_URL}/${encodeURIComponent(request.modelId)}:generateContent`;
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: 'POST',
        headers: {
          'x-goog-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: request.signal,
      });
    } catch {
      if (request.signal?.aborted) {
        throw new AiProviderExecutionError(
          'UPSTREAM_TIMEOUT',
          'Gemini Provider 请求超时',
          GEMINI_PROVIDER_ID,
        );
      }
      throw new AiProviderExecutionError(
        'UPSTREAM_UNAVAILABLE',
        '无法连接 Gemini Provider',
        GEMINI_PROVIDER_ID,
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
        'Gemini Provider 返回了无效响应',
        GEMINI_PROVIDER_ID,
        response.status,
      );
    }

    if (!isRecord(payload)) {
      throw new AiProviderExecutionError(
        'INVALID_RESPONSE',
        'Gemini Provider 返回结构不符合预期',
        GEMINI_PROVIDER_ID,
        response.status,
      );
    }

    const normalizedUsage = usage(payload);
    if (isRecord(payload.promptFeedback) && payload.promptFeedback.blockReason) {
      return {
        text: '',
        finishReason: 'content_filter',
        ...(normalizedUsage ? { usage: normalizedUsage } : {}),
      };
    }

    if (!Array.isArray(payload.candidates) || payload.candidates.length === 0) {
      throw new AiProviderExecutionError(
        'INVALID_RESPONSE',
        'Gemini Provider 响应中没有候选结果',
        GEMINI_PROVIDER_ID,
        response.status,
      );
    }

    const firstCandidate = payload.candidates[0];
    if (!isRecord(firstCandidate)) {
      throw new AiProviderExecutionError(
        'INVALID_RESPONSE',
        'Gemini Provider 候选结果结构不符合预期',
        GEMINI_PROVIDER_ID,
        response.status,
      );
    }

    const mappedFinishReason = finishReason(firstCandidate.finishReason);
    const text = collectCandidateText(firstCandidate);
    if (!text && mappedFinishReason !== 'content_filter') {
      throw new AiProviderExecutionError(
        'INVALID_RESPONSE',
        'Gemini Provider 响应中没有可用文本',
        GEMINI_PROVIDER_ID,
        response.status,
      );
    }

    return {
      text,
      finishReason: mappedFinishReason,
      ...(normalizedUsage ? { usage: normalizedUsage } : {}),
    };
  }
}
