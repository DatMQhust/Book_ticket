import { MigrationInterface, QueryRunner } from "typeorm";

export class EventStat1773568312705 implements MigrationInterface {
    name = 'EventStat1773568312705'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."event_change_requests_status_enum" AS ENUM('pending', 'approved', 'rejected')`);
        await queryRunner.query(`CREATE TABLE "event_change_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "requestedChanges" jsonb NOT NULL, "reason" text NOT NULL, "status" "public"."event_change_requests_status_enum" NOT NULL DEFAULT 'pending', "adminNotes" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "event_id" uuid, CONSTRAINT "PK_711ed97959de0fd0c1f4db01d76" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."event_cancel_requests_status_enum" AS ENUM('pending', 'approved', 'rejected')`);
        await queryRunner.query(`CREATE TABLE "event_cancel_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reason" text NOT NULL, "supportingDocs" jsonb, "refundProposal" character varying NOT NULL DEFAULT 'full', "status" "public"."event_cancel_requests_status_enum" NOT NULL DEFAULT 'pending', "adminNotes" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "event_id" uuid, CONSTRAINT "REL_4a3f9996d00dece261cc11a5f3" UNIQUE ("event_id"), CONSTRAINT "PK_87af622d60d8b1bcbef71ebeb64" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "collaborators" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "assignedEventIds" uuid array NOT NULL DEFAULT '{}', "isActive" boolean NOT NULL DEFAULT true, "invitedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "userId" uuid, "organizerId" uuid, CONSTRAINT "PK_f579a5df9d66287f400806ad875" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "event_change_requests" ADD CONSTRAINT "FK_83335104c8f849be88d77a5f42c" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "event_cancel_requests" ADD CONSTRAINT "FK_4a3f9996d00dece261cc11a5f3c" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "collaborators" ADD CONSTRAINT "FK_e5b82c5ada6a6557ec22f219b30" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "collaborators" ADD CONSTRAINT "FK_9f4a9d83e456bdb54f250ede0cd" FOREIGN KEY ("organizerId") REFERENCES "organizers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "collaborators" DROP CONSTRAINT "FK_9f4a9d83e456bdb54f250ede0cd"`);
        await queryRunner.query(`ALTER TABLE "collaborators" DROP CONSTRAINT "FK_e5b82c5ada6a6557ec22f219b30"`);
        await queryRunner.query(`ALTER TABLE "event_cancel_requests" DROP CONSTRAINT "FK_4a3f9996d00dece261cc11a5f3c"`);
        await queryRunner.query(`ALTER TABLE "event_change_requests" DROP CONSTRAINT "FK_83335104c8f849be88d77a5f42c"`);
        await queryRunner.query(`DROP TABLE "collaborators"`);
        await queryRunner.query(`DROP TABLE "event_cancel_requests"`);
        await queryRunner.query(`DROP TYPE "public"."event_cancel_requests_status_enum"`);
        await queryRunner.query(`DROP TABLE "event_change_requests"`);
        await queryRunner.query(`DROP TYPE "public"."event_change_requests_status_enum"`);
    }

}
