#!/usr/bin/env bats
# Integration tests for scripts/apply-rulesets.sh
#
# These tests stub the `gh` CLI so the script can run without network access or
# real credentials, and assert that the codified pr-quality ruleset payload
# matches the org standard — in particular dismiss_stale_reviews_on_push: true,
# require_last_push_approval: true and require_code_owner_review: true, which the
# compliance audit (ruleset-drift-pr-quality-dismiss_stale_reviews_on_push,
# ruleset-drift-pr-quality-require_last_push_approval and
# ruleset-drift-pr-quality-require_code_owner_review) checks against live
# GitHub state. This test locks the repo's codified mirror so it cannot drift.

setup() {
  REPO_ROOT="$(cd "$BATS_TEST_DIRNAME/../.." && pwd)"
  SCRIPT="$REPO_ROOT/scripts/apply-rulesets.sh"

  BIN_DIR="$BATS_TEST_TMPDIR/bin"
  mkdir -p "$BIN_DIR"
  CALL_LOG="$BATS_TEST_TMPDIR/gh-calls.log"

  # Mock `gh`: record every invocation, satisfy the repo-identity safety check,
  # return an empty ruleset list for the existing-rulesets fetch, and succeed on
  # any mutating call without making a network request.
  cat > "$BIN_DIR/gh" <<MOCK
#!/usr/bin/env bash
printf '%s\n' "\$*" >> "$CALL_LOG"
if [ "\$1" = "repo" ] && [ "\$2" = "view" ]; then
  echo "combsmith/broodly"
  exit 0
fi
if [ "\$1" = "api" ]; then
  [ ! -t 0 ] && cat > /dev/null 2>&1 || true
  echo "[]"
  exit 0
fi
exit 0
MOCK
  chmod +x "$BIN_DIR/gh"

  # Mock `jq`: apply-rulesets.sh uses jq to check existing rulesets and to
  # pretty-print the dry-run payload. The stubbed gh returns [] so length
  # queries must yield 0 and id queries must yield nothing; everything else
  # passes stdin through for the payload content assertions to work.
  cat > "$BIN_DIR/jq" <<'MOCK'
#!/usr/bin/env bash
args_str="$*"
if grep -qF 'length' <<< "$args_str"; then
  echo "0"
elif grep -qF '// empty' <<< "$args_str"; then
  : # output nothing — signals no existing ruleset id found
else
  cat
fi
MOCK
  chmod +x "$BIN_DIR/jq"

  export PATH="$BIN_DIR:$PATH"
  export GH_TOKEN="test-token"
}

@test "pr-quality ruleset codifies require_last_push_approval: true" {
  run bash "$SCRIPT" --dry-run --force
  [ "$status" -eq 0 ]
  grep -qF '"require_last_push_approval": true' <<< "$output"
}

@test "pr-quality ruleset never codifies require_last_push_approval: false" {
  run bash "$SCRIPT" --dry-run --force
  [ "$status" -eq 0 ]
  ! grep -qF '"require_last_push_approval": false' <<< "$output"
}

@test "pr-quality ruleset codifies dismiss_stale_reviews_on_push: true" {
  run bash "$SCRIPT" --dry-run --force
  [ "$status" -eq 0 ]
  grep -qF '"dismiss_stale_reviews_on_push": true' <<< "$output"
}

@test "pr-quality ruleset never codifies dismiss_stale_reviews_on_push: false" {
  run bash "$SCRIPT" --dry-run --force
  [ "$status" -eq 0 ]
  ! grep -qF '"dismiss_stale_reviews_on_push": false' <<< "$output"
}

@test "pr-quality ruleset codifies require_code_owner_review: true" {
  run bash "$SCRIPT" --dry-run --force
  [ "$status" -eq 0 ]
  grep -qF '"require_code_owner_review": true' <<< "$output"
}

@test "pr-quality ruleset never codifies require_code_owner_review: false" {
  run bash "$SCRIPT" --dry-run --force
  [ "$status" -eq 0 ]
  ! grep -qF '"require_code_owner_review": false' <<< "$output"
}

@test "pr-quality ruleset codifies the required review parameters" {
  run bash "$SCRIPT" --dry-run --force
  [ "$status" -eq 0 ]
  grep -qF '"required_approving_review_count": 1' <<< "$output"
  grep -qF '"dismiss_stale_reviews_on_push": true' <<< "$output"
  grep -qF '"require_code_owner_review": true' <<< "$output"
  grep -qF '"required_review_thread_resolution": true' <<< "$output"
}

@test "dry-run makes no mutating (POST/PUT) API call" {
  run bash "$SCRIPT" --dry-run --force
  [ "$status" -eq 0 ]
  ! grep -qE "api -X (POST|PUT)" "$CALL_LOG"
}
