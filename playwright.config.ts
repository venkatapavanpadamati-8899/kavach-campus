import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: {
    timeout: 8000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'tests/e2e/results.json' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    channel: 'chrome',
    headless: true,
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  // Set PLAYWRIGHT_REUSE_ONLY=1 when a normal host has already started the
  // project server. This is a diagnostic/test-runner mode, not a test skip.
  webServer: process.env.PLAYWRIGHT_REUSE_ONLY
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://127.0.0.1:3000',
        // A developer or an earlier test run may already own the project port.
        // Reuse it when healthy instead of starting a competing dev server.
        reuseExistingServer: true,
        timeout: 120_000,
      },
  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        viewport: { width: 1280, height: 720 },
        channel: 'chrome',
      },
    },
  ],
});
