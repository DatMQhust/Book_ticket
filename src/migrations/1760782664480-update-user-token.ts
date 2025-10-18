import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUserToken1760782664480 implements MigrationInterface {
  name = 'UpdateUserToken1760782664480';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "refreshToken" character varying NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "refreshToken"`);
  }
}
