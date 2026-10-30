#!/usr/bin/env node
/**
 * Smoke HTTP minimal staging / prod (Phase E1).
 * Usage: node scripts/smoke-staging.mjs --base https://api.example.com
 */
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    base: { type: 'string', short: 'b' },
  },
});

const base = (values.base || process.env.SMOKE_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');

async function check(path, pred) {
  const url = `${base}${path}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  if (pred && !pred(body, res)) throw new Error(`${path} → corps inattendu`);
  console.log(`OK ${path}`);
}

async function main() {
  console.log(`Smoke → ${base}`);
  await check('/health', (b) => b && (b.status === 'ok' || b.ok === true || b.db === 'up'));
  await check('/version', (b) => b != null);
  await check('/auth/signup-status', (b) => typeof b?.enabled === 'boolean');
  console.log('Smoke OK.');
}

main().catch((e) => {
  console.error('Smoke FAIL:', e.message || e);
  process.exit(1);
});
