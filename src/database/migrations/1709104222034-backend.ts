import { MigrationInterface, QueryRunner } from "typeorm";

export class Backend1709104222034 implements MigrationInterface {
  name = "Backend1709104222034";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "middleName"
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users"
            ADD "middleName" character varying(50) NOT NULL
        `);
  }
}
