#!/bin/bash
set -euo pipefail

# Copies all DynamoDB table data from one environment to another.
# Usage: ./copy-dynamodb-data.sh <source-namespace> <target-namespace> [--region <region>]
#
# Examples:
#   ./copy-dynamodb-data.sh sandbox prod
#   ./copy-dynamodb-data.sh sandbox-john prod --region eu-central-1
#   ./copy-dynamodb-data.sh beta prod
#
# ⚠️  This script will OVERWRITE items in the target tables if they share the same 'id'.
#     It does NOT delete items from the target that don't exist in the source.

SOURCE_NS="${1:?Usage: copy-dynamodb-data.sh <source-namespace> <target-namespace> [--region <region>]}"
TARGET_NS="${2:?Usage: copy-dynamodb-data.sh <source-namespace> <target-namespace> [--region <region>]}"
REGION="${4:-us-east-1}"

# Parse optional --region flag
shift 2
while [[ $# -gt 0 ]]; do
  case "$1" in
    --region)
      REGION="${2:?--region requires a value}"
      shift 2
      ;;
    *)
      echo "❌ Unknown option: $1"
      exit 1
      ;;
  esac
done

TABLES=("users" "subscriptions" "vocabulary-lists" "trainings")
TABLE_PREFIX="train-with-joe"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              DynamoDB Data Copy                             ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Source:  ${SOURCE_NS}"
echo "║  Target:  ${TARGET_NS}"
echo "║  Region:  ${REGION}"
echo "║  Tables:  ${TABLES[*]}"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Safety check for production target
if [ "$TARGET_NS" = "prod" ]; then
  echo "⚠️  WARNING: You are about to write data into PRODUCTION tables."
  read -r -p "Type 'yes-copy-to-prod' to confirm: " CONFIRM
  if [ "$CONFIRM" != "yes-copy-to-prod" ]; then
    echo "❌ Aborted."
    exit 1
  fi
fi

TOTAL_ITEMS=0
FAILED_TABLES=()

for TABLE in "${TABLES[@]}"; do
  SOURCE_TABLE="${TABLE_PREFIX}-${TABLE}-${SOURCE_NS}"
  TARGET_TABLE="${TABLE_PREFIX}-${TABLE}-${TARGET_NS}"

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📋 Copying: ${SOURCE_TABLE} → ${TARGET_TABLE}"

  # Verify source table exists
  if ! aws dynamodb describe-table --table-name "$SOURCE_TABLE" --region "$REGION" > /dev/null 2>&1; then
    echo "❌ Source table '${SOURCE_TABLE}' not found. Skipping."
    FAILED_TABLES+=("$SOURCE_TABLE (not found)")
    continue
  fi

  # Verify target table exists
  if ! aws dynamodb describe-table --table-name "$TARGET_TABLE" --region "$REGION" > /dev/null 2>&1; then
    echo "❌ Target table '${TARGET_TABLE}' not found. Skipping."
    FAILED_TABLES+=("$TARGET_TABLE (not found)")
    continue
  fi

  # Scan all items from source table (handles pagination)
  ITEMS_FILE=$(mktemp)
  trap "rm -f $ITEMS_FILE" EXIT

  echo "   Scanning source table..."
  LAST_KEY=""
  TABLE_COUNT=0

  while true; do
    if [ -z "$LAST_KEY" ]; then
      SCAN_RESULT=$(aws dynamodb scan \
        --table-name "$SOURCE_TABLE" \
        --region "$REGION" \
        --output json)
    else
      SCAN_RESULT=$(aws dynamodb scan \
        --table-name "$SOURCE_TABLE" \
        --region "$REGION" \
        --exclusive-start-key "$LAST_KEY" \
        --output json)
    fi

    # Extract items from this page
    PAGE_COUNT=$(echo "$SCAN_RESULT" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('Items',[])))")
    TABLE_COUNT=$((TABLE_COUNT + PAGE_COUNT))

    # Write items to batch format (25 items per batch, DynamoDB limit)
    echo "$SCAN_RESULT" | python3 -c "
import sys, json

data = json.load(sys.stdin)
items = data.get('Items', [])
target_table = '${TARGET_TABLE}'

# Build batch write requests (max 25 per batch)
batch = []
for item in items:
    batch.append({'PutRequest': {'Item': item}})
    if len(batch) == 25:
        print(json.dumps({'${TARGET_TABLE}': batch}))
        batch = []
if batch:
    print(json.dumps({'${TARGET_TABLE}': batch}))
" >> "$ITEMS_FILE"

    # Check for pagination
    LAST_KEY=$(echo "$SCAN_RESULT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
key = data.get('LastEvaluatedKey')
print(json.dumps(key) if key else '')
" 2>/dev/null)

    if [ -z "$LAST_KEY" ]; then
      break
    fi
  done

  echo "   Found ${TABLE_COUNT} items."

  if [ "$TABLE_COUNT" -eq 0 ]; then
    echo "   ⏭️  No items to copy."
    continue
  fi

  # Write batches to target table
  BATCH_NUM=0
  WRITE_ERRORS=0
  while IFS= read -r BATCH; do
    BATCH_NUM=$((BATCH_NUM + 1))
    RESULT=$(aws dynamodb batch-write-item \
      --request-items "$BATCH" \
      --region "$REGION" \
      --output json 2>&1) || {
      echo "   ❌ Batch ${BATCH_NUM} failed: ${RESULT}"
      WRITE_ERRORS=$((WRITE_ERRORS + 1))
      continue
    }

    # Handle unprocessed items with retry
    UNPROCESSED=$(echo "$RESULT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
unprocessed = data.get('UnprocessedItems', {})
print(json.dumps(unprocessed) if unprocessed else '')
")

    RETRIES=0
    while [ -n "$UNPROCESSED" ] && [ "$RETRIES" -lt 3 ]; do
      RETRIES=$((RETRIES + 1))
      echo "   ⏳ Retrying unprocessed items (attempt ${RETRIES}/3)..."
      sleep $((RETRIES * 2))

      RESULT=$(aws dynamodb batch-write-item \
        --request-items "$UNPROCESSED" \
        --region "$REGION" \
        --output json 2>&1) || break

      UNPROCESSED=$(echo "$RESULT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
unprocessed = data.get('UnprocessedItems', {})
print(json.dumps(unprocessed) if unprocessed else '')
")
    done

    if [ -n "$UNPROCESSED" ]; then
      echo "   ⚠️  Some items in batch ${BATCH_NUM} could not be written after retries."
      WRITE_ERRORS=$((WRITE_ERRORS + 1))
    fi
  done < "$ITEMS_FILE"

  if [ "$WRITE_ERRORS" -gt 0 ]; then
    echo "   ⚠️  Completed with ${WRITE_ERRORS} batch error(s)."
    FAILED_TABLES+=("$SOURCE_TABLE (${WRITE_ERRORS} errors)")
  else
    echo "   ✅ Copied ${TABLE_COUNT} items successfully."
  fi

  TOTAL_ITEMS=$((TOTAL_ITEMS + TABLE_COUNT))
  rm -f "$ITEMS_FILE"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary: ${TOTAL_ITEMS} total items processed across ${#TABLES[@]} tables."

if [ ${#FAILED_TABLES[@]} -gt 0 ]; then
  echo "⚠️  Issues with: ${FAILED_TABLES[*]}"
  exit 1
else
  echo "✅ All tables copied successfully."
fi
