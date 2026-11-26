#!/usr/bin/env node
/**
 * Captures marketing (mobile 390×844, desktop 1440×900, deviceScaleFactor 2).
 * Prérequis : API :4000, front en preview :4173 OU E2E_BASE_URL.
 *
 *   cd backend && npm run start:dev
 *   cd frontend && npm run build && npm run preview -- --host 127.0.0.1 --port 4173
 *   node scripts/capture-marketing-shots.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outRoot = path.join(root, 'docs/marketing/shots');

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173';
const EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@immopilot.local';
const PASS = process.env.E2E_ADMIN_PASSWORD ?? 'AdminImmo2026!';

const VIEWPORTS = {
  mobile: { width: 390, height: 844, deviceScaleFactor: 2 },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 2 },
};

/** Routes principales (sans zone admin plateforme). */
const ROUTES = [
  { slug: 'login', path: '/login', auth: false },
  { slug: 'dashboard', path: '/', auth: true },
  { slug: 'biens', path: '/biens', auth: true },
  { slug: 'locataires', path: '/locataires', auth: true },
  { slug: 'baux', path: '/baux', auth: true },
  { slug: 'paiements', path: '/paiements', auth: true },
  { slug: 'cautions', path: '/cautions', auth: true },
  { slug: 'comptabilite', path: '/comptabilite', auth: true },
  { slug: 'activite-loyers', path: '/activite-loyers', auth: true },
  { slug: 'locations', path: '/locations', auth: true },
  { slug: 'exports', path: '/exports', auth: true },
  { slug: 'collecteurs', path: '/collecteurs', auth: true },
  { slug: 'journal-securite', path: '/journal-securite', auth: true },
  { slug: 'profil', path: '/profil', auth: true },
];

function assertNotLogin(page, file) {
  const url = page.url();
  if (url.includes('/login')) throw new Error(`Capture refusée (page login) : ${file}`);
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('login-email').fill(EMAIL);
  await page.getByTestId('login-password').fill(PASS);
  await page.getByTestId('login-submit').click();
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 45_000 });
}

async function capture(page, vp, slug, scrollY = 0) {
  const dir = path.join(outRoot, vp);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, scrollY ? `${slug}-scroll${scrollY}.png` : `${slug}.png`);
  if (scrollY) await page.evaluate((y) => window.scrollTo(0, y), scrollY);
  await page.waitForTimeout(500);
  await page.screenshot({ path: file, fullPage: false });
  assertNotLogin(page, file);
  console.log('OK', vp, file);
}

async function main() {
  fs.mkdirSync(outRoot, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ locale: 'fr-FR' });
  const page = await context.newPage();

  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await context.clearCookies();
  await page.goto(`${BASE}/login`);
  await page.evaluate(() => localStorage.clear());

  for (const route of ROUTES.filter((r) => r.auth === false)) {
    await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded' });
    await capture(page, vpName, route.slug);
  }

  await login(page);
  for (const route of ROUTES.filter((r) => r.auth === true)) {
    await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded' });
    await capture(page, vpName, route.slug);
    const tall = ['paiements', 'baux', 'comptabilite'];
    if (tall.includes(route.slug)) {
      await capture(page, vpName, route.slug, 480);
    }
  }
  }

  await browser.close();
  console.log('Captures dans', outRoot);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});