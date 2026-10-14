#!/usr/bin/env bash
# Test: sonar-project.properties never uses wildcards in sonar.sources / sonar.tests.
#
# Why this exists: Fleet Monitor issue #533 flagged .github/workflows/sonarcloud.yml
# with a high failure rate. The failing run's SonarCloud scan failed deterministically
# on every retry attempt with:
#   ERROR Invalid value of sonar.tests for combsmith_broodly
#   ERROR Wildcards ** and * are not supported in "sonar.sources" and "sonar.tests"
#         properties.
# SonarCloud forbids '*' / '**' wildcards in sonar.sources and sonar.tests (they are a
# comma-separated list of directories). Wildcards belong only in the *.exclusions,
# *.inclusions, and *.test.* filter properties. A wildcard in either sonar.sources or
# sonar.tests makes the scanner exit 3 on every run, and the sonarcloud.yml retry loop
# cannot recover a deterministic config error — it just fails the job (and inflates
# duration). This guard fails CI fast so such a config can never merge to main.
#
# Run: bash tests/scripts/sonar-config.test.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROPERTIES_FILE="${REPO_ROOT}/sonar-project.properties"

fail=0
pass_count=0

# _sonar_property_value <path> <key>
# Extracts the logical value for <key> from a java.util.Properties file exactly
# as SonarScanner's parser would. Honors all java.util.Properties forms: '=',
# ':' and whitespace key/value separators, '#'/'!' comment lines, backslash
# line-continuations (a physical line ending in an odd number of backslashes is
# joined with the next, whose leading whitespace is discarded), and the escape
# sequences java.util.Properties decodes in keys and values (\t \n \r \f, an
# escaped separator/backslash, and \uXXXX Unicode escapes). Last assignment
# wins. Prints the decoded value ('' if the key is absent). Decoding \uXXXX is
# what stops an encoded wildcard such as sonar.tests=apps/* (which the
# scanner decodes to apps/*) from slipping past the guard. Exits non-zero on a
# malformed \uXXXX escape — java.util.Properties throws on such input, so the
# guard must reject it rather than let a half-decoded value pass.
_sonar_property_value() {
  local path="$1" key="$2"
  awk -v target="$key" '
    function trailing_bs(s,   i, c) {
      c = 0; i = length(s)
      while (i >= 1 && substr(s, i, 1) == "\\") { c++; i-- }
      return c
    }
    function is_ws(ch) { return (ch == " " || ch == "\t" || ch == "\f") }
    function hexval(ch,   p) {
      p = index("0123456789abcdef", tolower(ch))
      return p - 1
    }
    # Decode java.util.Properties escapes in a logical key or value. Sets the
    # global bad=1 (and returns "") on a malformed \uXXXX escape.
    function decode(s,   out, i, n, ch, nx, code, j, hv) {
      out = ""; n = length(s); i = 1
      while (i <= n) {
        ch = substr(s, i, 1)
        if (ch != "\\") { out = out ch; i++; continue }
        nx = substr(s, i + 1, 1)
        if (nx == "") { i += 1; continue }
        if (nx == "u") {
          if (i + 5 > n) { bad = 1; return "" }
          code = 0
          for (j = 0; j < 4; j++) {
            hv = hexval(substr(s, i + 2 + j, 1))
            if (hv < 0) { bad = 1; return "" }
            code = code * 16 + hv
          }
          out = out sprintf("%c", code); i += 6; continue
        }
        if (nx == "t") { out = out "\t"; i += 2; continue }
        if (nx == "n") { out = out "\n"; i += 2; continue }
        if (nx == "r") { out = out "\r"; i += 2; continue }
        if (nx == "f") { out = out "\f"; i += 2; continue }
        out = out nx; i += 2
      }
      return out
    }
    # Split off the raw (still-escaped) key, honoring escaped separators, then
    # decode key and value separately so \uXXXX in either is resolved.
    function process(line,   i, ch, rawk, n) {
      sub(/^[ \t\f]+/, "", line)
      if (line == "" || substr(line, 1, 1) == "#" || substr(line, 1, 1) == "!") return
      n = length(line); i = 1; rawk = ""
      while (i <= n) {
        ch = substr(line, i, 1)
        if (ch == "\\") { rawk = rawk substr(line, i, 2); i += 2; continue }
        if (ch == "=" || ch == ":" || is_ws(ch)) break
        rawk = rawk ch; i++
      }
      while (i <= n && is_ws(substr(line, i, 1))) i++
      if (i <= n && (substr(line, i, 1) == "=" || substr(line, i, 1) == ":")) {
        i++
        while (i <= n && is_ws(substr(line, i, 1))) i++
      }
      if (decode(rawk) == target) value = decode(substr(line, i))
    }
    BEGIN { buf = ""; cont = 0; value = ""; bad = 0 }
    {
      line = $0
      if (cont) sub(/^[ \t\f]+/, "", line)
      if (trailing_bs(line) % 2 == 1) {
        buf = buf substr(line, 1, length(line) - 1)
        cont = 1
        next
      }
      buf = buf line
      process(buf)
      buf = ""; cont = 0
    }
    END { if (buf != "") process(buf); if (bad) exit 2; printf "%s", value }
  ' "$path"
}

# validate_sonar_properties <path>
# Prints a human-readable reason and returns non-zero when the file sets a
# sonar.sources or sonar.tests value containing a '*' wildcard.
validate_sonar_properties() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "file not found: ${path}"
    return 1
  fi

  local reason=""
  local key value
  for key in "sonar.sources" "sonar.tests"; do
    # Resolve the logical property value (all java.util.Properties separator,
    # continuation and escape forms, last-assignment-wins) before checking for a
    # wildcard. A non-zero exit means a malformed \uXXXX escape, which
    # java.util.Properties would reject — so the guard rejects it too.
    if ! value="$(_sonar_property_value "$path" "$key")"; then
      reason="${key} has a malformed \\uXXXX escape (java.util.Properties would reject it)"
      break
    fi
    if [[ "$value" == *"*"* ]]; then
      reason="${key} contains an unsupported wildcard: '${value}'"
      break
    fi
  done

  [[ -z "$reason" ]] || { echo "$reason"; return 1; }
}

# --- Negative assertions: wildcard sonar.sources / sonar.tests are rejected. ---
# These mirror the exact corruption behind issue #533 and prove the validator
# does not pass trivially.
_fixture_dir="$(mktemp -d)" || { echo "Failed to create temporary directory" >&2; exit 1; }
trap '[[ -n "${_fixture_dir:-}" ]] && rm -rf "$_fixture_dir"' EXIT

_bad_tests="${_fixture_dir}/bad-tests.properties"
cat > "$_bad_tests" <<'EOF'
sonar.projectKey=combsmith_broodly
sonar.sources=.
sonar.tests=apps/**/__tests__
EOF

! validate_sonar_properties "$_bad_tests" >/dev/null 2>&1 \
  && { echo "ok - validator rejects a wildcard sonar.tests"; pass_count=$((pass_count + 1)); } \
  || { echo "not ok - validator accepted a wildcard sonar.tests"; fail=1; }

_bad_sources="${_fixture_dir}/bad-sources.properties"
cat > "$_bad_sources" <<'EOF'
sonar.projectKey=combsmith_broodly
sonar.sources=apps/*
EOF

! validate_sonar_properties "$_bad_sources" >/dev/null 2>&1 \
  && { echo "ok - validator rejects a wildcard sonar.sources"; pass_count=$((pass_count + 1)); } \
  || { echo "not ok - validator accepted a wildcard sonar.sources"; fail=1; }

# --- Negative assertions: alternate java.util.Properties forms are covered. ----
# A wildcard must be caught regardless of the separator (':' or whitespace) or
# whether the value is spread across backslash-continuation lines — these are the
# forms a naive single-line '=' match would let slip past the guard.
_bad_colon="${_fixture_dir}/bad-colon.properties"
cat > "$_bad_colon" <<'EOF'
sonar.projectKey=combsmith_broodly
sonar.tests:apps/**/__tests__
EOF

! validate_sonar_properties "$_bad_colon" >/dev/null 2>&1 \
  && { echo "ok - validator rejects a wildcard sonar.tests with ':' separator"; pass_count=$((pass_count + 1)); } \
  || { echo "not ok - validator accepted a wildcard sonar.tests with ':' separator"; fail=1; }

_bad_ws="${_fixture_dir}/bad-whitespace.properties"
cat > "$_bad_ws" <<'EOF'
sonar.projectKey=combsmith_broodly
sonar.sources apps/*
EOF

! validate_sonar_properties "$_bad_ws" >/dev/null 2>&1 \
  && { echo "ok - validator rejects a wildcard sonar.sources with whitespace separator"; pass_count=$((pass_count + 1)); } \
  || { echo "not ok - validator accepted a wildcard sonar.sources with whitespace separator"; fail=1; }

_bad_cont="${_fixture_dir}/bad-continuation.properties"
cat > "$_bad_cont" <<'EOF'
sonar.projectKey=combsmith_broodly
sonar.tests=\
  apps/**/__tests__
EOF

! validate_sonar_properties "$_bad_cont" >/dev/null 2>&1 \
  && { echo "ok - validator rejects a wildcard sonar.tests across a line continuation"; pass_count=$((pass_count + 1)); } \
  || { echo "not ok - validator accepted a wildcard sonar.tests across a line continuation"; fail=1; }

# --- Negative assertions: java.util.Properties \uXXXX escapes are decoded. -----
# The scanner runs each key/value through java.util.Properties, which decodes
# \uXXXX before use, so an encoded wildcard (*) or encoded key must be
# caught after decoding — a raw string match would let it slip past the guard.
# 'bs' is a single backslash, built via awk so these fixtures can embed literal
# \uXXXX escapes without a heredoc or the editor mangling them.
bs="$(awk 'BEGIN { printf "%c", 92 }')"

_bad_enc_value="${_fixture_dir}/bad-encoded-value.properties"
{
  echo "sonar.projectKey=combsmith_broodly"
  echo "sonar.tests=apps/${bs}u002a"
} > "$_bad_enc_value"

! validate_sonar_properties "$_bad_enc_value" >/dev/null 2>&1 \
  && { echo "ok - validator rejects a \\uXXXX-encoded wildcard value"; pass_count=$((pass_count + 1)); } \
  || { echo "not ok - validator accepted a \\uXXXX-encoded wildcard value"; fail=1; }

_bad_enc_key="${_fixture_dir}/bad-encoded-key.properties"
{
  echo "sonar.projectKey=combsmith_broodly"
  echo "sonar${bs}u002esources=apps/${bs}u002a"
} > "$_bad_enc_key"

! validate_sonar_properties "$_bad_enc_key" >/dev/null 2>&1 \
  && { echo "ok - validator rejects a wildcard under a \\uXXXX-encoded key"; pass_count=$((pass_count + 1)); } \
  || { echo "not ok - validator accepted a wildcard under a \\uXXXX-encoded key"; fail=1; }

_bad_malformed="${_fixture_dir}/bad-malformed-escape.properties"
cat > "$_bad_malformed" <<'EOF'
sonar.projectKey=combsmith_broodly
sonar.tests=apps/\u00zz
EOF

! validate_sonar_properties "$_bad_malformed" >/dev/null 2>&1 \
  && { echo "ok - validator rejects a malformed \\uXXXX escape"; pass_count=$((pass_count + 1)); } \
  || { echo "not ok - validator accepted a malformed \\uXXXX escape"; fail=1; }

# --- Negative control: a \uXXXX-encoded key with no wildcard is accepted. ------
# Decoding must not itself introduce a false positive: an encoded key/value that
# resolves to a wildcard-free directory list is valid and must pass.
_ok_encoded="${_fixture_dir}/ok-encoded.properties"
{
  echo "sonar.projectKey=combsmith_broodly"
  echo "sonar${bs}u002esources=apps/api,apps/mobile"
} > "$_ok_encoded"

validate_sonar_properties "$_ok_encoded" >/dev/null 2>&1 \
  && { echo "ok - validator accepts a wildcard-free \\uXXXX-encoded key"; pass_count=$((pass_count + 1)); } \
  || { echo "not ok - validator wrongly rejected a wildcard-free \\uXXXX-encoded key"; fail=1; }

# --- Negative control: wildcards in sonar.exclusions are allowed. --------------
# SonarCloud permits wildcards in the filter properties; the guard must not flag
# them, or it would reject the repo's own valid config.
_ok_exclusions="${_fixture_dir}/ok-exclusions.properties"
cat > "$_ok_exclusions" <<'EOF'
sonar.projectKey=combsmith_broodly
sonar.sources=.
sonar.exclusions=_bmad/**,.github/**
EOF

validate_sonar_properties "$_ok_exclusions" >/dev/null 2>&1 \
  && { echo "ok - validator allows wildcards in sonar.exclusions"; pass_count=$((pass_count + 1)); } \
  || { echo "not ok - validator wrongly rejected wildcards in sonar.exclusions"; fail=1; }

# --- Positive assertion: the repo's real properties file is valid. -------------
reason="$(validate_sonar_properties "$PROPERTIES_FILE")" \
  && { echo "ok - sonar-project.properties has no wildcard sonar.sources/sonar.tests"; pass_count=$((pass_count + 1)); } \
  || { echo "not ok - sonar-project.properties is invalid: ${reason}"; fail=1; }

echo "---"
[[ "$fail" -eq 0 ]] \
  && echo "PASS — ${pass_count} assertion(s) passed" \
  || echo "FAIL — see assertions above"
exit "$fail"
