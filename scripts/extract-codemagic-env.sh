#!/bin/bash
# Extracts Amplify configuration values from a deployed environment
# and outputs them in the format needed for Codemagic environment variables.
#
# Usage: ./scripts/extract-codemagic-env.sh <namespace> <region>
# Example: ./scripts/extract-codemagic-env.sh production eu-central-1

set -euo pipefail

NAMESPACE="${1:?Usage: extract-codemagic-env.sh <namespace> <region>}"
REGION="${2:?Usage: extract-codemagic-env.sh <namespace> <region>}"

echo "🔍 Extracting Amplify config from ${NAMESPACE} (${REGION})..."
echo ""

AMPLIFY_USER_POOL_ID=$(aws ssm get-parameter \
  --name "/${NAMESPACE}/config/cognito-user-pool-id" \
  --region "${REGION}" \
  --query "Parameter.Value" --output text)

AMPLIFY_APP_CLIENT_ID=$(aws ssm get-parameter \
  --name "/${NAMESPACE}/config/cognito-frontend-client-id" \
  --region "${REGION}" \
  --query "Parameter.Value" --output text)

AMPLIFY_IDENTITY_POOL_ID=$(aws ssm get-parameter \
  --name "/${NAMESPACE}/config/cognito-identity-pool-id" \
  --region "${REGION}" \
  --query "Parameter.Value" --output text)

AMPLIFY_API_URL=$(aws cloudformation describe-stacks \
  --stack-name "APIStack-${NAMESPACE}" \
  --region "${REGION}" \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text)

echo "✅ Codemagic environment variables for ${NAMESPACE}:"
echo ""
echo "  AMPLIFY_API_URL         = ${AMPLIFY_API_URL}"
echo "  AMPLIFY_REGION          = ${REGION}"
echo "  AMPLIFY_IDENTITY_POOL_ID = ${AMPLIFY_IDENTITY_POOL_ID}"
echo "  AMPLIFY_APP_CLIENT_ID   = ${AMPLIFY_APP_CLIENT_ID}"
echo "  AMPLIFY_USER_POOL_ID    = ${AMPLIFY_USER_POOL_ID}"
