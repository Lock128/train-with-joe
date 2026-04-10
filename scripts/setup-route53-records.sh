#!/usr/bin/env bash
#
# Creates Route53 alias records pointing to CloudFront distributions:
#   app.trainwithjoe.app -> d211vs9ookxori.cloudfront.net
#   trainwithjoe.app     -> d3qejgkwvxyn9g.cloudfront.net
#
# Usage: ./scripts/setup-route53-records.sh
#
# Prerequisites: AWS CLI configured with appropriate permissions.

set -euo pipefail

# CloudFront hosted zone ID is always Z2FDTNDATAQYW2 (AWS global constant)
CLOUDFRONT_HOSTED_ZONE_ID="Z2FDTNDATAQYW2"

DOMAIN="trainwithjoe.app"

# Look up the Route53 hosted zone ID for the domain
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name "$DOMAIN" \
  --query "HostedZones[?Name=='${DOMAIN}.'].Id" \
  --output text | sed 's|/hostedzone/||')

if [ -z "$HOSTED_ZONE_ID" ]; then
  echo "Error: Could not find hosted zone for $DOMAIN"
  exit 1
fi

echo "Found hosted zone: $HOSTED_ZONE_ID for $DOMAIN"

# Build the change batch JSON
CHANGE_BATCH=$(cat <<EOF
{
  "Comment": "Create alias records for CloudFront distributions",
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "app.${DOMAIN}",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "${CLOUDFRONT_HOSTED_ZONE_ID}",
          "DNSName": "d211vs9ookxori.cloudfront.net",
          "EvaluateTargetHealth": false
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "app.${DOMAIN}",
        "Type": "AAAA",
        "AliasTarget": {
          "HostedZoneId": "${CLOUDFRONT_HOSTED_ZONE_ID}",
          "DNSName": "d211vs9ookxori.cloudfront.net",
          "EvaluateTargetHealth": false
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "${DOMAIN}",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "${CLOUDFRONT_HOSTED_ZONE_ID}",
          "DNSName": "d3qejgkwvxyn9g.cloudfront.net",
          "EvaluateTargetHealth": false
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "${DOMAIN}",
        "Type": "AAAA",
        "AliasTarget": {
          "HostedZoneId": "${CLOUDFRONT_HOSTED_ZONE_ID}",
          "DNSName": "d3qejgkwvxyn9g.cloudfront.net",
          "EvaluateTargetHealth": false
        }
      }
    }
  ]
}
EOF
)

echo "Creating Route53 alias records..."
CHANGE_ID=$(aws route53 change-resource-record-sets \
  --hosted-zone-id "$HOSTED_ZONE_ID" \
  --change-batch "$CHANGE_BATCH" \
  --query 'ChangeInfo.Id' \
  --output text)

echo "Change submitted: $CHANGE_ID"
echo "Waiting for DNS propagation..."

aws route53 wait resource-record-sets-changed --id "$CHANGE_ID"

echo "Done! Records created:"
echo "  app.trainwithjoe.app -> d211vs9ookxori.cloudfront.net"
echo "  trainwithjoe.app     -> d3qejgkwvxyn9g.cloudfront.net"
