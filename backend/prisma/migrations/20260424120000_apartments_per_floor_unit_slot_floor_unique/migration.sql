-- Immeuble : logements par étage (même décompte sur chaque étage ≥ 1).
ALTER TABLE "buildings" ADD COLUMN "apartments_per_floor" INTEGER;

-- Permettre le même n° de logement sur des étages différents (ex. app. 1 au 1er et au 2e).
DROP INDEX IF EXISTS "units_building_id_apartment_slot_key";

CREATE UNIQUE INDEX "units_building_floor_coalesced_apartment_slot_key" ON "units" (
  "building_id",
  (COALESCE("floor", -999999)),
  "apartment_slot"
) WHERE "apartment_slot" IS NOT NULL;
