#!/usr/bin/env node
/**
 * Garde-fou : refuse toute opération DB si l’hôte n’est pas localhost / 127.0.0.1.
 * Usage :
 *   node scripts/assert-local-db.mjs
 *   node scripts/assert-local-db.mjs --env DATABASE_URL_TEST
 *   node scripts/assert-local-db.mjs --url "postgresql://..."
 *
 * Charge optionnellement .env racine et backend/.env (sans écraser les vars déjà définies).
 */

import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile(join(ROOT, '.env'));
loadEnvFile(join(ROOT, 'backend', '.env'));

const BLOCKED_HOST_PARTS = ['neon.tech', 'render.com', 'amazonaws.com', 'supabase.co', 'railway.app'];

/**
 * @param {string | undefined} rawUrl
 * @param {string} label
 */
export function assertLocalDatabaseUrl(rawUrl, label = 'DATABASE_URL') {
  if (!rawUrl || !String(rawUrl).trim()) {
    return { ok: false, reason: `${label} est vide ou absent.` };
  }
  let host = '';
  try {
    const u = new URL(rawUrl);
    host = (u.hostname || '').toLowerCase();
  } catch {
    const m = String(rawUrl).match(/@([^/:?]+)(?::\d+)?\//);
    host = (m?.[1] || '').toLowerCase();
  }
  const masked = String(rawUrl).replace(/:([^:@/]+)@/, ':****@');
  if (!host) {
    return { ok: false, reason: `Impossible d’extraire l’hôte de ${label}.`, masked };
  }
  const local = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  if (!local) {
    return {
      ok: false,
      reason: `${label} pointe vers « ${host} » — seul localhost / 127.0.0.1 est autorisé (pas de Neon / prod).`,
      host,
      masked,
    };
  }
  for (const part of BLOCKED_HOST_PARTS) {
    if (host.includes(part)) {
      return {
        ok: false,
        reason: `${label} contient « ${part} » — abort.`,
        host,
        masked,
      };
    }
  }
  return { ok: true, host, masked };
}

function parseArgs(argv) {
  let envName = 'DATABASE_URL';
  let urlOverride = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--env' && argv[i + 1]) {
      envName = argv[++i];
    } else if (argv[i] === '--url' && argv[i + 1]) {
      urlOverride = argv[++i];
    }
  }
  return { envName, urlOverride };
}

function main() {
  const { envName, urlOverride } = parseArgs(process.argv.slice(2));
  const raw = urlOverride ?? process.env[envName] ?? process.env.DATABASE_URL;
  const label = urlOverride ? 'URL' : envName in process.env || !urlOverride ? envName : 'DATABASE_URL';
  const result = assertLocalDatabaseUrl(raw, label);
  if (result.masked) {
    console.log(`[assert-local-db] ${label} host=${result.host ?? '?'} url=${result.masked}`);
  } else {
    console.log(`[assert-local-db] ${label} (pas d’URL)`);
  }
  if (!result.ok) {
    console.error(`[assert-local-db] ABORT: ${result.reason}`);
    process.exit(1);
  }
  console.log('[assert-local-db] OK — base locale.');
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (invokedPath && import.meta.url === invokedPath) {
  main();
}
