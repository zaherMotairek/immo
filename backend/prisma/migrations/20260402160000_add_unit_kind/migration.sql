-- CreateEnum
CREATE TYPE "public"."UnitKind" AS ENUM ('APARTMENT', 'HOUSE', 'LAND', 'OFFICE', 'WAREHOUSE', 'COMMERCIAL', 'GARAGE', 'OTHER');

-- AlterTable
ALTER TABLE "public"."units" ADD COLUMN "kind" "public"."UnitKind" NOT NULL DEFAULT 'APARTMENT';
