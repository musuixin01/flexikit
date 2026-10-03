import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminConsoleV11790434800000 implements MigrationInterface {
  name = 'AddAdminConsoleV11790434800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "role" character varying(16) NOT NULL DEFAULT 'user',
      ADD COLUMN "status" character varying(16) NOT NULL DEFAULT 'active'
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "CHK_users_role"
        CHECK ("role" IN ('user', 'admin')),
      ADD CONSTRAINT "CHK_users_status"
        CHECK ("status" IN ('active', 'suspended'))
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_users_role" ON "users" ("role")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_users_status" ON "users" ("status")',
    );

    await queryRunner.query(`
      CREATE TABLE "admin_audit_events" (
        "id" SERIAL NOT NULL,
        "actor_user_id" integer NOT NULL,
        "actor_username" character varying(50) NOT NULL,
        "access_mode" character varying(24) NOT NULL,
        "action" character varying(80) NOT NULL,
        "target_user_id" integer,
        "target_username" character varying(50),
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_audit_events" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_admin_audit_access_mode"
          CHECK ("access_mode" IN ('persistent-admin', 'bootstrap-admin'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_admin_audit_events_actor_user_id"
      ON "admin_audit_events" ("actor_user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_admin_audit_events_target_user_id"
      ON "admin_audit_events" ("target_user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_admin_audit_events_created_at"
      ON "admin_audit_events" ("created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "public"."IDX_admin_audit_events_created_at"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_admin_audit_events_target_user_id"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_admin_audit_events_actor_user_id"',
    );
    await queryRunner.query('DROP TABLE "admin_audit_events"');

    await queryRunner.query('DROP INDEX "public"."IDX_users_status"');
    await queryRunner.query('DROP INDEX "public"."IDX_users_role"');
    await queryRunner.query(
      'ALTER TABLE "users" DROP CONSTRAINT "CHK_users_status"',
    );
    await queryRunner.query(
      'ALTER TABLE "users" DROP CONSTRAINT "CHK_users_role"',
    );
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "status",
      DROP COLUMN "role"
    `);
  }
}
