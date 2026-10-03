import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshSessions1790298000000 implements MigrationInterface {
  name = 'AddRefreshSessions1790298000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "refresh_sessions" (
        "id" uuid NOT NULL,
        "user_id" integer NOT NULL,
        "token_hash" character varying(64) NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "revoked_at" TIMESTAMPTZ,
        "last_used_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refresh_sessions_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users"("id")
          ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_refresh_sessions_user_id"
      ON "refresh_sessions" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_refresh_sessions_expires_at"
      ON "refresh_sessions" ("expires_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "public"."IDX_refresh_sessions_expires_at"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_refresh_sessions_user_id"',
    );
    await queryRunner.query('DROP TABLE "refresh_sessions"');
  }
}
