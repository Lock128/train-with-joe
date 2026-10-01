/**
 * Minimal test-user shape for the train-with-joe integration suite.
 *
 * The registration spec generates its own fresh user on every run (a random,
 * plus-addressed email plus a Cognito-policy-compliant password), so this file
 * is intentionally thin. It exists so the UI sign-in helper can take a typed
 * credential object and so future suites can plug in env-driven fixtures.
 */
export interface TestUser {
  email: string;
  password: string;
}
