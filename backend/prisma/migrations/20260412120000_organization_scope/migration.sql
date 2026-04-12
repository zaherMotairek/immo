-- Cloisonnement par organisation (client) : biens et locataires rattachés à une org.

CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

INSERT INTO "organizations" ("id", "name", "created_at", "updated_at")
VALUES ('00000000-0000-4000-8000-000000000001', 'Par défaut', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "User" ADD COLUMN "organization_id" TEXT;
UPDATE "User" SET "organization_id" = '00000000-0000-4000-8000-000000000001' WHERE "organization_id" IS NULL;
ALTER TABLE "User" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "User" ADD CONSTRAINT "User_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "User_organization_id_idx" ON "User"("organization_id");

ALTER TABLE "buildings" ADD COLUMN "organization_id" TEXT;
UPDATE "buildings" SET "organization_id" = '00000000-0000-4000-8000-000000000001' WHERE "organization_id" IS NULL;
ALTER TABLE "buildings" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "buildings_organization_id_idx" ON "buildings"("organization_id");

ALTER TABLE "tenants" ADD COLUMN "organization_id" TEXT;
UPDATE "tenants" SET "organization_id" = '00000000-0000-4000-8000-000000000001' WHERE "organization_id" IS NULL;
ALTER TABLE "tenants" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "tenants_organization_id_idx" ON "tenants"("organization_id");
