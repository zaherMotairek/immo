import { test } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loginAsSeedAdmin, settlePage, setTheme, VIEWPORTS } from './helpers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'phase-c34');

test.describe('Phase C3–C4 screenshots', () => {
  test('automation quittance + paiements bulk/import', async ({ page }) => {
    test.setTimeout(120_000);
    fs.mkdirSync(outDir, { recursive: true });
    await loginAsSeedAdmin(page);
    await setTheme(page, 'light');

    for (const [name, vp] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(vp);

      await page.goto('/profil', { waitUntil: 'domcontentloaded' });
      await page.getByRole('tab', { name: /Automation/i }).click();
      await page.getByText('Quittance automatique').waitFor({ timeout: 20_000 });
      await settlePage(page);
      await page.screenshot({
        path: path.join(outDir, `automation-receipt-${name}.png`),
        fullPage: true,
      });

      await page.goto('/paiements', { waitUntil: 'domcontentloaded' });
      await page.getByText('Relevé Mobile Money').waitFor({ timeout: 20_000 });
      await settlePage(page);
      await page.screenshot({
        path: path.join(outDir, `paiements-c4-${name}.png`),
        fullPage: true,
      });
    }
  });
});
