import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateUser1760799017643 implements MigrationInterface {
    name = 'UpdateUser1760799017643'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "refreshToken"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "refreshToken" character varying(500)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "refreshToken"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "refreshToken" character varying NOT NULL`);
    }

}
