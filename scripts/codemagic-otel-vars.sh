#!/bin/bash
# Prints the Codemagic variables for Dash0 telemetry in mobile builds.
#
# With DASH0_AUTH_TOKEN (a Dash0 admin token, from the environment only) it creates dedicated
# ingest-only tokens named <slug>-codemagic-ingest (separate from the GitHub -flutter-ingest
# tokens, which are never touched) and prints ready-to-paste NAME=value lines including the
# real header secrets. Dash0 never returns a token secret after creation, so an existing token
# is not readable again: use --rotate to create a new one (this invalidates the old one).
# Without DASH0_AUTH_TOKEN it prints placeholders only.
#
# Secrets go to stdout only. They are refused when stdout is not a terminal (unless
# --print-secrets-to-pipe) and when CI or CM_BUILD_ID is set. They are never written to files
# in the repo, stderr or command arguments.
#
# Usage: ./scripts/codemagic-otel-vars.sh [--env beta|production|all] [--rotate] [--dry-run]
#          [--print-secrets-to-pipe] [--help]

set -euo pipefail

ENV_FILTER="all"
ROTATE=false
DRY_RUN=false
PIPE_OK=false

DASH0_API_URL="${DASH0_API_URL:-https://api.eu-west-1.aws.dash0.com}"
MIN_CLI_VERSION="1.22"
ENDPOINT="https://ingress.eu-west-1.aws.dash0.com"

usage() {
  cat <<'EOF'
Usage: codemagic-otel-vars.sh [--env beta|production|all] [--rotate] [--dry-run]
                              [--print-secrets-to-pipe] [--help]

Prints the Codemagic variables for Dash0 telemetry as NAME=value lines.

With DASH0_AUTH_TOKEN set (Dash0 admin token, environment only; needs dash0 CLI >= 1.22 and jq)
it creates the ingest-only tokens <slug>-codemagic-ingest and prints the real values. Mark the
secret ones as "Secure" in Codemagic. Without it, placeholders are printed.

  --env beta|production|all   Limit to one environment (default: all)
  --rotate                    Re-create an existing Codemagic token. The old one stops working.
                              Without it an existing token is kept and its secret cannot be shown.
  --dry-run                   Validate only, create nothing, print no secrets.
  --print-secrets-to-pipe     Allow printing secrets when stdout is not a terminal.
  --help                      Show this help

Secrets are refused when CI or CM_BUILD_ID is set. DASH0_API_URL defaults to
https://api.eu-west-1.aws.dash0.com.
EOF
}

die() {
  echo "ERROR: $*" >&2
  exit 1
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
    --rotate) ROTATE=true; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    --print-secrets-to-pipe) PIPE_OK=true; shift ;;
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
  *) die "Invalid --env value: ${ENV_FILTER} (use beta, production or all)" ;;
esac

LIVE=false
if [ -n "${DASH0_AUTH_TOKEN:-}" ]; then
  LIVE=true
fi

WORK_DIR=""
cleanup() { [ -z "$WORK_DIR" ] || rm -rf "$WORK_DIR"; }
trap cleanup EXIT

# --- Helpers (same style as setup-otel.sh) ---------------------------------

write_dataset_yaml() {
  local slug="$1" file="$2"
  cat >"$file" <<EOF
apiVersion: dash0.com/v1alpha1
kind: Dash0Dataset
metadata:
  name: ${slug}
  labels:
    dash0.com/id: ${slug}
spec:
  slug: ${slug}
  preferred: false
  permissions:
    - actions: [dataset:read]
      role: basic_member
  privacy:
    geoLocation:
      endUser:
        storage: up_to_city
    ipAddresses:
      endUser:
        storage: anonymize
  retention:
    logs: 30d
    metrics: 13M
    profiles: 30d
    traces: 30d
    webEvents: 30d
EOF
}

write_token_yaml() {
  local slug="$1" name="$2" file="$3"
  cat >"$file" <<EOF
apiVersion: dash0.com/v1alpha1
kind: Dash0AuthToken
metadata:
  name: ${name}
spec:
  actions: [ingest:*]
  ingestion:
    defaultDataset: ${slug}
  scope:
    datasets:
      restriction: restricted
      slugs: [${slug}]
    signals:
      restriction: unrestricted
      types: []
EOF
}

# Prints the id of the auth token with the given name, or nothing if none exists.
find_token_id() {
  local name="$1" list
  list="$(dash0 -X auth-tokens list -o json)" || die "Could not list Dash0 auth tokens. Check DASH0_AUTH_TOKEN and DASH0_API_URL."
  printf '%s' "$list" | jq -r --arg name "$name" '
    [.. | objects
      | select((.metadata.name? // .name? // "") == $name)
      | (.metadata.labels["dash0.com/id"]? // .metadata.id? // .id? // empty)]
    | first // empty'
}

# Creates the token for one environment. Sets TOKEN_SECRET (empty if not available) and TOKEN_STATE
# (created, rotated, exists, dry-run).
provision_token() {
  local slug="$1"
  local token_name="${slug}-codemagic-ingest"
  local ds_file="$WORK_DIR/ds-${slug}.yaml"
  local tok_file="$WORK_DIR/tok-${slug}.yaml"
  local secret_file="$WORK_DIR/${slug}.tok"
  TOKEN_SECRET=""
  TOKEN_STATE=""

  write_dataset_yaml "$slug" "$ds_file"
  write_token_yaml "$slug" "$token_name" "$tok_file"

  local existing_id
  existing_id="$(find_token_id "$token_name")"

  if [ "$DRY_RUN" = true ]; then
    dash0 -X datasets create -f "$ds_file" --dry-run >&2
    dash0 -X auth-tokens create -f "$tok_file" --secret-file "$secret_file" --dry-run >&2
    echo "Plan for ${slug}:" >&2
    echo "  - create or update dataset ${slug}" >&2
    if [ -n "$existing_id" ] && [ "$ROTATE" = true ]; then
      echo "  - delete existing token ${token_name} (--rotate)" >&2
    elif [ -n "$existing_id" ]; then
      echo "  - keep existing token ${token_name} (secret not readable, use --rotate)" >&2
    fi
    if [ -z "$existing_id" ] || [ "$ROTATE" = true ]; then
      echo "  - create token ${token_name} (ingest:*, restricted to dataset ${slug})" >&2
    fi
    TOKEN_STATE="dry-run"
    return 0
  fi

  if [ -n "$existing_id" ] && [ "$ROTATE" != true ]; then
    TOKEN_STATE="exists"
    return 0
  fi

  dash0 -X datasets create -f "$ds_file" >&2

  if [ -n "$existing_id" ]; then
    echo "Deleting existing token ${token_name} (rotation)" >&2
    dash0 -X auth-tokens delete "$existing_id" --force >&2
    TOKEN_STATE="rotated"
  else
    TOKEN_STATE="created"
  fi

  dash0 -X auth-tokens create -f "$tok_file" --secret-file "$secret_file" >&2
  [ -s "$secret_file" ] || die "Token was created but the secret file is empty."
  TOKEN_SECRET="$(tr -d '[:space:]' <"$secret_file")"
  rm -f "$secret_file"
}

# --- Prerequisites and secret-safety checks --------------------------------

if [ "$LIVE" = true ]; then
  for tool in dash0 jq; do
    command -v "$tool" >/dev/null 2>&1 || die "'$tool' not found in PATH (needed because DASH0_AUTH_TOKEN is set)."
  done
  export DASH0_AUTH_TOKEN DASH0_API_URL

  CLI_VERSION="$(dash0 --version 2>/dev/null | grep -Eo '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -n1 || true)"
  [ -n "$CLI_VERSION" ] || die "Could not determine the dash0 CLI version."
  if [ "$(printf '%s\n%s\n' "$MIN_CLI_VERSION" "$CLI_VERSION" | sort -V | head -n1)" != "$MIN_CLI_VERSION" ]; then
    die "dash0 CLI $CLI_VERSION is too old. Need >= $MIN_CLI_VERSION (https://github.com/dash0hq/dash0-cli/releases)."
  fi

  if [ "$DRY_RUN" != true ]; then
    if [ -n "${CI:-}" ] || [ -n "${CM_BUILD_ID:-}" ]; then
      die "Refusing to print secrets in a CI or Codemagic build (CI or CM_BUILD_ID is set). Run this on your own machine."
    fi
    if [ ! -t 1 ] && [ "$PIPE_OK" != true ]; then
      die "Refusing to print secrets because stdout is not a terminal. Run it in a terminal, or pass --print-secrets-to-pipe if you accept that."
    fi
  fi

  WORK_DIR="$(mktemp -d)"
  chmod 700 "$WORK_DIR"
fi

# --- Section 1: variables --------------------------------------------------

BETA_SLUG="nonprod-train-with-joe"
PROD_SLUG="train-with-joe"

# print_env <label> <prefix> <slug> <dash0 environment>
print_env() {
  local label="$1" prefix="$2" slug="$3" envname="$4" headers
  echo "${label} (DASH0_ENVIRONMENT=${envname}):"
  if [ "$LIVE" = true ]; then
    provision_token "$slug"
    case "$TOKEN_STATE" in
      created | rotated) headers="Authorization=Bearer ${TOKEN_SECRET},Dash0-Dataset=${slug}" ;;
      *) headers="Authorization=Bearer <token of ${slug}-codemagic-ingest>,Dash0-Dataset=${slug}" ;;
    esac
  else
    TOKEN_STATE="placeholder"
    headers="Authorization=Bearer <token of ${slug}-codemagic-ingest>,Dash0-Dataset=${slug}"
  fi
  echo "  ${prefix}_FLUTTER_OTLP_ENDPOINT=${ENDPOINT}"
  case "$TOKEN_STATE" in
    created | rotated) echo "  ${prefix}_FLUTTER_OTLP_HEADERS=${headers}    <- SECRET: tick 'Secure' in Codemagic" ;;
    *) echo "  ${prefix}_FLUTTER_OTLP_HEADERS=${headers}" ;;
  esac
  echo "  DASH0_ENVIRONMENT=${envname}"
  case "$TOKEN_STATE" in
    exists)
      echo "  Note: token ${slug}-codemagic-ingest already exists. Its secret cannot be retrieved again."
      echo "        Run with --rotate to create a new one (this invalidates the old one)."
      ;;
    dry-run)
      echo "  Note: dry run, nothing was created."
      ;;
  esac
  echo ""
  TOKEN_SECRET=""
  headers=""
}

echo "=== 1. Codemagic environment variables ==="
echo ""
if [ "$LIVE" = true ] && [ "$DRY_RUN" != true ]; then
  echo "Paste each NAME=value line into Codemagic (Environment variables). Tick 'Secure' for the HEADERS lines."
  echo "Headers go on ONE line, without quotes. Secrets are shown once and are not stored anywhere."
else
  echo "Headers go on ONE line, without quotes, and must contain both Authorization=Bearer and Dash0-Dataset=."
  if [ "$LIVE" != true ]; then
    echo "Placeholders only. Set DASH0_AUTH_TOKEN (admin token) to create the tokens and get real values."
  fi
fi
echo ""

if [ "${ENV_FILTER}" = "beta" ] || [ "${ENV_FILTER}" = "all" ]; then
  print_env "Beta builds" NONPROD "$BETA_SLUG" beta
fi

if [ "${ENV_FILTER}" = "production" ] || [ "${ENV_FILTER}" = "all" ]; then
  print_env "Production builds" PROD "$PROD_SLUG" production
  echo "  This is a children's app. Before enabling production telemetry, deploy the updated privacy policy and"
  echo "  close the open legal review (COPPA/GDPR-K). See the privacy release gate in SETUP_OTEL.md."
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

=== 3. Codemagic pre-build step and build commands ===

Add this as the Codemagic pre-build script. It works from any directory and writes
frontend/src/otlp_config.json from the variables above (never printing header values):

  bash scripts/codemagic-otel-prebuild.sh

Then build from frontend/src:

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
