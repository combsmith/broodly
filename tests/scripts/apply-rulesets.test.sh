#!/usr/bin/env bash
# Test: scripts/apply-rulesets.sh codifies the pr-quality and code-quality
# rulesets required by the org github-settings standard.
#
# Focus: the pr-quality `pull_request` rule must set the compliance-critical
# boolean parameters to true — dismiss_stale_reviews_on_push (compliance check
# ruleset-drift-pr-quality-dismiss_stale_reviews_on_push),
# require_code_owner_review (ruleset-drift-pr-quality-require_code_owner_review)
# and require_last_push_approval (ruleset-drift-pr-quality-require_last_push_approval).
# These are asserted as strict booleans so a string "true" cannot pass.
#
# Runs the script in --dry-run --force mode so no real GitHub API calls are
# made and the repo-identity safety check is skipped. Asserts the dry-run
# output contains the codified ruleset payloads.
#
# Run: bash tests/scripts/apply-rulesets.test.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="${REPO_ROOT}/scripts/apply-rulesets.sh"

fail=0
pass_count=0

assert_contains() {
  local needle="$1" desc="$2"
  if grep -qF -- "$needle" <<< "$output"; then
    echo "ok - ${desc}"
    pass_count=$((pass_count + 1))
  else
    echo "not ok - ${desc} (output missing: ${needle})"
    fail=1
  fi
  return 0
}

if [[ ! -f "$SCRIPT" ]]; then
  echo "not ok - script not found at ${SCRIPT}"
  exit 1
fi

# Dummy token satisfies the GH_TOKEN guard; --force skips the repo-identity
# check; --dry-run prevents any real API call. A mock gh is placed first on
# PATH and fails on any `gh api` subcommand so a dry-run regression cannot
# silently make a live API call.
_mock_bin="$(mktemp -d)" || { echo "not ok - mktemp -d failed"; exit 1; }
trap 'rm -rf "$_mock_bin"' EXIT
cat > "${_mock_bin}/gh" <<'EOF'
#!/usr/bin/env bash
if [[ "${1:-}" == "api" ]]; then
  echo "unexpected gh api invocation" >&2
  exit 1
fi
exit 0
EOF
chmod +x "${_mock_bin}/gh"

output="$(PATH="${_mock_bin}:${PATH}" GH_TOKEN=dummy-token bash "$SCRIPT" --dry-run --force 2>&1)"
exit_code=$?

if [[ "$exit_code" -ne 0 ]]; then
  echo "not ok - script exited non-zero (${exit_code}) in --dry-run --force mode"
  echo "--- output ---"
  printf '%s\n' "$output"
  fail=1
fi

# pr-quality ruleset is codified and named.
assert_contains '"name": "pr-quality"' "emits pr-quality ruleset"

# The compliance-critical parameter: stale reviews must be dismissed on push.
# Assert specifically within the pr-quality ruleset's pull_request rule so the
# check cannot be satisfied by the setting appearing in the wrong ruleset.
_pr_q_json=$(printf '%s\n' "$output" | grep -v '^\[' | jq -s 'map(select(.name == "pr-quality")) | first // empty')
# Default to an object with an empty rules array so the boolean asserts below
# feed jq valid JSON and fall through to their descriptive `not ok` branch
# instead of aborting under `set -e` when the pr-quality ruleset is absent.
[[ -n "$_pr_q_json" ]] || _pr_q_json='{"rules":[]}'
_dismiss_ec=0
_dismiss=$(jq -r '
  .rules?[]?
  | select(.type == "pull_request")
  | (.parameters.dismiss_stale_reviews_on_push // false)
  | (type == "boolean" and . == true)
' <<< "$_pr_q_json") || _dismiss_ec=$?
if [[ "$_dismiss" = "true" ]]; then
  echo "ok - pr-quality pull_request rule sets dismiss_stale_reviews_on_push = true"
  pass_count=$((pass_count + 1))
else
  echo "not ok - pr-quality pull_request rule: dismiss_stale_reviews_on_push not true (got: ${_dismiss:-missing})"
  fail=1
fi

# The compliance-critical parameter for #480: a code owner review must be
# required. Asserted as a strict boolean within the pr-quality ruleset so a
# string "true" or the setting appearing in another ruleset cannot pass.
_code_owner_ec=0
_code_owner=$(jq -r '
  .rules?[]?
  | select(.type == "pull_request")
  | (.parameters.require_code_owner_review // false)
  | (type == "boolean" and . == true)
' <<< "$_pr_q_json") || _code_owner_ec=$?
if [[ "$_code_owner" = "true" ]]; then
  echo "ok - pr-quality pull_request rule sets require_code_owner_review = true"
  pass_count=$((pass_count + 1))
else
  echo "not ok - pr-quality pull_request rule: require_code_owner_review not true (got: ${_code_owner:-missing})"
  fail=1
fi

# The compliance-critical parameter for #512: approval must be re-requested
# after the most recent push (require_last_push_approval). Asserted as a strict
# boolean within the pr-quality ruleset so a string "true" or the setting
# appearing in another ruleset cannot pass.
_last_push_ec=0
_last_push=$(jq -r '
  .rules?[]?
  | select(.type == "pull_request")
  | (.parameters.require_last_push_approval // false)
  | (type == "boolean" and . == true)
' <<< "$_pr_q_json") || _last_push_ec=$?
if [[ "$_last_push" = "true" ]]; then
  echo "ok - pr-quality pull_request rule sets require_last_push_approval = true"
  pass_count=$((pass_count + 1))
else
  echo "not ok - pr-quality pull_request rule: require_last_push_approval not true (got: ${_last_push:-missing})"
  fail=1
fi

# Remaining standard pr-quality pull_request parameters — checked within the
# pr-quality ruleset object so a matching field in any other ruleset cannot
# produce a false pass.
_pr_q_params=$(printf '%s\n' "$_pr_q_json" | jq -c '.rules[] | select(.type == "pull_request") | .parameters')

_jq_check() {
  local expr="$1" expected="$2" desc="$3"
  local actual
  actual=$(printf '%s\n' "$_pr_q_params" | jq -r "$expr // empty")
  if [[ "$actual" = "$expected" ]]; then
    echo "ok - ${desc}"
    pass_count=$((pass_count + 1))
  else
    echo "not ok - ${desc} (expected: ${expected}, got: ${actual:-missing})"
    fail=1
  fi
  return 0
}

_jq_check '.required_approving_review_count' '1' 'pr-quality requires 1 approving review'
_jq_check '.required_review_thread_resolution' 'true' 'pr-quality requires review thread resolution'

# ---------------------------------------------------------------------------
# Canonical snapshot lock (#540)
#
# The piecemeal per-parameter checks above catch a single flipped boolean, but
# a reformat that drops a key, renames it, or adds an unexpected one could slip
# through. This asserts the pr-quality pull_request rule's *entire* .parameters
# object equals the org-standard set byte-for-byte (keys sorted), so ANY drift
# in the codified mirror — including require_code_owner_review regressing from
# true (compliance check ruleset-drift-pr-quality-require_code_owner_review) —
# fails loudly. Comparison is on canonicalised JSON so key order and formatting
# are irrelevant; only the value set matters.
# ---------------------------------------------------------------------------
_expected_pr_params=$(jq -cS '.' <<'EXPECTED'
{
  "required_approving_review_count": 1,
  "dismiss_stale_reviews_on_push": true,
  "require_code_owner_review": true,
  "require_last_push_approval": true,
  "required_review_thread_resolution": true
}
EXPECTED
)
_actual_pr_params_ec=0
_actual_pr_params=$(jq -cS '.' <<<"$_pr_q_params") || _actual_pr_params_ec=$?
if [[ "$_actual_pr_params_ec" -eq 0 && "$_actual_pr_params" = "$_expected_pr_params" ]]; then
  echo "ok - pr-quality pull_request .parameters matches org-standard snapshot"
  pass_count=$((pass_count + 1))
else
  echo "not ok - pr-quality pull_request .parameters drifted from org-standard snapshot"
  echo "    expected: ${_expected_pr_params}"
  echo "    actual:   ${_actual_pr_params}"
  fail=1
fi

# code-quality ruleset is also codified.
assert_contains '"name": "code-quality"' "emits code-quality ruleset"

# ---------------------------------------------------------------------------
# --repo flag support
#
# The compliance remediation for this repo documents running:
#   scripts/apply-rulesets.sh --repo combsmith/broodly
# so the script must accept a --repo <owner/repo> argument (and --repo=<owner/repo>)
# without breaking, still codifying the pr-quality ruleset. Malformed or missing
# values must be rejected.
# ---------------------------------------------------------------------------
# Runs the script with a mock gh on PATH; never aborts the harness under set -e.
# Populates globals: _rs_out (combined output) and _rs_exit (exit code).
run_script() {
  _rs_exit=0
  _rs_out="$(PATH="${_mock_bin}:${PATH}" GH_TOKEN=dummy-token bash "$SCRIPT" "$@" 2>&1)" || _rs_exit=$?
}

# --repo <owner/repo> (space form) is accepted and still emits the pr-quality ruleset.
run_script --repo combsmith/broodly --dry-run --force
if [[ "$_rs_exit" -eq 0 ]]; then
  echo "ok - accepts --repo <owner/repo> (space form)"
  pass_count=$((pass_count + 1))
else
  echo "not ok - --repo <owner/repo> should exit 0 (got: ${_rs_exit})"
  printf '%s\n' "$_rs_out"
  fail=1
fi
if grep -qF -- '"name": "pr-quality"' <<< "$_rs_out"; then
  echo "ok - --repo run still emits pr-quality ruleset"
  pass_count=$((pass_count + 1))
else
  echo "not ok - --repo run missing pr-quality ruleset"
  fail=1
fi
_repo_pr_q=$(grep -v '^\[' <<< "$_rs_out" | jq -s 'map(select(.name == "pr-quality")) | first // empty')
[[ -n "$_repo_pr_q" ]] || _repo_pr_q='{"rules":[]}'
_repo_dismiss=$(jq -r '
  .rules?[]?
  | select(.type == "pull_request")
  | (.parameters.dismiss_stale_reviews_on_push // false)
  | (type == "boolean" and . == true)
' <<< "$_repo_pr_q")
if [[ "$_repo_dismiss" = "true" ]]; then
  echo "ok - --repo run still sets dismiss_stale_reviews_on_push = true"
  pass_count=$((pass_count + 1))
else
  echo "not ok - --repo run: dismiss_stale_reviews_on_push not true (got: ${_repo_dismiss:-missing})"
  fail=1
fi

# --repo=<owner/repo> (equals form) is accepted.
run_script --repo=combsmith/broodly --dry-run --force
if [[ "$_rs_exit" -eq 0 ]]; then
  echo "ok - accepts --repo=<owner/repo> (equals form)"
  pass_count=$((pass_count + 1))
else
  echo "not ok - --repo=<owner/repo> should exit 0 (got: ${_rs_exit})"
  fail=1
fi

# --repo= (equals form with empty value) is rejected.
run_script --repo= --dry-run --force
if [[ "$_rs_exit" -ne 0 ]]; then
  echo "ok - rejects --repo= (equals form with empty value)"
  pass_count=$((pass_count + 1))
else
  echo "not ok - --repo= (empty equals form) should exit non-zero"
  fail=1
fi

# Malformed --repo value (no slash) is rejected.
run_script --repo bogus --dry-run --force
if [[ "$_rs_exit" -ne 0 ]]; then
  echo "ok - rejects malformed --repo value (no slash)"
  pass_count=$((pass_count + 1))
else
  echo "not ok - malformed --repo value should exit non-zero"
  fail=1
fi

# --repo with no value is rejected.
run_script --repo
if [[ "$_rs_exit" -ne 0 ]]; then
  echo "ok - rejects --repo with no value"
  pass_count=$((pass_count + 1))
else
  echo "not ok - --repo with no value should exit non-zero"
  fail=1
fi

# --repo "" (space form with empty value) is rejected.
run_script --repo "" --dry-run --force
if [[ "$_rs_exit" -ne 0 ]]; then
  echo "ok - rejects --repo \"\" (space form with empty value)"
  pass_count=$((pass_count + 1))
else
  echo "not ok - --repo \"\" (empty space form) should exit non-zero"
  fail=1
fi

echo "---"
if [[ "$fail" -eq 0 ]]; then
  echo "PASS — ${pass_count} assertion(s) passed"
else
  echo "FAIL — see assertions above"
fi
exit "$fail"
