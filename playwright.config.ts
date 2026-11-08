import { defineConfig, devices } from '@playwright/test';

// Browser journeys J1–J7 (PROJECT-STATE.md Acceptance A1–A5) against the built app in `vite preview`,
// never the dev server: the service worker only exists in the build (D53).
// The browser is the laptop's installed Google Chrome (channel 'chrome'), so no browser download is
// needed. On a machine without Chrome, run `npx playwright install chromium` and remove `channel`.
// One worker: J7 builds the app twice and J3 and J7 drive service workers, so one journey at a time is
// steadier on Windows. Every test gets a fresh browser context, so storage never carries over.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173/nigiri/',
    channel: 'chrome',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'phone',
      use: { ...devices['Pixel 7'], channel: 'chrome', viewport: { width: 390, height: 844 } },
    },
    {
      // The desktop layout for the core journey and the themes (J1, J5).
      name: 'desktop',
      testMatch: /j(1|5)-.*\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/nigiri/',
    // Always a fresh build, so the journeys never run against an older one left running.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
