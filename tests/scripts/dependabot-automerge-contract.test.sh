#!/usr/bin/env bash
# Test: .github/workflows/dependabot-automerge.yml keeps its locked contract.
#
# Why this exists: Fleet Monitor issues #469 and #472 flagged this workflow with
# a high failure rate. The failures were GitHub "startup failures" caused by the
# stub being truncated to its comment header on a sibling branch. Two generic
# guards (tests/scripts/workflow-integrity.test.sh and scripts/validate-workflows.sh)
# already reject a *structurally* broken workflow (missing on:/jobs:). They do
# NOT verify this file's *contract* — the exact invariants its own header marks
# "MUST NOT change":
#   - trigger must be `pull_request_target` (not `pull_request` or `push`)
#   - it must call the org reusable via `uses: combsmith/.github/.github/
#     workflows/dependabot-automerge-reusable.yml@...`
#   - it must forward org secrets via `secrets: inherit`
#   - it must declare a job-level `permissions:` block (the reusable's gh API
#     calls fail without it)
# A drift in any of those would silently break auto-merge without tripping the
# structural guards. This test locks the contract for this one file.
#
# Run: bash tests/scripts/dependabot-automerge-contract.test.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STUB="${REPO_ROOT}/.github/workflows/dependabot-automerge.yml"

fail=0
pass_count=0

# check_contract <path>
# Returns non-zero and prints the first missing invariant when the file at
# <path> does not satisfy the locked dependabot-automerge contract.
check_contract() {
  local path="$1"

  [[ -f "$path" ]] || { echo "file not found: ${path}"; return 1; }

  # Parse YAML structurally so that a matching entry nested under an unrelated
  # mapping cannot satisfy the invariants (grep-over-whole-file false positives).
  python3 - "$path" 2>&1 <<'PYEOF'
import sys, re
try:
    import yaml
except ImportError:
    print("PyYAML not available; install with: pip install pyyaml")
    sys.exit(1)

try:
    with open(sys.argv[1]) as f:
        wf = yaml.safe_load(f)
except Exception as e:
    print(f"invalid YAML: {e}")
    sys.exit(1)

if not isinstance(wf, dict):
    print("not a YAML mapping")
    sys.exit(1)

# PyYAML (YAML 1.1) maps the bare word "on" to Python True.
on_block = wf.get("on") or wf.get(True) or {}
if not isinstance(on_block, dict) or "pull_request_target" not in on_block:
    print("missing 'pull_request_target' trigger")
    sys.exit(1)

jobs = wf.get("jobs") or {}
da_job = None
for job in jobs.values():
    if isinstance(job, dict):
        uses_val = job.get("uses", "")
        if isinstance(uses_val, str) and re.match(
            r'combsmith/\.github/\.github/workflows/dependabot-automerge-reusable\.yml@',
            uses_val,
        ):
            da_job = job
            break

if da_job is None:
    print("missing org reusable 'uses:' reference")
    sys.exit(1)

if da_job.get("secrets") != "inherit":
    print("missing 'secrets: inherit'")
    sys.exit(1)

if "permissions" not in da_job:
    print("missing job-level 'permissions:' block")
    sys.exit(1)
PYEOF
}

# --- Positive assertion: the real stub satisfies the contract. -----------------
reason=""
exit_code=0
reason="$(check_contract "$STUB")" || exit_code=$?
if [[ $exit_code -eq 0 ]]; then
  echo "ok - dependabot-automerge.yml satisfies its locked contract"
  pass_count=$((pass_count + 1))
else
  echo "not ok - dependabot-automerge.yml violates its contract: ${reason}"
  fail=1
fi

# --- Negative assertions: each invariant, removed/changed, is rejected. --------
# Proves the test does not pass trivially by mutating a valid copy of the stub.
_fixture_dir="$(mktemp -d)"
trap '[[ -n "${_fixture_dir:-}" ]] && rm -rf "$_fixture_dir"' EXIT

# 1) Trigger changed pull_request_target -> pull_request.
_f1="${_fixture_dir}/wrong-trigger.yml"
sed 's/pull_request_target/pull_request/' "$STUB" > "$_f1"
if ! check_contract "$_f1" >/dev/null 2>&1; then
  echo "ok - rejects a stub whose trigger is not pull_request_target"
  pass_count=$((pass_count + 1))
else
  echo "not ok - accepted a stub with the wrong trigger"
  fail=1
fi

# 2) secrets: inherit removed.
_f2="${_fixture_dir}/no-secrets.yml"
grep -v 'secrets:' "$STUB" > "$_f2"
if ! check_contract "$_f2" >/dev/null 2>&1; then
  echo "ok - rejects a stub with 'secrets: inherit' removed"
  pass_count=$((pass_count + 1))
else
  echo "not ok - accepted a stub without 'secrets: inherit'"
  fail=1
fi

# 3) Job-level permissions: block removed (only the top-level `permissions: {}`
#    at column 0 remains) — must still be rejected.
_f_perms="${_fixture_dir}/no-job-permissions.yml"
grep -Ev '^[[:space:]]+permissions:' "$STUB" > "$_f_perms"
if ! check_contract "$_f_perms" >/dev/null 2>&1; then
  echo "ok - rejects a stub with the job-level 'permissions:' block removed"
  pass_count=$((pass_count + 1))
else
  echo "not ok - accepted a stub without a job-level 'permissions:' block"
  fail=1
fi

# 4) Truncated to comments only (the exact corruption behind the failures).
_f4="${_fixture_dir}/truncated.yml"
grep -E '^#' "$STUB" > "$_f4"
if ! check_contract "$_f4" >/dev/null 2>&1; then
  echo "ok - rejects a stub truncated to its comment header"
  pass_count=$((pass_count + 1))
else
  echo "not ok - accepted a comment-only truncated stub"
  fail=1
fi

# 5) uses: reference removed — contract must reject even when the job exists.
_f5="${_fixture_dir}/no-uses.yml"
grep -v 'uses:' "$STUB" > "$_f5"
if ! check_contract "$_f5" >/dev/null 2>&1; then
  echo "ok - rejects a stub with the org reusable 'uses:' reference removed"
  pass_count=$((pass_count + 1))
else
  echo "not ok - accepted a stub without the org reusable 'uses:' reference"
  fail=1
fi

echo "---"
if [[ "$fail" -eq 0 ]]; then
  echo "PASS — ${pass_count} assertion(s) passed"
else
  echo "FAIL — see assertions above"
fi
exit "$fail"
