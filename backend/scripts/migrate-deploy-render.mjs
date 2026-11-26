#!/usr/bin/env node
/**
 * Déploiement Render : migrate deploy + déblocage P3009 pour migration idempotente B5
 * (déjà partiellement appliquée ou marquée failed en prod Neon).
 *
 * Neon : les migrations doivent passer par l’URL **directe** (sans `-pooler`), sinon P1002
 * (verrou advisory). Définir DATABASE_URL_DIRECT sur Render, ou on retire `-pooler` automatiquement.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { PrismaClient } from '@prisma/client';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STUCK = '20261030170000_phase_b_bootstraps_and_receipt_revoke';

function resolveMigrateDatabaseUrl() {
  const explicit =
    process.env.DATABASE_URL_DIRECT?.trim() ||
    process.env.DIRECT_URL?.trim() ||
    '';
  if (explicit) return explicit;

  const url = process.env.DATABASE_URL?.trim();
  if (!url) return url;
  if (url.includes('-pooler.')) {
    return url.replace('-pooler.', '.');
  }
  return url;
}

function migrateEnv() {
  const migrateUrl = resolveMigrateDatabaseUrl();
  const env = { ...process.env };
  env.PRISMA_MIGRATE_ADVISORY_LOCK_TIMEOUT =
    env.PRISMA_MIGRATE_ADVISORY_LOCK_TIMEOUT || '120000';
  if (migrateUrl && migrateUrl !== process.env.DATABASE_URL) {
    env.DATABASE_URL = migrateUrl;
    console.warn(
      '[migrate-deploy-render] migrations via URL directe Neon (sans pooler). Astuce Render : DATABASE_URL_DIRECT.',
    );
  }
  return env;
}

function runMigrateDeploy() {
  return spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: ROOT,
    stdio: 'pipe',
    encoding: 'utf8',
    shell: true,
    env: migrateEnv(),
  });
}

function prismaForMigrations() {
  const url = resolveMigrateDatabaseUrl() || process.env.DATABASE_URL;
  if (url && url !== process.env.DATABASE_URL) {
    return new PrismaClient({ datasources: { db: { url } } });
  }
  return new PrismaClient();
}

async function clearFailedMigrationRow(name) {
  const prisma = prismaForMigrations();
  try {
    const n = await prisma.$executeRaw`
      UPDATE "_prisma_migrations"
      SET finished_at = COALESCE(finished_at, NOW()),
          logs = NULL
      WHERE migration_name = ${name}
        AND finished_at IS NULL
    `;
    return Number(n);
  } finally {
    await prisma.$disconnect();
  }
}

function tryResolveApplied(name) {
  return spawnSync('npx', ['prisma', 'migrate', 'resolve', '--applied', name], {
    cwd: ROOT,
    stdio: 'pipe',
    encoding: 'utf8',
    shell: true,
    env: migrateEnv(),
  });
}

function dumpMigrateOutput(r) {
  process.stdout.write(r.stdout || '');
  process.stderr.write(r.stderr || '');
  return `${r.stdout || ''}\n${r.stderr || ''}`;
}

async function main() {
  const maxAttempts = 3;
  let r = null;
  let out = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    r = runMigrateDeploy();
    out = dumpMigrateOutput(r);
    if (r.status === 0) {
      console.log('migrate deploy OK.');
      process.exit(0);
    }
    const isP1002 = out.includes('P1002') || /advisory lock/i.test(out);
    if (isP1002 && attempt < maxAttempts) {
      console.warn(
        `[migrate-deploy-render] P1002 verrou advisory (tentative ${attempt}/${maxAttempts}) — attente 20 s…`,
      );
      await sleep(20_000);
      continue;
    }
    break;
  }

  const isP3009 = out.includes('P3009') || out.includes('failed migrations');
  const mentionsStuck = out.includes(STUCK);

  if (!isP3009) {
    console.error('migrate deploy échec (non P3009).');
    if (out.includes('P1002')) {
      console.error(
        '[migrate-deploy-render] Sur Neon : ajoutez DATABASE_URL_DIRECT (connexion sans pooler) dans Render, ou attendez la fin d’un autre deploy.',
      );
    }
    process.exit(r?.status || 1);
  }

  console.warn(`[migrate-deploy-render] tentative déblocage: ${STUCK}`);

  const resolved = tryResolveApplied(STUCK);
  if (resolved.status !== 0) {
    console.warn('[migrate-deploy-render] resolve --applied ignoré:', (resolved.stderr || resolved.stdout || '').trim());
    try {
      const updated = await clearFailedMigrationRow(STUCK);
      console.warn(`[migrate-deploy-render] SQL _prisma_migrations mis à jour: ${updated} ligne(s).`);
    } catch (e) {
      console.error('[migrate-deploy-render] SQL fallback échec:', e);
      process.exit(1);
    }
  }

  if (!mentionsStuck) {
    console.error('P3009 sur une autre migration — intervention manuelle requise.');
    process.exit(1);
  }

  r = runMigrateDeploy();
  dumpMigrateOutput(r);
  if (r.status === 0) {
    console.log('migrate deploy OK (après déblocage).');
    process.exit(0);
  }
  console.error('migrate deploy échec après déblocage.');
  process.exit(r.status || 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});