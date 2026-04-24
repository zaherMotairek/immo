import type { PrismaClient } from '@prisma/client';

const TAG = '[immo-schema-bootstrap]';

/**
 * Au démarrage de l’API : applique les changements SQL nécessaires pour la grille
 * « logements par étage » et l’unicité (bien, étage, n° de logement), même si
 * `prisma migrate deploy` n’a pas été exécuté sur l’environnement du client.
 */
export async function runImmeubleSchemaBootstrap(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "buildings" ADD COLUMN IF NOT EXISTS "apartments_per_floor" INTEGER`,
    );
  } catch (e) {
    console.error(TAG, 'ALTER TABLE buildings.apartments_per_floor', e);
  }

  try {
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "units_building_id_apartment_slot_key"`);
  } catch (e) {
    console.error(TAG, 'DROP INDEX units_building_id_apartment_slot_key', e);
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX "units_building_floor_coalesced_apartment_slot_key"
      ON "units" ("building_id", (COALESCE("floor", -999999)), "apartment_slot")
      WHERE "apartment_slot" IS NOT NULL
    `);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!/already exists|duplicate key|relation.*already exists/i.test(msg)) {
      console.warn(
        TAG,
        'CREATE UNIQUE INDEX units (building_id, floor, apartment_slot) — déjà présent ou conflit de données :',
        msg,
      );
    }
  }
}
