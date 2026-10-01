import { test, expect } from '@playwright/test';
import { getConfirmationCode } from '../../helpers/interactive-code';
import { tryAdminDeleteUser } from '../../helpers/auth';
import { signInViaUI } from '../../helpers/ui-auth';

/**
 * Registration -> Verification -> Login E2E (@ui @registration)
 *
 * Full happy-path signup against a REAL environment for Train with Joe. It
 * verifies the exact flow a new user goes through and, critically, that a
 * freshly registered + confirmed user can immediately sign in to the Flutter
 * app.
 *
 * Steps:
 *   1. Open the join_page HOME page and scroll to the #register section.
 *   2. Fill email + password + confirm password and submit.
 *   3. Fail fast if SignUp hangs: the submit button must leave its submitting
 *      state.
 *   4. The verification step appears in-page: enter the emailed code and verify.
 *   5. The join_page redirects to `${appUrl}/signin?email=..&registered=true`.
 *   6. Sign in to the Flutter app with the same credentials and assert landing
 *      on /home.
 *
 * DIVERGENCE FROM THE pegasus-galaxy REFERENCE — inline, no /register route:
 *   Train with Joe's join_page has NO dedicated `/register` route. Registration
 *   is an INLINE two-step form inside the home page, in `section#register`
 *   (home.component.html / home.component.ts). We reach it by loading the home
 *   page and scrolling `#register` into view. The step state is
 *   `step: 'register' | 'verify'`; the verify form (with
 *   `input[name="verificationCode"]`) replaces the register form in-page after a
 *   successful SignUp.
 *
 * SELECTOR STRATEGY — resilient to EN/DE:
 *   The form inputs have NO stable element ids and their visible labels /
 *   placeholders are i18n-driven (home.component toggles between English and
 *   German). To stay resilient to the active language we deliberately target the
 *   fields STRUCTURALLY by role / input type / position rather than by exact
 *   visible text:
 *     - email            -> input[type="email"] (autocomplete="email")
 *     - password         -> first  input[type="password"] (autocomplete new-password)
 *     - confirmPassword  -> second input[type="password"]
 *     - submit / verify  -> the primary form button (the only submit button in
 *                           the active step), not matched by its EN/DE text
 *     - verification code -> input[name="verificationCode"] (stable name attr)
 *   We also assert the submit button leaves its disabled/submitting state rather
 *   than matching the "Submitting..." / "Wird gesendet..." label text.
 *
 * CLEANUP LIMITATION — no join_page delete surface:
 *   Train with Joe's join_page has NO delete page at all (no /delete,
 *   /delete-account, or in-page delete form), so the user's intended
 *   "cleanup via the join_page /delete option" CANNOT be performed here (unlike
 *   places-unlock, which has a real /delete-account form). The backend exposes
 *   a Mutation.deleteUser resolver, but it is an authenticated GraphQL mutation
 *   keyed on the signed-in Cognito identity, not a public surface. The afterEach
 *   below therefore performs a BEST-EFFORT admin Cognito delete ONLY if admin
 *   AWS credentials + COGNITO_USER_POOL_ID are provided; otherwise it logs a
 *   WARNING that the account must be cleaned up manually. Cleanup never fails the
 *   test. See the README for details.
 *
 * This test is INTERACTIVE by design and hits production email, so it is NOT
 * part of any default CI run. Run it explicitly, headed:
 *
 *   cd integration-tests
 *   ENVIRONMENT=production npx playwright test tests/ui/registration.spec.ts \
 *     --project=ui-tests --headed
 *
 * Optional env overrides:
 *   REGISTER_URL        Full URL of the join_page home page carrying the inline
 *                       register form (default derived from ENVIRONMENT, e.g.
 *                       https://trainwithjoe.app/)
 *   APP_BASE_URL        App base used by the ui-tests project for /signin. The
 *                       real app subdomain is a DEPLOY-TIME value (environment.ts
 *                       ships a REPLACE_WITH_APP_URL placeholder) — confirm it and
 *                       set this if the default (https://app.trainwithjoe.app) is
 *                       wrong.
 *   CONFIRMATION_CODE   Skip the interactive stdin prompt and use this code
 *   REGISTRATION_EMAIL  Force a specific email instead of a random one
 *   COGNITO_USER_POOL_ID  Enables best-effort admin cleanup (with AWS creds)
 *   AWS_REGION          Cognito region (default eu-central-1)
 */

function getRegisterUrl(): string {
  if (process.env.REGISTER_URL) {
    return process.env.REGISTER_URL;
  }
  const env = process.env.ENVIRONMENT || 'sandbox';
  // The register form is inline on the join_page HOME page (apex domain), not a
  // /register route. We load the home page and scroll to #register.
  const base = env === 'production' || env === 'prod' ? 'https://trainwithjoe.app' : `https://${env}.trainwithjoe.app`;
  return `${base}/`;
}

/** Random, plus-addressed email so every run is a fresh account in one inbox. */
function randomEmail(): string {
  if (process.env.REGISTRATION_EMAIL) {
    return process.env.REGISTRATION_EMAIL;
  }
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `lockhead+${suffix}@lockhead.info`;
}

test.describe('Registration -> Login Flow @ui @registration', () => {
  // Interactive: allow plenty of time to fetch the code from the inbox.
  test.setTimeout(360_000);

  // Track the account we created so cleanup runs even if signup fails partway.
  let registeredEmail = '';

  test('a newly registered user can confirm and immediately log in', async ({ page }) => {
    const email = randomEmail();
    registeredEmail = email;
    // Meets the Cognito pool policy: >=8 chars, upper, lower, digit, symbol.
    const password = `Test-${Math.random().toString(36).slice(2, 10)}A9!`;

    console.log(`\n[registration] Registering ${email} (password: ${password})`);

    // --- Step 1: open the join_page home page and reveal the inline form ---
    await page.goto(getRegisterUrl());
    await page.waitForLoadState('networkidle');

    // Registration is an inline section on the home page; scroll it into view.
    const registerSection = page.locator('#register');
    await registerSection.scrollIntoViewIfNeeded();

    // --- Step 2: fill and submit the registration form ---
    // Inputs have no stable ids and are i18n/placeholder-driven, so target them
    // STRUCTURALLY (see the SELECTOR STRATEGY note in the file header).
    const emailInput = registerSection.locator('input[type="email"]');
    const passwordInputs = registerSection.locator('input[type="password"]');
    await expect(emailInput).toBeVisible({ timeout: 15_000 });

    await emailInput.fill(email);
    // Two password fields in document order: password, then confirmPassword.
    await passwordInputs.nth(0).fill(password);
    await passwordInputs.nth(1).fill(password);

    // The primary (and only) submit button of the register step.
    const submitButton = registerSection.getByRole('button').first();
    await submitButton.click();

    // Fail fast if SignUp hangs: the submit button must leave its submitting
    // state. We check the button becomes re-enabled (home.component.ts sets
    // `isLoading = false` once SignUp resolves) rather than matching the
    // EN/DE "Submitting..." label, so the assertion is language-agnostic. If
    // SignUp hangs this trips well before the verify step and points straight at
    // the regression.
    await expect(submitButton).toBeEnabled({ timeout: 25_000 });

    // --- Step 3: the in-page verification step appears ---
    // On a successful SignUp, home.component.ts flips step -> 'verify', which
    // swaps in a form containing the (stably named) verification code input.
    const codeInput = page.locator('input[name="verificationCode"]');
    await expect(codeInput).toBeVisible({ timeout: 15_000 });

    // --- Step 4: obtain the emailed code (stdin prompt or CONFIRMATION_CODE) ---
    const code = await getConfirmationCode(email);
    await codeInput.fill(code);

    // The verify step's primary button. Again matched structurally (the only
    // submit button on the verify form) rather than by its EN/DE text.
    const verifyButton = page.locator('#register').getByRole('button').first();
    await verifyButton.click();

    console.log('[registration] Code submitted. Awaiting redirect to the app /signin.');

    // --- Step 5: on success the join_page redirects to the app sign-in ---
    // home.component.ts navigates to `${appUrl}/signin?email=..&registered=true`.
    await page.waitForURL(/\/signin(\?|$)/, { timeout: 30_000 });

    console.log('[registration] Redirected to app sign-in. Proceeding to login.');

    // --- Step 6: sign in to the app with the new credentials ---
    // Clear any session state carried over from the join-page redirect so this
    // is a genuine cold login, proving the fresh account can authenticate.
    await page.context().clearCookies();
    await page.evaluate(() => {
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
      } catch {
        /* storage may be unavailable pre-load; ignore */
      }
    });

    // signInViaUI re-navigates to /signin (only the email is prefilled by the
    // redirect; it fills email + password and clicks "Sign In").
    await signInViaUI(page, { email, password });

    // The whole point of the test: a just-registered user lands on /home
    // (signin_screen.dart calls context.go('/home')).
    await expect(page).toHaveURL(/\/home/, { timeout: 45_000 });

    console.log(`[registration] SUCCESS — ${email} registered, confirmed, and logged in.`);
  });

  /**
   * Cleanup — BEST EFFORT ONLY. See the file header for the full explanation.
   *
   * train-with-joe has NO join_page delete surface (no /delete route and no
   * in-page delete form), so unlike the places-unlock suite we cannot drive a
   * /delete form in the browser. We attempt an admin Cognito delete only if
   * admin credentials + COGNITO_USER_POOL_ID are configured; otherwise we log a
   * WARNING instructing manual cleanup. This step never fails the test.
   */
  test.afterEach(async () => {
    if (!registeredEmail) {
      console.log('[cleanup] No account was registered; nothing to clean up.');
      return;
    }

    const email = registeredEmail;
    registeredEmail = '';

    try {
      const deleted = await tryAdminDeleteUser(email);
      if (deleted) {
        console.log(`[cleanup] Admin-deleted Cognito user ${email}.`);
      } else {
        console.warn(
          `[cleanup] WARNING: no automated cleanup available for ${email}. ` +
            'train-with-joe has NO join_page /delete surface (no /delete route and no in-page ' +
            'delete form), so the account cannot be removed through the browser. ' +
            'Provide admin AWS credentials + COGNITO_USER_POOL_ID to enable the best-effort ' +
            'Cognito AdminDeleteUser fallback, or delete this test account MANUALLY.',
        );
      }
    } catch (err) {
      // Cleanup is best-effort: never fail the suite on a cleanup problem.
      console.warn(`[cleanup] Best-effort delete failed for ${email}: ${String(err)}`);
    }
  });
});
