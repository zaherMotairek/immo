#!/usr/bin/env node
/**
 * Migre uploads/ locaux → bucket S3 (idempotent). Dry-run par défaut. Ne supprime jamais le local.
 *   node scripts/migrate-uploads-to-s3.mjs
 *   node scripts/migrate-uploads-to-s3.mjs --apply
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { createRequire } from 'module';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const apply = process.argv.includes('--apply');

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (process.env[k] === undefined) process.env[k] = v;
  }
}
loadEnv(join(ROOT, 'backend', '.env'));
loadEnv(join(ROOT, '.env'));

const { S3Client, HeadObjectCommand, PutObjectCommand } = require(
  join(ROOT, 'backend/node_modules/@aws-sdk/client-s3'),
);

const uploadRoot = join(ROOT, 'backend', process.env.LEASE_CONTRACT_UPLOAD_SUBDIR || 'uploads');
const namespaces = ['lease-contracts', 'tenant-id-docs'];

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

async function main() {
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!bucket || !accessKeyId || !secretAccessKey) {
    console.error('S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY requis.');
    process.exit(1);
  }
  const client = new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: { accessKeyId, secretAccessKey },
  });
  const prefix = (process.env.S3_KEY_PREFIX || '').replace(/^\/+|\/+$/g, '');
  let planned = 0;
  let uploaded = 0;
  let skipped = 0;

  for (const ns of namespaces) {
    const nsDir = join(uploadRoot, ns);
    for (const full of walk(nsDir)) {
      const rel = relative(nsDir, full).replace(/\\/g, '/');
      const key = prefix ? `${prefix}/${ns}/${rel}` : `${ns}/${rel}`;
      planned += 1;
      try {
        await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        skipped += 1;
        console.log(`skip ${key}`);
        continue;
      } catch {
        /* upload */
      }
      if (!apply) {
        console.log(`dry-run ${full} → s3://${bucket}/${key}`);
        continue;
      }
      await client.send(
        new PutObjectCommand({ Bucket: bucket, Key: key, Body: readFileSync(full) }),
      );
      uploaded += 1;
      console.log(`uploaded ${key}`);
    }
  }
  console.log(
    apply
      ? `OK planned=${planned} uploaded=${uploaded} skipped=${skipped}`
      : `Dry-run planned=${planned}. Relancer avec --apply. Fichiers locaux jamais supprimés.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
