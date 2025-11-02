import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateTicket1762095371619 implements MigrationInterface {
    name = 'UpdateTicket1762095371619'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_78597268621a8df3476d38313c2"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_8a101375d173c39a7c1d02c9d7d"`);
        await queryRunner.query(`CREATE TYPE "public"."ticket-types_status_enum" AS ENUM('available', 'sold_out')`);
        await queryRunner.query(`CREATE TABLE "ticket-types" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(200) NOT NULL, "price" integer NOT NULL, "quantity" integer NOT NULL, "rank" integer NOT NULL, "description" text NOT NULL, "sold" integer NOT NULL, "status" "public"."ticket-types_status_enum" NOT NULL DEFAULT 'available', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "eventId" uuid, CONSTRAINT "PK_82a8107ef92af69307d5156cff1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "quantity"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "ticket_id"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "price"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "quantity"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "rank"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "sold"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "eventId"`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "totalPrice" integer NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."events_status_enum" AS ENUM('upcoming', 'ongoing', 'ended', 'cancelled')`);
        await queryRunner.query(`ALTER TABLE "events" ADD "status" "public"."events_status_enum" NOT NULL DEFAULT 'upcoming'`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD "user_id" uuid`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD "order_id" uuid`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD "ticket_type_id" uuid`);
        await queryRunner.query(`ALTER TYPE "public"."tickets_status_enum" RENAME TO "tickets_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."tickets_status_enum" AS ENUM('unchecked', 'checked_in')`);
        await queryRunner.query(`ALTER TABLE "tickets" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "tickets" ALTER COLUMN "status" TYPE "public"."tickets_status_enum" USING "status"::"text"::"public"."tickets_status_enum"`);
        await queryRunner.query(`ALTER TABLE "tickets" ALTER COLUMN "status" SET DEFAULT 'unchecked'`);
        await queryRunner.query(`DROP TYPE "public"."tickets_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "ticket-types" ADD CONSTRAINT "FK_a9e4b6c604ca80e7c853b1e65bc" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_2e445270177206a97921e461710" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_bd5636236f799b19f132abf8d70" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_a95369aeea12da7fde110e95e00" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket-types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_a95369aeea12da7fde110e95e00"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_bd5636236f799b19f132abf8d70"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_2e445270177206a97921e461710"`);
        await queryRunner.query(`ALTER TABLE "ticket-types" DROP CONSTRAINT "FK_a9e4b6c604ca80e7c853b1e65bc"`);
        await queryRunner.query(`CREATE TYPE "public"."tickets_status_enum_old" AS ENUM('available', 'sold_out')`);
        await queryRunner.query(`ALTER TABLE "tickets" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "tickets" ALTER COLUMN "status" TYPE "public"."tickets_status_enum_old" USING "status"::"text"::"public"."tickets_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "tickets" ALTER COLUMN "status" SET DEFAULT 'available'`);
        await queryRunner.query(`DROP TYPE "public"."tickets_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."tickets_status_enum_old" RENAME TO "tickets_status_enum"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "ticket_type_id"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "order_id"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "user_id"`);
        await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."events_status_enum"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "totalPrice"`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD "eventId" uuid`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD "sold" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD "description" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD "rank" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD "quantity" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD "price" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD "name" character varying(200) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "ticket_id" uuid`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "quantity" integer NOT NULL`);
        await queryRunner.query(`DROP TABLE "ticket-types"`);
        await queryRunner.query(`DROP TYPE "public"."ticket-types_status_enum"`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_8a101375d173c39a7c1d02c9d7d" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_78597268621a8df3476d38313c2" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
