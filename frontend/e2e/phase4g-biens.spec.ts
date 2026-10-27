import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VIEWPORTS, loginAsSeedAdmin, setTheme } from './helpers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'phase4g');

async function firstBuildingHref(page: Page): Promise<string | null> {
  const link = page.locator('a[href^="/biens/"]').first();
  try {
    await link.waitFor({ state: 'attached', timeout: 10_000 });
  } catch {
    return null;
  }
  return link.getAttribute('href');
}

test.describe('Phase 4g biens after shots', () => {
  test.beforeAll(() => {
    fs.mkdirSync(outDir, { recursive: true });
  });

  test('biens + fiche bien desktop + mobile light', async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await setTheme(page, 'light');
    await loginAsSeedAdmin(page);
    await page.goto('/biens', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /biens immobiliers/i }).first()).toBeVisible({ timeout: 45_000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(outDir, 'after-biens-desktop-light.png'), fullPage: false });
    const detailHref = await firstBuildingHref(page);

    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/biens', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /biens immobiliers/i }).first()).toBeVisible({ timeout: 45_000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(outDir, 'after-biens-mobile-light.png'), fullPage: false });

    if (!detailHref) return;

    for (const [name, viewport] of [
      ['desktop', VIEWPORTS.desktop],
      ['mobile', VIEWPORTS.mobile],
    ] as const) {
      await page.setViewportSize(viewport);
      await page.goto(detailHref, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('tab', { name: /organisation/i }).first()).toBeVisible({ timeout: 45_000 });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(outDir, `after-bien-detail-${name}-light.png`), fullPage: false });
      await page.getByRole('tab', { name: /^unités/i }).first().click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(outDir, `after-bien-detail-unites-${name}-light.png`), fullPage: false });
    }
  });
});
