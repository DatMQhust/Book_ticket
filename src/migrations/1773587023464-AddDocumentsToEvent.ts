import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDocumentsToEvent1773587023464 implements MigrationInterface {
    name = 'AddDocumentsToEvent1773587023464'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "events" ADD "documents" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "documents"`);
    }

}
