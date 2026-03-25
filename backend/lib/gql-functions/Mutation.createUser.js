// backend/src/gql-functions/Mutation.createUser.ts
import { util } from "@aws-appsync/utils";
import { put } from "@aws-appsync/utils/dynamodb";
function request(ctx) {
  const { input } = ctx.args;
  const identity = ctx.identity;
  if (!identity || !identity.sub) {
    util.error("Authentication required", "Unauthorized", null);
  }
  if (!input || !input.email) {
    util.error("Email is required", "ValidationError", null);
  }
  const now = util.time.nowISO8601();
  const userId = identity.sub;
  const user = {
    id: userId,
    email: input.email,
    name: input.name || null,
    subscriptionStatus: "INACTIVE",
    subscriptionProvider: null,
    createdAt: now,
    updatedAt: now
  };
  return put({
    key: {
      id: userId
    },
    item: user,
    condition: {
      expression: "attribute_not_exists(id)"
    }
  });
}
function response(ctx) {
  if (ctx.error) {
    const errorMessage = ctx.error.message || "Unknown error";
    if (errorMessage.indexOf("ConditionalCheckFailed") >= 0) {
      return {
        success: false,
        user: null,
        error: "User already exists"
      };
    }
    return {
      success: false,
      user: null,
      error: errorMessage
    };
  }
  return {
    success: true,
    user: ctx.result,
    error: null
  };
}
export {
  request,
  response
};
