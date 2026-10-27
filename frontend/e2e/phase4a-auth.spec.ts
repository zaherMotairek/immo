import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VIEWPORTS, setTheme } from './helpers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'phase4a');

test.describe('Phase 4a auth after shots', () => {
  test.beforeAll(() => {
    fs.mkdirSync(outDir, { recursive: true });
  });

  test('login / forgot / reset — desktop + mobile light', async ({ page }) => {
    test.setTimeout(90_000);

    for (const vp of ['desktop', 'mobile'] as const) {
      await page.setViewportSize(VIEWPORTS[vp]);
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await setTheme(page, 'light');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('login-email')).toBeVisible({ timeout: 20_000 });
      await page.screenshot({
        path: path.join(outDir, `after-login-${vp}-light.png`),
        fullPage: true,
      });

      await page.goto('/mot-de-passe-oubli', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: /mot de passe oublié/i })).toBeVisible();
      await page.screenshot({
        path: path.join(outDir, `after-forgot-${vp}-light.png`),
        fullPage: true,
      });

      await page.goto('/reinitialiser-mot-de-passe', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: /nouveau mot de passe/i })).toBeVisible();
      await page.screenshot({
        path: path.join(outDir, `after-reset-${vp}-light.png`),
        fullPage: true,
      });
    }
  });
});
