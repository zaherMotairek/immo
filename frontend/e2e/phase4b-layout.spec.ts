import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VIEWPORTS, loginAsSeedAdmin, setTheme } from './helpers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'phase4b');

test.describe('Phase 4b layout after shots', () => {
  test.beforeAll(() => {
    fs.mkdirSync(outDir, { recursive: true });
  });

  test('dashboard layout desktop + mobile (+ Plus)', async ({ page }) => {
    test.setTimeout(120_000);

    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await setTheme(page, 'light');
    await loginAsSeedAdmin(page);
    await expect(page.getByRole('main')).toBeVisible();
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(outDir, 'after-dashboard-desktop-light.png'),
      fullPage: false,
    });

    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(outDir, 'after-dashboard-mobile-light.png'),
      fullPage: false,
    });

    await page.getByRole('button', { name: 'Plus', exact: true }).click();
    await expect(page.getByRole('dialog', { name: /Plus d[’']outils/i })).toBeVisible();
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(outDir, 'after-plus-sheet-mobile-light.png'),
      fullPage: false,
    });
  });
});
