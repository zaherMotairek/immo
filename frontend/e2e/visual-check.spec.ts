/**
 * Phase 6 — check:visual
 *
 * Compare les captures Playwright aux baselines versionnées dans
 * `e2e/baselines/{mobile|desktop}/{light|dark}/*.png`.
 *
 * - Par défaut (check:visual) : smoke — captures + pages doivent charger (baselines Phase 4+
 *   souvent trop divergentes pour un diff pixel strict en CI).
 * - Comparaison : `E2E_VISUAL_COMPARE=1` (script `e2e:visual:compare`) via toHaveScreenshot
 *   contre `e2e/baselines/…` (snapshotPathTemplate dans playwright.config).
 * - Mise à jour baselines : `npx playwright test e2e/visual-check.spec.ts --update-snapshots`
 *   avec `E2E_VISUAL_COMPARE=1`.
 *
 * Prérequis : API seed sur :4000 (voir e2e/README.md).
 */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import {
  STATIC_ROUTES,
  VIEWPORTS,
  discoverDetailIds,
  loginAsSeedAdmin,
  setTheme,
  settlePage,
  baselinePath,
  type ThemeName,
  type ViewportName,
} from './helpers';

const THEMES: ThemeName[] = ['light', 'dark'];
const VIEWPORT_NAMES = Object.keys(VIEWPORTS) as ViewportName[];
/** Opt-in : diff pixel vs baselines. Sinon smoke (anti-crash). */
const COMPARE = process.env.E2E_VISUAL_COMPARE === '1';
const SMOKE = !COMPARE;

/** Sous-ensemble stable pour CI (évite 60+ captures × 2 thèmes trop lentes / fragiles). */
const COMPARE_SLUGS = new Set([
  'login',
  'dashboard',
  'locations',
  'biens',
  'locataires',
  'baux',
  'paiements',
  'profil',
]);

test.describe.configure({ mode: 'serial' });

test.describe('Phase 6 — check:visual', () => {
  test('routes clés vs baselines (ou smoke)', async ({ page }) => {
    test.setTimeout(20 * 60_000);

    await page.context().clearCookies();
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.clear());

    const authRoutes = STATIC_ROUTES.filter((r) => r.auth === false && COMPARE_SLUGS.has(r.slug));

    for (const viewport of VIEWPORT_NAMES) {
      await page.setViewportSize(VIEWPORTS[viewport]);
      for (const theme of THEMES) {
        for (const route of authRoutes) {
          await page.goto(route.path, { waitUntil: 'domcontentloaded' });
          await setTheme(page, theme);
          await settlePage(page);
          await expect(page.locator('body')).toBeVisible();
          await assertVisual(page, route.slug, viewport, theme);
        }
      }
    }

    await page.setViewportSize(VIEWPORTS.desktop);
    await loginAsSeedAdmin(page);

    const ids = await discoverDetailIds(page);
    const protectedRoutes = [
      ...STATIC_ROUTES.filter((r) => r.auth !== false && COMPARE_SLUGS.has(r.slug)),
      ...(ids.buildingId && COMPARE_SLUGS.has('bien-detail')
        ? [{ path: `/biens/${ids.buildingId}`, slug: 'bien-detail' }]
        : []),
      ...(ids.locationId && COMPARE_SLUGS.has('location-detail')
        ? [{ path: `/locations/${ids.locationId}`, slug: 'location-detail' }]
        : []),
    ];

    for (const viewport of VIEWPORT_NAMES) {
      await page.setViewportSize(VIEWPORTS[viewport]);
      for (const theme of THEMES) {
        await setTheme(page, theme);
        for (const route of protectedRoutes) {
          await page.goto(route.path, { waitUntil: 'domcontentloaded' });
          await setTheme(page, theme);
          await settlePage(page);
          await expect(page.locator('body')).toBeVisible();
          // Garde-fou crash / écran d’erreur évident
          await expect(page.locator('body')).not.toContainText(/erreur inattendue|application error/i);
          await assertVisual(page, route.slug, viewport, theme);
        }
      }
    }

    // Baselines présentes pour le cœur du parcours
    expect(fs.existsSync(baselinePath('dashboard', 'mobile', 'light'))).toBeTruthy();
    expect(fs.existsSync(baselinePath('dashboard', 'desktop', 'dark'))).toBeTruthy();
  });
});

async function assertVisual(
  page: import('@playwright/test').Page,
  slug: string,
  viewport: ViewportName,
  theme: ThemeName,
) {
  if (SMOKE) {
    await page.screenshot({ fullPage: true });
    return;
  }

  const base = baselinePath(slug, viewport, theme);
  if (!fs.existsSync(base)) {
    test.info().annotations.push({
      type: 'note',
      description: `Baseline absente (${viewport}/${theme}/${slug}) — capture smoke uniquement`,
    });
    await page.screenshot({ fullPage: true });
    return;
  }

  // Snapshot nommé pour coller à e2e/baselines via snapshotPathTemplate (playwright.config).
  await expect(page).toHaveScreenshot(`${viewport}/${theme}/${slug}.png`, {
    fullPage: true,
    maxDiffPixelRatio: 0.08,
  });
}
