import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

/**
 * Cognito helpers for the train-with-joe registration E2E.
 *
 * Unlike the nexus-share suite, train-with-joe's join_page DOES render an
 * in-page verification code field (`input[name="verificationCode"]` in the
 * home.component.html #register section), so the happy-path spec confirms the
 * account THROUGH THE BROWSER. The ConfirmSignUp / InitiateAuth helpers below
 * are provided for parity and optional programmatic checks; the only one the
 * default spec relies on is the best-effort admin cleanup (`tryAdminDeleteUser`).
 *
 * ConfirmSignUp + InitiateAuth are UNAUTHENTICATED, app-client-scoped calls:
 * they only need COGNITO_CLIENT_ID + AWS_REGION, no AWS credentials. The
 * best-effort admin delete (AdminDeleteUser) DOES require AWS admin credentials
 * and COGNITO_USER_POOL_ID; it is used only by the optional cleanup path.
 */
function getRegion(): string {
  return process.env.AWS_REGION || 'eu-central-1';
}

function getClient(): CognitoIdentityProviderClient {
  return new CognitoIdentityProviderClient({ region: getRegion() });
}

/**
 * Confirm a freshly-registered account using the code emailed by Cognito.
 * Uses the public (no-credentials) ConfirmSignUp API against the app client.
 *
 * NOTE: the train-with-joe spec normally confirms in the browser (there is an
 * in-page code field). This is kept for parity / as a programmatic fallback.
 */
export async function confirmSignUp(email: string, code: string): Promise<void> {
  const clientId = process.env.COGNITO_CLIENT_ID;
  if (!clientId) {
    throw new Error('COGNITO_CLIENT_ID environment variable is required to confirm the account');
  }

  const client = getClient();
  await client.send(
    new ConfirmSignUpCommand({
      ClientId: clientId,
      Username: email,
      ConfirmationCode: code,
    }),
  );
}

/**
 * Verify that the given credentials authenticate against Cognito via the
 * USER_PASSWORD_AUTH flow (requires ALLOW_USER_PASSWORD_AUTH on the app client).
 * Returns the IdToken. Primarily a programmatic double-check; the spec proves
 * login through the real Flutter UI.
 */
export async function initiateAuth(email: string, password: string): Promise<string> {
  const clientId = process.env.COGNITO_CLIENT_ID;
  if (!clientId) {
    throw new Error('COGNITO_CLIENT_ID environment variable is required to authenticate');
  }

  const client = getClient();
  const response = await client.send(
    new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: clientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    }),
  );

  const idToken = response.AuthenticationResult?.IdToken;
  if (!idToken) {
    throw new Error(`No IdToken returned for ${email}: ${JSON.stringify(response)}`);
  }
  return idToken;
}

/**
 * BEST-EFFORT admin cleanup of a test account.
 *
 * CLEANUP LIMITATION: train-with-joe's join_page has NO delete page at all —
 * there is no /delete or /delete-account route and no self-service delete form
 * to drive in the browser (contrast with the places-unlock suite, which drives a
 * real /delete-account form). The backend DOES expose a Mutation.deleteUser
 * resolver, but it is an AUTHENTICATED GraphQL mutation keyed on the signed-in
 * user's Cognito identity (sub + username), not a public surface a test can hit
 * cleanly, and it ultimately performs an admin Cognito AdminDeleteUser anyway.
 *
 * As a fallback this attempts an admin-side Cognito delete, but ONLY when admin
 * AWS credentials and COGNITO_USER_POOL_ID are present in the environment. If
 * they are not configured, it returns false WITHOUT throwing — the caller logs a
 * warning and the test still passes. Cleanup must never fail the suite.
 */
export async function tryAdminDeleteUser(email: string): Promise<boolean> {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const hasAwsCreds = Boolean(
    process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE || process.env.AWS_ROLE_ARN,
  );

  if (!userPoolId || !hasAwsCreds) {
    // No admin surface available — signal "not cleaned up" without failing.
    return false;
  }

  const client = getClient();
  await client.send(
    new AdminDeleteUserCommand({
      UserPoolId: userPoolId,
      Username: email,
    }),
  );
  return true;
}
