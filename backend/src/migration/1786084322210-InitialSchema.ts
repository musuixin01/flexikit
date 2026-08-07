import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1786084322210 implements MigrationInterface {
    name = 'InitialSchema1786084322210'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "vector"`);
        await queryRunner.query(`
            CREATE TABLE "tools" (
                "id" SERIAL NOT NULL,
                "user_id" integer,
                "name" character varying(100) NOT NULL,
                "url" text NOT NULL,
                "description" text,
                "tags" text array,
                "category" character varying(50),
                "icon" text,
                "is_custom" boolean NOT NULL DEFAULT false,
                "local_path" text,
                "card_color" character varying(50),
                "embedding" vector(1536),
                "view_count" integer NOT NULL DEFAULT '0',
                "click_count" integer NOT NULL DEFAULT '0',
                "favorite_count" integer NOT NULL DEFAULT '0',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_e23d56734caad471277bad8bf85" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_96158ff69b91b8b52ff6f36117" ON "tools" ("user_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_577a9ddfdb8ebe33e89280d176" ON "tools" ("category")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_4f75a64de212a9db54ca1627eb" ON "tools" ("is_custom")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_96e3ca40d7ede2e262ebc71e1b" ON "tools" ("created_at")
        `);
        await queryRunner.query(`
            CREATE TABLE "favorites" (
                "id" SERIAL NOT NULL,
                "user_id" integer NOT NULL,
                "tool_id" integer NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_890818d27523748dd36a4d1bdc8" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "tool_orders" (
                "id" SERIAL NOT NULL,
                "user_id" integer NOT NULL,
                "ordered_ids" integer array NOT NULL,
                CONSTRAINT "PK_0bf5682548626bff10231eb4c39" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "categories" (
                "id" SERIAL NOT NULL,
                "user_id" integer,
                "name" character varying(50) NOT NULL,
                "display_order" integer NOT NULL DEFAULT '0',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" SERIAL NOT NULL,
                "username" character varying(50) NOT NULL,
                "email" character varying(100) NOT NULL,
                "password_hash" text NOT NULL,
                "display_name" character varying(100),
                "avatar" text,
                "avatar_type" character varying(20),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"),
                CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "discovery_tools" (
                "id" SERIAL NOT NULL,
                "name" character varying(255) NOT NULL,
                "url" character varying(500) NOT NULL,
                "description" text,
                "category" character varying(100),
                "tags" text NOT NULL DEFAULT '',
                "icon" text,
                "source" character varying(50) NOT NULL,
                "source_url" character varying(500),
                "hot_score" double precision NOT NULL DEFAULT '0',
                "upvotes" integer NOT NULL DEFAULT '0',
                "comments" integer NOT NULL DEFAULT '0',
                "discovered_at" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_14a2ad0eaaa5f5b92c4733fa1a6" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_4f4c6f9c5aecc0b750024f4975" ON "discovery_tools" ("name")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_a308f323610d9e8f39c1ce47dd" ON "discovery_tools" ("source")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_24ed26bb165aa62d87a4827666" ON "discovery_tools" ("hot_score")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_6ed664d87246d770d416200d61" ON "discovery_tools" ("discovered_at")
        `);
        await queryRunner.query(`
            ALTER TABLE "tools"
            ADD CONSTRAINT "FK_96158ff69b91b8b52ff6f361174" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "favorites"
            ADD CONSTRAINT "FK_35a6b05ee3b624d0de01ee50593" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "favorites"
            ADD CONSTRAINT "FK_6876696fbab1ece103f84765601" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "tool_orders"
            ADD CONSTRAINT "FK_1f9a30f5d2a9c787e51d4b529d8" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "categories"
            ADD CONSTRAINT "FK_2296b7fe012d95646fa41921c8b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "categories" DROP CONSTRAINT "FK_2296b7fe012d95646fa41921c8b"
        `);
        await queryRunner.query(`
            ALTER TABLE "tool_orders" DROP CONSTRAINT "FK_1f9a30f5d2a9c787e51d4b529d8"
        `);
        await queryRunner.query(`
            ALTER TABLE "favorites" DROP CONSTRAINT "FK_6876696fbab1ece103f84765601"
        `);
        await queryRunner.query(`
            ALTER TABLE "favorites" DROP CONSTRAINT "FK_35a6b05ee3b624d0de01ee50593"
        `);
        await queryRunner.query(`
            ALTER TABLE "tools" DROP CONSTRAINT "FK_96158ff69b91b8b52ff6f361174"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_6ed664d87246d770d416200d61"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_24ed26bb165aa62d87a4827666"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_a308f323610d9e8f39c1ce47dd"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_4f4c6f9c5aecc0b750024f4975"
        `);
        await queryRunner.query(`
            DROP TABLE "discovery_tools"
        `);
        await queryRunner.query(`
            DROP TABLE "users"
        `);
        await queryRunner.query(`
            DROP TABLE "categories"
        `);
        await queryRunner.query(`
            DROP TABLE "tool_orders"
        `);
        await queryRunner.query(`
            DROP TABLE "favorites"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_96e3ca40d7ede2e262ebc71e1b"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_4f75a64de212a9db54ca1627eb"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_577a9ddfdb8ebe33e89280d176"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_96158ff69b91b8b52ff6f36117"
        `);
        await queryRunner.query(`
            DROP TABLE "tools"
        `);
    }

}
