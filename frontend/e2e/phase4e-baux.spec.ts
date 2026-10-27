import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VIEWPORTS, loginAsSeedAdmin, setTheme } from './helpers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'phase4e');

test.describe('Phase 4e baux after shots', () => {
  test.beforeAll(() => {
    fs.mkdirSync(outDir, { recursive: true });
  });

  test('baux desktop + mobile light', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await setTheme(page, 'light');
    await loginAsSeedAdmin(page);
    await page.goto('/baux', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /baux & locations/i }).first()).toBeVisible({ timeout: 45_000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, 'after-baux-desktop-light.png'), fullPage: false });

    const filtersToggle = page.getByRole('button', { name: /filtres/i }).first();
    if (await filtersToggle.count()) await filtersToggle.click();
    await page.getByRole('button', { name: /enregistrer un nouveau bail/i }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(outDir, 'after-baux-form-desktop-light.png'), fullPage: false });

    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/baux', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /baux & locations/i }).first()).toBeVisible({ timeout: 45_000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, 'after-baux-mobile-light.png'), fullPage: false });
    await page.locator('#liste-des-baux').scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, 'after-baux-liste-mobile-light.png'), fullPage: false });
  });
});
