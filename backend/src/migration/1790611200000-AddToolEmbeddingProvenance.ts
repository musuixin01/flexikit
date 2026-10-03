import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddToolEmbeddingProvenance1790611200000
implements MigrationInterface {
  name = 'AddToolEmbeddingProvenance1790611200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tools"
      ADD COLUMN "embedding_provider" character varying(32),
      ADD COLUMN "embedding_model" character varying(120),
      ADD COLUMN "embedding_dimensions" smallint,
      ADD COLUMN "embedding_source_version" smallint,
      ADD COLUMN "embedding_source_hash" character(64),
      ADD COLUMN "embedding_updated_at" TIMESTAMPTZ
    `);
    await queryRunner.query('UPDATE "tools" SET "embedding" = NULL');
    await queryRunner.query(`
      ALTER TABLE "tools"
      ADD CONSTRAINT "CHK_tools_embedding_provenance"
      CHECK (
        (
          "embedding" IS NULL
          AND "embedding_provider" IS NULL
          AND "embedding_model" IS NULL
          AND "embedding_dimensions" IS NULL
          AND "embedding_source_version" IS NULL
          AND "embedding_source_hash" IS NULL
          AND "embedding_updated_at" IS NULL
        )
        OR
        (
          "embedding" IS NOT NULL
          AND "embedding_provider" IS NOT NULL
          AND "embedding_model" IS NOT NULL
          AND "embedding_dimensions" = 1536
          AND "embedding_source_version" > 0
          AND "embedding_source_hash" IS NOT NULL
          AND "embedding_updated_at" IS NOT NULL
        )
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "tools" DROP CONSTRAINT "CHK_tools_embedding_provenance"',
    );
    await queryRunner.query(`
      ALTER TABLE "tools"
      DROP COLUMN "embedding_updated_at",
      DROP COLUMN "embedding_source_hash",
      DROP COLUMN "embedding_source_version",
      DROP COLUMN "embedding_dimensions",
      DROP COLUMN "embedding_model",
      DROP COLUMN "embedding_provider"
    `);
  }
}
