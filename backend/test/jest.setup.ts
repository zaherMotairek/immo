/**
 * Setup Jest : charge les .env locaux puis impose le garde-fou localhost
 * pour toute suite qui utilise DATABASE_URL / DATABASE_URL_TEST.
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

function loadEnvFile(path: string) {
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

loadEnvFile(join(__dirname, '..', '.env'));
loadEnvFile(join(__dirname, '..', '..', '.env'));

// Africa/Abidjan = UTC+0 sans DST — on force UTC pour les tests de dates métier.
process.env.TZ = process.env.TZ || 'UTC';
