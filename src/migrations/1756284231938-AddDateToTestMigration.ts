import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDateToTestMigration1756284231938 implements MigrationInterface {
  name = 'AddDateToTestMigration1756284231938';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "test" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "test" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "test" DROP COLUMN "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "test" DROP COLUMN "createdAt"`);
  }
}
