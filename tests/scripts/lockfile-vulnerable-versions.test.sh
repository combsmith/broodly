#!/usr/bin/env bash
# Test: pnpm-lock.yaml does not resolve package versions with known, fixable
# vulnerabilities, and pnpm-workspace.yaml does not keep stale audit ignores
# for advisories that have since been fixed.
#
# Why this exists: OpenSSF Scorecard's "Vulnerabilities" check (issue #447)
# runs OSV against the committed lockfile and deducts a point per open
# advisory. `audit.ignore` only silences `pnpm audit` — Scorecard still counts
# the advisory — so every suppressed-but-fixable advisory costs score. This
# guard pins the remediations so a lockfile refresh cannot silently regress:
#
#   image-size < 2.0.3  GHSA-5p2g-fcmc-qvqq, GHSA-w3rx-r6r6-pgpr (High)
#                       Pulled in by metro < 0.83.8; metro 0.83.8 dropped the
#                       dependency entirely, so metro* must be >= 0.83.8.
#   zod < 4.6.6         GHSA-mrhx-c7xc-m3w5 (High), via @expo/cli (zod v3).
#
# Run: bash tests/scripts/lockfile-vulnerable-versions.test.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOCKFILE="${REPO_ROOT}/pnpm-lock.yaml"
WORKSPACE="${REPO_ROOT}/pnpm-workspace.yaml"

fail=0
pass_count=0

ok() { echo "ok - $1"; pass_count=$((pass_count + 1)); }
not_ok() { echo "not ok - $1"; fail=1; }

# version_lt <a> <b> — true when semver a < b (prerelease suffixes ignored).
version_lt() {
  local a="${1%%-*}" b="${2%%-*}"
  [[ "$a" != "$b" ]] && [[ "$(printf '%s\n%s\n' "$a" "$b" | sort -V | head -n1)" == "$a" ]]
}

# resolved_versions <lockfile> <name-regex>
# Prints every version of packages whose name fully matches <name-regex>, read
# from the top-level `packages:` section keys (e.g. "  image-size@1.2.1:").
resolved_versions() {
  local path="$1" name_re="$2"
  awk -v re="^(${name_re})\$" '
    /^packages:/ { in_pkgs = 1; next }
    /^[^ ]/      { in_pkgs = 0 }
    in_pkgs && /^  [^ ]/ {
      key = $0
      sub(/^  /, "", key); sub(/:$/, "", key); gsub(/\x27/, "", key)
      at = index(substr(key, 2), "@") + 1
      name = substr(key, 1, at - 1); ver = substr(key, at + 1)
      if (name ~ re) print ver
    }
  ' "$path"
}

# check_min <lockfile> <name-regex> <min-version> <label>
# Prints offending versions; returns 1 if any resolved version is < min.
check_min() {
  local path="$1" name_re="$2" min="$3" bad="" v
  while IFS= read -r v; do
    [[ -z "$v" ]] && continue
    version_lt "$v" "$min" && bad+="${v} "
  done < <(resolved_versions "$path" "$name_re")
  if [[ -n "$bad" ]]; then
    printf '%s' "$bad"
    return 1
  fi
  return 0
}

# --- Self-checks: the parser and comparator detect a vulnerable lockfile. ------
tmp_lock="$(mktemp)"
trap 'rm -f "$tmp_lock"' EXIT
cat > "$tmp_lock" <<'EOF'
lockfileVersion: '9.0'

packages:

  image-size@1.2.1:
    resolution: {integrity: sha512-x}

  '@scope/zod@1.0.0':
    resolution: {integrity: sha512-x}

  zod@3.25.76:
    resolution: {integrity: sha512-x}

  metro-config@0.83.5:
    resolution: {integrity: sha512-x}

snapshots:

  image-size@1.2.1: {}
EOF

! check_min "$tmp_lock" 'image-size' '2.0.3' >/dev/null \
  && ok "guard rejects image-size 1.2.1" || not_ok "guard accepted image-size 1.2.1"
! check_min "$tmp_lock" 'zod' '4.6.6' >/dev/null \
  && ok "guard rejects zod 3.25.76" || not_ok "guard accepted zod 3.25.76"
! check_min "$tmp_lock" 'metro(-[a-z-]+)?' '0.83.8' >/dev/null \
  && ok "guard rejects metro-config 0.83.5" || not_ok "guard accepted metro-config 0.83.5"
[[ "$(resolved_versions "$tmp_lock" 'zod')" == "3.25.76" ]] \
  && ok "parser ignores scoped look-alikes and the snapshots section" \
  || not_ok "parser matched the wrong entries for zod"
version_lt "4.6.6" "4.6.6" \
  && not_ok "comparator treats equal versions as lower" \
  || ok "comparator accepts the exact fixed version"
version_lt "0.83.10" "0.83.8" \
  && not_ok "comparator sorts lexically instead of by semver" \
  || ok "comparator orders 0.83.10 above 0.83.8"

# --- Real-file assertions. ----------------------------------------------------
[[ -f "$LOCKFILE" ]] && ok "pnpm-lock.yaml exists" || not_ok "pnpm-lock.yaml not found"
[[ -f "$WORKSPACE" ]] && ok "pnpm-workspace.yaml exists" || not_ok "pnpm-workspace.yaml not found"

if [[ "$fail" -eq 0 ]]; then
  [[ -n "$(resolved_versions "$LOCKFILE" 'metro')" ]] \
    && ok "lockfile parser finds metro entries" \
    || not_ok "lockfile parser found no metro entries (format changed?)"

  if bad="$(check_min "$LOCKFILE" 'image-size' '2.0.3')"; then
    ok "no image-size < 2.0.3 (GHSA-5p2g-fcmc-qvqq, GHSA-w3rx-r6r6-pgpr)"
  else
    not_ok "lockfile resolves vulnerable image-size: ${bad}"
  fi

  if bad="$(check_min "$LOCKFILE" 'metro(-[a-z-]+)?' '0.83.8')"; then
    ok "no metro* < 0.83.8 (pulls vulnerable image-size)"
  else
    not_ok "lockfile resolves metro* < 0.83.8: ${bad}"
  fi

  if bad="$(check_min "$LOCKFILE" 'zod' '4.6.6')"; then
    ok "no zod < 4.6.6 (GHSA-mrhx-c7xc-m3w5)"
  else
    not_ok "lockfile resolves vulnerable zod: ${bad}"
  fi

  for ghsa in GHSA-5p2g-fcmc-qvqq GHSA-w3rx-r6r6-pgpr GHSA-mrhx-c7xc-m3w5; do
    if grep -qE "^[[:space:]]*-[[:space:]]*${ghsa}[[:space:]]*$" "$WORKSPACE"; then
      not_ok "pnpm-workspace.yaml still ignores fixed advisory ${ghsa}"
    else
      ok "no stale audit ignore for ${ghsa}"
    fi
  done
fi

echo "---"
[[ "$fail" -eq 0 ]] \
  && echo "PASS — ${pass_count} assertion(s) passed" \
  || echo "FAIL — see assertions above"
exit "$fail"
