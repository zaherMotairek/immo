-- Indicatif « combien de lots » pour les biens TERRAIN_LOTS (comme étages / app. pour l’immeuble).
ALTER TABLE "buildings" ADD COLUMN "terrain_lot_count" INTEGER;
