#!/bin/bash
# Injects real AWS Cognito resource IDs into the join page environment files before build.
# Usage: ./scripts/inject-join-page-config.sh <namespace> <region>
#
# Reads values from SSM Parameter Store, then patches
# join_page/src/environments/environment.ts and environment.prod.ts.

set -euo pipefail

NAMESPACE="${1:?Usage: inject-join-page-config.sh <namespace> <region>}"
REGION="${2:?Usage: inject-join-page-config.sh <namespace> <region>}"

ENV_FILE="join_page/src/environments/environment.ts"
ENV_PROD_FILE="join_page/src/environments/environment.prod.ts"

echo "🔧 Injecting join page config for namespace=${NAMESPACE}, region=${REGION}"

USER_POOL_ID=$(aws ssm get-parameter \
  --name "/${NAMESPACE}/config/cognito-user-pool-id" \
  --query "Parameter.Value" --output text)
echo "  User Pool ID: ${USER_POOL_ID}"

APP_CLIENT_ID=$(aws ssm get-parameter \
  --name "/${NAMESPACE}/config/cognito-frontend-client-id" \
  --query "Parameter.Value" --output text)
echo "  App Client ID: ${APP_CLIENT_ID}"

for FILE in "${ENV_FILE}" "${ENV_PROD_FILE}"; do
  if [ -f "${FILE}" ]; then
    sed -i.bak \
      -e "s|REPLACE_WITH_REGION|${REGION}|g" \
      -e "s|REPLACE_WITH_USER_POOL_ID|${USER_POOL_ID}|g" \
      -e "s|REPLACE_WITH_USER_POOL_CLIENT_ID|${APP_CLIENT_ID}|g" \
      "${FILE}"
    rm -f "${FILE}.bak"
    echo "  ✅ Patched ${FILE}"
  else
    echo "  ⚠️  File not found: ${FILE}"
  fi
done

echo "✅ Join page config injected successfully"
