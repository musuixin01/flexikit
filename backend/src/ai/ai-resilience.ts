import { Injectable } from '@nestjs/common';
import {
  AiProviderExecutionError,
  type AiProviderExecutionErrorCode,
} from './ai-provider.errors';

export interface AiResilienceConfig {
  attemptTimeoutMs: number;
  totalTimeoutMs: number;
  maxAttemptsPerProvider: number;
  retryBaseDelayMs: number;
  retryMaxDelayMs: number;
  fallbackEnabled: boolean;
}

interface AiResilienceRuntime {
  now: () => number;
  sleep: (milliseconds: number) => Promise<void>;
  random: () => number;
}

const RETRYABLE_ERROR_CODES = new Set<AiProviderExecutionErrorCode>([
  'RATE_LIMITED',
  'UPSTREAM_TIMEOUT',
  'UPSTREAM_UNAVAILABLE',
]);

const DEFAULT_RUNTIME: AiResilienceRuntime = {
  now: () => Date.now(),
  sleep: (milliseconds) => new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  }),
  random: () => Math.random(),
};

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    return fallback;
  }
  return parsed;
}

function booleanValue(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === '') return fallback;
  if (value.trim().toLowerCase() === 'true') return true;
  if (value.trim().toLowerCase() === 'false') return false;
  return fallback;
}

export function defaultAiResilienceConfig(): AiResilienceConfig {
  return {
    attemptTimeoutMs: boundedInteger(
      process.env.AI_ATTEMPT_TIMEOUT_MS,
      60_000,
      1_000,
      120_000,
    ),
    totalTimeoutMs: boundedInteger(
      process.env.AI_TOTAL_TIMEOUT_MS,
      90_000,
      1_000,
      300_000,
    ),
    maxAttemptsPerProvider: boundedInteger(
      process.env.AI_MAX_ATTEMPTS_PER_PROVIDER,
      3,
      1,
      5,
    ),
    retryBaseDelayMs: boundedInteger(
      process.env.AI_RETRY_BASE_DELAY_MS,
      500,
      0,
      10_000,
    ),
    retryMaxDelayMs: boundedInteger(
      process.env.AI_RETRY_MAX_DELAY_MS,
      4_000,
      0,
      30_000,
    ),
    fallbackEnabled: booleanValue(process.env.AI_FALLBACK_ENABLED, true),
  };
}

export function retryAfterMsFromHeaders(
  headers: Headers,
  nowMs = Date.now(),
): number | undefined {
  const raw = headers.get('retry-after')?.trim();
  if (!raw) return undefined;

  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.ceil(seconds * 1_000);
  }

  const absoluteTime = Date.parse(raw);
  if (!Number.isFinite(absoluteTime)) return undefined;
  return Math.max(0, absoluteTime - nowMs);
}

export function isRetryableAiProviderError(
  error: unknown,
): error is AiProviderExecutionError {
  return (
    error instanceof AiProviderExecutionError
    && RETRYABLE_ERROR_CODES.has(error.code)
  );
}

@Injectable()
export class AiResiliencePolicy {
  config: AiResilienceConfig;
  private runtime: AiResilienceRuntime;

  constructor() {
    this.config = defaultAiResilienceConfig();
    this.runtime = DEFAULT_RUNTIME;
  }

  static createForTesting(
    config: Partial<AiResilienceConfig> = {},
    runtime: Partial<AiResilienceRuntime> = {},
  ): AiResiliencePolicy {
    const policy = new AiResiliencePolicy();
    policy.config = {
      ...policy.config,
      ...config,
    };
    policy.runtime = {
      ...DEFAULT_RUNTIME,
      ...runtime,
    };
    return policy;
  }

  now(): number {
    return this.runtime.now();
  }

  sleep(milliseconds: number): Promise<void> {
    return this.runtime.sleep(milliseconds);
  }

  retryDelayMs(
    error: AiProviderExecutionError,
    failedAttempt: number,
  ): number {
    if (error.retryAfterMs !== undefined) {
      return error.retryAfterMs;
    }

    const exponential = Math.min(
      this.config.retryMaxDelayMs,
      this.config.retryBaseDelayMs * (2 ** Math.max(0, failedAttempt - 1)),
    );
    if (exponential === 0) return 0;

    const jitterMultiplier = 0.8 + (this.runtime.random() * 0.4);
    return Math.max(0, Math.round(exponential * jitterMultiplier));
  }
}
