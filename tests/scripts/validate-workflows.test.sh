#!/usr/bin/env bash
# Test: scripts/validate-workflows.sh rejects structurally-invalid GitHub
# Actions workflow files.
#
# Motivation: Fleet Monitor issue #466. The `auto-rebase.yml` thin-caller stub
# was transiently truncated to a comments-only file (no top-level `on:` or
# `jobs:`) on a feature branch. GitHub treats such a file as an invalid
# workflow and records a `startup_failure` run on every push, which polluted
# the auto-rebase workflow's health metric (50% failure rate). This guard
# rejects any workflow file that lacks a trigger or jobs block so a truncated
# stub can never land again.
#
# Run: bash tests/scripts/validate-workflows.test.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="${REPO_ROOT}/scripts/validate-workflows.sh"

fail=0
pass_count=0

if [[ ! -f "$SCRIPT" ]]; then
  echo "not ok - script not found at ${SCRIPT}"
  exit 1
fi

# Scratch dir for fixtures; cleaned up on exit.
_tmp="$(mktemp -d)"
trap '[[ -d "$_tmp" ]] && rm -rf "$_tmp"' EXIT

# run_validator <dir> -> sets `output` and `rc`
run_validator() {
  local dir="$1"
  rc=0
  output="$(bash "$SCRIPT" "$dir" 2>&1)" || rc=$?
}

assert_rc() {
  local expected="$1" desc="$2"
  if [[ "$rc" == "$expected" ]]; then
    echo "ok - ${desc}"
    pass_count=$((pass_count + 1))
  else
    echo "not ok - ${desc} (expected rc ${expected}, got ${rc})"
    echo "--- output ---"
    printf '%s\n' "$output"
    fail=1
  fi
}

assert_output_contains() {
  local needle="$1" desc="$2"
  if grep -qF -- "$needle" <<< "$output"; then
    echo "ok - ${desc}"
    pass_count=$((pass_count + 1))
  else
    echo "not ok - ${desc} (output missing: ${needle})"
    fail=1
  fi
}

# --- Fixture 1: a valid minimal workflow --------------------------------------
_valid_dir="${_tmp}/valid"
mkdir -p "$_valid_dir"
cat > "${_valid_dir}/good.yml" << 'YML'
name: Good
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo hi
YML
run_validator "$_valid_dir"
assert_rc 0 "passes on a valid minimal workflow"

# --- Fixture 2: comments-only stub (the #466 corruption) ----------------------
_bad_dir="${_tmp}/comments-only"
mkdir -p "$_bad_dir"
cat > "${_bad_dir}/auto-rebase.yml" << 'YML'
# ─────────────────────────────────────────────────────────────────────────────
# SOURCE OF TRUTH: combsmith/.github/standards/workflows/auto-rebase.yml
# This file is a THIN CALLER STUB.
# (body accidentally truncated — no `on:` / `jobs:` remain)
# ─────────────────────────────────────────────────────────────────────────────
YML
run_validator "$_bad_dir"
assert_rc 1 "fails on a comments-only / truncated workflow stub"
assert_output_contains "auto-rebase.yml" "names the offending file"

# --- Fixture 3: missing jobs only ---------------------------------------------
_no_jobs_dir="${_tmp}/no-jobs"
mkdir -p "$_no_jobs_dir"
cat > "${_no_jobs_dir}/x.yml" << 'YML'
name: No Jobs
on:
  push:
    branches: [main]
YML
run_validator "$_no_jobs_dir"
assert_rc 1 "fails when a workflow has no jobs: block"

# --- Fixture 4: missing trigger only ------------------------------------------
_no_on_dir="${_tmp}/no-on"
mkdir -p "$_no_on_dir"
cat > "${_no_on_dir}/x.yml" << 'YML'
name: No Trigger
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo hi
YML
run_validator "$_no_on_dir"
assert_rc 1 "fails when a workflow has no on: trigger"

# --- Fixture 5: quoted "on": key is accepted ----------------------------------
_quoted_dir="${_tmp}/quoted"
mkdir -p "$_quoted_dir"
cat > "${_quoted_dir}/q.yml" << 'YML'
name: Quoted Trigger
"on":
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo hi
YML
run_validator "$_quoted_dir"
assert_rc 0 'accepts a quoted "on": trigger key'

# --- Fixture 6: true: key is not a valid trigger --------------------------------
_true_dir="${_tmp}/true-trigger"
mkdir -p "$_true_dir"
cat > "${_true_dir}/invalid-trigger.yml" << 'YML'
name: Invalid Trigger
true:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo hi
YML
run_validator "$_true_dir"
assert_rc 1 'rejects true: as an invalid trigger (only on: is valid)'

# --- Fixture 7: jobs: block with no job definitions ----------------------------
_empty_jobs_dir="${_tmp}/empty-jobs"
mkdir -p "$_empty_jobs_dir"
cat > "${_empty_jobs_dir}/no-jobs-defined.yml" << 'YML'
name: No Jobs Defined
on:
  push:
    branches: [main]
jobs:
YML
run_validator "$_empty_jobs_dir"
assert_rc 1 "fails when jobs: block is empty (no job definitions)"

# --- Fixture 8: jobs: block containing only indented comments -----------------
_comment_jobs_dir="${_tmp}/comment-jobs"
mkdir -p "$_comment_jobs_dir"
cat > "${_comment_jobs_dir}/comment-only-jobs.yml" << 'YML'
name: Comment Jobs
on:
  push:
    branches: [main]
jobs:
  # This is just a comment, not a job definition
YML
run_validator "$_comment_jobs_dir"
assert_rc 1 "fails when jobs: block contains only comments (no real job definitions)"

# --- Fixture 9: over-indented comment only under jobs: (must fail) ------------
_deep_comment_jobs_dir="${_tmp}/deep-comment-jobs"
mkdir -p "$_deep_comment_jobs_dir"
cat > "${_deep_comment_jobs_dir}/deep-comment-only-jobs.yml" << 'YML'
name: Deep Comment Jobs
on:
  push:
    branches: [main]
jobs:
    # only a comment indented more than two spaces
YML
run_validator "$_deep_comment_jobs_dir"
assert_rc 1 "fails when jobs: block contains only over-indented comments (no real job definitions)"

# --- Fixture 10: column-0 banner comment between jobs: and first job (must pass) ---
_banner_comment_dir="${_tmp}/banner-comment"
mkdir -p "$_banner_comment_dir"
cat > "${_banner_comment_dir}/banner-comment.yml" << 'YML'
name: Banner Comment
on:
  push:
    branches: [main]
jobs:
# ── banner comment at column 0 ──
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo hi
YML
run_validator "$_banner_comment_dir"
assert_rc 0 "passes when a column-0 banner comment appears between jobs: and the first job"

# --- Fixture 11: empty directory (nothing to validate) ------------------------
_empty_dir="${_tmp}/empty"
mkdir -p "$_empty_dir"
run_validator "$_empty_dir"
assert_rc 0 "passes (no-op) on a directory with no workflow files"

# --- The repo's own workflows must all be valid -------------------------------
run_validator "${REPO_ROOT}/.github/workflows"
assert_rc 0 "passes on the repository's real .github/workflows"

echo "---"
if [[ "$fail" -eq 0 ]]; then
  echo "PASS — ${pass_count} assertion(s) passed"
else
  echo "FAIL — see assertions above"
fi
exit "$fail"
