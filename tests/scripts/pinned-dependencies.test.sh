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
mapfile -t dockerfiles < <(
  for d in "${REPO_ROOT}/apps" "${REPO_ROOT}/packages" "${REPO_ROOT}/infra"; do
    [[ -d "$d" ]] && find "$d" -type f \( -name 'Dockerfile' -o -name 'Dockerfile.*' -o -name '*.Dockerfile' \) \
      -not -path '*/node_modules/*'
  done | sort
)

if [[ ${#dockerfiles[@]} -eq 0 ]]; then
  failure "no Dockerfiles found (expected at least apps/api/Dockerfile)"
fi

for dockerfile in ${dockerfiles[@]+"${dockerfiles[@]}"}; do
  rel="${dockerfile#"${REPO_ROOT}/"}"
  # Stage aliases are collected in order: a FROM is checked only against the
  # aliases of EARLIER stages, then its own alias is added. So a later
  # `AS alpine` cannot hide an earlier external `FROM alpine`, and
  # `FROM alpine AS alpine` is still checked as an external image.
  aliases=()
  while IFS= read -r line; do
    image="$(awk '{ for (i = 2; i <= NF; i++) if ($i !~ /^--/) { print $i; exit } }' <<< "$line")"
    stage_alias="$(awk '{ for (i = 2; i < NF; i++) if (toupper($i) == "AS") { print tolower($(i + 1)); exit } }' <<< "$line")"
    is_alias=0
    for a in ${aliases[@]+"${aliases[@]}"}; do
      if [[ "${image,,}" == "$a" ]]; then is_alias=1; fi
    done
    [[ -n "$stage_alias" ]] && aliases+=("$stage_alias")
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
    /^[[:space:]]*#/ { print f ":" FNR ":" buf $0; buf = ""; next }
    /\\[[:space:]]*$/ { sub(/\\[[:space:]]*$/, ""); buf = buf $0; next }
    { print f ":" start ":" buf $0; buf = "" }
    END { if (buf != "") print f ":" start ":" buf }
  ' "$1"
}

# Strip a trailing shell comment: a '#' starts a comment only when it is
# unquoted, unescaped, and at the start of a word. '#' inside '...' or "..."
# (e.g. echo "#395") is preserved. A '#' also starts a comment right after a
# shell control operator (; & | ( ). A single-line YAML-quoted `run: '...'`
# scalar is unwrapped first so the YAML quotes are not mistaken for shell
# quotes (the shell only sees the scalar's content).
strip_shell_comment() {
  local s="$1" out="" c prev=" " quote="" ansi=0 i
  # A trailing YAML comment (` # ...`) after the closing quote is dropped.
  local re_sq="^([[:space:]]*(-[[:space:]]+)?run:[[:space:]]+)'(([^']|'')*)'([[:space:]]+#.*)?[[:space:]]*\$"
  local re_dq='^([[:space:]]*(-[[:space:]]+)?run:[[:space:]]+)"(([^"\\]|\\.)*)"([[:space:]]+#.*)?[[:space:]]*$'
  if [[ "$s" =~ $re_sq ]]; then
    s="${BASH_REMATCH[3]//\'\'/\'}"
  elif [[ "$s" =~ $re_dq ]]; then
    s="${BASH_REMATCH[3]//\\\"/\"}"
  fi
  for ((i = 0; i < ${#s}; i++)); do
    c="${s:i:1}"
    if [[ "$prev" == "\\" && ( "$quote" != "'" || $ansi -eq 1 ) ]]; then
      out+="$c"; prev="x"; continue
    fi
    if [[ -n "$quote" ]]; then
      [[ "$c" == "$quote" ]] && { quote=""; ansi=0; }
    elif [[ "$c" == "'" || "$c" == '"' ]]; then
      quote="$c"
      # $'...' is an ANSI-C string: backslash escapes (including \') apply.
      [[ "$c" == "'" && "$prev" == '$' ]] && ansi=1
    elif [[ "$c" == "#" && ( -z "$prev" || "$prev" =~ [[:space:]] || "$prev" == [\;\&\|\(] ) ]]; then
      break
    fi
    out+="$c"; prev="$c"
  done
  printf '%s' "$out"
}

# Split a shell line into simple commands at unquoted ; & && | || (one per
# output line). '&' inside a redirection (2>&1, &>) is not a separator.
split_commands() {
  local s="$1" c prev=" " quote="" ansi=0 i next
  for ((i = 0; i < ${#s}; i++)); do
    c="${s:i:1}"; next="${s:i+1:1}"
    if [[ "$prev" == "\\" && ( "$quote" != "'" || $ansi -eq 1 ) ]]; then
      printf '%s' "$c"; prev="x"; continue
    fi
    if [[ -n "$quote" ]]; then
      [[ "$c" == "$quote" ]] && { quote=""; ansi=0; }
    elif [[ "$c" == "'" || "$c" == '"' ]]; then
      quote="$c"
      # $'...' is an ANSI-C string: backslash escapes (including \') apply.
      [[ "$c" == "'" && "$prev" == '$' ]] && ansi=1
    elif [[ "$c" == ";" || "$c" == "|" ]]; then
      printf '\n'; prev=" "; continue
    elif [[ "$c" == "&" && "$prev" != ">" && "$prev" != "<" && "$next" != ">" ]]; then
      printf '\n'; prev=" "; continue
    fi
    printf '%s' "$c"; prev="$c"
  done
  printf '\n'
}

# `pip [global options] install`: pip accepts global options (and their values)
# before the subcommand, e.g. `python3 -m pip --disable-pip-version-check install`.
pip_install_re='pip3?[[:space:]]+(-[^[:space:]]*[[:space:]]+([^-[:space:]][^[:space:]]*[[:space:]]+)?)*install([[:space:]]|$)'
# YAML metadata keys (step `name:` etc.) are not shell commands.
yaml_meta_re='^[[:space:]]*(-[[:space:]]+)?(name|description|id|if):'

shopt -s nullglob
workflow_files=("${REPO_ROOT}"/.github/workflows/*.yml "${REPO_ROOT}"/.github/workflows/*.yaml)
shopt -u nullglob

while IFS= read -r hit; do
  file="${hit%%:*}"
  rest="${hit#*:}"
  lineno="${rest%%:*}"
  line="${rest#*:}"
  rel="${file#"${REPO_ROOT}/"}"
  # Ignore YAML comment lines that merely mention pip.
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  # Ignore step metadata (e.g. `name: Verify pip install`): it is not executed.
  [[ "$line" =~ $yaml_meta_re ]] && continue
  # Strip real shell comments (unquoted '#') before checking for --require-hashes.
  active_line="$(strip_shell_comment "$line")"
  # Every simple command that runs `pip install` needs the flag itself.
  found_pip=0
  while IFS= read -r cmd; do
    [[ "$cmd" =~ $pip_install_re ]] || continue
    found_pip=1
    # Redirections (e.g. `> /tmp/--require-hashes.log`) are not pip arguments.
    pip_args="$(sed -E 's/[0-9&]*(>>?|<)&?[[:space:]]*[^[:space:]]+//g' <<< "$cmd")"
    if [[ "$pip_args" =~ (^|[[:space:]])--require-hashes([[:space:]=]|$) ]]; then
      pass "${rel}:${lineno}: pip install uses --require-hashes"
    else
      failure "${rel}:${lineno}: pip install without --require-hashes"
    fi
  done < <(split_commands "$active_line")
  # The line matched `pip install` but no pip command survived comment
  # stripping/splitting (e.g. a multi-line string hid it): fail, never skip.
  # A match removed purely as a shell comment is not an active command: allow it.
  if [[ $found_pip -eq 0 && "$active_line" =~ $pip_install_re ]]; then
    failure "${rel}:${lineno}: pip install not verifiable (no pip command found after parsing)"
  fi
done < <(for wf in ${workflow_files[@]+"${workflow_files[@]}"}; do join_continuations "$wf"; done | grep -E "$pip_install_re" || true)

# --- Requirements files must hash every requirement ------------------------
mapfile -t reqfiles < <(find "${REPO_ROOT}" -type f -name 'requirements*.txt' \
  -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null | sort)

for req in ${reqfiles[@]+"${reqfiles[@]}"}; do
  rel="${req#"${REPO_ROOT}/"}"
  # Join backslash continuations, drop comments/blank lines, check each entry.
  while IFS= read -r entry; do
    # Included files (-r/-c/--requirement/--constraint, any spelling) may not be
    # named requirements*.txt and so would go unchecked: fail instead.
    if [[ "$entry" =~ ^[[:space:]]*(-[rc]|--requirement|--constraint) ]]; then
      failure "${rel}: include line '${entry}' is not allowed (inline the pinned requirements)"
      continue
    fi
    # Editable requirements bypass version/hash pinning: reject them.
    if [[ "$entry" =~ ^[[:space:]]*(-e|--editable([[:space:]=]|$)) ]]; then
      failure "${rel}: editable requirement '${entry}' is not allowed"
      continue
    fi
    # Skip other pip option lines (--index-url, ...): not requirements.
    [[ "$entry" =~ ^[[:space:]]*- ]] && continue
    name="${entry%%[ =<>!~;]*}"
    # Only the package specifier (before any ';' environment marker or
    # ' --' option) may supply the '==' pin; a marker's '==' must not count.
    spec="${entry%%;*}"
    spec="${spec%% --*}"
    if [[ "$spec" =~ ^[[:space:]]*[^[:space:]=\<\>!~\;]+(\[[^]]*\])?[[:space:]]*==[[:space:]]*[^[:space:]=*]+[[:space:]]*$ && "$entry" =~ --hash=sha256:[0-9a-fA-F]{64}([[:space:]]|$) ]]; then
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
