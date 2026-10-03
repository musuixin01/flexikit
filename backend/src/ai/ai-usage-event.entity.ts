import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type AiUsageBillingMode = 'platform' | 'byok';
export type AiUsageCostStatus = 'estimated' | 'unpriced';

@Entity('ai_usage_events')
@Index('IDX_ai_usage_events_created_at', ['createdAt'])
@Index('IDX_ai_usage_events_provider_model', ['providerId', 'modelId'])
@Index('IDX_ai_usage_events_user_id', ['userId'])
export class AiUsageEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer', name: 'user_id', nullable: true })
  userId!: number | null;

  @Column({ type: 'varchar', length: 32, name: 'provider_id' })
  providerId!: string;

  @Column({ type: 'varchar', length: 120, name: 'model_id' })
  modelId!: string;

  @Column({ type: 'varchar', length: 16, name: 'billing_mode' })
  billingMode!: AiUsageBillingMode;

  @Column({ type: 'integer', name: 'input_tokens' })
  inputTokens!: number;

  @Column({ type: 'integer', name: 'output_tokens' })
  outputTokens!: number;

  @Column({ type: 'integer', name: 'total_tokens' })
  totalTokens!: number;

  @Column({ type: 'integer', name: 'cached_input_tokens', default: 0 })
  cachedInputTokens!: number;

  @Column({ type: 'integer', name: 'cache_write_input_tokens', default: 0 })
  cacheWriteInputTokens!: number;

  @Column({ type: 'integer', name: 'cache_write_5m_input_tokens', default: 0 })
  cacheWrite5mInputTokens!: number;

  @Column({ type: 'integer', name: 'cache_write_1h_input_tokens', default: 0 })
  cacheWrite1hInputTokens!: number;

  @Column({ type: 'integer', name: 'reasoning_tokens', default: 0 })
  reasoningTokens!: number;

  @Column({ type: 'varchar', length: 16, name: 'cost_status' })
  costStatus!: AiUsageCostStatus;

  @Column({ type: 'bigint', name: 'estimated_cost_pico_usd', nullable: true })
  estimatedCostPicoUsd!: string | null;

  @Column({ type: 'varchar', length: 32, name: 'pricing_catalog_version' })
  pricingCatalogVersion!: string;

  @Column({ type: 'varchar', length: 80, name: 'pricing_source', nullable: true })
  pricingSource!: string | null;

  @Column({ type: 'date', name: 'pricing_effective_date', nullable: true })
  pricingEffectiveDate!: string | null;

  @Column({ type: 'date', name: 'pricing_valid_through', nullable: true })
  pricingValidThrough!: string | null;

  @Column({ type: 'varchar', length: 40, name: 'cost_scope' })
  costScope!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
