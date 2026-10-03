import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiUsageAccounting1790521200000 implements MigrationInterface {
  name = 'AddAiUsageAccounting1790521200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ai_usage_events" (
        "id" SERIAL NOT NULL,
        "user_id" integer,
        "provider_id" character varying(32) NOT NULL,
        "model_id" character varying(120) NOT NULL,
        "billing_mode" character varying(16) NOT NULL,
        "input_tokens" integer NOT NULL,
        "output_tokens" integer NOT NULL,
        "total_tokens" integer NOT NULL,
        "cached_input_tokens" integer NOT NULL DEFAULT 0,
        "cache_write_input_tokens" integer NOT NULL DEFAULT 0,
        "reasoning_tokens" integer NOT NULL DEFAULT 0,
        "cost_status" character varying(16) NOT NULL,
        "estimated_cost_pico_usd" bigint,
        "pricing_catalog_version" character varying(32) NOT NULL,
        "pricing_source" character varying(80),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_usage_events" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_ai_usage_billing_mode"
          CHECK ("billing_mode" IN ('platform', 'byok')),
        CONSTRAINT "CHK_ai_usage_cost_status"
          CHECK ("cost_status" IN ('estimated', 'unpriced')),
        CONSTRAINT "CHK_ai_usage_tokens_nonnegative"
          CHECK (
            "input_tokens" >= 0
            AND "output_tokens" >= 0
            AND "total_tokens" >= 0
            AND "cached_input_tokens" >= 0
            AND "cache_write_input_tokens" >= 0
            AND "reasoning_tokens" >= 0
          )
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_ai_usage_events_created_at"
      ON "ai_usage_events" ("created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_ai_usage_events_provider_model"
      ON "ai_usage_events" ("provider_id", "model_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_ai_usage_events_user_id"
      ON "ai_usage_events" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "public"."IDX_ai_usage_events_user_id"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_ai_usage_events_provider_model"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_ai_usage_events_created_at"',
    );
    await queryRunner.query('DROP TABLE "ai_usage_events"');
  }
}
