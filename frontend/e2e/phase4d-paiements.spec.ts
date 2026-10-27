import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VIEWPORTS, loginAsSeedAdmin, setTheme } from './helpers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'phase4d');

test.describe('Phase 4d paiements after shots', () => {
  test.beforeAll(() => {
    fs.mkdirSync(outDir, { recursive: true });
  });

  test('paiements desktop + mobile light', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await setTheme(page, 'light');
    await loginAsSeedAdmin(page);
    await page.goto('/paiements?year=all&month=all', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /paiements/i }).first()).toBeVisible({ timeout: 45_000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, 'after-paiements-top-desktop-light.png'), fullPage: false });
    const expandAll = page.getByRole('button', { name: /tout déplier/i });
    if (await expandAll.count()) await expandAll.click();
    else {
      const first = page.locator('[id^="payments-month-head-"]').first();
      if (await first.count()) await first.click();
    }
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, 'after-paiements-desktop-light.png'), fullPage: false });

    const firstRow = page.locator('tr[id^="payment-"]').first();
    if (await firstRow.count()) {
      await firstRow.locator('td').nth(2).click();
      await page.waitForTimeout(900);
      await page.screenshot({ path: path.join(outDir, 'after-paiements-zoom-desktop-light.png'), fullPage: false });
    }

    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/paiements?year=all&month=all', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /paiements/i }).first()).toBeVisible({ timeout: 45_000 });
    await page.waitForTimeout(1000);
    const firstHead = page.locator('[id^="payments-month-head-"]').first();
    if (await firstHead.count()) await firstHead.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, 'after-paiements-mobile-light.png'), fullPage: false });
  });
});
