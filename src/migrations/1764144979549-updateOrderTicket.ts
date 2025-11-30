import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateOrderTicket1764144979549 implements MigrationInterface {
    name = 'UpdateOrderTicket1764144979549'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" ADD "totalQuantity" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "paymentMethod" character varying`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "transactionId" character varying`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD "accessCode" character varying(20) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD "checkedInAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TYPE "public"."orders_status_enum" RENAME TO "orders_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."orders_status_enum" AS ENUM('pending', 'completed', 'cancelled', 'refunded')`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" TYPE "public"."orders_status_enum" USING "status"::"text"::"public"."orders_status_enum"`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."orders_status_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."tickets_status_enum" RENAME TO "tickets_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."tickets_status_enum" AS ENUM('unchecked', 'checked_in', 'cancelled')`);
        await queryRunner.query(`ALTER TABLE "tickets" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "tickets" ALTER COLUMN "status" TYPE "public"."tickets_status_enum" USING "status"::"text"::"public"."tickets_status_enum"`);
        await queryRunner.query(`ALTER TABLE "tickets" ALTER COLUMN "status" SET DEFAULT 'unchecked'`);
        await queryRunner.query(`DROP TYPE "public"."tickets_status_enum_old"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a3ef360abe0ab613aaeb754972" ON "tickets" ("accessCode") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_a3ef360abe0ab613aaeb754972"`);
        await queryRunner.query(`CREATE TYPE "public"."tickets_status_enum_old" AS ENUM('unchecked', 'checked_in')`);
        await queryRunner.query(`ALTER TABLE "tickets" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "tickets" ALTER COLUMN "status" TYPE "public"."tickets_status_enum_old" USING "status"::"text"::"public"."tickets_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "tickets" ALTER COLUMN "status" SET DEFAULT 'unchecked'`);
        await queryRunner.query(`DROP TYPE "public"."tickets_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."tickets_status_enum_old" RENAME TO "tickets_status_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."orders_status_enum_old" AS ENUM('pending', 'completed', 'cancelled')`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" TYPE "public"."orders_status_enum_old" USING "status"::"text"::"public"."orders_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."orders_status_enum_old" RENAME TO "orders_status_enum"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "checkedInAt"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "accessCode"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "transactionId"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "paymentMethod"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "totalQuantity"`);
    }

}
