#!/usr/bin/env bash
# Test: the GCP APIs the CI image-push path depends on are enabled by Terraform,
# and the push-api-image job verifies its credentials before building.
#
# Why this exists: Fleet Monitor issues #607 and #611 flagged
# .github/workflows/ci.yml as degraded. Every push to main failed in the
# "Push API Image" job with:
#   ERROR: (gcloud.auth.docker-helper) ... IAM Service Account Credentials API has
#   not been used in project 922040293304 before or it is disabled
#   denied: Unauthenticated request ... artifactregistry.repositories.uploadArtifacts
# google-github-actions/auth "succeeds" (it only writes a WIF credentials file);
# the service-account impersonation that needs iamcredentials.googleapis.com is
# deferred until docker push. #608 documented the API as a manual setup step,
# which was never run. This guard keeps the APIs codified in Terraform and keeps
# a token preflight in CI so a missing API fails fast with an actionable error.
#
# Run: bash tests/scripts/gcp-required-apis.test.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TF_FILE="${REPO_ROOT}/infra/terraform/environments/dev/main.tf"
CI_FILE="${REPO_ROOT}/.github/workflows/ci.yml"

# APIs required for GitHub Actions (WIF) to impersonate broodly-ci and push to
# Artifact Registry.
REQUIRED_APIS=(
  "iam.googleapis.com"
  "iamcredentials.googleapis.com"
  "sts.googleapis.com"
  "artifactregistry.googleapis.com"
)

fail=0
pass_count=0

# tf_declares_api <tf-file> <api>
# Succeeds when <tf-file> enables <api> through a google_project_service
# resource — either directly (service = "<api>") or via a for_each set that
# lists "<api>" as a quoted element.
tf_declares_api() {
  local path="$1" api="$2"
  # Only lines inside a google_project_service block (tracked by brace depth)
  # are considered, so a quoted API in locals or another resource never counts.
  awk -v api="$api" '
    BEGIN { gsub(/\./, "[.]", api); re = "^[[:space:]]*(service[[:space:]]*=[[:space:]]*)?\"" api "\",?[[:space:]]*(#.*)?$" }
    !in_res && /^[[:space:]]*resource[[:space:]]+"google_project_service"/ { in_res = 1; depth = 0 }
    in_res {
      if ($0 ~ re) found = 1
      line = $0
      sub(/[[:space:]]*(#|\/\/).*$/, "", line)
      opens = gsub(/\{/, "{", line)
      closes = gsub(/\}/, "}", line)
      depth += opens - closes
      if (depth <= 0 && (opens > 0 || closes > 0)) in_res = 0
    }
    END { exit found ? 0 : 1 }
  ' "$path"
}

# job_has_preflight_before_build <ci-file>
# Succeeds when the push-api-image job runs `gcloud auth print-access-token`
# before the step that runs `docker build`.
job_has_preflight_before_build() {
  python3 - "$1" <<'PY'
import sys, yaml
with open(sys.argv[1]) as fh:
    wf = yaml.safe_load(fh)
steps = wf["jobs"]["push-api-image"]["steps"]
runs = [s.get("run", "") or "" for s in steps]
pre = next((i for i, r in enumerate(runs) if "gcloud auth print-access-token" in r), None)
build = next((i for i, r in enumerate(runs) if "docker build" in r), None)
sys.exit(0 if pre is not None and build is not None and pre < build else 1)
PY
}

# --- Negative control: a Terraform file without the API is rejected. ---------
_fixture_dir="$(mktemp -d)" || { echo "Failed to create temporary directory" >&2; exit 1; }
trap '[[ -n "${_fixture_dir:-}" ]] && rm -rf "$_fixture_dir"' EXIT

_bad_tf="${_fixture_dir}/bad.tf"
cat > "$_bad_tf" <<'EOF'
resource "google_project_service" "required" {
  for_each = toset([
    "iam.googleapis.com",
  ])
  service = each.value
}
EOF

! tf_declares_api "$_bad_tf" "iamcredentials.googleapis.com" \
  && { echo "ok - checker rejects Terraform missing iamcredentials.googleapis.com"; pass_count=$((pass_count + 1)); } \
  || { echo "not ok - checker accepted Terraform missing iamcredentials.googleapis.com"; fail=1; }

# A mention in a comment must not count as enabling the API.
_comment_tf="${_fixture_dir}/comment.tf"
cat > "$_comment_tf" <<'EOF'
# TODO: enable "iamcredentials.googleapis.com"
resource "google_project_service" "other" {
  service = "iam.googleapis.com"
}
EOF

! tf_declares_api "$_comment_tf" "iamcredentials.googleapis.com" \
  && { echo "ok - checker ignores an API named only in a comment"; pass_count=$((pass_count + 1)); } \
  || { echo "not ok - checker counted an API named only in a comment"; fail=1; }

# An API quoted outside any google_project_service block (e.g. in locals) must
# not count as enabling it.
_locals_tf="${_fixture_dir}/locals.tf"
cat > "$_locals_tf" <<'EOF'
locals {
  required_apis = [
    "iamcredentials.googleapis.com",
  ]
}

resource "google_project_service" "other" {
  service = "iam.googleapis.com"
}
EOF

! tf_declares_api "$_locals_tf" "iamcredentials.googleapis.com" \
  && { echo "ok - checker ignores an API listed outside the google_project_service block"; pass_count=$((pass_count + 1)); } \
  || { echo "not ok - checker counted an API listed outside the google_project_service block"; fail=1; }

# --- Positive assertions: the real Terraform enables every required API. -----
for api in "${REQUIRED_APIS[@]}"; do
  tf_declares_api "$TF_FILE" "$api" \
    && { echo "ok - Terraform enables ${api}"; pass_count=$((pass_count + 1)); } \
    || { echo "not ok - Terraform does not enable ${api} in ${TF_FILE#"${REPO_ROOT}"/}"; fail=1; }
done

# --- Positive assertion: CI verifies credentials before building the image. ---
job_has_preflight_before_build "$CI_FILE" \
  && { echo "ok - push-api-image verifies GCP credentials before docker build"; pass_count=$((pass_count + 1)); } \
  || { echo "not ok - push-api-image lacks a 'gcloud auth print-access-token' preflight before docker build"; fail=1; }

echo "---"
[[ "$fail" -eq 0 ]] \
  && echo "PASS — ${pass_count} assertion(s) passed" \
  || echo "FAIL — see assertions above"
exit "$fail"
