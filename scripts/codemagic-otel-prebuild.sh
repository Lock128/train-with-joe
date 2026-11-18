#!/bin/bash
# Codemagic pre-build step: writes frontend/src/otlp_config.json for Dash0 telemetry.
#
# Usage (Codemagic "Pre-build script", any working directory):
#   bash scripts/codemagic-otel-prebuild.sh
#
# Then build with:  --dart-define-from-file=otlp_config.json  (from frontend/src)
#
# Reads these Codemagic variables:
#   DASH0_ENVIRONMENT                 production uses PROD_ only, anything else uses NONPROD_
#   NONPROD_FLUTTER_OTLP_ENDPOINT / NONPROD_FLUTTER_OTLP_HEADERS
#   PROD_FLUTTER_OTLP_ENDPOINT    / PROD_FLUTTER_OTLP_HEADERS
#   BUILD_NUMBER, FCI_COMMIT, FCI_BRANCH, FCI_REPOSITORY_URL   (set by Codemagic)
# Headers must contain Authorization=Bearer and Dash0-Dataset=. Header values are never printed.
# If endpoint or headers are missing, a warning is shown and an empty {} config is written,
# so the build still works with telemetry off. Needs jq. Compatible with bash 3.2.
# Get the variable values with: DASH0_AUTH_TOKEN=... scripts/codemagic-otel-vars.sh (see SETUP_OTEL.md).

set -euo pipefail

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  cat <<'EOF'
Usage: bash scripts/codemagic-otel-prebuild.sh [--help]

Writes frontend/src/otlp_config.json (chmod 600, gitignored) from the Codemagic variables
DASH0_ENVIRONMENT, NONPROD_/PROD_FLUTTER_OTLP_ENDPOINT and NONPROD_/PROD_FLUTTER_OTLP_HEADERS.
Production uses PROD_ only. Missing values disable telemetry (writes {}). Bad headers exit 1.
Run it from the Codemagic pre-build step, then build with --dart-define-from-file=otlp_config.json.
EOF
  exit 0
fi

command -v jq >/dev/null 2>&1 || { echo "ERROR: jq not found in PATH." >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${SCRIPT_DIR}/../frontend/src"
[ -d "$OUT_DIR" ] || { echo "ERROR: ${OUT_DIR} not found." >&2; exit 1; }
OUT_FILE="${OUT_DIR}/otlp_config.json"

DASH0_ENV="${DASH0_ENVIRONMENT:-}"

case "$DASH0_ENV" in
  production)
    # Production uses PROD_ only. No fallback to NONPROD_ values.
    OTLP_ENDPOINT="${PROD_FLUTTER_OTLP_ENDPOINT:-}"
    OTLP_HEADERS="${PROD_FLUTTER_OTLP_HEADERS:-}"
    ;;
  *)
    OTLP_ENDPOINT="${NONPROD_FLUTTER_OTLP_ENDPOINT:-}"
    OTLP_HEADERS="${NONPROD_FLUTTER_OTLP_HEADERS:-}"
    ;;
esac

umask 077

if [ -z "$OTLP_ENDPOINT" ] || [ -z "$OTLP_HEADERS" ]; then
  echo "WARNING: OTLP endpoint or headers not set for '${DASH0_ENV:-non-production}', telemetry disabled"
  echo '{}' >"$OUT_FILE"
  chmod 600 "$OUT_FILE"
  echo "otlp_config.json written (empty, telemetry off)"
  exit 0
fi

case "$OTLP_HEADERS" in
  *"Authorization=Bearer"*) ;;
  *) echo "ERROR: headers must contain Authorization=Bearer <token> (header value not shown)" >&2; exit 1 ;;
esac
case "$OTLP_HEADERS" in
  *"Dash0-Dataset="*) ;;
  *) echo "ERROR: headers must contain Dash0-Dataset=<dataset> (header value not shown)" >&2; exit 1 ;;
esac

# Strip credentials (user:password@) from the repository URL.
VCS_URL="$(printf '%s' "${FCI_REPOSITORY_URL:-}" | sed -E 's#^([A-Za-z][A-Za-z0-9+.-]*://)[^/@]*@#\1#')"

jq -n \
  --arg endpoint "$OTLP_ENDPOINT" \
  --arg headers "$OTLP_HEADERS" \
  --arg environment "$DASH0_ENV" \
  --arg deployment_name "train-with-joe-${DASH0_ENV}" \
  --arg deployment_id "${BUILD_NUMBER:-}" \
  --arg vcs_revision "${FCI_COMMIT:-}" \
  --arg vcs_ref "${FCI_BRANCH:-}" \
  --arg vcs_url "$VCS_URL" \
  '{
    OTEL_EXPORTER_OTLP_ENDPOINT: $endpoint,
    OTEL_EXPORTER_OTLP_HEADERS: $headers,
    DASH0_ENVIRONMENT: $environment,
    DASH0_DEPLOYMENT_NAME: $deployment_name,
    DASH0_DEPLOYMENT_ID: $deployment_id,
    DASH0_VCS_REF_HEAD_REVISION: $vcs_revision,
    DASH0_VCS_REF_HEAD_NAME: $vcs_ref,
    DASH0_VCS_REPOSITORY_URL_FULL: $vcs_url
  }' >"$OUT_FILE"
chmod 600 "$OUT_FILE"
echo "otlp_config.json written for '${DASH0_ENV:-non-production}' (endpoint set, headers not shown)"
