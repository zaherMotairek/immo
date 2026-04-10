-- Carnet d’immeuble : nombre d’étages et d’appartements (indicatif / aide à la saisie des baux).
ALTER TABLE "buildings" ADD COLUMN "floor_count" INTEGER;
ALTER TABLE "buildings" ADD COLUMN "apartment_count" INTEGER;
