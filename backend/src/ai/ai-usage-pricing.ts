import type { AiTokenUsage } from './contracts/ai-provider';

export const AI_PRICING_CATALOG_VERSION = '2026-09-28';
export const AI_COST_SCOPE = 'token-request-only' as const;

export type AiCostStatus = 'estimated' | 'unpriced';

export interface AiCostEstimate {
  status: AiCostStatus;
  currency: 'USD';
  scope: typeof AI_COST_SCOPE;
  catalogVersion: string;
  source: string | null;
  effectiveDate: string | null;
  validThrough: string | null;
  estimatedCostPicoUsd: string | null;
  estimatedCostUsd: string | null;
}

interface TokenRates {
  input: string;
  cachedInput: string;
  cacheWrite?: string;
  cacheWrite5m?: string;
  cacheWrite1h?: string;
  output: string;
}

interface PricingEntry {
  source: string;
  effectiveDate: string;
  validThrough?: string;
  rates: TokenRates;
  longContext?: {
    inputThresholdExclusive: number;
    rates: TokenRates;
  };
}

const PRICING: Readonly<Record<string, PricingEntry>> = {
  'openai:text-embedding-3-small': {
    source: 'openai-api-pricing',
    effectiveDate: '2026-09-28',
    rates: {
      input: '0.02',
      cachedInput: '0',
      output: '0',
    },
  },
  'openai:gpt-6-astra': {
    source: 'openai-api-pricing',
    effectiveDate: '2026-09-27',
    rates: {
      input: '10',
      cachedInput: '1',
      cacheWrite: '12.5',
      output: '50',
    },
    longContext: {
      inputThresholdExclusive: 272000,
      rates: {
        input: '20',
        cachedInput: '2',
        cacheWrite: '25',
        output: '75',
      },
    },
  },
  'openai:gpt-6-sol': {
    source: 'openai-api-pricing',
    effectiveDate: '2026-09-27',
    rates: {
      input: '2',
      cachedInput: '0.2',
      cacheWrite: '2.5',
      output: '10',
    },
    longContext: {
      inputThresholdExclusive: 272000,
      rates: {
        input: '4',
        cachedInput: '0.4',
        cacheWrite: '5',
        output: '15',
      },
    },
  },
  'openai:gpt-6-luna': {
    source: 'openai-api-pricing',
    effectiveDate: '2026-09-27',
    rates: {
      input: '0.1',
      cachedInput: '0.01',
      cacheWrite: '0.125',
      output: '0.5',
    },
    longContext: {
      inputThresholdExclusive: 272000,
      rates: {
        input: '0.2',
        cachedInput: '0.02',
        cacheWrite: '0.25',
        output: '0.75',
      },
    },
  },
  'gemini:gemini-3.8-flash': {
    source: 'gemini-developer-api-pricing',
    effectiveDate: '2026-09-27',
    validThrough: '2026-12-31',
    rates: {
      input: '0.75',
      cachedInput: '0.075',
      output: '3.75',
    },
  },
  'gemini:gemini-3.5-flash': {
    source: 'gemini-developer-api-pricing',
    effectiveDate: '2026-09-27',
    rates: {
      input: '1.5',
      cachedInput: '0.15',
      output: '9',
    },
  },
  'gemini:gemini-3.5-flash-lite': {
    source: 'gemini-developer-api-pricing',
    effectiveDate: '2026-09-27',
    rates: {
      input: '0.3',
      cachedInput: '0.03',
      output: '2.5',
    },
  },
  'anthropic:claude-sonnet-5': {
    source: 'claude-platform-pricing',
    effectiveDate: '2026-09-27',
    rates: {
      input: '2',
      cachedInput: '0.2',
      cacheWrite5m: '2.5',
      cacheWrite1h: '4',
      output: '10',
    },
  },
  'anthropic:claude-opus-5': {
    source: 'claude-platform-pricing',
    effectiveDate: '2026-09-27',
    rates: {
      input: '5',
      cachedInput: '0.5',
      cacheWrite5m: '6.25',
      cacheWrite1h: '10',
      output: '25',
    },
  },
  'anthropic:claude-fable-5': {
    source: 'claude-platform-pricing',
    effectiveDate: '2026-09-27',
    rates: {
      input: '10',
      cachedInput: '1',
      cacheWrite5m: '12.5',
      cacheWrite1h: '20',
      output: '50',
    },
  },
  'anthropic:claude-haiku-4-5-20251001': {
    source: 'claude-platform-pricing',
    effectiveDate: '2026-09-27',
    rates: {
      input: '1',
      cachedInput: '0.1',
      cacheWrite5m: '1.25',
      cacheWrite1h: '2',
      output: '5',
    },
  },
};

function ratePicoUsdPerToken(usdPerMillion: string): bigint {
  const [wholeRaw, fractionRaw = ''] = usdPerMillion.split('.');
  const whole = BigInt(wholeRaw);
  const fraction = fractionRaw.padEnd(6, '0').slice(0, 6);
  return (whole * 1_000_000n) + BigInt(fraction || '0');
}

export function formatPicoUsd(value: bigint): string {
  const whole = value / 1_000_000_000_000n;
  const fraction = (value % 1_000_000_000_000n)
    .toString()
    .padStart(12, '0');
  return `${whole}.${fraction}`;
}

function unpriced(): AiCostEstimate {
  return {
    status: 'unpriced',
    currency: 'USD',
    scope: AI_COST_SCOPE,
    catalogVersion: AI_PRICING_CATALOG_VERSION,
    source: null,
    effectiveDate: null,
    validThrough: null,
    estimatedCostPicoUsd: null,
    estimatedCostUsd: null,
  };
}

export function estimateAiUsageCost(
  providerId: string,
  modelId: string,
  usage: Readonly<AiTokenUsage>,
  occurredAt = new Date(),
): AiCostEstimate {
  const entry = PRICING[`${providerId}:${modelId}`];
  if (!entry) return unpriced();
  if (
    entry.validThrough
    && occurredAt.getTime() > Date.parse(`${entry.validThrough}T23:59:59.999Z`)
  ) {
    return unpriced();
  }

  const rates = (
    entry.longContext
    && usage.inputTokens > entry.longContext.inputThresholdExclusive
  )
    ? entry.longContext.rates
    : entry.rates;
  const ordinaryInputTokens = usage.inputTokens
    - usage.cachedInputTokens
    - usage.cacheWriteInputTokens;
  if (ordinaryInputTokens < 0) return unpriced();

  let cost = BigInt(ordinaryInputTokens) * ratePicoUsdPerToken(rates.input);
  cost += BigInt(usage.cachedInputTokens)
    * ratePicoUsdPerToken(rates.cachedInput);
  cost += BigInt(usage.outputTokens) * ratePicoUsdPerToken(rates.output);

  if (usage.cacheWriteInputTokens > 0) {
    if (rates.cacheWrite) {
      cost += BigInt(usage.cacheWriteInputTokens)
        * ratePicoUsdPerToken(rates.cacheWrite);
    } else {
      const classifiedCacheWrites = (
        usage.cacheWrite5mInputTokens + usage.cacheWrite1hInputTokens
      );
      if (
        classifiedCacheWrites !== usage.cacheWriteInputTokens
        || !rates.cacheWrite5m
        || !rates.cacheWrite1h
      ) {
        return unpriced();
      }
      cost += BigInt(usage.cacheWrite5mInputTokens)
        * ratePicoUsdPerToken(rates.cacheWrite5m);
      cost += BigInt(usage.cacheWrite1hInputTokens)
        * ratePicoUsdPerToken(rates.cacheWrite1h);
    }
  }

  return {
    status: 'estimated',
    currency: 'USD',
    scope: AI_COST_SCOPE,
    catalogVersion: AI_PRICING_CATALOG_VERSION,
    source: entry.source,
    effectiveDate: entry.effectiveDate,
    validThrough: entry.validThrough ?? null,
    estimatedCostPicoUsd: cost.toString(),
    estimatedCostUsd: formatPicoUsd(cost),
  };
}
