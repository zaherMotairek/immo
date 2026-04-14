-- Rez-de-chaussée optionnel dans le carnet d'étages (immeuble).
ALTER TABLE "buildings" ADD COLUMN "has_rez_de_chaussee" BOOLEAN;

UPDATE "buildings"
SET "has_rez_de_chaussee" = true
WHERE "structure_kind" = 'IMMEUBLE';
