-- Carnet séparé pour entrepôts / commerces (immeuble), distinct du carnet appartements.
ALTER TABLE "buildings" ADD COLUMN "locaux_slot_count" INTEGER;

ALTER TABLE "units" ADD COLUMN "locaux_slot" INTEGER;

-- Anciennes unités entrepôt / commerce en immeuble : déplacer le n° vers locaux_slot.
UPDATE "units" u
SET "locaux_slot" = u."apartment_slot", "apartment_slot" = NULL
FROM "buildings" b
WHERE u."building_id" = b."id"
  AND b."structure_kind" = 'IMMEUBLE'
  AND u."kind" IN ('WAREHOUSE', 'COMMERCIAL')
  AND u."apartment_slot" IS NOT NULL;

CREATE UNIQUE INDEX "units_building_id_locaux_slot_key" ON "units" ("building_id", "locaux_slot");
