import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VIEWPORTS, loginAsSeedAdmin, setTheme } from './helpers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'phase4c');

test.describe('Phase 4c dashboard after shots', () => {
  test.beforeAll(() => {
    fs.mkdirSync(outDir, { recursive: true });
  });

  test('dashboard desktop + mobile light', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await setTheme(page, 'light');
    await loginAsSeedAdmin(page);
    await expect(page.getByRole('heading', { name: /tableau de bord/i })).toBeVisible({ timeout: 45_000 });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(outDir, 'after-dashboard-desktop-light.png'),
      fullPage: false,
    });

    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /tableau de bord/i })).toBeVisible({ timeout: 45_000 });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(outDir, 'after-dashboard-mobile-light.png'),
      fullPage: false,
    });
  });
});
