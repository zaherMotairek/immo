/**
 * Captures Phase 4h / 4i / 4j (après migration).
 * Viewports : mobile 390×844 + desktop 1440×900 ; thèmes clair + sombre.
 *
 * Les « before » manquants sont copiés depuis e2e/baselines (Phase 0) via
 * scripts/copy-phase4hij-befores.mjs — on ne peut plus rejouer l’UI pré-kit.
 */
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  VIEWPORTS,
  loginAsSeedAdmin,
  setTheme,
  settlePage,
  type ThemeName,
  type ViewportName,
} from './helpers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const THEMES: ThemeName[] = ['light', 'dark'];
const VIEWPORT_ENTRIES = [
  ['desktop', VIEWPORTS.desktop],
  ['mobile', VIEWPORTS.mobile],
] as const satisfies ReadonlyArray<readonly [ViewportName, { width: number; height: number }]>;

async function shot(page: Page, dir: string, name: string) {
  fs.mkdirSync(dir, { recursive: true });
  await settlePage(page);
  await page.screenshot({ path: path.join(dir, name), fullPage: false });
}

/** Évite les libellés dupliqués / cachés de la nav latérale. */
async function waitMainReady(page: Page, ready: RegExp) {
  const main = page.locator('main');
  await expect(main).toBeVisible({ timeout: 45_000 });
  await expect(main.getByText(ready).first()).toBeVisible({ timeout: 45_000 });
}

async function firstLeaseHref(page: Page): Promise<string | null> {
  const link = page.locator('a[href^="/locations/"]').first();
  try {
    await link.waitFor({ state: 'attached', timeout: 12_000 });
  } catch {
    return null;
  }
  return link.getAttribute('href');
}

test.describe('Phase 4h–4j after shots', () => {
  test('4h locations + fiche (light/dark × mobile/desktop)', async ({ page }) => {
    test.setTimeout(300_000);
    const outDir = path.join(__dirname, 'phase4h');
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await loginAsSeedAdmin(page);

    let detailHref: string | null = null;

    for (const theme of THEMES) {
      await setTheme(page, theme);
      for (const [vpName, viewport] of VIEWPORT_ENTRIES) {
        await page.setViewportSize(viewport);
        await page.goto('/locations', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { name: /^locations$/i }).first()).toBeVisible({
          timeout: 45_000,
        });
        await shot(page, outDir, `after-locations-${vpName}-${theme}.png`);
        if (!detailHref) detailHref = await firstLeaseHref(page);
      }
    }

    if (!detailHref) return;

    for (const theme of THEMES) {
      await setTheme(page, theme);
      for (const [vpName, viewport] of VIEWPORT_ENTRIES) {
        await page.setViewportSize(viewport);
        await page.goto(detailHref, { waitUntil: 'domcontentloaded' });
        await expect(page.getByText(/fiche location/i).first()).toBeVisible({ timeout: 45_000 });
        await shot(page, outDir, `after-fiche-${vpName}-${theme}.png`);
        const bailTab = page.getByRole('tab', { name: /contrat|bail/i }).first();
        if (await bailTab.count()) {
          await bailTab.click();
          await page.waitForTimeout(500);
          await shot(page, outDir, `after-fiche-bail-${vpName}-${theme}.png`);
        }
      }
    }
  });

  test('4i cautions/charges, compta, calendrier', async ({ page }) => {
    test.setTimeout(300_000);
    const outDir = path.join(__dirname, 'phase4i');
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await loginAsSeedAdmin(page);

    const routes: { path: string; slug: string; ready: RegExp }[] = [
      { path: '/cautions', slug: 'cautions', ready: /Cautions encaiss/i },
      { path: '/cautions?tab=charges', slug: 'charges', ready: /Charges\s*&\s*imp/i },
      { path: '/comptabilite', slug: 'comptabilite', ready: /Mode comptable/i },
      { path: '/activite-loyers', slug: 'activite-loyers', ready: /Activit[eé] loyers/i },
    ];

    for (const theme of THEMES) {
      await setTheme(page, theme);
      for (const [vpName, viewport] of VIEWPORT_ENTRIES) {
        await page.setViewportSize(viewport);
        for (const route of routes) {
          await page.goto(route.path, { waitUntil: 'domcontentloaded' });
          await waitMainReady(page, route.ready);
          await shot(page, outDir, `after-${route.slug}-${vpName}-${theme}.png`);
        }
      }
    }
  });

  test('4j collecteurs, journal, exports, profil, admin', async ({ page }) => {
    test.setTimeout(300_000);
    const outDir = path.join(__dirname, 'phase4j');
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await loginAsSeedAdmin(page);

    const routes: { path: string; slug: string; ready: RegExp }[] = [
      { path: '/collecteurs', slug: 'collecteurs', ready: /collecteur/i },
      { path: '/journal-securite', slug: 'journal-securite', ready: /journal|s[eé]curit/i },
      { path: '/exports', slug: 'exports', ready: /export/i },
      { path: '/profil', slug: 'profil', ready: /profil/i },
      { path: '/admin', slug: 'admin', ready: /admin|client|organisation/i },
    ];

    for (const theme of THEMES) {
      await setTheme(page, theme);
      for (const [vpName, viewport] of VIEWPORT_ENTRIES) {
        await page.setViewportSize(viewport);
        for (const route of routes) {
          await page.goto(route.path, { waitUntil: 'domcontentloaded' });
          await waitMainReady(page, route.ready);
          await shot(page, outDir, `after-${route.slug}-${vpName}-${theme}.png`);
        }
      }
    }
  });
});
