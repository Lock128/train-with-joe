#!/bin/bash
# Prints what to configure in the Codemagic UI so mobile builds send telemetry to Dash0.
# Only prints text. No network access, no side effects, and no token values.
#
# Usage: ./scripts/codemagic-otel-vars.sh [--env beta|production|all] [--help]

set -euo pipefail

ENV_FILTER="all"

usage() {
  cat <<'EOF'
Usage: codemagic-otel-vars.sh [--env beta|production|all] [--help]

Prints the Codemagic secure variables, optional build variables and a
ready-to-paste build script step for Dash0 telemetry. Prints text only.

  --env beta|production|all   Limit the secure variables to one environment (default: all)
  --help                      Show this help
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --env)
      ENV_FILTER="${2:?--env needs a value: beta, production or all}"
      shift 2
      ;;
    --env=*)
      ENV_FILTER="${1#--env=}"
      shift
      ;;
    --help | -h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

case "${ENV_FILTER}" in
  beta | production | all) ;;
  *)
    echo "Invalid --env value: ${ENV_FILTER} (use beta, production or all)" >&2
    exit 1
    ;;
esac

ENDPOINT="https://ingress.eu-west-1.aws.dash0.com"

echo "=== 1. Secure variables (Codemagic: Environment variables, tick 'Secure') ==="
echo ""
echo "Headers go on ONE line, without quotes, and must contain both Authorization=Bearer and Dash0-Dataset=."
echo "Token values come from 'scripts/setup-otel.sh --rotate' (Dash0 PR) or the Dash0 UI. They are never printed here."
echo ""

if [ "${ENV_FILTER}" = "beta" ] || [ "${ENV_FILTER}" = "all" ]; then
  echo "Beta builds (DASH0_ENVIRONMENT=beta):"
  echo "  NONPROD_FLUTTER_OTLP_ENDPOINT = ${ENDPOINT}"
  echo "  NONPROD_FLUTTER_OTLP_HEADERS  = Authorization=Bearer <token of nonprod-train-with-joe-flutter-ingest>,Dash0-Dataset=nonprod-train-with-joe"
  echo "  DASH0_ENVIRONMENT             = beta"
  echo ""
fi

if [ "${ENV_FILTER}" = "production" ] || [ "${ENV_FILTER}" = "all" ]; then
  echo "Production builds (DASH0_ENVIRONMENT=production):"
  echo "  PROD_FLUTTER_OTLP_ENDPOINT = ${ENDPOINT}"
  echo "  PROD_FLUTTER_OTLP_HEADERS  = Authorization=Bearer <token of train-with-joe-flutter-ingest>,Dash0-Dataset=train-with-joe"
  echo "  DASH0_ENVIRONMENT          = production"
  echo ""
  echo "  This is a children's app. Before enabling production telemetry, deploy the updated privacy policy and"
  echo "  close the open legal review (COPPA/GDPR-K). See the privacy release gate in SETUP_OTEL.md (Dash0 PR)."
  echo ""
fi

cat <<'EOF'
=== 2. Optional build variables (only those the app reads) ===

  Variable                                Default / Codemagic source        Meaning
  DASH0_DEPLOYMENT_NAME                   train-with-joe-$DASH0_ENVIRONMENT Deployment name on telemetry
  DASH0_DEPLOYMENT_ID                     $BUILD_NUMBER                     Deployment id
  DASH0_VCS_REF_HEAD_REVISION             $FCI_COMMIT                       Commit SHA
  DASH0_VCS_REF_HEAD_NAME                 $FCI_BRANCH                       Branch or tag name
  DASH0_VCS_REPOSITORY_URL_FULL           $FCI_REPOSITORY_URL (if set)      Repository URL
  DASH0_SESSION_REPLAY_SAMPLING_RATE      0                                 Session replay rate, 0 to 1. Keep 0 (off) for a children's app
  DASH0_PROFILING_ENABLED                 false                             Enable profiling
  DASH0_HTTP_OVERRIDES_ENABLED            true (native)                     Trace dart:io HTTP calls
  DASH0_PROPAGATE_TRACE_HEADERS           true (native)                     Send trace headers on API calls
  DASH0_METRIC_EXPORT_INTERVAL_SECONDS    SDK default                       Metric export interval
  COMMIT_ID                               $FCI_COMMIT                       app.version resource attribute
  GITHUB_RUN_NUMBER                       $BUILD_NUMBER                     app.build_number resource attribute

  Set the optional ones as --dart-define flags or add them to otlp_config.json.
  DASH0_ENVIRONMENT and the OTLP endpoint/headers above are the only required ones.

=== 3. Codemagic script step ===

EOF

cat <<'EOF'
# Paste into a Codemagic "Custom script" step before the build. Replace the Amplify
# defines placeholder with the defines your build already passes.
set -euo pipefail
cd frontend/src

case "${DASH0_ENVIRONMENT:-}" in
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

if [ -z "$OTLP_ENDPOINT" ] || [ -z "$OTLP_HEADERS" ]; then
  echo "WARNING: OTLP endpoint or headers not set for '${DASH0_ENVIRONMENT:-}', telemetry disabled"
  OTLP_ENDPOINT=""
  OTLP_HEADERS=""
elif [[ "$OTLP_HEADERS" != *"Dash0-Dataset="* ]]; then
  echo "ERROR: headers must contain Dash0-Dataset=<dataset> (header value not shown)" >&2
  exit 1
fi

jq -n \
  --arg endpoint "$OTLP_ENDPOINT" \
  --arg headers "$OTLP_HEADERS" \
  --arg environment "${DASH0_ENVIRONMENT:-}" \
  --arg deployment_name "train-with-joe-${DASH0_ENVIRONMENT:-}" \
  --arg deployment_id "${BUILD_NUMBER:-}" \
  --arg vcs_revision "${FCI_COMMIT:-}" \
  --arg vcs_ref "${FCI_BRANCH:-}" \
  --arg vcs_url "${FCI_REPOSITORY_URL:-}" \
  '{
    OTEL_EXPORTER_OTLP_ENDPOINT: $endpoint,
    OTEL_EXPORTER_OTLP_HEADERS: $headers,
    DASH0_ENVIRONMENT: $environment,
    DASH0_DEPLOYMENT_NAME: $deployment_name,
    DASH0_DEPLOYMENT_ID: $deployment_id,
    DASH0_VCS_REF_HEAD_REVISION: $vcs_revision,
    DASH0_VCS_REF_HEAD_NAME: $vcs_ref,
    DASH0_VCS_REPOSITORY_URL_FULL: $vcs_url
  }' > otlp_config.json   # contains the token, never commit it
echo "otlp_config.json written (endpoint: $([ -n "$OTLP_ENDPOINT" ] && echo set || echo empty), headers not shown)"

flutter build apk --release \
  --dart-define=COMMIT_ID="${FCI_COMMIT:-}" \
  --dart-define=GITHUB_RUN_NUMBER="${BUILD_NUMBER:-}" \
  --dart-define-from-file=otlp_config.json
  # + your existing Amplify --dart-define flags

flutter build ipa --release \
  --dart-define=COMMIT_ID="${FCI_COMMIT:-}" \
  --dart-define=GITHUB_RUN_NUMBER="${BUILD_NUMBER:-}" \
  --dart-define-from-file=otlp_config.json
  # + your existing Amplify --dart-define flags
EOF
