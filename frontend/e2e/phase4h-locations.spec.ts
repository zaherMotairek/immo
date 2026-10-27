import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VIEWPORTS, loginAsSeedAdmin, setTheme } from './helpers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'phase4h');
/** `before` / `after` : préfixe des captures (PHASE4H_PREFIX=before avant la migration). */
const prefix = process.env.PHASE4H_PREFIX ?? 'after';

async function firstLeaseHref(page: Page): Promise<string | null> {
  const link = page.locator('a[href^="/locations/"]').first();
  try {
    await link.waitFor({ state: 'attached', timeout: 10_000 });
  } catch {
    return null;
  }
  return link.getAttribute('href');
}

test.describe('Phase 4h locations shots', () => {
  test.beforeAll(() => {
    fs.mkdirSync(outDir, { recursive: true });
  });

  test('locations + fiche desktop + mobile light', async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await setTheme(page, 'light');
    await loginAsSeedAdmin(page);
    await page.goto('/locations', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /^locations$/i }).first()).toBeVisible({ timeout: 45_000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(outDir, `${prefix}-locations-desktop-light.png`), fullPage: false });
    const detailHref = await firstLeaseHref(page);

    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/locations', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /^locations$/i }).first()).toBeVisible({ timeout: 45_000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(outDir, `${prefix}-locations-mobile-light.png`), fullPage: false });

    if (!detailHref) return;

    for (const [name, viewport] of [
      ['desktop', VIEWPORTS.desktop],
      ['mobile', VIEWPORTS.mobile],
    ] as const) {
      await page.setViewportSize(viewport);
      await page.goto(detailHref, { waitUntil: 'domcontentloaded' });
      await expect(page.getByText(/fiche location/i).first()).toBeVisible({ timeout: 45_000 });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(outDir, `${prefix}-fiche-${name}-light.png`), fullPage: false });
      await page.getByRole('tab', { name: /contrat/i }).first().click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(outDir, `${prefix}-fiche-bail-${name}-light.png`), fullPage: false });
    }
  });
});
