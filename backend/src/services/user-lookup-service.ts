import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';
import { UserRepository } from '../repositories/user-repository';

/**
 * Resolves a userId that might be an email address to the actual Cognito sub (user ID).
 * Tries DynamoDB first (fast), falls back to Cognito ListUsers if not found.
 * Returns the original value if it doesn't look like an email.
 */
export async function resolveUserIdFromEmail(targetUserId: string): Promise<string> {
  if (!targetUserId.includes('@')) {
    return targetUserId;
  }

  // 1. Try DynamoDB email-index first
  try {
    const userRepo = UserRepository.getInstance();
    const dbUser = await userRepo.getByEmail(targetUserId);
    if (dbUser) {
      console.log('[UserLookup] Resolved email via DynamoDB:', targetUserId, '→', dbUser.id);
      return dbUser.id;
    }
  } catch (err) {
    console.warn('[UserLookup] DynamoDB email lookup failed:', err);
  }

  // 2. Fall back to Cognito ListUsers
  const userPoolId = process.env.USER_POOL_ID;
  if (!userPoolId) {
    console.warn('[UserLookup] USER_POOL_ID not set, cannot query Cognito');
    return targetUserId;
  }

  try {
    const cognito = new CognitoIdentityProviderClient({});
    const response = await cognito.send(
      new ListUsersCommand({
        UserPoolId: userPoolId,
        Filter: `email = "${targetUserId}"`,
        Limit: 1,
      }),
    );

    const cognitoUser = response.Users?.[0];
    if (cognitoUser) {
      const sub = cognitoUser.Attributes?.find((a) => a.Name === 'sub')?.Value ?? cognitoUser.Username;
      if (sub) {
        console.log('[UserLookup] Resolved email via Cognito:', targetUserId, '→', sub);
        return sub;
      }
    }

    console.warn('[UserLookup] No Cognito user found for email:', targetUserId);
  } catch (err) {
    console.error('[UserLookup] Cognito lookup failed:', err);
  }

  return targetUserId;
}
