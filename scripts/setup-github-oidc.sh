#!/usr/bin/env bash
# Requires bash 4+ for associative arrays — macOS ships with bash 3.2,
# so we use /opt/homebrew/bin/bash or /usr/local/bin/bash if available.
set -euo pipefail

###############################################################################
# setup-github-oidc.sh
#
# Sets up GitHub Actions OIDC federation across alpha, beta, and prod AWS
# accounts:
#   1. Creates the GitHub OIDC identity provider (if not already present)
#   2. Creates an IAM role that GitHub Actions can assume
#   3. Stores the role ARN as a GitHub Actions secret
#
# Prerequisites:
#   - AWS CLI v2 configured with profiles for each account
#   - GitHub CLI (gh) authenticated with repo access
#   - jq installed
#
# Usage:
#   ./scripts/setup-github-oidc.sh
#
# Environment variables (optional overrides):
#   GITHUB_REPO        - owner/repo (auto-detected from git remote)
#   ROLE_NAME          - IAM role name (default: github-actions-deploy)
#   POLICY_ARN         - IAM policy to attach (default: AdministratorAccess)
#   AWS_PROFILE_ALPHA  - AWS CLI profile for alpha account
#   AWS_PROFILE_BETA   - AWS CLI profile for beta account
#   AWS_PROFILE_PROD   - AWS CLI profile for prod account
###############################################################################

# --- Configuration -----------------------------------------------------------

ROLE_NAME="${ROLE_NAME:-github-actions-deploy}"
POLICY_ARN="${POLICY_ARN:-arn:aws:iam::aws:policy/AdministratorAccess}"
OIDC_PROVIDER_URL="token.actions.githubusercontent.com"
OIDC_AUDIENCE="sts.amazonaws.com"

# AWS CLI profiles — set these to match your ~/.aws/config
AWS_PROFILE_ALPHA="${AWS_PROFILE_ALPHA:-saas_alpha}"
AWS_PROFILE_BETA="${AWS_PROFILE_BETA:-saas_beta}"
AWS_PROFILE_PROD="${AWS_PROFILE_PROD:-saas_prod}"

# Parallel arrays — avoids bash 4+ associative array requirement
ENV_NAMES=(alpha beta prod)
ENV_PROFILES=("$AWS_PROFILE_ALPHA" "$AWS_PROFILE_BETA" "$AWS_PROFILE_PROD")
ENV_SECRETS=("AWS_ROLE_ARN" "AWS_ROLE_ARN_BETA" "AWS_ROLE_ARN_PROD")

# --- Helper functions --------------------------------------------------------

log()  { echo -e "\033[1;34m[INFO]\033[0m  $*" >&2; }
warn() { echo -e "\033[1;33m[WARN]\033[0m  $*" >&2; }
err()  { echo -e "\033[1;31m[ERROR]\033[0m $*" >&2; }

check_prerequisites() {
  local missing=0
  for cmd in aws gh jq; do
    if ! command -v "$cmd" &>/dev/null; then
      err "'$cmd' is required but not installed."
      missing=1
    fi
  done
  if [[ $missing -eq 1 ]]; then
    exit 1
  fi
}

detect_github_repo() {
  if [[ -n "${GITHUB_REPO:-}" ]]; then
    echo "$GITHUB_REPO"
    return
  fi
  local remote_url
  remote_url=$(git remote get-url origin 2>/dev/null || true)
  if [[ -z "$remote_url" ]]; then
    err "Could not detect GitHub repo. Set GITHUB_REPO=owner/repo"
    exit 1
  fi
  # Handle both SSH and HTTPS remotes
  echo "$remote_url" | sed -E 's#(git@github\.com:|https://github\.com/)##; s/\.git$//'
}

get_account_id() {
  local profile="$1"
  aws sts get-caller-identity --profile "$profile" --query 'Account' --output text
}

# --- Core functions ----------------------------------------------------------

ensure_oidc_provider() {
  local profile="$1"
  local account_id="$2"
  local provider_arn="arn:aws:iam::${account_id}:oidc-provider/${OIDC_PROVIDER_URL}"

  log "Checking OIDC provider in account $account_id..."

  if aws iam get-open-id-connect-provider \
       --open-id-connect-provider-arn "$provider_arn" \
       --profile "$profile" &>/dev/null; then
    log "OIDC provider already exists — skipping creation."
  else
    log "Creating OIDC provider..."

    # AWS no longer validates the thumbprint for GitHub's OIDC provider,
    # but the API still requires a non-empty value. A dummy thumbprint works.
    # See: https://github.com/aws-actions/configure-aws-credentials/issues/357
    local thumbprint="6938fd4d98bab03faadb97b34396831e3780aea1"

    if ! aws iam create-open-id-connect-provider \
      --url "https://${OIDC_PROVIDER_URL}" \
      --client-id-list "$OIDC_AUDIENCE" \
      --thumbprint-list "$thumbprint" \
      --profile "$profile" >/dev/null 2>&1; then
      err "Failed to create OIDC provider in account $account_id"
      return 1
    fi

    log "OIDC provider created."
  fi
}

create_iam_role() {
  local profile="$1"
  local account_id="$2"
  local repo="$3"
  local provider_arn="arn:aws:iam::${account_id}:oidc-provider/${OIDC_PROVIDER_URL}"

  log "Checking IAM role '$ROLE_NAME' in account $account_id..."

  if aws iam get-role --role-name "$ROLE_NAME" --profile "$profile" &>/dev/null; then
    log "Role '$ROLE_NAME' already exists — updating trust policy."
  else
    log "Creating IAM role '$ROLE_NAME'..."
  fi

  # Build trust policy
  local trust_policy
  trust_policy=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "${provider_arn}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "${OIDC_PROVIDER_URL}:aud": "${OIDC_AUDIENCE}"
        },
        "StringLike": {
          "${OIDC_PROVIDER_URL}:sub": "repo:${repo}:*"
        }
      }
    }
  ]
}
EOF
)

  if aws iam get-role --role-name "$ROLE_NAME" --profile "$profile" &>/dev/null; then
    aws iam update-assume-role-policy \
      --role-name "$ROLE_NAME" \
      --policy-document "$trust_policy" \
      --profile "$profile" >/dev/null
    log "Trust policy updated."
  else
    aws iam create-role \
      --role-name "$ROLE_NAME" \
      --assume-role-policy-document "$trust_policy" \
      --description "GitHub Actions OIDC role for ${repo}" \
      --profile "$profile" >/dev/null
    log "Role created."

    aws iam attach-role-policy \
      --role-name "$ROLE_NAME" \
      --policy-arn "$POLICY_ARN" \
      --profile "$profile" >/dev/null
    log "Attached policy: $POLICY_ARN"
  fi

  # Return the role ARN
  aws iam get-role --role-name "$ROLE_NAME" --profile "$profile" \
    --query 'Role.Arn' --output text
}

set_github_secret() {
  local repo="$1"
  local secret_name="$2"
  local secret_value="$3"

  log "Setting GitHub secret '$secret_name'..."
  echo "$secret_value" | gh secret set "$secret_name" --repo "$repo"
  log "Secret '$secret_name' set."
}

# --- Main --------------------------------------------------------------------

main() {
  check_prerequisites

  local repo
  repo=$(detect_github_repo)
  log "GitHub repository: $repo"

  echo ""
  log "This script will set up OIDC + IAM roles in the following accounts:"
  for i in "${!ENV_NAMES[@]}"; do
    echo "  - ${ENV_NAMES[$i]} (profile: ${ENV_PROFILES[$i]}, secret: ${ENV_SECRETS[$i]})"
  done
  echo ""

  read -rp "Continue? [y/N] " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    log "Aborted."
    exit 0
  fi

  local env_name profile secret_name account_id role_arn
  for i in 0 1 2; do
    env_name="${ENV_NAMES[$i]}"
    profile="${ENV_PROFILES[$i]}"
    secret_name="${ENV_SECRETS[$i]}"

    echo ""
    log "========== Setting up: $env_name (profile: $profile) =========="

    account_id=$(get_account_id "$profile")
    log "Account ID: $account_id"

    ensure_oidc_provider "$profile" "$account_id"

    role_arn=$(create_iam_role "$profile" "$account_id" "$repo")

    # Validate it looks like an ARN
    if [[ ! "$role_arn" =~ ^arn:aws:iam::[0-9]+:role/ ]]; then
      err "Expected a role ARN but got: '$role_arn'"
      exit 1
    fi

    log "Role ARN: $role_arn"
    log "Setting GitHub secret '$secret_name' = '$role_arn'"

    set_github_secret "$repo" "$secret_name" "$role_arn"

    log "Done with $env_name."
  done

  echo ""
  log "All environments configured. GitHub secrets set:"
  for i in "${!ENV_NAMES[@]}"; do
    echo "  - ${ENV_SECRETS[$i]}"
  done
  echo ""
  log "Your workflows can now use:"
  echo '  role-to-assume: ${{ secrets.AWS_ROLE_ARN }}'
  echo '  role-to-assume: ${{ secrets.AWS_ROLE_ARN_BETA }}'
  echo '  role-to-assume: ${{ secrets.AWS_ROLE_ARN_PROD }}'
}

main "$@"
