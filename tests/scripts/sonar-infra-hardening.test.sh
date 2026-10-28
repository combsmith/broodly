#!/usr/bin/env bash
# Test: infrastructure hardening that resolves the SonarCloud findings tracked
# in issue #614 stays in place.
#
#   docker:S6471    — API/worker images must not run as root
#   terraform:S6258 — Cloud SQL connection/lock/checkpoint logging and GCS
#                     access logging must be enabled
#   terraform:S6403 — Cloud SQL must reject unencrypted connections
#   terraform:S6329 — Cloud SQL public IP is only reachable via the Cloud SQL
#                     connector; authorized_networks must never open 0.0.0.0/0
#
# Run: bash tests/scripts/sonar-infra-hardening.test.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SQL_MAIN="${REPO_ROOT}/infra/terraform/modules/cloud-sql/main.tf"
SQL_VARS="${REPO_ROOT}/infra/terraform/modules/cloud-sql/variables.tf"
STORAGE_MAIN="${REPO_ROOT}/infra/terraform/modules/storage/main.tf"

fail=0
pass_count=0

check() {
  local desc="$1"
  shift
  if "$@"; then
    echo "PASS: ${desc}"
    pass_count=$((pass_count + 1))
  else
    echo "FAIL: ${desc}"
    fail=1
  fi
}

# final_stage_user <dockerfile>
# Prints the last USER instruction that appears after the final FROM.
final_stage_user() {
  awk '
    /^[[:space:]]*FROM[[:space:]]/ { user = "" }
    /^[[:space:]]*USER[[:space:]]/ { user = $2 }
    END { print user }
  ' "$1"
}

runs_as_non_root() {
  local user uid
  user="$(final_stage_user "$1")"
  # Verify the resolved UID is non-root. Only the distroless non-root identity
  # (UID 65532) or explicit non-root numeric UIDs are accepted: an unknown user name
  # makes Cloud Run fall back to root, so a bare "not root" spelling is not enough.
  # Extract numeric UID if format is UID:GID.
  uid="${user%%:*}"
  [[ "$uid" =~ ^[0-9]+$ && "$uid" != "0" ]] || [[ "$user" == "nonroot" || "$user" == "nonroot:nonroot" || "$user" == "65532" || "$user" == "65532:65532" ]]
}

# has_db_flag <tf-file> <flag> <value>
# Succeeds when a database_flags block sets name = <flag> and value = <value>,
# matching only active (uncommented) lines.
has_db_flag() {
  awk -v flag="$2" -v want="$3" '
    /^[[:space:]]*(#|\/\/)/ { next }
    /^[[:space:]]*database_flags[[:space:]]*\{/ { in_blk = 1; name = ""; value = ""; next }
    in_blk && /^[[:space:]]*#/ { next }
    in_blk && /^[[:space:]]*name[[:space:]]*=/  { if (!/^[[:space:]]*(#|\/\/)/) { line = $0; sub(/.*=[[:space:]]*"/, "", line); sub(/".*/, "", line); name = line } }
    in_blk && /^[[:space:]]*value[[:space:]]*=/ { if (!/^[[:space:]]*(#|\/\/)/) { line = $0; sub(/.*=[[:space:]]*"/, "", line); sub(/".*/, "", line); value = line } }
    in_blk && /\}/ { if (name == flag && value == want) found = 1; in_blk = 0 }
    END { exit found ? 0 : 1 }
  ' "$1"
}

for dockerfile in "${REPO_ROOT}/apps/api/Dockerfile" "${REPO_ROOT}/apps/api/Dockerfile.worker"; do
  check "${dockerfile#"${REPO_ROOT}/"} final stage runs as a non-root USER" runs_as_non_root "$dockerfile"
done

for flag in log_connections log_disconnections log_checkpoints log_lock_waits; do
  check "cloud-sql sets database flag ${flag}=on" has_db_flag "$SQL_MAIN" "$flag" "on"
done

check "cloud-sql enforces encrypted connections (ssl_mode = ENCRYPTED_ONLY)" \
  grep -Eq '^[[:space:]]*ssl_mode[[:space:]]*=[[:space:]]*"(ENCRYPTED_ONLY|TRUSTED_CLIENT_CERTIFICATE_REQUIRED)"' "$SQL_MAIN"

check "cloud-sql enforces connector-only access (connector_enforcement = REQUIRED)" \
  grep -Eq '^[[:space:]]*connector_enforcement[[:space:]]*=[[:space:]]*"REQUIRED"' "$SQL_MAIN"

check "cloud-sql authorized_networks validation rejects 0.0.0.0/0" \
  awk '/^[[:space:]]*(#|\/\/)/ { next } /^[[:space:]]*validation[[:space:]]*\{/ { in_val = 1; next } in_val && /^[[:space:]]*(#|\/\/)/ { next } in_val && /^[[:space:]]*condition[[:space:]]*=/ { cond = $0; if (index(cond, "!contains") && index(cond, "0.0.0.0/0")) found = 1 } in_val && /\}/ { in_val = 0 } END { exit found ? 0 : 1 }' "$SQL_VARS"

check "storage media bucket has an access logging block" \
  grep -Eq '^[[:space:]]*log_bucket[[:space:]]*=' "$STORAGE_MAIN"

# iam_member_grants <tf-file> <bucket-ref> <role> <member>
# Succeeds when a single google_storage_bucket_iam_member resource sets all three
# together in the same resource block, with active (uncommented) fields.
iam_member_grants() {
  awk -v bucket="$2" -v role="$3" -v member="$4" '
    /^[[:space:]]*(#|\/\/)/ { next }
    /^resource[[:space:]]+"google_storage_bucket_iam_member"/ { in_res = 1; b = r = m = 0; next }
    in_res && /^[[:space:]]*(#|\/\/)/ { next }
    in_res && /^[[:space:]]*bucket[[:space:]]*=/ { if (index($0, bucket)) b = 1 }
    in_res && /^[[:space:]]*role[[:space:]]*=/   { if (index($0, "\"" role "\"")) r = 1 }
    in_res && /^[[:space:]]*member[[:space:]]*=/ { if (index($0, "\"" member "\"")) m = 1 }
    in_res && /^\}/ { if (b && r && m) found = 1; in_res = 0 }
    END { exit found ? 0 : 1 }
  ' "$1"
}

check "storage grants Cloud Storage analytics objectCreator on the log bucket" \
  iam_member_grants "$STORAGE_MAIN" "google_storage_bucket.access_logs.name" \
    "roles/storage.objectCreator" "group:cloud-storage-analytics@google.com"

echo
if [[ "$fail" -ne 0 ]]; then
  echo "sonar-infra-hardening: FAILED (${pass_count} passed)"
  exit 1
fi
echo "sonar-infra-hardening: all ${pass_count} checks passed"
