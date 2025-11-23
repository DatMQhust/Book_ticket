import { MigrationInterface, QueryRunner } from "typeorm";

export class EventTypeFix1763901126443 implements MigrationInterface {
    name = 'EventTypeFix1763901126443'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."events_eventtype_enum" AS ENUM('sport', 'live music', 'concert', 'festival', 'other')`);
        await queryRunner.query(`ALTER TABLE "events" ADD "eventType" "public"."events_eventtype_enum" NOT NULL DEFAULT 'other'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "eventType"`);
        await queryRunner.query(`DROP TYPE "public"."events_eventtype_enum"`);
    }

}
