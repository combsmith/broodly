#!/usr/bin/env bash
# Test: third-party build/CI dependencies are pinned by hash.
#
# Why this exists: OpenSSF Scorecard's Pinned-Dependencies check (issue #395)
# scored 5/10 because of "dependency not pinned by hash" findings:
#   - Dockerfile base images referenced by mutable tag only (golang:1.24-alpine)
#   - `pip install` in workflows without --require-hashes
# A tag or version number can be re-pointed upstream; a digest/hash cannot.
# This guard fails CI if an unpinned dependency is reintroduced.
#
# Out of scope: first-party combsmith reusable-workflow channel refs
# (`@<agent>/vN-stable`), which are governed by the org "mutable-ref exception".
# Third-party action SHA pinning is enforced by scripts/validate-workflows.sh.
#
# Run: bash tests/scripts/pinned-dependencies.test.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

fail=0
pass_count=0

pass() { echo "PASS: $1"; pass_count=$((pass_count + 1)); }
failure() { echo "FAIL: $1"; fail=1; }

# --- Dockerfile base images must be digest-pinned ---------------------------
mapfile -t dockerfiles < <(find "${REPO_ROOT}/apps" "${REPO_ROOT}/packages" "${REPO_ROOT}/infra" \
  -type f \( -name 'Dockerfile' -o -name 'Dockerfile.*' -o -name '*.Dockerfile' \) \
  -not -path '*/node_modules/*' 2>/dev/null | sort)

if [[ ${#dockerfiles[@]} -eq 0 ]]; then
  failure "no Dockerfiles found (expected at least apps/api/Dockerfile)"
fi

for dockerfile in "${dockerfiles[@]}"; do
  rel="${dockerfile#"${REPO_ROOT}/"}"
  # Collect stage aliases so `FROM <alias>` (multi-stage reuse) is not flagged.
  mapfile -t aliases < <(awk 'toupper($1) == "FROM" { for (i = 2; i <= NF; i++) if (toupper($i) == "AS" && i < NF) print tolower($(i + 1)) }' "$dockerfile")
  while IFS= read -r line; do
    image="$(awk '{ for (i = 2; i <= NF; i++) if ($i !~ /^--/) { print $i; exit } }' <<< "$line")"
    is_alias=0
    for a in "${aliases[@]}"; do
      if [[ "${image,,}" == "$a" ]]; then is_alias=1; fi
    done
    if [[ $is_alias -eq 1 || "$image" == "scratch" ]]; then
      continue
    fi
    if [[ "$image" =~ @sha256:[0-9a-f]{64}$ ]]; then
      pass "${rel}: base image '${image%%@*}' pinned by digest"
    else
      failure "${rel}: base image '${image}' is not pinned by @sha256 digest"
    fi
  done < <(grep -Ei '^[[:space:]]*FROM[[:space:]]' "$dockerfile")
done

# --- Workflow pip installs must use --require-hashes -----------------------
# Backslash-continued shell lines are joined first so a flag on a continuation
# line is seen as part of the same command. Both .yml and .yaml are scanned.
join_continuations() {
  awk -v f="$1" '
    { if (buf == "") start = FNR }
    /\\[[:space:]]*$/ { sub(/\\[[:space:]]*$/, ""); buf = buf $0; next }
    { print f ":" start ":" buf $0; buf = "" }
    END { if (buf != "") print f ":" start ":" buf }
  ' "$1"
}

workflow_files=()
for wf in "${REPO_ROOT}"/.github/workflows/*.yml "${REPO_ROOT}"/.github/workflows/*.yaml; do
  [[ -f "$wf" ]] && workflow_files+=("$wf")
done

while IFS= read -r hit; do
  file="${hit%%:*}"
  rest="${hit#*:}"
  lineno="${rest%%:*}"
  line="${rest#*:}"
  rel="${file#"${REPO_ROOT}/"}"
  # Ignore YAML comment lines that merely mention pip.
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  # Strip shell comments (everything after #) before checking for --require-hashes.
  active_line="${line%%#*}"
  if [[ "$active_line" == *"--require-hashes"* ]]; then
    pass "${rel}:${lineno}: pip install uses --require-hashes"
  else
    failure "${rel}:${lineno}: pip install without --require-hashes"
  fi
done < <(for wf in "${workflow_files[@]}"; do join_continuations "$wf"; done | grep -E 'pip3?[[:space:]]+install' || true)

# --- Requirements files must hash every requirement ------------------------
mapfile -t reqfiles < <(find "${REPO_ROOT}" -type f -name 'requirements*.txt' \
  -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null | sort)

for req in "${reqfiles[@]}"; do
  rel="${req#"${REPO_ROOT}/"}"
  # Join backslash continuations, drop comments/blank lines, check each entry.
  while IFS= read -r entry; do
    # Skip pip option lines (-r/-c includes, --index-url, ...): not requirements.
    [[ "$entry" =~ ^[[:space:]]*- ]] && continue
    name="${entry%%[ =<>!~;]*}"
    if [[ "$entry" =~ ==[^[:space:]]+ && "$entry" =~ --hash=sha256:[0-9a-fA-F]{64}([[:space:]]|$) ]]; then
      pass "${rel}: '${name}' pinned by version and hash"
    else
      failure "${rel}: '${name}' must be pinned with == and --hash=sha256:"
    fi
  done < <(sed -e ':a' -e '/\\$/N; s/\\\n//; ta' "$req" | sed -e 's/#.*//' | grep -Ev '^[[:space:]]*$' || true)
done

echo
if [[ $fail -ne 0 ]]; then
  echo "pinned-dependencies: FAILED (${pass_count} passed)"
  exit 1
fi
echo "pinned-dependencies: all ${pass_count} checks passed"
