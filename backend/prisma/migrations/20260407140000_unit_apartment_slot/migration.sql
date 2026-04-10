-- Numéro d’appartement dans l’immeuble (1…N) ; unicité par bien (PostgreSQL autorise plusieurs NULL).
ALTER TABLE "units" ADD COLUMN "apartment_slot" INTEGER;

CREATE UNIQUE INDEX "units_building_id_apartment_slot_key" ON "units" ("building_id", "apartment_slot");
