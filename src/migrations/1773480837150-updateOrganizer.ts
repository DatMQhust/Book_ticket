import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateOrganizer1773480837150 implements MigrationInterface {
  name = 'UpdateOrganizer1773480837150';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."organizers_organizertype_enum" AS ENUM('INDIVIDUAL', 'BUSINESS', 'HOUSEHOLD')`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizers" ADD "organizerType" "public"."organizers_organizertype_enum" NOT NULL DEFAULT 'INDIVIDUAL'`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizers" ADD "taxCode" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizers" ADD "phone" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizers" ADD "website" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "organizers" ADD "documents" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "organizers" ADD "bankName" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizers" ADD "bankAccount" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizers" ADD "bankAccountHolder" character varying`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."organizers_kycstatus_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_REVISION')`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizers" ADD "kycStatus" "public"."organizers_kycstatus_enum" NOT NULL DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizers" ADD "kycRejectedReason" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizers" ADD "kycSubmittedAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizers" ADD "kycReviewedAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizers" ADD "kycReviewedByAdminId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizers" ALTER COLUMN "description" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organizers" ALTER COLUMN "description" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizers" DROP COLUMN "kycReviewedByAdminId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizers" DROP COLUMN "kycReviewedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizers" DROP COLUMN "kycSubmittedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizers" DROP COLUMN "kycRejectedReason"`,
    );
    await queryRunner.query(`ALTER TABLE "organizers" DROP COLUMN "kycStatus"`);
    await queryRunner.query(`DROP TYPE "public"."organizers_kycstatus_enum"`);
    await queryRunner.query(
      `ALTER TABLE "organizers" DROP COLUMN "bankAccountHolder"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizers" DROP COLUMN "bankAccount"`,
    );
    await queryRunner.query(`ALTER TABLE "organizers" DROP COLUMN "bankName"`);
    await queryRunner.query(`ALTER TABLE "organizers" DROP COLUMN "documents"`);
    await queryRunner.query(`ALTER TABLE "organizers" DROP COLUMN "website"`);
    await queryRunner.query(`ALTER TABLE "organizers" DROP COLUMN "phone"`);
    await queryRunner.query(`ALTER TABLE "organizers" DROP COLUMN "taxCode"`);
    await queryRunner.query(
      `ALTER TABLE "organizers" DROP COLUMN "organizerType"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."organizers_organizertype_enum"`,
    );
  }
}
