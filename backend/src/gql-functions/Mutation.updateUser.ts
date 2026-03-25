import type { DynamoDBUpdateItemRequest } from '@aws-appsync/utils';
import { util } from '@aws-appsync/utils';
import { update } from '@aws-appsync/utils/dynamodb';

/**
 * AppSync resolver for Mutation.updateUser
 * Updates user information in DynamoDB
 */

type Context = {
  args: { input: { id: string; name?: string } };
  identity: { sub: string };
  error?: { message: string; type?: string };
  result?: Record<string, unknown>;
};

export function request(ctx: Context): DynamoDBUpdateItemRequest {
  const { input } = ctx.args;
  const identity = ctx.identity;

  if (!identity || !identity.sub) {
    util.error('Authentication required', 'Unauthorized', null);
  }

  if (!input || !input.id) {
    util.error('User ID is required', 'ValidationError', null);
  }

  // Verify user can only update their own profile
  if (input.id !== identity.sub) {
    util.error('Cannot update another user profile', 'Forbidden', null);
  }

  const now = util.time.nowISO8601();
  const updates: Record<string, string> = {};

  if (input.name !== undefined && input.name !== null) {
    updates.name = input.name;
  }

  updates.updatedAt = now;

  return update({
    key: {
      id: input.id,
    },
    update: updates,
    condition: {
      expression: 'attribute_exists(id)',
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
        error: 'User not found',
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
