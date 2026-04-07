-- Localisation (Côte d'Ivoire) + commune
ALTER TABLE "public"."buildings" ADD COLUMN "commune" TEXT;
UPDATE "public"."buildings" SET "commune" = 'Non renseigné' WHERE "commune" IS NULL;
ALTER TABLE "public"."buildings" ALTER COLUMN "commune" SET NOT NULL;
ALTER TABLE "public"."buildings" ALTER COLUMN "address" DROP NOT NULL;
ALTER TABLE "public"."buildings" ALTER COLUMN "postal_code" DROP NOT NULL;
ALTER TABLE "public"."buildings" ALTER COLUMN "country" SET DEFAULT 'Côte d''Ivoire';

-- Description du lot
ALTER TABLE "public"."units" ADD COLUMN "description" TEXT;
