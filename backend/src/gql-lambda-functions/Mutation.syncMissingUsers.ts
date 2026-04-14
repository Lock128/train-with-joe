import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  type AttributeType,
} from '@aws-sdk/client-cognito-identity-provider';
import { UserRepository } from '../repositories/user-repository';
import { Tier, TierSource } from '../model/domain/User';

const ADMIN_EMAILS = ['johannes.koch@gmail.com', 'lockhead+joe1@lockhead.info', 'lockhead@lockhead.info'];

/**
 * Lambda resolver for Mutation.syncMissingUsers
 * Scans Cognito for users that don't have a DynamoDB record and creates them.
 * Admin only.
 */

interface Event {
  identity: {
    sub: string;
    username?: string;
    claims: Record<string, string>;
  };
}

function getCognitoAttr(attrs: AttributeType[] | undefined, name: string): string | undefined {
  return attrs?.find((a) => a.Name === name)?.Value;
}

export const handler = async (event: Event) => {
  const callerUserId = event.identity?.sub;

  if (!callerUserId) {
    return { success: false, createdCount: 0, error: 'Authentication required' };
  }

  // Admin authorization
  const claims = event.identity?.claims ?? {};
  let callerEmail: string | undefined =
    claims.email ?? claims['cognito:email'] ?? claims['custom:email'] ?? claims.username ?? event.identity?.username;

  if (!callerEmail) {
    try {
      const userRepo = UserRepository.getInstance();
      const callerUser = await userRepo.getById(callerUserId);
      callerEmail = callerUser?.email;
    } catch (dbError) {
      console.error('[AdminAuth] DB lookup failed:', dbError);
    }
  }

  const isAdmin = callerEmail != null && ADMIN_EMAILS.includes(callerEmail);
  if (!callerEmail || !isAdmin) {
    return { success: false, createdCount: 0, error: 'Not authorized' };
  }

  const userPoolId = process.env.USER_POOL_ID;
  if (!userPoolId) {
    return { success: false, createdCount: 0, error: 'USER_POOL_ID not configured' };
  }

  try {
    const userRepo = UserRepository.getInstance();
    const cognito = new CognitoIdentityProviderClient({});

    // Get all existing DynamoDB user IDs
    const dbUsers = await userRepo.getAll();
    const existingIds = new Set(dbUsers.map((u) => u.id));

    let createdCount = 0;
    let paginationToken: string | undefined;

    do {
      const response = await cognito.send(
        new ListUsersCommand({
          UserPoolId: userPoolId,
          Limit: 60,
          PaginationToken: paginationToken,
        }),
      );

      for (const cu of response.Users ?? []) {
        const sub = getCognitoAttr(cu.Attributes, 'sub') ?? cu.Username ?? '';
        if (!sub || existingIds.has(sub)) continue;

        const email = getCognitoAttr(cu.Attributes, 'email') ?? cu.Username ?? '';
        const name = getCognitoAttr(cu.Attributes, 'name');
        const createdAt = cu.UserCreateDate?.toISOString() ?? new Date().toISOString();

        await userRepo.create({
          id: sub,
          email,
          name: name ?? undefined,
          tier: Tier.FREE,
          tierSource: TierSource.SUBSCRIPTION,
          createdAt,
          updatedAt: createdAt,
        });

        createdCount++;
        console.log(`[syncMissingUsers] Created DynamoDB record for Cognito user ${sub} (${email})`);
      }

      paginationToken = response.PaginationToken;
    } while (paginationToken);

    console.log(`[syncMissingUsers] Done — created ${createdCount} missing user records`);
    return { success: true, createdCount, error: null };
  } catch (error) {
    console.error('[syncMissingUsers] Error:', error);
    return {
      success: false,
      createdCount: 0,
      error: error instanceof Error ? error.message : 'Failed to sync users',
    };
  }
};
