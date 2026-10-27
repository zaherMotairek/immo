/**
 * Phase 2 — captures Option A / B (page /design + Dashboard).
 * Nécessite le serveur **dev** Vite (import.meta.env.DEV) : E2E_BASE_URL=http://127.0.0.1:5173
 */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VIEWPORTS, loginAsSeedAdmin, setTheme } from './helpers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'phase2-options');

test.describe('Phase 2 design options', () => {
  test.beforeAll(() => {
    fs.mkdirSync(outDir, { recursive: true });
  });

  test('captures A/B design + dashboard (desktop light)', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/design', { waitUntil: 'domcontentloaded' });
    await setTheme(page, 'light');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('design-system-page')).toBeVisible({ timeout: 30_000 });

    for (const opt of ['a', 'b'] as const) {
      await page.getByTestId(`ds-option-${opt}`).click();
      await page.waitForTimeout(400);
      await page.screenshot({
        path: path.join(outDir, `design-option-${opt}-desktop-light.png`),
        fullPage: true,
      });
    }

    await loginAsSeedAdmin(page);

    for (const opt of ['a', 'b'] as const) {
      await page.goto(`/?ds=${opt}`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('main')).toBeVisible({ timeout: 45_000 });
      await page.waitForTimeout(800);
      await page.screenshot({
        path: path.join(outDir, `dashboard-option-${opt}-desktop-light.png`),
        fullPage: false,
      });
    }

    // Mobile design page (option B representative + A)
    await page.setViewportSize(VIEWPORTS.mobile);
    for (const opt of ['a', 'b'] as const) {
      await page.goto('/design', { waitUntil: 'domcontentloaded' });
      await page.getByTestId(`ds-option-${opt}`).click();
      await page.waitForTimeout(400);
      await page.screenshot({
        path: path.join(outDir, `design-option-${opt}-mobile-light.png`),
        fullPage: true,
      });
    }
  });
});
