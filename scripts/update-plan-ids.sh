#!/bin/bash
set -euo pipefail

# Updates the SSM plan-ids parameter for a given namespace with the
# configured Stripe, App Store, and Play Store product/price IDs.
# CDK creates this parameter with placeholder values on first deploy
# but cannot overwrite it on subsequent deploys, so this script is
# used to set the real values.
#
# Usage: ./update-plan-ids.sh <namespace> <region>
# Example: ./update-plan-ids.sh prod eu-central-1

NAMESPACE="${1:?Usage: update-plan-ids.sh <namespace> <region>}"
REGION="${2:?Usage: update-plan-ids.sh <namespace> <region>}"
PARAM_NAME="/${NAMESPACE}/config/plan-ids"

# ── Stripe price IDs (EUR, monthly recurring) ────────────────────────
STRIPE_BASIC="price_1TMjma6XJ81FrS4ZxPpE6yr4"
STRIPE_PRO="price_1TMjmb6XJ81FrS4ZKdv5Site"

# ── App Store product IDs ────────────────────────────────────────────
APPSTORE_BASIC="${APPSTORE_BASIC:-CONFIGURE_ME_appstore_basic}"
APPSTORE_PRO="${APPSTORE_PRO:-CONFIGURE_ME_appstore_pro}"

# ── Play Store product IDs ───────────────────────────────────────────
PLAYSTORE_BASIC="${PLAYSTORE_BASIC:-CONFIGURE_ME_playstore_basic}"
PLAYSTORE_PRO="${PLAYSTORE_PRO:-CONFIGURE_ME_playstore_pro}"

# Build the JSON value
PLAN_IDS_JSON=$(cat <<EOF
{"stripe":{"basic":"${STRIPE_BASIC}","pro":"${STRIPE_PRO}"},"appStore":{"basic":"${APPSTORE_BASIC}","pro":"${APPSTORE_PRO}"},"playStore":{"basic":"${PLAYSTORE_BASIC}","pro":"${PLAYSTORE_PRO}"}}
EOF
)

echo "🔍 Checking existing parameter: ${PARAM_NAME} in ${REGION}..."

CURRENT=$(aws ssm get-parameter \
  --name "$PARAM_NAME" \
  --region "$REGION" \
  --query "Parameter.Value" \
  --output text 2>/dev/null || echo "")

if [ -z "$CURRENT" ]; then
  echo "⚠️  Parameter ${PARAM_NAME} does not exist yet. Deploy the CDK stack first."
  exit 1
fi

echo "📋 Current value:"
echo "   ${CURRENT}"
echo ""
echo "📝 New value:"
echo "   ${PLAN_IDS_JSON}"
echo ""

if [ "$CURRENT" = "$PLAN_IDS_JSON" ]; then
  echo "✅ Parameter is already up to date — no changes needed."
  exit 0
fi

echo "🔄 Updating parameter ${PARAM_NAME}..."
aws ssm put-parameter \
  --name "$PARAM_NAME" \
  --value "$PLAN_IDS_JSON" \
  --type String \
  --overwrite \
  --region "$REGION"

echo "✅ Parameter ${PARAM_NAME} updated successfully in ${REGION}."
