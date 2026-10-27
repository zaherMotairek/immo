/**
 * Lance Playwright visual-check (Phase 6).
 * Usage :
 *   node scripts/run-visual-check.mjs          → smoke (défaut)
 *   node scripts/run-visual-check.mjs compare  → diff vs e2e/baselines
 *   node scripts/run-visual-check.mjs update   → compare + --update-snapshots
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '..');
const mode = (process.argv[2] || 'smoke').toLowerCase();

const env = { ...process.env };
const args = ['playwright', 'test', 'e2e/visual-check.spec.ts'];

if (mode === 'compare' || mode === 'update') {
  env.E2E_VISUAL_COMPARE = '1';
}
if (mode === 'update') {
  args.push('--update-snapshots');
}

console.log(`check:visual mode=${mode} E2E_VISUAL_COMPARE=${env.E2E_VISUAL_COMPARE || ''}`);

const result = spawnSync('npx', args, {
  cwd: frontendRoot,
  env,
  stdio: 'inherit',
  shell: true,
});

process.exit(result.status ?? 1);
