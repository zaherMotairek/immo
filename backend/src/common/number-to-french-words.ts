/**
 * Conversion d’un entier positif en libellé français (cardinal),
 * pour mentions légales sur quittances (montant en lettres).
 */

const UNITS = ['un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'] as const;

/** 1 … 16 */
function word1to16(n: number): string {
  const w = [
    'un',
    'deux',
    'trois',
    'quatre',
    'cinq',
    'six',
    'sept',
    'huit',
    'neuf',
    'dix',
    'onze',
    'douze',
    'treize',
    'quatorze',
    'quinze',
    'seize',
  ];
  return w[n - 1]!;
}

/** 0 … 99 (0 → chaîne vide pour composition) */
function under100(n: number): string {
  if (n === 0) return '';
  if (n < 17) return word1to16(n);
  if (n < 20) {
    if (n === 17) return 'dix-sept';
    if (n === 18) return 'dix-huit';
    return 'dix-neuf';
  }
  if (n < 70) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    const tens = ['vingt', 'trente', 'quarante', 'cinquante', 'soixante'];
    const base = tens[d - 2]!;
    if (u === 0) return base;
    if (u === 1) return `${base}-et-un`;
    return `${base}-${under100(u)}`;
  }
  if (n < 80) {
    const u = n - 60;
    if (n === 70) return 'soixante-dix';
    if (n === 71) return 'soixante-et-onze';
    return `soixante-${under100(u)}`;
  }
  const u = n - 80;
  if (n === 80) return 'quatre-vingts';
  if (u === 1) return 'quatre-vingt-un';
  return `quatre-vingt-${under100(u)}`;
}

/** 0 … 999 */
function under1000(n: number): string {
  if (n === 0) return '';
  if (n < 100) return under100(n);
  const h = Math.floor(n / 100);
  const r = n % 100;
  let head: string;
  if (h === 1) head = r === 0 ? 'cent' : `cent ${under100(r)}`.trim();
  else head = r === 0 ? `${word1to16(h)} cents` : `${word1to16(h)} cent ${under100(r)}`.trim();
  return head.replace(/\s+/g, ' ');
}

/** 0 … 999_999 */
function under1e6(n: number): string {
  if (n === 0) return '';
  if (n < 1000) return under1000(n);
  const th = Math.floor(n / 1000);
  const r = n % 1000;
  const millePart = th === 1 ? 'mille' : `${under1000(th)} mille`.trim();
  if (r === 0) return millePart;
  return `${millePart} ${under1000(r)}`.trim();
}

/** 0 … 999_999_999 */
function under1e9(n: number): string {
  if (n === 0) return '';
  if (n < 1_000_000) return under1e6(n);
  const m = Math.floor(n / 1_000_000);
  const r = n % 1_000_000;
  const millionPart = m === 1 ? 'un million' : `${under1e6(m)} millions`.trim();
  if (r === 0) return millionPart;
  return `${millionPart} ${under1e6(r)}`.trim();
}

/** 0 … 999_999_999_999 */
function under1e12(n: number): string {
  if (n === 0) return '';
  if (n < 1_000_000_000) return under1e9(n);
  const b = Math.floor(n / 1_000_000_000);
  const r = n % 1_000_000_000;
  const billPart = b === 1 ? 'un milliard' : `${under1e9(b)} milliards`.trim();
  if (r === 0) return billPart;
  return `${billPart} ${under1e9(r)}`.trim();
}

function capitalizeSentence(s: string): string {
  if (!s.length) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Entier ≥ 0 → libellé en français (minuscules, sans « francs »).
 */
export function integerToFrenchWords(n: number): string {
  if (!Number.isFinite(n) || n < 0 || n !== Math.floor(n)) {
    throw new Error('Entier positif attendu pour la conversion en lettres.');
  }
  if (n === 0) return 'zéro';
  return under1e12(n);
}

/**
 * Montant en francs CFA pour quittance : lettres + mention monétaire.
 */
export function amountXofToFrenchWords(n: number): string {
  const rounded = Math.round(Number(n));
  if (rounded === 0) return 'Zéro franc CFA';
  if (rounded === 1) return 'Un franc CFA';
  const w = integerToFrenchWords(rounded);
  const head = capitalizeSentence(w);
  if (/\b(millions?|milliards?)\b/.test(w)) {
    return `${head} de francs CFA`;
  }
  return `${head} francs CFA`;
}
