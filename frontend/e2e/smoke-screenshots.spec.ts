import { test, expect } from '@playwright/test';
import {
  STATIC_ROUTES,
  VIEWPORTS,
  discoverDetailIds,
  loginAsSeedAdmin,
  setTheme,
  settlePage,
  captureBaseline,
  type ThemeName,
  type ViewportName,
} from './helpers';

const THEMES: ThemeName[] = ['light', 'dark'];
const VIEWPORT_NAMES = Object.keys(VIEWPORTS) as ViewportName[];

test.describe.configure({ mode: 'serial' });

test.describe('Phase 0 — smoke + baselines', () => {
  test('login, parcourt les routes, captures mobile/desktop × clair/sombre', async ({ page }) => {
    test.setTimeout(25 * 60_000);

    // Pages auth (sans session)
    await page.context().clearCookies();
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.clear());

    for (const viewport of VIEWPORT_NAMES) {
      for (const theme of THEMES) {
        await page.setViewportSize(VIEWPORTS[viewport]);
        for (const route of [
          { path: '/login', slug: 'login' },
          { path: '/mot-de-passe-oubli', slug: 'forgot-password' },
          { path: '/reinitialiser-mot-de-passe', slug: 'reset-password' },
        ]) {
          await page.goto(route.path, { waitUntil: 'domcontentloaded' });
          await setTheme(page, theme);
          await settlePage(page);
          console.log(`capture ${viewport}/${theme}/${route.slug}`);
          await captureBaseline(page, route.slug, viewport, theme);
        }
      }
    }

    await page.setViewportSize(VIEWPORTS.desktop);
    await loginAsSeedAdmin(page);
    console.log('login ok', page.url());

    const ids = await discoverDetailIds(page);
    console.log('detail ids', ids);
    const protectedRoutes = [
      ...STATIC_ROUTES.filter((r) => r.auth !== false),
      ...(ids.buildingId ? [{ path: `/biens/${ids.buildingId}`, slug: 'bien-detail', auth: true as const }] : []),
      ...(ids.locationId
        ? [{ path: `/locations/${ids.locationId}`, slug: 'location-detail', auth: true as const }]
        : []),
    ];

    for (const viewport of VIEWPORT_NAMES) {
      for (const theme of THEMES) {
        await page.setViewportSize(VIEWPORTS[viewport]);
        await setTheme(page, theme);
        for (const route of protectedRoutes) {
          await page.goto(route.path, { waitUntil: 'domcontentloaded' });
          await setTheme(page, theme);
          await settlePage(page);
          await expect(page.locator('body')).toBeVisible();
          console.log(`capture ${viewport}/${theme}/${route.slug}`);
          await captureBaseline(page, route.slug, viewport, theme);
        }
      }
    }

    const fs = await import('node:fs');
    const { baselinePath } = await import('./helpers');
    expect(fs.existsSync(baselinePath('dashboard', 'mobile', 'light'))).toBeTruthy();
    expect(fs.existsSync(baselinePath('dashboard', 'desktop', 'dark'))).toBeTruthy();
  });
});
