#!/usr/bin/env node
/**
 * Déploiement Render : migrate deploy + déblocage P3009 pour migration idempotente B5
 * (déjà partiellement appliquée ou marquée failed en prod Neon).
 *
 * Neon : migrations via URL **directe** (sans `-pooler`), sinon P1002 (verrou advisory).
 * Définir DATABASE_URL_DIRECT sur Render, ou on retire `-pooler` automatiquement.
 *
 * P1002 : le timeout du verrou Prisma est fixe (10 s). Sur Render (une instance), on
 * désactive le verrou advisory. Contournement urgence : SKIP_MIGRATE_DEPLOY=1.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { PrismaClient } from '@prisma/client';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STUCK = '20261030170000_phase_b_bootstraps_and_receipt_revoke';

function withoutNeonPoolerHost(url) {
  if (!url || !url.includes('-pooler.')) return url;
  return url.replace('-pooler.', '.');
}

function resolveMigrateDatabaseUrl() {
  const explicit =
    process.env.DATABASE_URL_DIRECT?.trim() ||
    process.env.DIRECT_URL?.trim() ||
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
    '';
  if (explicit) {
    const direct = withoutNeonPoolerHost(explicit);
    if (direct !== explicit) {
      console.warn(
        '[migrate-deploy-render] DATABASE_URL_DIRECT contenait -pooler — host corrigé pour migrate.',
      );
    }
    return direct;
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) return url;
  return withoutNeonPoolerHost(url);
}

function shouldDisableAdvisoryLock() {
  const v = process.env.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK;
  if (v === '1' || v === 'true') return true;
  if (process.env.MIGRATE_DISABLE_ADVISORY_LOCK === '1') return true;
  if (process.env.RENDER && process.env.RENDER !== 'false' && process.env.RENDER !== '0') {
    return true;
  }
  return false;
}

function migrateEnv(extra = {}) {
  const migrateUrl = resolveMigrateDatabaseUrl();
  const env = { ...process.env, ...extra };
  if (migrateUrl && migrateUrl !== process.env.DATABASE_URL) {
    env.DATABASE_URL = migrateUrl;
    console.warn(
      '[migrate-deploy-render] migrations via URL directe Neon (sans pooler). Astuce Render : DATABASE_URL_DIRECT.',
    );
  }
  if (shouldDisableAdvisoryLock()) {
    env.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK = '1';
  }
  return env;
}

function runMigrateDeploy(envOverrides = {}) {
  return spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: ROOT,
    stdio: 'pipe',
    encoding: 'utf8',
    shell: true,
    env: migrateEnv(envOverrides),
  });
}

function prismaForMigrations() {
  const url = resolveMigrateDatabaseUrl() || process.env.DATABASE_URL;
  if (url && url !== process.env.DATABASE_URL) {
    return new PrismaClient({ datasources: { db: { url } } });
  }
  return new PrismaClient();
}

function listLocalMigrationNames() {
  const dir = join(ROOT, 'prisma', 'migrations');
  return readdirSync(dir, { withFileTypes: true })
    .filter(
      (d) =>
        d.isDirectory() &&
        existsSync(join(dir, d.name, 'migration.sql')),
    )
    .map((d) => d.name)
    .sort();
}

async function migrationsUpToDate() {
  const skip = process.env.SKIP_MIGRATE_DEPLOY;
  if (skip === '1' || skip === 'true') {
    console.warn(
      '[migrate-deploy-render] SKIP_MIGRATE_DEPLOY — migrate deploy ignoré (démarrage API seul).',
    );
    return true;
  }

  const local = listLocalMigrationNames();
  if (local.length === 0) return false;

  const prisma = prismaForMigrations();
  try {
    const failed = await prisma.$queryRaw`
      SELECT migration_name FROM "_prisma_migrations"
      WHERE finished_at IS NULL
    `;
    if (Array.isArray(failed) && failed.length > 0) {
      console.warn(
        `[migrate-deploy-render] ${failed.length} migration(s) en échec / en cours — migrate deploy requis.`,
      );
      return false;
    }

    const rows = await prisma.$queryRaw`
      SELECT migration_name FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
    `;
    const applied = new Set(
      (Array.isArray(rows) ? rows : []).map((r) => r.migration_name),
    );
    const pending = local.filter((m) => !applied.has(m));
    if (pending.length === 0) {
      console.log(
        `[migrate-deploy-render] Schéma à jour (${local.length} migrations) — migrate deploy ignoré.`,
      );
      return true;
    }
    console.log(
      `[migrate-deploy-render] ${pending.length} migration(s) à appliquer: ${pending.slice(0, 5).join(', ')}${pending.length > 5 ? '…' : ''}`,
    );
    return false;
  } catch (e) {
    const msg = e?.message || String(e);
    if (/does not exist|_prisma_migrations/i.test(msg)) {
      console.warn(
        '[migrate-deploy-render] Table _prisma_migrations absente — première migration.',
      );
      return false;
    }
    console.warn(
      '[migrate-deploy-render] Impossible de lire _prisma_migrations — migrate deploy quand même:',
      msg,
    );
    return false;
  } finally {
    await prisma.$disconnect();
  }
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
  if (shouldDisableAdvisoryLock()) {
    console.warn(
      '[migrate-deploy-render] PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1 (Render / config explicite, instance unique).',
    );
  }

  if (await migrationsUpToDate()) {
    process.exit(0);
  }

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
    if (isP1002 && !shouldDisableAdvisoryLock() && attempt === maxAttempts) {
      console.warn(
        '[migrate-deploy-render] P1002 — nouvelle tentative avec verrou advisory désactivé.',
      );
      r = runMigrateDeploy({ PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: '1' });
      out = dumpMigrateOutput(r);
      if (r.status === 0) {
        console.log('migrate deploy OK (verrou advisory désactivé).');
        process.exit(0);
      }
    }
    if (isP1002 && attempt < maxAttempts) {
      console.warn(
        `[migrate-deploy-render] P1002 verrou advisory (tentative ${attempt}/${maxAttempts}) — attente 25 s…`,
      );
      await sleep(25_000);
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
        '[migrate-deploy-render] P1002 : URL directe Neon (DATABASE_URL_DIRECT), un seul deploy à la fois, ou SKIP_MIGRATE_DEPLOY=1 si le schéma est déjà à jour.',
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
  console.error('migrate deploy échoue après déblocage.');
  process.exit(r.status || 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});