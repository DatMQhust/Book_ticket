import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateEvent1763907988322 implements MigrationInterface {
    name = 'UpdateEvent1763907988322'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "events" ADD CONSTRAINT "UQ_6ac865133ce017b07b1390cc157" UNIQUE ("name", "organizerId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "events" DROP CONSTRAINT "UQ_6ac865133ce017b07b1390cc157"`);
    }

}
