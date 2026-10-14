#!/usr/bin/env bash
# apply-repo-settings.sh — Apply standard repository settings to combsmith/broodly
#
# Applies settings defined in:
#   https://github.com/combsmith/.github/blob/main/standards/github-settings.md
#
# Settings managed:
#   security_and_analysis — enables the required repo-level secret-scanning and
#     Dependabot settings from the push-protection standard, including
#     secret_scanning_non_provider_patterns.
#     https://github.com/combsmith/.github/blob/main/standards/push-protection.md#required-repo-level-settings
#   check-suite preferences — disables auto-trigger for the Claude GitHub App (ID 1236702)
#     and CodeRabbit (ID 347564) so that they no longer create perpetually-queued check
#     suites on every push, which would otherwise block auto-merge indefinitely.
#
# Usage:
#   GH_TOKEN=<admin-token> ./scripts/apply-repo-settings.sh [<repo>] [--dry-run] [--force]
#
# Arguments:
#   <repo>      Repository name (default: broodly). Positional, must come before flags.
#
# Requirements:
#   - GH_TOKEN must have administration:write scope on this repo
#   - gh CLI must be installed
#   - jq must be installed

set -euo pipefail

ORG="combsmith"
REPO="broodly"
DRY_RUN=false
FORCE=false

info()  { echo "[INFO]  $*"; }
ok()    { echo "[OK]    $*"; }
err()   { echo "[ERROR] $*" >&2; }
skip()  { echo "[SKIP]  $*"; }

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --force)   FORCE=true ;;
    -h|--help)
      echo "Usage: $0 [<repo>] [--dry-run] [--force]"
      echo "  <repo>   Repository name (default: broodly)"
      echo "  --force  Skip repo-identity safety check (use when running from a fork or CI)"
      exit 0
      ;;
    -*) err "Unknown flag: $arg"; exit 1 ;;
    *)  REPO="$arg" ;;
  esac
done

if [[ -z "${GH_TOKEN:-}" ]]; then
  err "GH_TOKEN is required — provide a token with administration:write scope"
  exit 1
fi

export GH_TOKEN

# Safety guard: verify the current git remote matches ORG/REPO.
# Prevents accidentally targeting the wrong repository when running from a fork
# or a different checkout that has administration access to combsmith/broodly.
if [[ "$FORCE" = false ]]; then
  actual_repo=$(gh repo view --json nameWithOwner -q '.nameWithOwner' 2>/dev/null || true)
  if [[ -z "$actual_repo" ]]; then
    err "Unable to determine current repo (gh repo view failed)."
    err "Run with --force to skip this safety check, or ensure GH_TOKEN has repo read access."
    exit 1
  fi
  if [[ "$actual_repo" != "$ORG/$REPO" ]]; then
    err "Current repo ($actual_repo) does not match target ($ORG/$REPO)."
    err "Run with --force to override this safety check."
    exit 1
  fi
fi

# ---------------------------------------------------------------------------
# security_and_analysis settings
#
# Enforce the required repo-level security features per the push-protection
# standard. Each must be "enabled". Patching a value that is already enabled is
# idempotent; a value the plan/license does not permit (e.g. settings that need
# GitHub Advanced Security) returns an error, which we surface as a warning
# without aborting the rest of the run.
#
# Required set:
#   https://github.com/combsmith/.github/blob/main/standards/push-protection.md#required-repo-level-settings
# ---------------------------------------------------------------------------
readonly -a REQUIRED_SA_SETTINGS=(
  secret_scanning
  secret_scanning_push_protection
  secret_scanning_ai_detection
  secret_scanning_non_provider_patterns
)

info "Enforcing security_and_analysis settings for $ORG/$REPO ..."

for sa_key in "${REQUIRED_SA_SETTINGS[@]}"; do
  sa_payload=$(jq -n --arg k "$sa_key" '{"security_and_analysis": {($k): {"status": "enabled"}}}')
  if [[ "$DRY_RUN" = true ]]; then
    skip "DRY_RUN — would PATCH repos/$ORG/$REPO security_and_analysis.$sa_key = enabled"
    echo "$sa_payload" | jq '.'
  elif echo "$sa_payload" | gh api -X PATCH "repos/$ORG/$REPO" --input - > /dev/null; then
    ok "security_and_analysis.$sa_key enabled"
  else
    err "Could not enable security_and_analysis.$sa_key (may require GitHub Advanced Security)"
  fi
done

# ---------------------------------------------------------------------------
# Dependabot settings
#
# Dependabot alerts and automated security fixes cannot be set via the
# security_and_analysis PATCH endpoint — doing so returns a 422 error.
# They each have a dedicated PUT endpoint.
# ---------------------------------------------------------------------------
info "Enforcing Dependabot settings for $ORG/$REPO ..."

if [[ "$DRY_RUN" = true ]]; then
  skip "DRY_RUN — would PUT repos/$ORG/$REPO/vulnerability-alerts"
  skip "DRY_RUN — would PUT repos/$ORG/$REPO/automated-security-fixes"
else
  if gh api -X PUT "repos/$ORG/$REPO/vulnerability-alerts" > /dev/null; then
    ok "vulnerability-alerts enabled"
  else
    err "Could not enable vulnerability-alerts"
  fi

  if gh api -X PUT "repos/$ORG/$REPO/automated-security-fixes" > /dev/null; then
    ok "automated-security-fixes enabled"
  else
    err "Could not enable automated-security-fixes"
  fi
fi

# ---------------------------------------------------------------------------
# check-suite preferences
#
# Disable auto-trigger for the Claude GitHub App (ID 1236702) and
# CodeRabbit (ID 347564).
#
# When auto-trigger is enabled, GitHub creates a queued check suite on every
# push. Because these apps do not complete check suites on their own, they
# remain in "queued" state permanently and block auto-merge on every PR.
#
# App IDs obtained via:
#   gh api /apps/claude --jq '.id'
#   gh api /apps/coderabbitai --jq '.id'
# ---------------------------------------------------------------------------
CLAUDE_APP_ID=1236702
CODERABBIT_APP_ID=347564

CHECK_SUITE_PAYLOAD=$(cat <<PAYLOAD
{
  "auto_trigger_checks": [
    {
      "app_id": ${CLAUDE_APP_ID},
      "setting": false
    },
    {
      "app_id": ${CODERABBIT_APP_ID},
      "setting": false
    }
  ]
}
PAYLOAD
)

info "Configuring check-suite preferences for $ORG/$REPO ..."

if [[ "$DRY_RUN" = true ]]; then
  skip "DRY_RUN — would PATCH repos/$ORG/$REPO/check-suites/preferences:"
  echo "$CHECK_SUITE_PAYLOAD" | jq '.'
else
  echo "$CHECK_SUITE_PAYLOAD" | gh api -X PATCH "repos/$ORG/$REPO/check-suites/preferences" --input - > /dev/null
  ok "check-suite auto-trigger disabled for Claude (ID=$CLAUDE_APP_ID) and CodeRabbit (ID=$CODERABBIT_APP_ID)"
fi

ok "Done — repository settings applied to $ORG/$REPO"
