#!/bin/bash
set -euo pipefail

# Sets up Dash0 datasets and ingest-only tokens for the Flutter app and stores the
# resulting OTLP settings as GitHub Actions secrets. Run it from your own machine.
# No token value is written to the repository, printed, or passed on a command line.
#
# Usage: ./setup-otel.sh [--dry-run] [--rotate] [--only nonprod|prod] [--help]
# Required env: DASH0_AUTH_TOKEN (Dash0 admin token)
# Optional env: DASH0_API_URL (default https://api.eu-west-1.aws.dash0.com)
# See SETUP_OTEL.md ("Local setup script").

REPO="Lock128/train-with-joe"
OTLP_ENDPOINT="https://ingress.eu-west-1.aws.dash0.com"
DASH0_API_URL="${DASH0_API_URL:-https://api.eu-west-1.aws.dash0.com}"
MIN_CLI_VERSION="1.22"

DRY_RUN=false
ROTATE=false
ONLY=""

usage() {
  cat <<'EOF'
Usage: setup-otel.sh [--dry-run] [--rotate] [--only nonprod|prod] [--help]

Creates or updates the Dash0 datasets and ingest-only tokens for Train with Joe and
sets the GitHub Actions secrets NONPROD_FLUTTER_OTLP_ENDPOINT, NONPROD_FLUTTER_OTLP_HEADERS,
PROD_FLUTTER_OTLP_ENDPOINT and PROD_FLUTTER_OTLP_HEADERS on Lock128/train-with-joe.

Options:
  --dry-run          Validate with dash0 --dry-run and print the plan. Changes nothing.
  --rotate           Delete an existing <slug>-flutter-ingest token and create a new one.
                     Without it, an existing token makes the script stop, because the token
                     secret is only returned at creation.
  --only nonprod|prod  Handle one environment only.
  --help             Show this help.

Requirements:
  dash0 CLI >= 1.22, gh CLI logged in with permission to write Actions secrets, jq,
  and the environment variable DASH0_AUTH_TOKEN (an admin token, never an argument).
  DASH0_API_URL defaults to https://api.eu-west-1.aws.dash0.com.
EOF
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --rotate) ROTATE=true ;;
    --only)
      [ $# -ge 2 ] || die "--only needs a value: nonprod or prod"
      ONLY="$2"
      shift
      ;;
    --help | -h)
      usage
      exit 0
      ;;
    *)
      usage >&2
      die "Unknown argument: $1"
      ;;
  esac
  shift
done

case "$ONLY" in
  "" | nonprod | prod) ;;
  *) die "--only must be nonprod or prod" ;;
esac

# --- Prerequisites ---------------------------------------------------------

for tool in dash0 gh jq; do
  command -v "$tool" >/dev/null 2>&1 || die "'$tool' not found in PATH."
done

[ -n "${DASH0_AUTH_TOKEN:-}" ] || die "DASH0_AUTH_TOKEN is not set. Export a Dash0 admin token (one that can manage datasets and auth tokens), for example: read -rs DASH0_AUTH_TOKEN && export DASH0_AUTH_TOKEN"
export DASH0_AUTH_TOKEN DASH0_API_URL

CLI_VERSION="$(dash0 --version 2>/dev/null | grep -Eo '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -n1 || true)"
[ -n "$CLI_VERSION" ] || die "Could not determine the dash0 CLI version."
if [ "$(printf '%s\n%s\n' "$MIN_CLI_VERSION" "$CLI_VERSION" | sort -V | head -n1)" != "$MIN_CLI_VERSION" ]; then
  die "dash0 CLI $CLI_VERSION is too old. Need >= $MIN_CLI_VERSION (https://github.com/dash0hq/dash0-cli/releases)."
fi

gh auth status >/dev/null 2>&1 || die "gh is not logged in. Run: gh auth login"

if ! gh api "repos/$REPO/actions/secrets/public-key" >/dev/null 2>&1; then
  cat >&2 <<EOF
ERROR: gh cannot access the Actions secrets of $REPO (HTTP 403 or 404).
Your gh login needs permission to write Actions secrets. Fix one of:
  - Classic token: scope 'repo'.
  - Fine-grained token: repository $REPO with 'Secrets: Read and write' (and 'Metadata: Read').
Then run: gh auth login   (or: gh auth refresh -s repo)
Note: a GITHUB_TOKEN or GH_TOKEN environment variable overrides the stored login. Unset it
if it holds a token without this permission.
EOF
  exit 1
fi

# --- Working directory -----------------------------------------------------

WORK_DIR="$(mktemp -d)"
chmod 700 "$WORK_DIR"
trap 'rm -rf "$WORK_DIR"' EXIT

# --- Helpers ---------------------------------------------------------------

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

setup_env() {
  local prefix="$1" slug="$2"
  local token_name="${slug}-flutter-ingest"
  local ds_file="$WORK_DIR/ds-${slug}.yaml"
  local tok_file="$WORK_DIR/tok-${slug}.yaml"
  local secret_file="$WORK_DIR/${slug}.tok"

  echo
  echo "== ${prefix}: dataset '${slug}', token '${token_name}' =="

  write_dataset_yaml "$slug" "$ds_file"
  write_token_yaml "$slug" "$token_name" "$tok_file"

  local existing_id
  existing_id="$(find_token_id "$token_name")"

  if [ -n "$existing_id" ] && [ "$ROTATE" != true ]; then
    die "Token '${token_name}' already exists and its secret cannot be read again. Re-run with --rotate to replace it (the old token stops working at once)."
  fi

  if [ "$DRY_RUN" = true ]; then
    dash0 -X datasets create -f "$ds_file" --dry-run
    dash0 -X auth-tokens create -f "$tok_file" --secret-file "$secret_file" --dry-run
    echo "Plan:"
    echo "  - create or update dataset ${slug}"
    if [ -n "$existing_id" ]; then
      echo "  - delete existing token ${token_name} (--rotate)"
    fi
    echo "  - create token ${token_name} (ingest:*, restricted to dataset ${slug})"
    echo "  - set secrets ${prefix}_FLUTTER_OTLP_ENDPOINT and ${prefix}_FLUTTER_OTLP_HEADERS on ${REPO}"
    return 0
  fi

  dash0 -X datasets create -f "$ds_file"

  if [ -n "$existing_id" ]; then
    echo "Deleting existing token ${token_name} (rotation)"
    dash0 -X auth-tokens delete "$existing_id" --force
  fi

  dash0 -X auth-tokens create -f "$tok_file" --secret-file "$secret_file"
  [ -s "$secret_file" ] || die "Token was created but the secret file is empty."

  # The secret never appears in argv or in output: it is read from the file
  # and piped to gh on stdin.
  local token
  token="$(tr -d '[:space:]' <"$secret_file")"
  printf '%s' "$OTLP_ENDPOINT" | gh secret set "${prefix}_FLUTTER_OTLP_ENDPOINT" --repo "$REPO"
  printf 'Authorization=Bearer %s,Dash0-Dataset=%s' "$token" "$slug" |
    gh secret set "${prefix}_FLUTTER_OTLP_HEADERS" --repo "$REPO"
  token=""
  rm -f "$secret_file"
}

# --- Run -------------------------------------------------------------------

if [ "$DRY_RUN" = true ]; then
  echo "Dry run: nothing will be created, deleted or set."
fi

if [ -z "$ONLY" ] || [ "$ONLY" = "nonprod" ]; then
  setup_env NONPROD nonprod-train-with-joe
fi
if [ -z "$ONLY" ] || [ "$ONLY" = "prod" ]; then
  setup_env PROD train-with-joe
fi

echo
if [ "$DRY_RUN" = true ]; then
  echo "Dry run finished."
else
  echo "Done. Secrets set on ${REPO}. Production telemetry stays gated by the privacy release gate in SETUP_OTEL.md."
fi
