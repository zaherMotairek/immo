import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke + baselines visuelles (Phase 0 design system).
 * Prérequis : API locale (seed) + front `npm run preview` ou `webServer` ci-dessous.
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/playwright-report' }]],
  outputDir: 'e2e/test-results',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'off',
    video: 'off',
    locale: 'fr-FR',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : {
        command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
      },
});
