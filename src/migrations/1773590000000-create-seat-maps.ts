import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSeatMaps1773590000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "seat_maps" (
        "id"              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
        "eventId"         UUID            NOT NULL UNIQUE,
        "bgUrl"           VARCHAR(500)    NULL,
        "canvasWidth"     INT             NOT NULL DEFAULT 900,
        "canvasHeight"    INT             NOT NULL DEFAULT 600,
        "stageElements"   JSONB           NOT NULL DEFAULT '[]',
        "zones"           JSONB           NOT NULL DEFAULT '[]',
        "createdAt"       TIMESTAMPTZ     NOT NULL DEFAULT now(),
        "updatedAt"       TIMESTAMPTZ     NOT NULL DEFAULT now(),
        CONSTRAINT "FK_seat_maps_event" FOREIGN KEY ("eventId")
          REFERENCES "events"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "seat_maps"`);
  }
}
