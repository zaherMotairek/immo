import { test } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loginAsSeedAdmin, settlePage, setTheme, VIEWPORTS } from './helpers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'phase-c58');

test.describe('Phase C5–C8 screenshots', () => {
  test('accueil aujourd’hui + paiements réf mois', async ({ page }) => {
    test.setTimeout(120_000);
    fs.mkdirSync(outDir, { recursive: true });
    await loginAsSeedAdmin(page);
    await setTheme(page, 'light');

    for (const [name, vp] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(vp);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: /Aujourd/i }).waitFor({ timeout: 25_000 });
      await settlePage(page);
      await page.screenshot({ path: path.join(outDir, `accueil-${name}.png`), fullPage: true });

      await page.goto('/paiements', { waitUntil: 'domcontentloaded' });
      await page.getByText(/Réf\. mois/i).waitFor({ timeout: 25_000 });
      await settlePage(page);
      await page.screenshot({ path: path.join(outDir, `paiements-ref-${name}.png`), fullPage: true });
    }
  });
});
