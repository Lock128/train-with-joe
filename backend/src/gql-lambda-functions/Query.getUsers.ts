import { UserRepository } from '../repositories/user-repository';
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  type AttributeType,
} from '@aws-sdk/client-cognito-identity-provider';

const ADMIN_EMAILS = ['johannes.koch@gmail.com', 'lockhead+joe1@lockhead.info'];

/**
 * Lambda resolver for Query.getUsers
 * Returns all users — admin only.
 * Merges DynamoDB user records with Cognito user pool entries so that
 * users who exist only in Cognito (never called createUser) still appear.
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
    throw new Error('Authentication required');
  }

  // Access tokens don't carry an email claim, so also check the username claim
  // (which Cognito sets to the email when email is used as the sign-in alias).
  const claims = event.identity?.claims ?? {};
  let callerEmail: string | undefined =
    claims.email ?? claims['cognito:email'] ?? claims['custom:email'] ?? claims.username ?? event.identity?.username;
  console.log('[AdminAuth] getUsers — callerUserId:', callerUserId, 'jwtEmail:', callerEmail);
  if (!callerEmail) {
    console.log('[AdminAuth] JWT email claim missing, falling back to DB lookup');
    const userRepo = UserRepository.getInstance();
    const callerUser = await userRepo.getById(callerUserId);
    callerEmail = callerUser?.email;
    console.log('[AdminAuth] DB email lookup result:', callerEmail);
  }
  const isAdmin = callerEmail != null && ADMIN_EMAILS.includes(callerEmail);
  console.log('[AdminAuth] email:', callerEmail, 'isAdmin:', isAdmin);
  if (!callerEmail || !isAdmin) {
    console.warn('[AdminAuth] DENIED — getUsers');
    throw new Error('Not authorized');
  }
  console.log('[AdminAuth] GRANTED — listing all users');

  // 1. Get DynamoDB users (keyed by id)
  const userRepo = UserRepository.getInstance();
  const dbUsers = await userRepo.getAll();
  const dbMap = new Map(dbUsers.map((u) => [u.id, u]));

  // 2. List Cognito users and merge
  const userPoolId = process.env.USER_POOL_ID;
  if (!userPoolId) {
    console.warn('[getUsers] USER_POOL_ID not set, returning DynamoDB users only');
    return dbUsers;
  }

  const cognito = new CognitoIdentityProviderClient({});
  const merged = new Map(dbMap);

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
      if (!sub || merged.has(sub)) continue; // already have a DB record

      const email = getCognitoAttr(cu.Attributes, 'email') ?? cu.Username ?? '';
      const name = getCognitoAttr(cu.Attributes, 'name');
      const createdAt = cu.UserCreateDate?.toISOString() ?? new Date().toISOString();

      merged.set(sub, {
        id: sub,
        email,
        name: name ?? null,
        subscriptionStatus: 'INACTIVE',
        subscriptionProvider: null,
        createdAt,
        updatedAt: createdAt,
      });
    }

    paginationToken = response.PaginationToken;
  } while (paginationToken);

  const result = Array.from(merged.values());
  console.log(
    '[getUsers] Returning',
    result.length,
    'users (',
    dbUsers.length,
    'from DB,',
    result.length - dbUsers.length,
    'from Cognito only)',
  );
  return result;
};
