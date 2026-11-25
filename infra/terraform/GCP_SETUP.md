# GCP Manual Setup Guide

This document records the one-time GCP configuration steps that cannot be automated via Terraform or CI/CD. These steps were performed for project `broodly-491920` (project number `922040293304`).

## Prerequisites

- `gcloud` CLI authenticated with Owner access to the GCP project
- `gh` CLI authenticated with repo access

## 1. Workload Identity Federation (GitHub Actions → GCP)

These steps allow GitHub Actions to authenticate to GCP without service account keys.

### 1.0 Enable Required APIs

These APIs are codified in Terraform as `google_project_service.ci_required` in `infra/terraform/environments/dev/main.tf`, so `terraform apply` enables them. To enable them before the first apply, run:

```bash
gcloud services enable \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  artifactregistry.googleapis.com \
  --project="broodly-491920"
```

> **Note:** `iamcredentials.googleapis.com` is required for the WIF provider to impersonate `broodly-ci`. Without it, `google-github-actions/auth` succeeds but `docker push` fails with `IAM Service Account Credentials API has not been used in project 922040293304 before or it is disabled`.

### 1.1 Create CI Service Account

```bash
gcloud iam service-accounts create broodly-ci \
  --project="broodly-491920" \
  --display-name="Broodly CI/CD"
```

### 1.2 Grant Deployment Permissions

```bash
# Artifact Registry (push Docker images)
gcloud projects add-iam-policy-binding broodly-491920 \
  --member="serviceAccount:broodly-ci@broodly-491920.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# Cloud Run (deploy services)
gcloud projects add-iam-policy-binding broodly-491920 \
  --member="serviceAccount:broodly-ci@broodly-491920.iam.gserviceaccount.com" \
  --role="roles/run.admin"

# Act as runtime service accounts during deploy
gcloud projects add-iam-policy-binding broodly-491920 \
  --member="serviceAccount:broodly-ci@broodly-491920.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

### 1.3 Create Workload Identity Pool

```bash
gcloud iam workload-identity-pools create "github-actions" \
  --project="broodly-491920" \
  --location="global" \
  --display-name="GitHub Actions"
```

### 1.4 Create OIDC Provider (GitHub)

```bash
gcloud iam workload-identity-pools providers create-oidc "github" \
  --project="broodly-491920" \
  --location="global" \
  --workload-identity-pool="github-actions" \
  --display-name="GitHub" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

### 1.5 Allow GitHub Repo to Impersonate Service Account

```bash
gcloud iam service-accounts add-iam-policy-binding \
  "broodly-ci@broodly-491920.iam.gserviceaccount.com" \
  --project="broodly-491920" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/922040293304/locations/global/workloadIdentityPools/github-actions/attribute.repository/combsmith/broodly"
```

> **Note:** Update the `attribute.repository` value if the GitHub repo moves to a different org/name.

## 2. Artifact Registry Repository

```bash
gcloud artifacts repositories create broodly \
  --project="broodly-491920" \
  --repository-format=docker \
  --location=us-central1 \
  --description="Broodly container images"
```

## 3. GitHub Secrets

These secrets are required by the CI/CD pipeline (`.github/workflows/ci.yml`):

```bash
gh secret set GCP_PROJECT_ID --repo combsmith/broodly --body "broodly-491920"
gh secret set GCP_WORKLOAD_IDENTITY_PROVIDER --repo combsmith/broodly --body "projects/922040293304/locations/global/workloadIdentityPools/github-actions/providers/github"
gh secret set GCP_SERVICE_ACCOUNT --repo combsmith/broodly --body "broodly-ci@broodly-491920.iam.gserviceaccount.com"
```

## 4. Firebase Console (Manual)

These Firebase settings must be configured manually in the [Firebase Console](https://console.firebase.google.com/project/broodly-491920):

1. **Authentication Providers** — Enable Google Sign-In and Apple Sign-In under Authentication > Sign-in method
2. **Web App Registration** — Register a web app to get the `apiKey`, `authDomain`, etc. (Terraform outputs these if using the Firebase module)
3. **Auth Emulator** — No console config needed; runs locally via `firebase emulators:start --only auth`

## 5. Cloud SQL (Database)

The database is provisioned via Terraform (`infra/terraform/modules/cloud-sql/`). It has **no public IP**: it gets a private IP through Private Service Access on the VPC from `infra/terraform/modules/network/`. Cloud Run reaches it through Direct VPC egress. You can't connect from outside the VPC, including from a laptop with the Cloud SQL Auth Proxy, unless you have a path into the VPC.

The instance sets `connector_enforcement = "REQUIRED"`, so plain TCP clients are rejected even over the private IP. The API must connect through the Cloud SQL Go Connector (`cloud.google.com/go/cloudsqlconn`) with `cloudsqlconn.WithPrivateIP()`, using the instance connection name. Direct VPC egress gives network reachability; the connector supplies authorization.

Store a connection string in Secret Manager that carries the instance connection name instead of a host:

```bash
CONNECTION_NAME=$(gcloud sql instances describe broodly-dev \
  --project="broodly-491920" \
  --format="value(connectionName)")
gcloud secrets versions add db-connection-string \
  --project="broodly-491920" \
  --data-file=<(printf '%s' "postgres://broodly:PASSWORD@/broodly?instance=${CONNECTION_NAME}&ip_type=PRIVATE")
```

The API's database layer must parse `instance` and `ip_type` and dial through the connector.

### 5.1 Rollback: Keeping the Private Network

**⚠️ IMPORTANT: Do NOT roll back by reverting the Cloud SQL Terraform changes wholesale.**

Removing `private_network` from an existing Cloud SQL instance is a ForceNew operation, which means `terraform apply` will destroy and recreate the instance. Since the dev environment sets `deletion_protection = false`, the database will be **permanently deleted**.

**To safely roll back while keeping the database:**

1. Keep `private_network = module.network.private_services_network_id` in `infra/terraform/environments/dev/main.tf` and retain the `private_network = var.private_network` wiring in `infra/terraform/modules/cloud-sql/`
2. Retain the VPC (`infra/terraform/modules/network/`) and the Private Service Access connection
3. Adjust only other settings as needed (e.g., Cloud Run egress, security groups)

**Full revert is a migration, not a rollback.** Removing `private_network` forces instance replacement. With `deletion_protection = true` (the setting that protects the data), the locked Google provider (5.45.2) refuses to destroy the instance, so `terraform apply` fails by design. Reverting therefore cannot be completed by Terraform alone. To migrate off the private network:
1. Export the database using Cloud SQL export (e.g., to a GCS bucket) and verify the export
2. Deliberately set `deletion_protection = false` and apply. This does not destroy the instance by itself.
3. Revert the Terraform configuration (remove `private_network`) and apply. **This apply destroys the existing instance and creates the replacement**, so confirm the export first.
4. Restore the export into the new instance and repoint `db-connection-string`

> **Behavior change (issue #649):** `ipv4_enabled = false` removes the public IPv4 endpoint, and no `authorized_networks` allow-list remains. Any client outside the VPC (e.g., an operator laptop using a public IP) can no longer connect directly; they need a path into the VPC.

## Reference

| Resource | Value |
|---|---|
| GCP Project ID | `broodly-491920` |
| GCP Project Number | `922040293304` |
| CI Service Account | `broodly-ci@broodly-491920.iam.gserviceaccount.com` |
| Workload Identity Pool | `github-actions` |
| Workload Identity Provider | `github` |
| Artifact Registry | `us-central1-docker.pkg.dev/broodly-491920/broodly` |
| Cloud Run Region | `us-central1` |
