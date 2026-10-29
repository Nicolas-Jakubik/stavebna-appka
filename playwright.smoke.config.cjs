// Only for isolated GitHub Actions smoke tests.
// This configuration does not access Vercel, Supabase or existing employee data.
const { defineConfig, devices } = require('@playwright/test')

const baseURL = 'http://localhost:3100'
const syntheticPassword = 'ONLY-FAKE-LOCAL-E2E-PASSWORD-2026'

module.exports = defineConfig({
  testDir: './e2e',
  testMatch: '**/*.smoke.spec.cjs',
  timeout: 30000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    ignoreHTTPSErrors: false,
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'android-like-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'iphone-like-webkit', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run start -- --hostname 127.0.0.1 --port 3100',
    url: baseURL + '/admin-prihlasenie',
    timeout: 120000,
    reuseExistingServer: false,
    env: {
      // A synthetic password is set only in this temporary test process.
      ADMIN_PASSWORD: syntheticPassword,
      NEXT_PUBLIC_SUPABASE_URL: '',
      SUPABASE_SERVICE_ROLE_KEY: '',
    },
  },
})
