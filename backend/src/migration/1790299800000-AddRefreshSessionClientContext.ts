import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshSessionClientContext1790299800000 implements MigrationInterface {
  name = 'AddRefreshSessionClientContext1790299800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "refresh_sessions"
      ADD COLUMN "client_type" character varying(16) NOT NULL DEFAULT 'unknown',
      ADD COLUMN "client_instance_id" uuid,
      ADD COLUMN "client_name" character varying(80)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_refresh_sessions_user_client_instance"
      ON "refresh_sessions" ("user_id", "client_instance_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "public"."IDX_refresh_sessions_user_client_instance"',
    );
    await queryRunner.query(`
      ALTER TABLE "refresh_sessions"
      DROP COLUMN "client_name",
      DROP COLUMN "client_instance_id",
      DROP COLUMN "client_type"
    `);
  }
}
