/**
 * Authentication service for user registration, sign-in, sign-out, and token refresh
 * using AWS Cognito
 */

import type {
  SignUpCommandInput,
  InitiateAuthCommandInput,
  GlobalSignOutCommandInput,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  GlobalSignOutCommand,
  AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export class AuthService {
  private static instance: AuthService;
  private client: CognitoIdentityProviderClient;
  private userPoolId: string;
  private clientId: string;

  private constructor() {
    this.client = new CognitoIdentityProviderClient({});
    this.userPoolId = process.env.USER_POOL_ID || '';
    this.clientId = process.env.USER_POOL_CLIENT_ID || '';

    if (!this.userPoolId || !this.clientId) {
      throw new Error('USER_POOL_ID and USER_POOL_CLIENT_ID environment variables must be set');
    }
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Register a new user with email and password
   * @param input - Registration input containing email, password, and optional name
   * @throws Error with descriptive message if registration fails
   */
  async register(input: RegisterInput): Promise<void> {
    try {
      const params: SignUpCommandInput = {
        ClientId: this.clientId,
        Username: input.email,
        Password: input.password,
        UserAttributes: [
          {
            Name: 'email',
            Value: input.email,
          },
        ],
      };

      if (input.name) {
        params.UserAttributes?.push({
          Name: 'name',
          Value: input.name,
        });
      }

      const command = new SignUpCommand(params);
      await this.client.send(command);
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(`User registration failed: ${err.message || 'Unknown error'}`);
    }
  }

  /**
   * Sign in a user with email and password
   * @param input - Sign-in input containing email and password
   * @returns Authentication tokens
   * @throws Error with descriptive message if sign-in fails
   */
  async signIn(input: SignInInput): Promise<AuthTokens> {
    try {
      const params: InitiateAuthCommandInput = {
        AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
        ClientId: this.clientId,
        AuthParameters: {
          USERNAME: input.email,
          PASSWORD: input.password,
        },
      };

      const command = new InitiateAuthCommand(params);
      const response = await this.client.send(command);

      if (
        !response.AuthenticationResult ||
        !response.AuthenticationResult.AccessToken ||
        !response.AuthenticationResult.RefreshToken ||
        !response.AuthenticationResult.IdToken
      ) {
        throw new Error('Authentication failed: Missing tokens in response');
      }

      return {
        accessToken: response.AuthenticationResult.AccessToken,
        refreshToken: response.AuthenticationResult.RefreshToken,
        idToken: response.AuthenticationResult.IdToken,
        expiresIn: response.AuthenticationResult.ExpiresIn || 3600,
      };
    } catch (error: unknown) {
      const err = error as Error;
      const message = err.message || 'Unknown error';

      // Provide descriptive error messages based on Cognito error types
      if (message.includes('NotAuthorizedException')) {
        throw new Error('Invalid email or password');
      } else if (message.includes('UserNotFoundException')) {
        throw new Error('User not found');
      } else if (message.includes('UserNotConfirmedException')) {
        throw new Error('User email not confirmed');
      } else if (message.includes('PasswordResetRequiredException')) {
        throw new Error('Password reset required');
      } else if (message.includes('TooManyRequestsException')) {
        throw new Error('Too many sign-in attempts, please try again later');
      } else {
        throw new Error(`Sign-in failed: ${message}`);
      }
    }
  }

  /**
   * Sign out a user globally (invalidates all tokens)
   * @param accessToken - The user's access token
   * @throws Error with descriptive message if sign-out fails
   */
  async signOut(accessToken: string): Promise<void> {
    try {
      const params: GlobalSignOutCommandInput = {
        AccessToken: accessToken,
      };

      const command = new GlobalSignOutCommand(params);
      await this.client.send(command);
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(`Sign-out failed: ${err.message || 'Unknown error'}`);
    }
  }

  /**
   * Refresh authentication tokens using a refresh token
   * @param refreshToken - The refresh token
   * @returns New authentication tokens
   * @throws Error with descriptive message if token refresh fails
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const params: InitiateAuthCommandInput = {
        AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
        ClientId: this.clientId,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
      };

      const command = new InitiateAuthCommand(params);
      const response = await this.client.send(command);

      if (
        !response.AuthenticationResult ||
        !response.AuthenticationResult.AccessToken ||
        !response.AuthenticationResult.IdToken
      ) {
        throw new Error('Token refresh failed: Missing tokens in response');
      }

      return {
        accessToken: response.AuthenticationResult.AccessToken,
        refreshToken: refreshToken, // Refresh token is not returned, use the same one
        idToken: response.AuthenticationResult.IdToken,
        expiresIn: response.AuthenticationResult.ExpiresIn || 3600,
      };
    } catch (error: unknown) {
      const err = error as Error;
      const message = err.message || 'Unknown error';

      // Provide descriptive error messages
      if (message.includes('NotAuthorizedException')) {
        throw new Error('Invalid or expired refresh token');
      } else {
        throw new Error(`Token refresh failed: ${message}`);
      }
    }
  }
}
