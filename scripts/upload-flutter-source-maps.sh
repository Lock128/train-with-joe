#!/usr/bin/env bash
# Uploads Flutter web source maps to Dash0 and strips them from the build output so they are never deployed.
#
# Usage: bash scripts/upload-flutter-source-maps.sh <flutter web build dir>
# Required env: DASH0_AUTH_TOKEN (needs ingest:debuginfo or ingest:*), DASH0_API_URL
# Optional env: DASH0_DATASET
set -euo pipefail

BUILD_DIR="${1:?Usage: $0 <flutter web build dir>}"
DASH0_CLI_VERSION="1.23.0"

if [ ! -d "$BUILD_DIR" ]; then
  echo "::error::Build directory '$BUILD_DIR' does not exist"
  exit 1
fi

# Fail closed: without an upload the maps would be useless, and debug IDs would be missing.
if [ -z "${DASH0_AUTH_TOKEN:-}" ] || [ -z "${DASH0_API_URL:-}" ]; then
  echo "::error::DASH0_AUTH_TOKEN and DASH0_API_URL secrets must be set to upload source maps to Dash0"
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
BASE_URL="https://github.com/dash0hq/dash0-cli/releases/download/v${DASH0_CLI_VERSION}"
ARCHIVE="dash0_${DASH0_CLI_VERSION}_linux_amd64.tar.gz"

curl -fsSL -o "$TMP_DIR/$ARCHIVE" "$BASE_URL/$ARCHIVE"
curl -fsSL -o "$TMP_DIR/checksums.txt" "$BASE_URL/checksums.txt"
(cd "$TMP_DIR" && grep " $ARCHIVE\$" checksums.txt | sha256sum -c -)
tar -xzf "$TMP_DIR/$ARCHIVE" -C "$TMP_DIR" dash0

# Writes a //# debugId=<UUID> comment into each JS file and uploads the maps.
"$TMP_DIR/dash0" -X debuginfo upload --type source-map "$BUILD_DIR"

# Remove maps from the deployable output and drop the public map reference (keep debugId).
find "$BUILD_DIR" -type f -name '*.map' -print -delete
if [ -f "$BUILD_DIR/main.dart.js" ]; then
  sed -i '/^\/\/# sourceMappingURL=/d' "$BUILD_DIR/main.dart.js"
fi

if find "$BUILD_DIR" -name '*.map' | grep -q .; then
  echo "::error::Source maps remain in $BUILD_DIR"
  exit 1
fi
if grep -q 'sourceMappingURL=' "$BUILD_DIR/main.dart.js"; then
  echo "::error::sourceMappingURL still present in main.dart.js"
  exit 1
fi
echo "Source maps uploaded to Dash0 and removed from $BUILD_DIR"
