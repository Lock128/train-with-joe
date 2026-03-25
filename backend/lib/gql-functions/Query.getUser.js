// backend/src/gql-functions/Query.getUser.ts
import { util } from "@aws-appsync/utils";
import { get } from "@aws-appsync/utils/dynamodb";
function request(ctx) {
  const { id } = ctx.args;
  if (!id) {
    util.error("User ID is required", "ValidationError", null);
  }
  return get({
    key: {
      id
    }
  });
}
function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type || "ResponseError", null);
  }
  const result = ctx.result;
  if (!result) {
    return null;
  }
  return result;
}
export {
  request,
  response
};
