import { test } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loginAsSeedAdmin, settlePage, setTheme, VIEWPORTS } from './helpers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'phase-c12');

test.describe('Phase C1–C2 screenshots', () => {
  test('profil automation + relances (390 + desktop)', async ({ page }) => {
    test.setTimeout(120_000);
    fs.mkdirSync(outDir, { recursive: true });
    await loginAsSeedAdmin(page);
    await setTheme(page, 'light');

    for (const [name, vp] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(vp);
      await page.goto('/profil', { waitUntil: 'domcontentloaded' });
      await settlePage(page);
      await page.getByRole('tab', { name: /Automation/i }).click();
      await page.getByText('Échéances automatiques').waitFor({ timeout: 20_000 });
      await settlePage(page);
      await page.screenshot({
        path: path.join(outDir, `profil-automation-${name}.png`),
        fullPage: true,
      });

      await page.goto('/relances', { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: 'Relances' }).waitFor({ timeout: 20_000 });
      await settlePage(page);
      await page.screenshot({
        path: path.join(outDir, `relances-${name}.png`),
        fullPage: true,
      });
    }
  });
});
