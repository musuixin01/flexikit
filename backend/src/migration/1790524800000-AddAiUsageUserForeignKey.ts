import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiUsageUserForeignKey1790524800000
implements MigrationInterface {
  name = 'AddAiUsageUserForeignKey1790524800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ai_usage_events"
      ADD CONSTRAINT "FK_ai_usage_events_user_id"
      FOREIGN KEY ("user_id")
      REFERENCES "users"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "ai_usage_events" DROP CONSTRAINT "FK_ai_usage_events_user_id"',
    );
  }
}
