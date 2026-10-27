/**
 * Guardrails UI ImmoPilot (Phase 6) — Calm ledger
 *
 * Politique (mode B — pragmatique tant qu’il reste des balises brutes hors kit) :
 * - FAIL (exit 1) : `alert(` / `confirm(` (hors allowlist) ; couleurs hex `#…`
 *   dans className / style (ou feuilles .css hors allowlist).
 * - WARN (exit 0 si pas de FAIL) : `<button` / `<input` / `<select` / `<textarea`
 *   JSX hors kit — compteurs imprimés, migration progressive.
 *
 * Allowlist (primitives + hex autorisés) :
 * - src/theme/**
 * - src/components/ui/**
 * - src/components/ui.tsx (pont legacy)
 * - pages DesignSystem (galerie DEV)
 * - src/index.css (entrée globale tokens / legacy)
 *
 * Usage : `node scripts/ui-guardrails.mjs` depuis frontend/
 *         `npm run check:ui`
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '..', 'src');

const ALLOW_DIR_FRAGMENTS = [
  `${path.sep}theme${path.sep}`,
  `${path.sep}components${path.sep}ui${path.sep}`,
];

const ALLOW_FILES = new Set(
  [
    'components/ui.tsx',
    'pages/DesignSystemPage.tsx',
    'index.css',
  ].map((p) => path.normalize(p)),
);

const EXT = new Set(['.ts', '.tsx', '.css']);

/** @typedef {{ file: string, line: number, col: number, kind: string, excerpt: string }} Finding */

/** @param {string} abs */
function toRel(abs) {
  return path.relative(SRC, abs).split(path.sep).join('/');
}

/** @param {string} abs */
function isAllowlisted(abs) {
  const norm = path.normalize(abs);
  const rel = path.normalize(toRel(norm));
  if (ALLOW_FILES.has(rel)) return true;
  for (const frag of ALLOW_DIR_FRAGMENTS) {
    if (norm.includes(frag)) return true;
  }
  return false;
}

/** @param {string} dir @param {string[]} out */
function walk(dir, out) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === 'dist') continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (EXT.has(path.extname(ent.name))) out.push(full);
  }
}

/**
 * Ignore occurrences dans commentaires ligne // … et blocs /* … *\/
 * Approximatif mais suffisant pour des guardrails CI.
 * @param {string} source
 */
function stripComments(source) {
  let out = '';
  let i = 0;
  while (i < source.length) {
    if (source[i] === '/' && source[i + 1] === '/') {
      out += '  ';
      i += 2;
      while (i < source.length && source[i] !== '\n') {
        out += ' ';
        i++;
      }
      continue;
    }
    if (source[i] === '/' && source[i + 1] === '*') {
      out += '  ';
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
        out += source[i] === '\n' ? '\n' : ' ';
        i++;
      }
      if (i < source.length) {
        out += '  ';
        i += 2;
      }
      continue;
    }
    out += source[i];
    i++;
  }
  return out;
}

/** @param {string} text @param {number} index */
function lineCol(text, index) {
  const before = text.slice(0, index);
  const line = before.split('\n').length;
  const col = before.length - before.lastIndexOf('\n');
  return { line, col };
}

/** @param {string} text @param {number} index */
function excerptAt(text, index) {
  const start = text.lastIndexOf('\n', index - 1) + 1;
  let end = text.indexOf('\n', index);
  if (end < 0) end = text.length;
  return text.slice(start, end).trim().slice(0, 120);
}

/**
 * @param {string} abs
 * @param {string} raw
 * @param {Finding[]} fails
 * @param {Finding[]} warns
 */
function scanFile(abs, raw, fails, warns) {
  const rel = toRel(abs);
  const allowed = isAllowlisted(abs);
  const text = stripComments(raw);
  const ext = path.extname(abs);

  /** @param {Finding[]} bucket @param {string} kind @param {number} index */
  const push = (bucket, kind, index) => {
    const { line, col } = lineCol(raw, index);
    bucket.push({ file: rel, line, col, kind, excerpt: excerptAt(raw, index) });
  };

  if (!allowed) {
    // alert( / confirm( — pas window.confirm dans chaînes déjà stripées
    for (const re of [/\balert\s*\(/g, /\bconfirm\s*\(/g]) {
      let m;
      while ((m = re.exec(text)) !== null) {
        // Évite `confirmDialog(`
        if (m[0].startsWith('confirm') && text.slice(m.index, m.index + 13) === 'confirmDialog') {
          continue;
        }
        push(fails, m[0].startsWith('alert') ? 'alert(' : 'confirm(', m.index);
      }
    }

    // Hex dans className=… / style=… (JSX) — pas strokeStyle canvas ni props SVG
    const hexInUi =
      /(?:className|style)\s*=\s*(?:\{[^}]{0,400\}|`[^`]{0,400}`|"[^"]{0,400}"|'[^']{0,400}')/g;
    let hm;
    while ((hm = hexInUi.exec(text)) !== null) {
      if (/#[0-9a-fA-F]{3,8}\b/.test(hm[0])) {
        push(fails, 'hex-in-className/style', hm.index);
      }
    }

    // Fichiers CSS hors allowlist : toute couleur hex
    if (ext === '.css') {
      const cssHex = /#[0-9a-fA-F]{3,8}\b/g;
      let cm;
      while ((cm = cssHex.exec(text)) !== null) {
        push(fails, 'hex-in-css', cm.index);
      }
    }

    // Primitives HTML JSX — warn only (case-sensitive : ignore <Button>/<Input> du kit)
    if (ext === '.tsx' || ext === '.jsx') {
      const prim = /<(button|input|select|textarea)\b/g;
      let pm;
      while ((pm = prim.exec(text)) !== null) {
        push(warns, `<${pm[1]}`, pm.index);
      }
    }
  }
}

function dedupe(findings) {
  const seen = new Set();
  return findings.filter((f) => {
    const k = `${f.file}:${f.line}:${f.kind}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function printGroup(title, findings) {
  console.log(`\n${title} (${findings.length})`);
  if (findings.length === 0) {
    console.log('  (aucun)');
    return;
  }
  const byFile = new Map();
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }
  for (const [file, list] of [...byFile.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  ${file}`);
    for (const f of list.slice(0, 8)) {
      console.log(`    L${f.line}: ${f.kind} — ${f.excerpt}`);
    }
    if (list.length > 8) console.log(`    … +${list.length - 8} autres`);
  }
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.error('ui-guardrails: src/ introuvable');
    process.exit(2);
  }

  const files = [];
  walk(SRC, files);

  /** @type {Finding[]} */
  const fails = [];
  /** @type {Finding[]} */
  const warns = [];

  for (const abs of files) {
    const raw = fs.readFileSync(abs, 'utf8');
    scanFile(abs, raw, fails, warns);
  }

  const failList = dedupe(fails);
  const warnList = dedupe(warns);

  console.log('ImmoPilot UI guardrails (Phase 6)');
  console.log(`Fichiers scannés : ${files.length}`);

  printGroup('FAIL — alert/confirm + hex hors allowlist', failList);
  printGroup('WARN — balises brutes button/input/select/textarea', warnList);

  const warnCounts = {};
  for (const w of warnList) {
    warnCounts[w.kind] = (warnCounts[w.kind] || 0) + 1;
  }
  console.log('\nRésumé WARN :', warnCounts);
  console.log(`Total FAIL : ${failList.length} | Total WARN : ${warnList.length}`);

  if (failList.length > 0) {
    console.error('\nui-guardrails: échec (corriger FAIL ou élargir allowlist à bon escient).');
    process.exit(1);
  }
  console.log('\nui-guardrails: OK (WARN n’échouent pas le check).');
  process.exit(0);
}

main();
