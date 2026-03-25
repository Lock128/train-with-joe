import type { DynamoDBGetItemRequest } from '@aws-appsync/utils';
import { util } from '@aws-appsync/utils';
import { get } from '@aws-appsync/utils/dynamodb';

/**
 * AppSync resolver for Query.getUser
 * Retrieves a user by ID from DynamoDB
 */

type Context = {
  args: { id: string };
  error?: { message: string; type?: string };
  result?: Record<string, unknown>;
};

export function request(ctx: Context): DynamoDBGetItemRequest {
  const { id } = ctx.args;

  if (!id) {
    util.error('User ID is required', 'ValidationError', null);
  }

  return get({
    key: {
      id: id,
    },
  });
}

export function response(ctx: Context): Record<string, unknown> | null {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type || 'ResponseError', null);
  }

  const result = ctx.result;
  if (!result) {
    return null;
  }

  return result;
}
