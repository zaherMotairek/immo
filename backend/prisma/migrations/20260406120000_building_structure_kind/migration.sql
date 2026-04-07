-- Immeuble = plusieurs unités / plusieurs baux possibles. MONO_LOT = une seule unité sur le bien.
CREATE TYPE "BuildingStructureKind" AS ENUM ('IMMEUBLE', 'MONO_LOT');

ALTER TABLE "buildings" ADD COLUMN "structure_kind" "BuildingStructureKind" NOT NULL DEFAULT 'MONO_LOT';

UPDATE "buildings" b
SET "structure_kind" = 'IMMEUBLE'
WHERE (SELECT COUNT(*)::int FROM "units" u WHERE u.building_id = b.id) > 1;
