#!/bin/bash
set -euo pipefail

# Configures Stripe API keys for a given namespace.
# Stores the keys in SSM Parameter Store (SecureString) and updates
# the Lambda function environment variables that need them.
#
# Usage: ./configure-stripe-keys.sh <namespace> <region>
# Example: ./configure-stripe-keys.sh prod eu-central-1
#
# You will be prompted for the secret key and webhook secret.
# Alternatively, set them as environment variables:
#   STRIPE_SECRET_KEY=sk_live_... STRIPE_WEBHOOK_SECRET=whsec_... ./configure-stripe-keys.sh prod eu-central-1

NAMESPACE="${1:?Usage: configure-stripe-keys.sh <namespace> <region>}"
REGION="${2:?Usage: configure-stripe-keys.sh <namespace> <region>}"

# ── Collect keys ─────────────────────────────────────────────────────

if [ -z "${STRIPE_SECRET_KEY:-}" ]; then
  echo -n "🔑 Enter Stripe Secret Key (sk_live_... or sk_test_...): "
  read -rs STRIPE_SECRET_KEY
  echo ""
fi

if [ -z "${STRIPE_WEBHOOK_SECRET:-}" ]; then
  echo -n "🔑 Enter Stripe Webhook Secret (whsec_...): "
  read -rs STRIPE_WEBHOOK_SECRET
  echo ""
fi

if [ -z "$STRIPE_SECRET_KEY" ]; then
  echo "❌ Stripe Secret Key cannot be empty."
  exit 1
fi

if [ -z "$STRIPE_WEBHOOK_SECRET" ]; then
  echo "❌ Stripe Webhook Secret cannot be empty."
  exit 1
fi

# ── Store in SSM Parameter Store ─────────────────────────────────────

SSM_KEY_PATH="/${NAMESPACE}/stripe/secret-key"
SSM_WEBHOOK_PATH="/${NAMESPACE}/stripe/webhook-secret"

echo "🔄 Storing Stripe Secret Key in SSM: ${SSM_KEY_PATH}..."
aws ssm put-parameter \
  --name "$SSM_KEY_PATH" \
  --value "$STRIPE_SECRET_KEY" \
  --type SecureString \
  --overwrite \
  --region "$REGION"

echo "🔄 Storing Stripe Webhook Secret in SSM: ${SSM_WEBHOOK_PATH}..."
aws ssm put-parameter \
  --name "$SSM_WEBHOOK_PATH" \
  --value "$STRIPE_WEBHOOK_SECRET" \
  --type SecureString \
  --overwrite \
  --region "$REGION"

echo "✅ SSM parameters stored."

# ── Find and update Lambda functions ─────────────────────────────────

echo ""
echo "🔍 Finding Lambda functions that need Stripe keys..."

# The CreateStripeCheckout Lambda needs STRIPE_SECRET_KEY
# The StripeWebhook Lambda needs both STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET

CHECKOUT_FUNCTIONS=$(aws lambda list-functions \
  --region "$REGION" \
  --query "Functions[?contains(FunctionName, '${NAMESPACE}') && contains(FunctionName, 'StripeCheckout')].FunctionName" \
  --output text)

WEBHOOK_FUNCTIONS=$(aws lambda list-functions \
  --region "$REGION" \
  --query "Functions[?contains(FunctionName, '${NAMESPACE}') && contains(FunctionName, 'StripeWebhook')].FunctionName" \
  --output text)

update_lambda_env() {
  local FUNC_NAME="$1"
  shift
  # Remaining args are KEY=VALUE pairs to set

  echo "  🔄 Updating ${FUNC_NAME}..."

  # Get current environment variables
  CURRENT_ENV=$(aws lambda get-function-configuration \
    --function-name "$FUNC_NAME" \
    --region "$REGION" \
    --query "Environment.Variables" \
    --output json 2>/dev/null || echo "{}")

  if [ "$CURRENT_ENV" = "null" ] || [ -z "$CURRENT_ENV" ]; then
    CURRENT_ENV="{}"
  fi

  # Merge new env vars into existing ones
  UPDATED_ENV="$CURRENT_ENV"
  for KV in "$@"; do
    KEY="${KV%%=*}"
    VALUE="${KV#*=}"
    UPDATED_ENV=$(echo "$UPDATED_ENV" | python3 -c "
import sys, json
env = json.load(sys.stdin)
env['$KEY'] = '$VALUE'
print(json.dumps(env))
")
  done

  aws lambda update-function-configuration \
    --function-name "$FUNC_NAME" \
    --environment "{\"Variables\": $UPDATED_ENV}" \
    --region "$REGION" \
    --output text \
    --query "FunctionName" > /dev/null

  echo "  ✅ ${FUNC_NAME} updated."
}

FOUND_ANY=false

for FUNC in $CHECKOUT_FUNCTIONS; do
  FOUND_ANY=true
  update_lambda_env "$FUNC" \
    "STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}"
done

for FUNC in $WEBHOOK_FUNCTIONS; do
  FOUND_ANY=true
  update_lambda_env "$FUNC" \
    "STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}" \
    "STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}"
done

if [ "$FOUND_ANY" = false ]; then
  echo "⚠️  No matching Lambda functions found for namespace '${NAMESPACE}'."
  echo "   Make sure the CDK stacks have been deployed first."
  echo "   The keys are stored in SSM and can be referenced manually."
  exit 1
fi

echo ""
echo "✅ All done. Stripe keys configured for namespace '${NAMESPACE}' in ${REGION}."
echo ""
echo "📋 SSM Parameters:"
echo "   ${SSM_KEY_PATH}"
echo "   ${SSM_WEBHOOK_PATH}"
