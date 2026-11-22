#!/usr/bin/env node
/**
 * Déploiement Render : migrate deploy + déblocage P3009 pour migration idempotente B5
 * (déjà partiellement appliquée ou marquée failed en prod Neon).
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STUCK = '20261030170000_phase_b_bootstraps_and_receipt_revoke';

function runMigrateDeploy() {
  return spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: ROOT,
    stdio: 'pipe',
    encoding: 'utf8',
    shell: true,
  });
}

async function clearFailedMigrationRow(name) {
  const prisma = new PrismaClient();
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
  });
}

async function main() {
  let r = runMigrateDeploy();
  if (r.status === 0) {
    process.stdout.write(r.stdout || '');
    process.stderr.write(r.stderr || '');
    console.log('migrate deploy OK.');
    process.exit(0);
  }

  const out = `${r.stdout || ''}\n${r.stderr || ''}`;
  process.stdout.write(r.stdout || '');
  process.stderr.write(r.stderr || '');

  const isP3009 = out.includes('P3009') || out.includes('failed migrations');
  const mentionsStuck = out.includes(STUCK);

  if (!isP3009) {
    console.error('migrate deploy échec (non P3009).');
    process.exit(r.status || 1);
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
  process.stdout.write(r.stdout || '');
  process.stderr.write(r.stderr || '');
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