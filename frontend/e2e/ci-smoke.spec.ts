import { test, expect } from '@playwright/test';

/**
 * Smoke CI léger : page login sans API seed.
 * Ne remplace pas les suites Phase 4 / screenshots.
 */
test.describe('CI smoke', () => {
  test('affiche la page de connexion', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });
});
