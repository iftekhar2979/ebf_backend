import { MigrationInterface, QueryRunner } from "typeorm";

export class Backend1709103990179 implements MigrationInterface {
  name = "Backend1709103990179";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TYPE "public"."users_roles_enum" AS ENUM('user', 'admin');
    `);
    await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "googleID" character varying,
                "first_name" character varying(50) NOT NULL,
                "last_name" character varying(50) NOT NULL,
                "email" character varying(100) NOT NULL,
                "password" character varying,
                "passwordResetToken" character varying,
                "passwordResetExpires" character varying,
                "active" boolean NOT NULL DEFAULT false,
                "activeToken" character varying,
                "roles" "public"."users_roles_enum" array NOT NULL DEFAULT '{user}',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                CONSTRAINT "UQ_c28f2e9885cdacab90219693692" UNIQUE ("googleID"),
                CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "users"
        `);
  }
}
