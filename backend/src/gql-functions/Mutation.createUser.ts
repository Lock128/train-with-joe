import type { DynamoDBPutItemRequest } from '@aws-appsync/utils';
import { util } from '@aws-appsync/utils';
import { put } from '@aws-appsync/utils/dynamodb';

/**
 * AppSync resolver for Mutation.createUser
 * Creates a new user in DynamoDB
 */

type Context = {
  args: { input: { email: string; name?: string } };
  identity: { sub: string };
  error?: { message: string; type?: string };
  result?: Record<string, unknown>;
};

export function request(ctx: Context): DynamoDBPutItemRequest {
  const { input } = ctx.args;
  const identity = ctx.identity;

  if (!identity || !identity.sub) {
    util.error('Authentication required', 'Unauthorized', null);
  }

  if (!input || !input.email) {
    util.error('Email is required', 'ValidationError', null);
  }

  const now = util.time.nowISO8601();
  const userId = identity.sub;

  const user = {
    id: userId,
    email: input.email,
    name: input.name || null,
    subscriptionStatus: 'INACTIVE',
    subscriptionProvider: null,
    tier: 'FREE',
    tierSource: 'SUBSCRIPTION',
    createdAt: now,
    updatedAt: now,
  };

  return put({
    key: {
      id: userId,
    },
    item: user,
    condition: {
      expression: 'attribute_not_exists(id)',
    },
  });
}

export function response(ctx: Context): Record<string, unknown> {
  if (ctx.error) {
    const errorMessage = ctx.error.message || 'Unknown error';

    if (errorMessage.indexOf('ConditionalCheckFailed') >= 0) {
      return {
        success: false,
        user: null,
        error: 'User already exists',
      };
    }

    return {
      success: false,
      user: null,
      error: errorMessage,
    };
  }

  return {
    success: true,
    user: ctx.result,
    error: null,
  };
}
