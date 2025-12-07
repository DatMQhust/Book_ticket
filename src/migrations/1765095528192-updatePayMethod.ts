import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatePayMethod1765095528192 implements MigrationInterface {
    name = 'UpdatePayMethod1765095528192'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "organization_payment_configs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sepayApiKey" character varying NOT NULL, "bankAccount" character varying NOT NULL, "bankCode" character varying NOT NULL, "organizerId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_fb662b6e51b1adb109cc0c0d61" UNIQUE ("organizerId"), CONSTRAINT "PK_f608ddc9ce59a838ec022c42b36" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "organization_payment_configs" ADD CONSTRAINT "FK_fb662b6e51b1adb109cc0c0d611" FOREIGN KEY ("organizerId") REFERENCES "organizers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organization_payment_configs" DROP CONSTRAINT "FK_fb662b6e51b1adb109cc0c0d611"`);
        await queryRunner.query(`DROP TABLE "organization_payment_configs"`);
    }

}
