import { Injectable } from '@angular/core';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider';
import { environment } from '../../environments/environment';

export interface AuthTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private client: CognitoIdentityProviderClient;
  private clientId = environment.cognito.userPoolClientId;

  constructor() {
    this.client = new CognitoIdentityProviderClient({
      region: environment.cognito.region,
    });
  }

  async signUp(email: string, password: string): Promise<boolean> {
    const command = new SignUpCommand({
      ClientId: this.clientId,
      Username: email,
      Password: password,
      UserAttributes: [{ Name: 'email', Value: email }],
    });
    const response = await this.client.send(command);
    return response.UserConfirmed ?? false;
  }

  async confirmSignUp(email: string, code: string): Promise<void> {
    const command = new ConfirmSignUpCommand({
      ClientId: this.clientId,
      Username: email,
      ConfirmationCode: code,
    });
    await this.client.send(command);
  }

  async signIn(email: string, password: string): Promise<AuthTokens> {
    const command = new InitiateAuthCommand({
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      ClientId: this.clientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });
    const response = await this.client.send(command);
    const result = response.AuthenticationResult;
    if (!result?.IdToken || !result?.AccessToken || !result?.RefreshToken) {
      throw new Error('Authentication failed: missing tokens');
    }
    return {
      idToken: result.IdToken,
      accessToken: result.AccessToken,
      refreshToken: result.RefreshToken,
    };
  }
}
