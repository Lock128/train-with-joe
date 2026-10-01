import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import type { TestUser } from './test-users';

/**
 * Performs browser-based sign-in via the Flutter web app's /signin page.
 *
 * The app's sign-in screen (frontend/src/lib/screens/signin_screen.dart) accepts
 * an `initialEmail` and a `showRegisteredBanner` flag, which the join_page passes
 * through the redirect `${appUrl}/signin?email=<email>&registered=true`. It
 * renders Material text fields labelled 'Email' and 'Password' and a 'Sign In'
 * button; on success it calls `context.go('/home')`.
 *
 * We navigate to `/signin` ourselves (optionally carrying the email as a query
 * param) and fill the credentials. The sign-in base URL defaults from the
 * ui-tests project baseURL and is overridable via APP_BASE_URL (see
 * playwright.config.ts), because the real app subdomain is a deploy-time value
 * (environment.ts ships a REPLACE_WITH_APP_URL placeholder).
 *
 * Selector strategy: we prefer role + input-type selectors (textbox named
 * /email/i, input[type=password], button /sign in/i) over exact visible text so
 * the helper stays resilient to small UI/label changes.
 */
export async function signInViaUI(page: Page, user: TestUser): Promise<void> {
  await page.goto(`/signin?email=${encodeURIComponent(user.email)}`);
  await page.waitForLoadState('networkidle');

  // Flutter web renders Material text fields — locate by label text / input type.
  const emailInput = page.getByRole('textbox', { name: /email/i });
  const passwordInput = page.locator('input[type="password"]');

  await emailInput.fill(user.email);
  await passwordInput.fill(user.password);

  await page.getByRole('button', { name: /sign in/i }).click();

  // The whole point of the test: a just-registered user lands on /home and is
  // no longer on the sign-in screen.
  await page.waitForURL('**/home', { timeout: 45_000 });
  await expect(page).not.toHaveURL(/\/signin/);
}

/**
 * Verifies the user is logged in by checking the current URL is not /signin.
 */
export async function assertLoggedIn(page: Page): Promise<void> {
  await expect(page).not.toHaveURL(/\/signin/);
}
