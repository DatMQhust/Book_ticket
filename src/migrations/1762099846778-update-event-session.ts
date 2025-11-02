import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateEventSession1762099846778 implements MigrationInterface {
    name = 'UpdateEventSession1762099846778'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."event_sessions_status_enum" AS ENUM('upcoming', 'ongoing', 'ended', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "event_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(200) NOT NULL, "startTime" TIMESTAMP WITH TIME ZONE NOT NULL, "endTime" TIMESTAMP WITH TIME ZONE NOT NULL, "status" "public"."event_sessions_status_enum" NOT NULL DEFAULT 'upcoming', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "eventId" uuid, CONSTRAINT "PK_dbe18de390df26f2dffc4ef3356" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "eventDate"`);
        await queryRunner.query(`ALTER TABLE "events" ADD "bannerUrl" character varying(500)`);
        await queryRunner.query(`ALTER TABLE "events" ADD "imageUrl" character varying(500)`);
        await queryRunner.query(`ALTER TABLE "ticket-types" ADD "eventSessionId" uuid`);
        await queryRunner.query(`ALTER TABLE "ticket-types" ADD CONSTRAINT "CHK_4df9ac3884cf9acfdfd7bdca4c" CHECK (
  ( ("eventId" IS NOT NULL) AND ("eventSessionId" IS NULL) )
  OR
  ( ("eventId" IS NULL) AND ("eventSessionId" IS NOT NULL) )
)`);
        await queryRunner.query(`ALTER TABLE "event_sessions" ADD CONSTRAINT "FK_51ed83c9a1acb790e7d51f1358a" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket-types" ADD CONSTRAINT "FK_acb9279eaaa5afcd9acc1b78b03" FOREIGN KEY ("eventSessionId") REFERENCES "event_sessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket-types" DROP CONSTRAINT "FK_acb9279eaaa5afcd9acc1b78b03"`);
        await queryRunner.query(`ALTER TABLE "event_sessions" DROP CONSTRAINT "FK_51ed83c9a1acb790e7d51f1358a"`);
        await queryRunner.query(`ALTER TABLE "ticket-types" DROP CONSTRAINT "CHK_4df9ac3884cf9acfdfd7bdca4c"`);
        await queryRunner.query(`ALTER TABLE "ticket-types" DROP COLUMN "eventSessionId"`);
        await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "imageUrl"`);
        await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "bannerUrl"`);
        await queryRunner.query(`ALTER TABLE "events" ADD "eventDate" TIMESTAMP WITH TIME ZONE NOT NULL`);
        await queryRunner.query(`DROP TABLE "event_sessions"`);
        await queryRunner.query(`DROP TYPE "public"."event_sessions_status_enum"`);
    }

}
