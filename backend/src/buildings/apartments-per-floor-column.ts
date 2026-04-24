import type { PrismaClient } from '@prisma/client';

type SqlClient = Pick<PrismaClient, '$queryRawUnsafe' | '$executeRawUnsafe'>;

/**
 * Lecture / écriture directe de la colonne `apartments_per_floor` pour rester compatible
 * tant que `npx prisma generate` n’a pas été rejoué (client Prisma obsolète → « Unknown argument »).
 *
 * Les identifiants Prisma (`id`, `organization_id`) sont stockés en **TEXT** dans les migrations
 * historiques : ne pas utiliser `::uuid` dans le SQL brut (erreur P2010 / syntaxe invalide).
 */
export async function selectApartmentsPerFloorColumn(
  prisma: SqlClient,
  buildingId: string,
): Promise<number | null | undefined> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ apartments_per_floor: number | null }>>(
      `SELECT "apartments_per_floor" FROM "buildings" WHERE "id" = $1 LIMIT 1`,
      buildingId,
    );
    if (!rows.length) return undefined;
    return rows[0].apartments_per_floor;
  } catch {
    return undefined;
  }
}

export async function selectApartmentsPerFloorByOrg(
  prisma: SqlClient,
  organizationId: string,
): Promise<Map<string, number | null>> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string; apartments_per_floor: number | null }>>(
      `SELECT "id", "apartments_per_floor" FROM "buildings" WHERE "organization_id" = $1`,
      organizationId,
    );
    return new Map(rows.map((r) => [r.id, r.apartments_per_floor]));
  } catch {
    return new Map();
  }
}

export async function updateApartmentsPerFloorColumn(
  prisma: SqlClient,
  buildingId: string,
  value: number | null,
): Promise<void> {
  if (value === null) {
    await prisma.$executeRawUnsafe(
      `UPDATE "buildings" SET "apartments_per_floor" = NULL WHERE "id" = $1`,
      buildingId,
    );
    return;
  }
  await prisma.$executeRawUnsafe(
    `UPDATE "buildings" SET "apartments_per_floor" = $2 WHERE "id" = $1`,
    buildingId,
    value,
  );
}
