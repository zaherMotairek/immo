import { type Page, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@immopilot.local';
export const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'AdminImmo2026!';

export const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 },
} as const;

export type ViewportName = keyof typeof VIEWPORTS;
export type ThemeName = 'light' | 'dark';

/** Routes listées dans App.tsx (hors redirects purs /immeubles → /biens). */
export const STATIC_ROUTES: { path: string; slug: string; auth?: boolean }[] = [
  { path: '/login', slug: 'login', auth: false },
  { path: '/mot-de-passe-oubli', slug: 'forgot-password', auth: false },
  { path: '/reinitialiser-mot-de-passe', slug: 'reset-password', auth: false },
  { path: '/', slug: 'dashboard', auth: true },
  { path: '/locations', slug: 'locations', auth: true },
  { path: '/biens', slug: 'biens', auth: true },
  { path: '/locataires', slug: 'locataires', auth: true },
  { path: '/baux', slug: 'baux', auth: true },
  { path: '/paiements', slug: 'paiements', auth: true },
  { path: '/activite-loyers', slug: 'activite-loyers', auth: true },
  { path: '/cautions', slug: 'cautions', auth: true },
  { path: '/exports', slug: 'exports', auth: true },
  { path: '/comptabilite', slug: 'comptabilite', auth: true },
  { path: '/journal-securite', slug: 'journal-securite', auth: true },
  { path: '/collecteurs', slug: 'collecteurs', auth: true },
  { path: '/profil', slug: 'profil', auth: true },
  { path: '/admin', slug: 'admin', auth: true },
];

export function baselineDir(): string {
  return path.join(__dirname, 'baselines');
}

export function baselinePath(slug: string, viewport: ViewportName, theme: ThemeName): string {
  return path.join(baselineDir(), viewport, theme, `${slug}.png`);
}

export async function ensureBaselineDir(viewport: ViewportName, theme: ThemeName) {
  const dir = path.join(baselineDir(), viewport, theme);
  fs.mkdirSync(dir, { recursive: true });
}

export async function setTheme(page: Page, theme: ThemeName) {
  await page.evaluate((mode) => {
    localStorage.setItem('immopilot-theme', mode);
    const root = document.documentElement;
    root.classList.toggle('dark', mode === 'dark');
    root.style.colorScheme = mode === 'dark' ? 'dark' : 'light';
  }, theme);
}

export async function loginAsSeedAdmin(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('login-email').fill(E2E_ADMIN_EMAIL);
  await page.getByTestId('login-password').fill(E2E_ADMIN_PASSWORD);
  await page.getByTestId('login-submit').click();
  await expect(page.getByRole('main')).toBeVisible({ timeout: 45_000 });
  await expect(page).not.toHaveURL(/\/login/);
}

/** Récupère un id de bien / location depuis les listes (seed démo). */
export async function discoverDetailIds(page: Page): Promise<{ buildingId?: string; locationId?: string }> {
  const out: { buildingId?: string; locationId?: string } = {};

  await page.goto('/biens');
  await page.waitForTimeout(800);
  const buildingHref = await page.locator('a[href^="/biens/"]').first().getAttribute('href').catch(() => null);
  if (buildingHref) {
    const m = buildingHref.match(/\/biens\/([^/?#]+)/);
    if (m?.[1]) out.buildingId = m[1];
  }

  await page.goto('/locations');
  await page.waitForTimeout(800);
  const locHref = await page
    .locator('a[href^="/locations/"]')
    .first()
    .getAttribute('href')
    .catch(() => null);
  if (locHref) {
    const m = locHref.match(/\/locations\/([^/?#]+)/);
    if (m?.[1]) out.locationId = m[1];
  }

  return out;
}

export async function settlePage(page: Page) {
  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  // Évite networkidle (souvent bloqué par polling / SW / requêtes longues).
  await page.waitForTimeout(700);
}

export async function captureBaseline(
  page: Page,
  slug: string,
  viewport: ViewportName,
  theme: ThemeName,
) {
  await ensureBaselineDir(viewport, theme);
  const file = baselinePath(slug, viewport, theme);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}
