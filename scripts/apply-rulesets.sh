#!/usr/bin/env bash
# apply-rulesets.sh — Apply standard repository rulesets to combsmith/broodly
#
# Applies the rulesets defined in:
#   https://github.com/combsmith/.github/blob/main/standards/github-settings.md#repository-rulesets
#
# Rulesets managed:
#   pr-quality    — pull request review requirements and merge policy
#   code-quality  — required status checks (CI, SonarCloud, CodeQL, agent-shield, dependency-audit)
#
# NOTE: claude-code / claude is intentionally NOT a required check.
# claude-code-action's GitHub App refuses to mint a token for any PR that
# touches workflow files, which would deadlock every workflow-modifying PR.
# The check still runs on normal PRs for review feedback but is not a merge gate.
# See: https://github.com/combsmith/.github/blob/main/standards/ci-standards.md#centralization-tiers
#
# Usage:
#   GH_TOKEN=<admin-token> ./scripts/apply-rulesets.sh [--dry-run] [--force]
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

REPO_ARG=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --force)   FORCE=true; shift ;;
    --repo)
      if [[ $# -lt 2 || -z "${2:-}" ]]; then err "--repo requires a value (<owner>/<repo>)"; exit 1; fi
      REPO_ARG="$2"; shift 2 ;;
    --repo=*)
      REPO_ARG="${1#*=}"
      if [[ -z "$REPO_ARG" ]]; then err "--repo= requires a non-empty value (<owner>/<repo>)"; exit 1; fi
      shift ;;
    -h|--help)
      echo "Usage: $0 [--repo <owner>/<repo>] [--dry-run] [--force]"
      echo "  --repo   Target repository (default: $ORG/$REPO); must match the checkout unless --force"
      echo "  --force  Skip repo-identity safety check (use when running from a fork or CI)"
      exit 0
      ;;
    *) err "Unknown flag: $1"; exit 1 ;;
  esac
done

# Resolve --repo into ORG/REPO. The value must be a well-formed <owner>/<repo>
# (exactly one slash, non-empty parts). The repo-identity guard below still
# validates that the resolved target matches the current checkout unless --force.
if [[ -n "$REPO_ARG" ]]; then
  if [[ "$REPO_ARG" != */* || "$REPO_ARG" == */*/* || "${REPO_ARG%%/*}" == "" || "${REPO_ARG##*/}" == "" ]]; then
    err "Invalid --repo value: '$REPO_ARG' (expected <owner>/<repo>)"
    exit 1
  fi
  ORG="${REPO_ARG%%/*}"
  REPO="${REPO_ARG##*/}"
fi

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
  if [[ "${actual_repo,,}" != "${ORG,,}/${REPO,,}" ]]; then
    err "Current repo ($actual_repo) does not match target ($ORG/$REPO)."
    err "Run with --force to override this safety check."
    exit 1
  fi
fi

# ---------------------------------------------------------------------------
# pr-quality ruleset
#
# bypass_actors:
#   actor_id 0 / OrganizationAdmin — org admins can always bypass PR rules
#   actor_id 3167543 / Integration  — this is the claude-code-action GitHub App
#     (https://github.com/apps/claude-code-action).  bypass_mode "pull_request"
#     lets it open and merge its own PRs without requiring a human review, which
#     is necessary for automated fix PRs produced by Claude Code in CI.
#     The numeric ID was obtained via:
#       gh api /apps/claude-code-action --jq '.id'
# ---------------------------------------------------------------------------
PR_QUALITY_PAYLOAD=$(cat <<'PAYLOAD'
{
  "name": "pr-quality",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": ["~DEFAULT_BRANCH"],
      "exclude": []
    }
  },
  "rules": [
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 1,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": true,
        "require_last_push_approval": true,
        "required_review_thread_resolution": true
      }
    },
    { "type": "required_linear_history" },
    { "type": "non_fast_forward" },
    { "type": "deletion" }
  ],
  "bypass_actors": [
    {
      "actor_id": 0,
      "actor_type": "OrganizationAdmin",
      "bypass_mode": "always"
    },
    {
      "actor_id": 3167543,
      "actor_type": "Integration",
      "bypass_mode": "pull_request"
    }
  ]
}
PAYLOAD
)

# ---------------------------------------------------------------------------
# code-quality ruleset
#
# Required check contexts for combsmith/broodly (as detected by the
# org-level apply-rulesets.sh from combsmith/.github):
#
#   SonarCloud                            sonarcloud.yml present
#   CodeQL                                GitHub-managed default setup configured
#   agent-shield / AgentShield            agent-shield.yml (stub → reusable)
#   dependency-audit / Detect ecosystems  dependency-audit.yml (stub → reusable)
#   TypeScript                            ci.yml job name: TypeScript
#   Go                                    ci.yml job name: Go
#
# claude-code / claude is intentionally omitted — see header comment.
# ---------------------------------------------------------------------------
CODE_QUALITY_PAYLOAD=$(cat <<'PAYLOAD'
{
  "name": "code-quality",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": ["~DEFAULT_BRANCH"],
      "exclude": []
    }
  },
  "rules": [
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "do_not_enforce_on_create": false,
        "required_status_checks": [
          {"context": "SonarCloud"},
          {"context": "CodeQL"},
          {"context": "agent-shield / AgentShield"},
          {"context": "dependency-audit / Detect ecosystems"},
          {"context": "TypeScript"},
          {"context": "Go"}
        ]
      }
    }
  ],
  "bypass_actors": []
}
PAYLOAD
)

# ---------------------------------------------------------------------------
# Apply
# ---------------------------------------------------------------------------
# In --dry-run mode, skip the live rulesets API fetch and treat existing
# rulesets as empty. This avoids all `gh api repos/.../rulesets` network calls
# so the payload output is deterministic. Note: GH_TOKEN is still required by
# the guard above, and `gh repo view` runs unless --force is also passed.
if [[ "$DRY_RUN" = true ]]; then
  existing="[]"
else
  info "Fetching existing rulesets for $ORG/$REPO ..."
  if ! existing=$(gh api "repos/$ORG/$REPO/rulesets"); then
    err "Failed to fetch existing rulesets for $ORG/$REPO — check GH_TOKEN has administration:read scope"
    exit 1
  fi
fi

apply_ruleset() {
  local name="$1"
  local payload="$2"
  local match_count existing_id

  # Guard against duplicate ruleset names: multiple matches would produce a
  # multi-line string that breaks the API URL and causes a confusing failure.
  match_count=$(echo "$existing" | jq -r --arg n "$name" '[.[] | select(.name == $n)] | length')
  if [[ "$match_count" -gt 1 ]]; then
    err "Multiple ($match_count) rulesets named '$name' found — resolve duplicates manually before rerunning."
    exit 1
  fi
  existing_id=$(echo "$existing" | jq -r --arg n "$name" 'first(.[] | select(.name == $n) | .id) // empty')

  if [[ "$DRY_RUN" = true ]]; then
    if [[ -n "$existing_id" ]]; then
      skip "DRY_RUN — would UPDATE $name ruleset (id=$existing_id)"
    else
      skip "DRY_RUN — would CREATE $name ruleset"
    fi
    echo "$payload" | jq '.'
    return 0
  fi

  if [[ -n "$existing_id" ]]; then
    info "Updating existing $name ruleset (id=$existing_id) ..."
    echo "$payload" | gh api -X PUT "repos/$ORG/$REPO/rulesets/$existing_id" --input - > /dev/null
    ok "$name ruleset updated"
  else
    info "Creating $name ruleset ..."
    echo "$payload" | gh api -X POST "repos/$ORG/$REPO/rulesets" --input - > /dev/null
    ok "$name ruleset created"
  fi
}

apply_ruleset "pr-quality"   "$PR_QUALITY_PAYLOAD"
apply_ruleset "code-quality" "$CODE_QUALITY_PAYLOAD"

ok "Done — rulesets applied to $ORG/$REPO"
