import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const environment = process.env.ENVIRONMENT || 'sandbox';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: environment === 'production' ? 0 : 1,
  workers: 1,
  reporter: [['html', { outputFolder: 'reports/html' }], ['json', { outputFile: 'reports/results.json' }], ['list']],
  use: {
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'ui-tests',
      testDir: './tests/ui',
      testMatch: /.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: getAppBaseUrl(environment),
      },
    },
  ],
});

/**
 * Base URL of the Flutter web app under test (where sign-in happens).
 *
 * IMPORTANT: Train with Joe's join_page `environment.ts` ships the app URL as a
 * `REPLACE_WITH_APP_URL` placeholder that is only substituted at deploy time, so
 * the real app subdomain is NOT knowable from the source tree. The default below
 * (`https://app.trainwithjoe.app`) is a best guess based on the join_page apex
 * (`https://trainwithjoe.app`); the operator MUST confirm the actual deployed
 * app URL and override it via `APP_BASE_URL` if it differs. See the README.
 */
export function getAppBaseUrl(env: string): string {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/+$/, '');
  }
  switch (env) {
    case 'production':
    case 'prod':
      return 'https://app.trainwithjoe.app';
    default:
      return `https://app.${env}.trainwithjoe.app`;
  }
}
