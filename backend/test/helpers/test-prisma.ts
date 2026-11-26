import { PrismaClient } from '@prisma/client';
import { assertLocalDatabaseUrl } from './assert-local-url';

/**
 * Client Prisma pour tests d’intégration.
 * Utilise DATABASE_URL_TEST si défini, sinon DATABASE_URL (toujours local).
 * Retourne null si aucune URL locale utilisable (les specs appellent then `describe.skip`).
 */
export function resolveTestDatabaseUrl(): string | null {
  const raw = process.env.DATABASE_URL_TEST?.trim() || process.env.DATABASE_URL?.trim();
  if (!raw) return null;
  const check = assertLocalDatabaseUrl(raw, process.env.DATABASE_URL_TEST ? 'DATABASE_URL_TEST' : 'DATABASE_URL');
  if (!check.ok) {
    // eslint-disable-next-line no-console
    console.warn(`[test-prisma] skip DB: ${check.reason}`);
    return null;
  }
  // eslint-disable-next-line no-console
  console.log(`[test-prisma] ${check.host} ${check.masked}`);
  return raw;
}

export function createTestPrisma(): PrismaClient | null {
  const url = resolveTestDatabaseUrl();
  if (!url) return null;
  return new PrismaClient({ datasources: { db: { url } } });
}

export const hasLocalTestDb = (): boolean => resolveTestDatabaseUrl() != null;
