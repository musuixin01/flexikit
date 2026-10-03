import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AiUsageEvent,
  type AiUsageBillingMode,
} from './ai-usage-event.entity';
import {
  AI_PRICING_CATALOG_VERSION,
  estimateAiUsageCost,
  formatPicoUsd,
} from './ai-usage-pricing';
import type { AiTokenUsage } from './contracts/ai-provider';

export interface RecordAiUsageInput {
  userId?: number;
  providerId: string;
  modelId: string;
  billingMode: AiUsageBillingMode;
  usage: Readonly<AiTokenUsage>;
  occurredAt?: Date;
}

export interface AdminAiUsageProviderBreakdown {
  providerId: string;
  modelId: string;
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: string;
  unpricedRequestCount: number;
}

export interface AdminAiUsageSummary {
  trackingStatus: 'active';
  source: 'provider-reported';
  pricingCatalogVersion: string;
  currency: 'USD';
  costScope: 'token-request-only';
  requestCount: number;
  platformRequestCount: number;
  byokRequestCount: number;
  pricedRequestCount: number;
  unpricedRequestCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens: number;
  reasoningTokens: number;
  estimatedCostUsd: string;
  platformEstimatedCostUsd: string;
  byokEstimatedCostUsd: string;
  byProviderModel: AdminAiUsageProviderBreakdown[];
  message: string;
}

interface AggregateRow {
  requestCount: string;
  platformRequestCount: string;
  byokRequestCount: string;
  pricedRequestCount: string;
  unpricedRequestCount: string;
  inputTokens: string;
  outputTokens: string;
  totalTokens: string;
  cachedInputTokens: string;
  reasoningTokens: string;
  estimatedCostPicoUsd: string;
  platformEstimatedCostPicoUsd: string;
  byokEstimatedCostPicoUsd: string;
}

interface BreakdownRow {
  providerId: string;
  modelId: string;
  requestCount: string;
  inputTokens: string;
  outputTokens: string;
  totalTokens: string;
  estimatedCostPicoUsd: string;
  unpricedRequestCount: string;
}

function asSafeNumber(value: string): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function asPicoUsd(value: string): bigint {
  try {
    return BigInt(value || '0');
  } catch {
    return 0n;
  }
}

@Injectable()
export class AiUsageService {
  constructor(
    @InjectRepository(AiUsageEvent)
    private readonly usageRepository: Repository<AiUsageEvent>,
  ) {}

  async record(input: Readonly<RecordAiUsageInput>): Promise<void> {
    const occurredAt = input.occurredAt ?? new Date();
    const estimate = estimateAiUsageCost(
      input.providerId,
      input.modelId,
      input.usage,
      occurredAt,
    );
    await this.usageRepository.insert({
      userId: input.userId ?? null,
      providerId: input.providerId,
      modelId: input.modelId,
      billingMode: input.billingMode,
      inputTokens: input.usage.inputTokens,
      outputTokens: input.usage.outputTokens,
      totalTokens: input.usage.totalTokens,
      cachedInputTokens: input.usage.cachedInputTokens,
      cacheWriteInputTokens: input.usage.cacheWriteInputTokens,
      cacheWrite5mInputTokens: input.usage.cacheWrite5mInputTokens,
      cacheWrite1hInputTokens: input.usage.cacheWrite1hInputTokens,
      reasoningTokens: input.usage.reasoningTokens,
      costStatus: estimate.status,
      estimatedCostPicoUsd: estimate.estimatedCostPicoUsd,
      pricingCatalogVersion: estimate.catalogVersion,
      pricingSource: estimate.source,
      pricingEffectiveDate: estimate.effectiveDate,
      pricingValidThrough: estimate.validThrough,
      costScope: estimate.scope,
      createdAt: occurredAt,
    });
  }

  async getAdminSummary(): Promise<AdminAiUsageSummary> {
    const aggregate = await this.usageRepository
      .createQueryBuilder('usage')
      .select('COUNT(*)', 'requestCount')
      .addSelect(
        `COUNT(*) FILTER (WHERE usage.billing_mode = 'platform')`,
        'platformRequestCount',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE usage.billing_mode = 'byok')`,
        'byokRequestCount',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE usage.cost_status = 'estimated')`,
        'pricedRequestCount',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE usage.cost_status = 'unpriced')`,
        'unpricedRequestCount',
      )
      .addSelect('COALESCE(SUM(usage.input_tokens), 0)', 'inputTokens')
      .addSelect('COALESCE(SUM(usage.output_tokens), 0)', 'outputTokens')
      .addSelect('COALESCE(SUM(usage.total_tokens), 0)', 'totalTokens')
      .addSelect(
        'COALESCE(SUM(usage.cached_input_tokens), 0)',
        'cachedInputTokens',
      )
      .addSelect(
        'COALESCE(SUM(usage.reasoning_tokens), 0)',
        'reasoningTokens',
      )
      .addSelect(
        'COALESCE(SUM(usage.estimated_cost_pico_usd), 0)',
        'estimatedCostPicoUsd',
      )
      .addSelect(
        `COALESCE(SUM(usage.estimated_cost_pico_usd) FILTER (WHERE usage.billing_mode = 'platform'), 0)`,
        'platformEstimatedCostPicoUsd',
      )
      .addSelect(
        `COALESCE(SUM(usage.estimated_cost_pico_usd) FILTER (WHERE usage.billing_mode = 'byok'), 0)`,
        'byokEstimatedCostPicoUsd',
      )
      .getRawOne<AggregateRow>();

    const breakdown = await this.usageRepository
      .createQueryBuilder('usage')
      .select('usage.provider_id', 'providerId')
      .addSelect('usage.model_id', 'modelId')
      .addSelect('COUNT(*)', 'requestCount')
      .addSelect('COALESCE(SUM(usage.input_tokens), 0)', 'inputTokens')
      .addSelect('COALESCE(SUM(usage.output_tokens), 0)', 'outputTokens')
      .addSelect('COALESCE(SUM(usage.total_tokens), 0)', 'totalTokens')
      .addSelect(
        'COALESCE(SUM(usage.estimated_cost_pico_usd), 0)',
        'estimatedCostPicoUsd',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE usage.cost_status = 'unpriced')`,
        'unpricedRequestCount',
      )
      .groupBy('usage.provider_id')
      .addGroupBy('usage.model_id')
      .orderBy('COUNT(*)', 'DESC')
      .addOrderBy('usage.provider_id', 'ASC')
      .addOrderBy('usage.model_id', 'ASC')
      .getRawMany<BreakdownRow>();

    const totals = aggregate ?? {
      requestCount: '0',
      platformRequestCount: '0',
      byokRequestCount: '0',
      pricedRequestCount: '0',
      unpricedRequestCount: '0',
      inputTokens: '0',
      outputTokens: '0',
      totalTokens: '0',
      cachedInputTokens: '0',
      reasoningTokens: '0',
      estimatedCostPicoUsd: '0',
      platformEstimatedCostPicoUsd: '0',
      byokEstimatedCostPicoUsd: '0',
    };

    return {
      trackingStatus: 'active',
      source: 'provider-reported',
      pricingCatalogVersion: AI_PRICING_CATALOG_VERSION,
      currency: 'USD',
      costScope: 'token-request-only',
      requestCount: asSafeNumber(totals.requestCount),
      platformRequestCount: asSafeNumber(totals.platformRequestCount),
      byokRequestCount: asSafeNumber(totals.byokRequestCount),
      pricedRequestCount: asSafeNumber(totals.pricedRequestCount),
      unpricedRequestCount: asSafeNumber(totals.unpricedRequestCount),
      inputTokens: asSafeNumber(totals.inputTokens),
      outputTokens: asSafeNumber(totals.outputTokens),
      totalTokens: asSafeNumber(totals.totalTokens),
      cachedInputTokens: asSafeNumber(totals.cachedInputTokens),
      reasoningTokens: asSafeNumber(totals.reasoningTokens),
      estimatedCostUsd: formatPicoUsd(
        asPicoUsd(totals.estimatedCostPicoUsd),
      ),
      platformEstimatedCostUsd: formatPicoUsd(
        asPicoUsd(totals.platformEstimatedCostPicoUsd),
      ),
      byokEstimatedCostUsd: formatPicoUsd(
        asPicoUsd(totals.byokEstimatedCostPicoUsd),
      ),
      byProviderModel: breakdown.map((row) => ({
        providerId: row.providerId,
        modelId: row.modelId,
        requestCount: asSafeNumber(row.requestCount),
        inputTokens: asSafeNumber(row.inputTokens),
        outputTokens: asSafeNumber(row.outputTokens),
        totalTokens: asSafeNumber(row.totalTokens),
        estimatedCostUsd: formatPicoUsd(asPicoUsd(row.estimatedCostPicoUsd)),
        unpricedRequestCount: asSafeNumber(row.unpricedRequestCount),
      })),
      message: 'Token 来自 Provider usage；成本为版本化官方单价下的请求级估算，不等同于最终供应商账单。',
    };
  }
}
