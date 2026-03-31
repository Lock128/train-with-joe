#!/bin/bash
# Injects real AWS resource IDs into the Amplify configuration before Flutter build.
# Usage: ./scripts/inject-amplify-config.sh <namespace> <region>
#
# Reads values from SSM Parameter Store and CloudFormation stack outputs,
# then patches frontend/src/lib/models/amplifyconfiguration.dart.

set -euo pipefail

NAMESPACE="${1:?Usage: inject-amplify-config.sh <namespace> <region>}"
REGION="${2:?Usage: inject-amplify-config.sh <namespace> <region>}"

CONFIG_FILE="frontend/src/lib/models/amplifyconfiguration.dart"

echo "🔧 Injecting Amplify config for namespace=${NAMESPACE}, region=${REGION}"

# Fetch Cognito values from SSM
USER_POOL_ID=$(aws ssm get-parameter \
  --name "/${NAMESPACE}/config/cognito-user-pool-id" \
  --query "Parameter.Value" --output text)
echo "  User Pool ID: ${USER_POOL_ID}"

APP_CLIENT_ID=$(aws ssm get-parameter \
  --name "/${NAMESPACE}/config/cognito-frontend-client-id" \
  --query "Parameter.Value" --output text)
echo "  App Client ID: ${APP_CLIENT_ID}"

# Fetch API endpoint from CloudFormation outputs
API_URL=$(aws cloudformation describe-stacks \
  --stack-name "APIStack-${NAMESPACE}" \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text)
echo "  API URL: ${API_URL}"

# Fetch Identity Pool ID from SSM
IDENTITY_POOL_ID=$(aws ssm get-parameter \
  --name "/${NAMESPACE}/config/cognito-identity-pool-id" \
  --query "Parameter.Value" --output text)
echo "  Identity Pool ID: ${IDENTITY_POOL_ID}"

# Patch the config file
sed -i.bak \
  -e "s|REPLACE_WITH_USER_POOL_ID|${USER_POOL_ID}|g" \
  -e "s|REPLACE_WITH_APP_CLIENT_ID|${APP_CLIENT_ID}|g" \
  -e "s|REPLACE_WITH_IDENTITY_POOL_ID|${IDENTITY_POOL_ID}|g" \
  -e "s|REPLACE_WITH_REGION|${REGION}|g" \
  -e "s|https://localhost:3000/graphql|${API_URL}|g" \
  "${CONFIG_FILE}"

rm -f "${CONFIG_FILE}.bak"

echo "✅ Amplify config injected successfully"
