#!/usr/bin/env bash
# Test: infrastructure hardening that resolves the SonarCloud findings tracked
# in issue #614 stays in place.
#
#   docker:S6471    — API/worker images must not run as root
#   terraform:S6258 — Cloud SQL connection/lock/checkpoint logging and GCS
#                     access logging must be enabled
#   terraform:S6403 — Cloud SQL must reject unencrypted connections
#   terraform:S6329 — Cloud SQL has no public IPv4 endpoint: it is reachable only
#                     over private IP (Private Service Access), and Cloud Run
#                     reaches it through Direct VPC egress (issue #649)
#
# Run: bash tests/scripts/sonar-infra-hardening.test.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SQL_MAIN="${REPO_ROOT}/infra/terraform/modules/cloud-sql/main.tf"
SQL_VARS="${REPO_ROOT}/infra/terraform/modules/cloud-sql/variables.tf"
STORAGE_MAIN="${REPO_ROOT}/infra/terraform/modules/storage/main.tf"
NETWORK_MAIN="${REPO_ROOT}/infra/terraform/modules/network/main.tf"
RUN_MAIN="${REPO_ROOT}/infra/terraform/modules/cloud-run/main.tf"
DEV_MAIN="${REPO_ROOT}/infra/terraform/environments/dev/main.tf"

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

# active_grep <pattern> <file>
# grep -E over uncommented lines only, so a commented-out setting never counts.
active_grep() {
  [[ -f "$2" ]] || return 1
  grep -Ev '^[[:space:]]*(#|//)' "$2" | grep -E "$1" >/dev/null
}

check "cloud-sql disables the public IPv4 endpoint (ipv4_enabled = false)" \
  active_grep '^[[:space:]]*ipv4_enabled[[:space:]]*=[[:space:]]*false' "$SQL_MAIN"

check "cloud-sql attaches the instance to a private network" \
  active_grep '^[[:space:]]*private_network[[:space:]]*=[[:space:]]*var\.private_network' "$SQL_MAIN"

check "cloud-sql declares no authorized_networks (public-IP allow-list)" \
  bash -c '! grep -Ev "^[[:space:]]*(#|//)" "$1" | grep -Eq "authorized_networks"' _ "$SQL_MAIN"

check "cloud-sql module no longer exposes an authorized_networks variable" \
  bash -c '! grep -Eq "^[[:space:]]*variable[[:space:]]+\"authorized_networks\"" "$1"' _ "$SQL_VARS"

check "network module reserves a VPC_PEERING range for Private Service Access" \
  active_grep '^[[:space:]]*purpose[[:space:]]*=[[:space:]]*"VPC_PEERING"' "$NETWORK_MAIN"

check "network module creates the servicenetworking.googleapis.com connection" \
  active_grep '^[[:space:]]*service[[:space:]]*=[[:space:]]*"servicenetworking\.googleapis\.com"' "$NETWORK_MAIN"

for api in compute.googleapis.com servicenetworking.googleapis.com; do
  check "dev environment enables ${api}" \
    active_grep "^[[:space:]]*\"${api//./\\.}\",?[[:space:]]*\$" "$DEV_MAIN"
done

check "dev environment wires the private network into cloud_sql" \
  active_grep '^[[:space:]]*private_network[[:space:]]*=[[:space:]]*module\.network\.' "$DEV_MAIN"

check "dev environment wires Direct VPC egress into cloud_run" \
  active_grep '^[[:space:]]*vpc_subnetwork[[:space:]]*=[[:space:]]*module\.network\.' "$DEV_MAIN"

check "cloud-run supports Direct VPC egress to private ranges" \
  active_grep '^[[:space:]]*egress[[:space:]]*=[[:space:]]*"PRIVATE_RANGES_ONLY"' "$RUN_MAIN"

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
