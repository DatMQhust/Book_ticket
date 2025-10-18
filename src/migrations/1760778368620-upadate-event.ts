import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpadateEvent1760778368620 implements MigrationInterface {
  name = 'UpadateEvent1760778368620';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "events" ADD "province" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" ADD "ward" character varying(255) NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "ward"`);
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "province"`);
  }
}
