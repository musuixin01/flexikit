import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendAiUsageAccountingAuditFields1790523000000
implements MigrationInterface {
  name = 'ExtendAiUsageAccountingAuditFields1790523000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ai_usage_events"
      ADD COLUMN "cache_write_5m_input_tokens" integer NOT NULL DEFAULT 0,
      ADD COLUMN "cache_write_1h_input_tokens" integer NOT NULL DEFAULT 0,
      ADD COLUMN "pricing_effective_date" date,
      ADD COLUMN "pricing_valid_through" date,
      ADD COLUMN "cost_scope" character varying(40)
        NOT NULL DEFAULT 'token-request-only'
    `);
    await queryRunner.query(
      'ALTER TABLE "ai_usage_events" DROP CONSTRAINT "CHK_ai_usage_tokens_nonnegative"',
    );
    await queryRunner.query(`
      ALTER TABLE "ai_usage_events"
      ADD CONSTRAINT "CHK_ai_usage_tokens_nonnegative"
      CHECK (
        "input_tokens" >= 0
        AND "output_tokens" >= 0
        AND "total_tokens" >= 0
        AND "cached_input_tokens" >= 0
        AND "cache_write_input_tokens" >= 0
        AND "cache_write_5m_input_tokens" >= 0
        AND "cache_write_1h_input_tokens" >= 0
        AND "reasoning_tokens" >= 0
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "ai_usage_events"
      ADD CONSTRAINT "CHK_ai_usage_cost_scope"
      CHECK ("cost_scope" IN ('token-request-only'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "ai_usage_events" DROP CONSTRAINT "CHK_ai_usage_cost_scope"',
    );
    await queryRunner.query(
      'ALTER TABLE "ai_usage_events" DROP CONSTRAINT "CHK_ai_usage_tokens_nonnegative"',
    );
    await queryRunner.query(`
      ALTER TABLE "ai_usage_events"
      DROP COLUMN "cost_scope",
      DROP COLUMN "pricing_valid_through",
      DROP COLUMN "pricing_effective_date",
      DROP COLUMN "cache_write_1h_input_tokens",
      DROP COLUMN "cache_write_5m_input_tokens"
    `);
    await queryRunner.query(`
      ALTER TABLE "ai_usage_events"
      ADD CONSTRAINT "CHK_ai_usage_tokens_nonnegative"
      CHECK (
        "input_tokens" >= 0
        AND "output_tokens" >= 0
        AND "total_tokens" >= 0
        AND "cached_input_tokens" >= 0
        AND "cache_write_input_tokens" >= 0
        AND "reasoning_tokens" >= 0
      )
    `);
  }
}
