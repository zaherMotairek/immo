/**
 * Copie les baselines Phase 0 → before-* pour 4h/4i/4j (UI pré-kit figée).
 * Ne touche pas à une base de données.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const e2e = path.resolve(__dirname, '../e2e');
const baselines = path.join(e2e, 'baselines');

const themes = ['light', 'dark'];
const viewports = ['desktop', 'mobile'];

function copy(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (!fs.existsSync(src)) {
    console.warn('MANQUANT', src);
    return false;
  }
  fs.copyFileSync(src, dest);
  console.log('OK', path.relative(e2e, dest));
  return true;
}

function baseline(vp, theme, slug) {
  return path.join(baselines, vp, theme, `${slug}.png`);
}

/** 4h — locations + fiche (+ bail ≈ même baseline détail si pas de shot dédié) */
for (const theme of themes) {
  for (const vp of viewports) {
    const out = path.join(e2e, 'phase4h');
    // Ne pas écraser les before light déjà capturés en vrai avant migration.
    const locDest = path.join(out, `before-locations-${vp}-${theme}.png`);
    if (!(theme === 'light' && fs.existsSync(locDest))) {
      copy(baseline(vp, theme, 'locations'), locDest);
    } else {
      console.log('KEEP', path.relative(e2e, locDest));
    }
    const ficheDest = path.join(out, `before-fiche-${vp}-${theme}.png`);
    if (!(theme === 'light' && fs.existsSync(ficheDest))) {
      copy(baseline(vp, theme, 'location-detail'), ficheDest);
    } else {
      console.log('KEEP', path.relative(e2e, ficheDest));
    }
    const bailDest = path.join(out, `before-fiche-bail-${vp}-${theme}.png`);
    if (!(theme === 'light' && fs.existsSync(bailDest))) {
      copy(baseline(vp, theme, 'location-detail'), bailDest);
    } else {
      console.log('KEEP', path.relative(e2e, bailDest));
    }
  }
}

/** 4i */
const phase4i = [
  ['cautions', 'cautions'],
  // Pas de baseline Phase 0 « charges » séparée → on réutilise cautions (onglet voisin).
  ['charges', 'cautions'],
  ['comptabilite', 'comptabilite'],
  ['activite-loyers', 'activite-loyers'],
];
for (const [slug, baseSlug] of phase4i) {
  for (const theme of themes) {
    for (const vp of viewports) {
      copy(baseline(vp, theme, baseSlug), path.join(e2e, 'phase4i', `before-${slug}-${vp}-${theme}.png`));
    }
  }
}

/** 4j */
const phase4j = ['collecteurs', 'journal-securite', 'exports', 'profil', 'admin'];
for (const slug of phase4j) {
  for (const theme of themes) {
    for (const vp of viewports) {
      copy(baseline(vp, theme, slug), path.join(e2e, 'phase4j', `before-${slug}-${vp}-${theme}.png`));
    }
  }
}

console.log('Befores 4h/4i/4j prêts (baselines Phase 0 + keep light 4h existants).');
