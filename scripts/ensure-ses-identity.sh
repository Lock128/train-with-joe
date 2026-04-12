#!/bin/bash
set -euo pipefail

# Ensures an SES email identity exists and is verified.
# Usage: ./ensure-ses-identity.sh <namespace> <region>
# Example: ./ensure-ses-identity.sh beta eu-central-1

NAMESPACE="${1:?Usage: ensure-ses-identity.sh <namespace> <region>}"
REGION="${2:?Usage: ensure-ses-identity.sh <namespace> <region>}"
EMAIL="lockhead+joe${NAMESPACE}@lockhead.info"
MAX_WAIT_SECONDS=300
POLL_INTERVAL=15

echo "🔍 Checking SES identity: ${EMAIL} in ${REGION}..."

# Check current verification status
STATUS=$(aws ses get-identity-verification-attributes \
  --identities "$EMAIL" \
  --region "$REGION" \
  --query "VerificationAttributes.\"${EMAIL}\".VerificationStatus" \
  --output text 2>/dev/null || echo "None")

if [ "$STATUS" = "Success" ]; then
  echo "✅ SES identity ${EMAIL} is already verified in ${REGION}"
  exit 0
fi

# Identity doesn't exist or isn't verified — create/resend verification
echo "📧 SES identity not verified (status: ${STATUS}). Sending verification email to ${EMAIL}..."
aws ses verify-email-identity \
  --email-address "$EMAIL" \
  --region "$REGION"

echo "⏳ Waiting up to ${MAX_WAIT_SECONDS}s for email verification..."
echo "📬 A verification email has been sent to ${EMAIL}. Please click the link in the email."

ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT_SECONDS ]; do
  sleep $POLL_INTERVAL
  ELAPSED=$((ELAPSED + POLL_INTERVAL))

  STATUS=$(aws ses get-identity-verification-attributes \
    --identities "$EMAIL" \
    --region "$REGION" \
    --query "VerificationAttributes.\"${EMAIL}\".VerificationStatus" \
    --output text 2>/dev/null || echo "Pending")

  if [ "$STATUS" = "Success" ]; then
    echo "✅ SES identity ${EMAIL} verified successfully after ${ELAPSED}s"
    exit 0
  fi

  echo "⏳ Still waiting... (${ELAPSED}s/${MAX_WAIT_SECONDS}s, status: ${STATUS})"
done

echo "❌ Timed out waiting for SES identity verification after ${MAX_WAIT_SECONDS}s"
echo "💡 Please verify the email manually and re-run the pipeline."
exit 1
