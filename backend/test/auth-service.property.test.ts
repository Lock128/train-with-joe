import { describe, test, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { AuthService } from '../src/services/auth-service';
import { mockClient } from 'aws-sdk-client-mock';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  GlobalSignOutCommand,
  AdminGetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

/**
 * Property-Based Tests for Authentication Service
 * Feature: train-with-joe
 */

const cognitoMock = mockClient(CognitoIdentityProviderClient);

describe('Authentication Service Property Tests', () => {
  beforeEach(() => {
    cognitoMock.reset();
    // Set required environment variables
    process.env.USER_POOL_ID = 'us-east-1_TEST123456';
    process.env.USER_POOL_CLIENT_ID = 'test-client-id-123456';
  });

  /**
   * Property 3: User Registration Creates Cognito Account
   * **Validates: Requirements 3.4**
   */
  test('Property 3: User registration creates Cognito account', { timeout: 60000 }, async () => {
    const registrationDataArbitrary = fc.record({
      email: fc.emailAddress(),
      password: fc
        .string({ minLength: 8, maxLength: 20 })
        .filter((pwd) => /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /[0-9]/.test(pwd)),
      name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    });

    await fc.assert(
      fc.asyncProperty(registrationDataArbitrary, async (registrationData) => {
        const authService = AuthService.getInstance();

        // Mock successful registration
        cognitoMock.on(SignUpCommand).resolves({
          UserConfirmed: false,
          UserSub: fc.sample(fc.uuid(), 1)[0],
        });

        // Mock user retrieval to verify account was created
        cognitoMock.on(AdminGetUserCommand).resolves({
          Username: registrationData.email,
          UserAttributes: [
            { Name: 'email', Value: registrationData.email },
            { Name: 'email_verified', Value: 'false' },
          ],
        });

        // Register user
        await authService.register(registrationData);

        // Verify SignUpCommand was called with correct parameters
        const signUpCalls = cognitoMock.commandCalls(SignUpCommand);
        expect(signUpCalls.length).toBeGreaterThan(0);

        const lastCall = signUpCalls[signUpCalls.length - 1];
        expect(lastCall.args[0].input.Username).toBe(registrationData.email);
        expect(lastCall.args[0].input.Password).toBe(registrationData.password);

        // Verify email attribute is set
        const emailAttr = lastCall.args[0].input.UserAttributes?.find((attr) => attr.Name === 'email');
        expect(emailAttr).toBeDefined();
        expect(emailAttr?.Value).toBe(registrationData.email);

        // Verify name attribute if provided
        if (registrationData.name) {
          const nameAttr = lastCall.args[0].input.UserAttributes?.find((attr) => attr.Name === 'name');
          expect(nameAttr).toBeDefined();
          expect(nameAttr?.Value).toBe(registrationData.name);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4: Successful Sign-In Returns Tokens
   * **Validates: Requirements 3.5**
   */
  test('Property 4: Successful sign-in returns tokens', { timeout: 60000 }, async () => {
    const signInDataArbitrary = fc.record({
      email: fc.emailAddress(),
      password: fc.string({ minLength: 8, maxLength: 20 }),
    });

    const tokenArbitrary = fc.string({ minLength: 100, maxLength: 500 });

    await fc.assert(
      fc.asyncProperty(
        signInDataArbitrary,
        tokenArbitrary,
        tokenArbitrary,
        tokenArbitrary,
        async (signInData, accessToken, refreshToken, idToken) => {
          const authService = AuthService.getInstance();

          // Mock successful sign-in with tokens
          cognitoMock.on(InitiateAuthCommand).resolves({
            AuthenticationResult: {
              AccessToken: accessToken,
              RefreshToken: refreshToken,
              IdToken: idToken,
              ExpiresIn: 3600,
            },
          });

          // Sign in user
          const tokens = await authService.signIn(signInData);

          // Verify all required tokens are returned
          expect(tokens).toBeDefined();
          expect(tokens.accessToken).toBeDefined();
          expect(tokens.refreshToken).toBeDefined();
          expect(tokens.idToken).toBeDefined();
          expect(tokens.expiresIn).toBeDefined();

          // Verify tokens are non-empty strings
          expect(typeof tokens.accessToken).toBe('string');
          expect(typeof tokens.refreshToken).toBe('string');
          expect(typeof tokens.idToken).toBe('string');
          expect(tokens.accessToken.length).toBeGreaterThan(0);
          expect(tokens.refreshToken.length).toBeGreaterThan(0);
          expect(tokens.idToken.length).toBeGreaterThan(0);

          // Verify tokens match what was returned by Cognito
          expect(tokens.accessToken).toBe(accessToken);
          expect(tokens.refreshToken).toBe(refreshToken);
          expect(tokens.idToken).toBe(idToken);
          expect(tokens.expiresIn).toBe(3600);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5: Authentication Failure Returns Descriptive Errors
   * **Validates: Requirements 3.7**
   */
  test('Property 5: Authentication failure returns descriptive errors', { timeout: 60000 }, async () => {
    const errorScenarios = fc.constantFrom(
      { type: 'NotAuthorizedException', expectedMessage: 'Invalid email or password' },
      { type: 'UserNotFoundException', expectedMessage: 'User not found' },
      { type: 'UserNotConfirmedException', expectedMessage: 'User email not confirmed' },
      { type: 'PasswordResetRequiredException', expectedMessage: 'Password reset required' },
      { type: 'TooManyRequestsException', expectedMessage: 'Too many sign-in attempts' },
    );

    const signInDataArbitrary = fc.record({
      email: fc.emailAddress(),
      password: fc.string({ minLength: 8, maxLength: 20 }),
    });

    await fc.assert(
      fc.asyncProperty(errorScenarios, signInDataArbitrary, async (errorScenario, signInData) => {
        const authService = AuthService.getInstance();

        // Mock authentication failure
        cognitoMock.on(InitiateAuthCommand).rejects({
          name: errorScenario.type,
          message: `Cognito error: ${errorScenario.type}`,
        });

        try {
          await authService.signIn(signInData);
          // Should not reach here
          expect(true).toBe(false);
        } catch (error: any) {
          // Verify error has descriptive message
          expect(error).toBeDefined();
          expect(error.message).toBeDefined();
          expect(typeof error.message).toBe('string');
          expect(error.message.length).toBeGreaterThan(5);

          // Verify error message contains expected description
          expect(error.message.toLowerCase()).toContain(errorScenario.expectedMessage.toLowerCase().split(' ')[0]);
        }
      }),
      { numRuns: 100 },
    );
  });

  test('Property 5: Registration failure returns descriptive errors', { timeout: 60000 }, async () => {
    const errorScenarios = fc.constantFrom(
      'UsernameExistsException',
      'InvalidPasswordException',
      'InvalidParameterException',
      'TooManyRequestsException',
    );

    const registrationDataArbitrary = fc.record({
      email: fc.emailAddress(),
      password: fc.string({ minLength: 8, maxLength: 20 }),
    });

    await fc.assert(
      fc.asyncProperty(errorScenarios, registrationDataArbitrary, async (errorType, registrationData) => {
        const authService = AuthService.getInstance();

        // Mock registration failure
        cognitoMock.on(SignUpCommand).rejects({
          name: errorType,
          message: `Cognito error: ${errorType}`,
        });

        try {
          await authService.register(registrationData);
          // Should not reach here
          expect(true).toBe(false);
        } catch (error: any) {
          // Verify error has descriptive message
          expect(error).toBeDefined();
          expect(error.message).toBeDefined();
          expect(typeof error.message).toBe('string');
          expect(error.message.length).toBeGreaterThan(5);

          // Verify error message indicates registration failure
          expect(error.message.toLowerCase()).toMatch(/registration failed|failed/);
        }
      }),
      { numRuns: 100 },
    );
  });

  test('Property 5: Sign-out failure returns descriptive errors', { timeout: 60000 }, async () => {
    const errorScenarios = fc.constantFrom(
      'NotAuthorizedException',
      'InvalidParameterException',
      'TooManyRequestsException',
    );

    const accessTokenArbitrary = fc.string({ minLength: 100, maxLength: 500 });

    await fc.assert(
      fc.asyncProperty(errorScenarios, accessTokenArbitrary, async (errorType, accessToken) => {
        const authService = AuthService.getInstance();

        // Mock sign-out failure
        cognitoMock.on(GlobalSignOutCommand).rejects({
          name: errorType,
          message: `Cognito error: ${errorType}`,
        });

        try {
          await authService.signOut(accessToken);
          // Should not reach here
          expect(true).toBe(false);
        } catch (error: any) {
          // Verify error has descriptive message
          expect(error).toBeDefined();
          expect(error.message).toBeDefined();
          expect(typeof error.message).toBe('string');
          expect(error.message.length).toBeGreaterThan(5);

          // Verify error message indicates sign-out failure
          expect(error.message.toLowerCase()).toMatch(/sign-out failed|failed/);
        }
      }),
      { numRuns: 100 },
    );
  });

  test('Property 5: Token refresh failure returns descriptive errors', { timeout: 60000 }, async () => {
    const errorScenarios = fc.constantFrom(
      { type: 'NotAuthorizedException', expectedMessage: 'Invalid or expired refresh token' },
      { type: 'InvalidParameterException', expectedMessage: 'Token refresh failed' },
      { type: 'TooManyRequestsException', expectedMessage: 'Token refresh failed' },
    );

    const refreshTokenArbitrary = fc.string({ minLength: 100, maxLength: 500 });

    await fc.assert(
      fc.asyncProperty(errorScenarios, refreshTokenArbitrary, async (errorScenario, refreshToken) => {
        const authService = AuthService.getInstance();

        // Mock token refresh failure
        cognitoMock.on(InitiateAuthCommand).rejects({
          name: errorScenario.type,
          message: `Cognito error: ${errorScenario.type}`,
        });

        try {
          await authService.refreshTokens(refreshToken);
          // Should not reach here
          expect(true).toBe(false);
        } catch (error: any) {
          // Verify error has descriptive message
          expect(error).toBeDefined();
          expect(error.message).toBeDefined();
          expect(typeof error.message).toBe('string');
          expect(error.message.length).toBeGreaterThan(5);

          // Verify error message contains expected description
          if (errorScenario.type === 'NotAuthorizedException') {
            expect(error.message.toLowerCase()).toContain('invalid');
          } else {
            expect(error.message.toLowerCase()).toMatch(/token refresh failed|failed/);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
