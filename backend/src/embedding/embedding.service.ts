import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TOOL_EMBEDDING_DIMENSIONS,
  TOOL_EMBEDDING_MAX_BATCH_SIZE,
  TOOL_EMBEDDING_MAX_SOURCE_BYTES,
  TOOL_EMBEDDING_MODEL,
  TOOL_EMBEDDING_PROVIDER,
} from './tool-embedding-source';

const OPENAI_EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings';
const DEFAULT_EMBEDDING_TIMEOUT_MS = 30_000;

export const EMBEDDING_FETCH = Symbol('EMBEDDING_FETCH');

export type EmbeddingFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type EmbeddingProviderErrorCode =
  | 'NOT_CONFIGURED'
  | 'AUTHENTICATION_FAILED'
  | 'RATE_LIMITED'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_UNAVAILABLE'
  | 'UPSTREAM_REJECTED'
  | 'INVALID_RESPONSE';

export class EmbeddingProviderError extends Error {
  constructor(
    readonly code: EmbeddingProviderErrorCode,
    message: string,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'EmbeddingProviderError';
  }
}

export interface EmbeddingBatchResult {
  vectors: number[][];
  modelId: string;
  providerId: typeof TOOL_EMBEDDING_PROVIDER;
  promptTokens: number;
}

interface JsonRecord {
  [key: string]: unknown;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedTimeout(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1_000 && parsed <= 120_000
    ? parsed
    : DEFAULT_EMBEDDING_TIMEOUT_MS;
}

@Injectable()
export class EmbeddingService {
  constructor(
    private readonly configService: ConfigService,
    @Inject(EMBEDDING_FETCH)
    private readonly fetchImpl: EmbeddingFetch,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.configService.get<string>('OPENAI_API_KEY')?.trim());
  }

  async generateBatch(inputs: readonly string[]): Promise<EmbeddingBatchResult> {
    if (inputs.length < 1 || inputs.length > TOOL_EMBEDDING_MAX_BATCH_SIZE) {
      throw new EmbeddingProviderError(
        'UPSTREAM_REJECTED',
        'Embedding batch size is outside the supported range',
      );
    }
    for (const input of inputs) {
      if (
        !input.trim()
        || Buffer.byteLength(input, 'utf8') > TOOL_EMBEDDING_MAX_SOURCE_BYTES
      ) {
        throw new EmbeddingProviderError(
          'UPSTREAM_REJECTED',
          'Embedding input is empty or exceeds the safe byte limit',
        );
      }
    }

    const apiKey = this.configService.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      throw new EmbeddingProviderError(
        'NOT_CONFIGURED',
        'Embedding Provider is not configured',
      );
    }

    const controller = new AbortController();
    const timeoutMs = boundedTimeout(
      this.configService.get<string>('EMBEDDING_TIMEOUT_MS'),
    );
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await this.fetchImpl(OPENAI_EMBEDDINGS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: TOOL_EMBEDDING_MODEL,
          input: inputs,
          dimensions: TOOL_EMBEDDING_DIMENSIONS,
          encoding_format: 'float',
        }),
        signal: controller.signal,
      });
    } catch {
      if (controller.signal.aborted) {
        throw new EmbeddingProviderError(
          'UPSTREAM_TIMEOUT',
          'Embedding Provider request timed out',
        );
      }
      throw new EmbeddingProviderError(
        'UPSTREAM_UNAVAILABLE',
        'Embedding Provider is temporarily unavailable',
      );
    } finally {
      clearTimeout(timeoutHandle);
    }

    if (!response.ok) {
      throw this.errorForStatus(response.status);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new EmbeddingProviderError(
        'INVALID_RESPONSE',
        'Embedding Provider returned invalid JSON',
      );
    }

    return this.parseResponse(payload, inputs.length);
  }

  private parseResponse(
    payload: unknown,
    inputCount: number,
  ): EmbeddingBatchResult {
    if (!isRecord(payload) || !Array.isArray(payload.data)) {
      throw new EmbeddingProviderError(
        'INVALID_RESPONSE',
        'Embedding Provider returned an invalid response',
      );
    }
    if (
      typeof payload.model !== 'string'
      || payload.model !== TOOL_EMBEDDING_MODEL
    ) {
      throw new EmbeddingProviderError(
        'INVALID_RESPONSE',
        'Embedding Provider returned an unexpected model',
      );
    }
    if (payload.data.length !== inputCount) {
      throw new EmbeddingProviderError(
        'INVALID_RESPONSE',
        'Embedding Provider returned an unexpected item count',
      );
    }

    const ordered = new Array<number[] | undefined>(inputCount);
    for (const item of payload.data) {
      if (
        !isRecord(item)
        || !Number.isInteger(item.index)
        || Number(item.index) < 0
        || Number(item.index) >= inputCount
        || !Array.isArray(item.embedding)
        || item.embedding.length !== TOOL_EMBEDDING_DIMENSIONS
        || !item.embedding.every(
          (value) => typeof value === 'number' && Number.isFinite(value),
        )
      ) {
        throw new EmbeddingProviderError(
          'INVALID_RESPONSE',
          'Embedding Provider returned an invalid vector',
        );
      }
      const index = Number(item.index);
      if (ordered[index]) {
        throw new EmbeddingProviderError(
          'INVALID_RESPONSE',
          'Embedding Provider returned duplicate indexes',
        );
      }
      ordered[index] = item.embedding as number[];
    }
    if (ordered.some((vector) => vector === undefined)) {
      throw new EmbeddingProviderError(
        'INVALID_RESPONSE',
        'Embedding Provider response is incomplete',
      );
    }

    const usage = isRecord(payload.usage) ? payload.usage : undefined;
    if (
      !usage
      || typeof usage.prompt_tokens !== 'number'
      || !Number.isSafeInteger(usage.prompt_tokens)
      || usage.prompt_tokens < 0
    ) {
      throw new EmbeddingProviderError(
        'INVALID_RESPONSE',
        'Embedding Provider response is missing usage metadata',
      );
    }

    return {
      vectors: ordered as number[][],
      modelId: TOOL_EMBEDDING_MODEL,
      providerId: TOOL_EMBEDDING_PROVIDER,
      promptTokens: usage.prompt_tokens,
    };
  }

  private errorForStatus(statusCode: number): EmbeddingProviderError {
    if (statusCode === 401 || statusCode === 403) {
      return new EmbeddingProviderError(
        'AUTHENTICATION_FAILED',
        'Embedding Provider authentication failed',
        statusCode,
      );
    }
    if (statusCode === 429) {
      return new EmbeddingProviderError(
        'RATE_LIMITED',
        'Embedding Provider rate limit reached',
        statusCode,
      );
    }
    if (statusCode === 408 || statusCode === 504) {
      return new EmbeddingProviderError(
        'UPSTREAM_TIMEOUT',
        'Embedding Provider request timed out',
        statusCode,
      );
    }
    if (statusCode >= 500) {
      return new EmbeddingProviderError(
        'UPSTREAM_UNAVAILABLE',
        'Embedding Provider is temporarily unavailable',
        statusCode,
      );
    }
    return new EmbeddingProviderError(
      'UPSTREAM_REJECTED',
      'Embedding Provider rejected the request',
      statusCode,
    );
  }
}
