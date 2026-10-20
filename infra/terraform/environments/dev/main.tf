terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# -----------------------------------------------------------------------------
# Project APIs — required for GitHub Actions (Workload Identity Federation) to
# impersonate broodly-ci and push the API image to Artifact Registry.
# Without iamcredentials.googleapis.com, google-github-actions/auth succeeds but
# docker push fails with "Unauthenticated request" (issues #607, #611).
# Guarded by tests/scripts/gcp-required-apis.test.sh.
# -----------------------------------------------------------------------------

resource "google_project_service" "ci_required" {
  for_each = toset([
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
    "artifactregistry.googleapis.com",
  ])

  project = var.project_id
  service = each.value

  # Leave APIs enabled if this resource is removed; disabling them would break
  # CI image pushes and any other workload sharing the project.
  disable_on_destroy = false
}

# -----------------------------------------------------------------------------
# Secret Manager — secret containers only (values added manually or via CI)
# -----------------------------------------------------------------------------

resource "google_secret_manager_secret" "firebase_service_account" {
  secret_id = "firebase-service-account"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "db_password" {
  secret_id = "db-password"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "db_connection_string" {
  secret_id = "db-connection-string"
  project   = var.project_id

  replication {
    auto {}
  }
}

# -----------------------------------------------------------------------------
# IAM Service Accounts
# -----------------------------------------------------------------------------

resource "google_service_account" "api" {
  account_id   = "broodly-api-${var.environment}"
  display_name = "Broodly API Service Account (${var.environment})"
  project      = var.project_id
}

resource "google_service_account" "worker" {
  account_id   = "broodly-worker-${var.environment}"
  display_name = "Broodly Worker Service Account (${var.environment})"
  project      = var.project_id
}

# API service account roles
locals {
  api_roles = [
    "roles/cloudsql.client",
    "roles/pubsub.publisher",
    "roles/storage.objectAdmin",
    "roles/secretmanager.secretAccessor",
  ]

  worker_roles = [
    "roles/cloudsql.client",
    "roles/pubsub.subscriber",
    "roles/storage.objectViewer",
    "roles/aiplatform.user",
    "roles/secretmanager.secretAccessor",
  ]
}

resource "google_project_iam_member" "api" {
  for_each = toset(local.api_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "worker" {
  for_each = toset(local.worker_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.worker.email}"
}

# Secret Manager IAM — allow service accounts to access secrets
resource "google_secret_manager_secret_iam_member" "api_firebase_sa" {
  secret_id = google_secret_manager_secret.firebase_service_account.secret_id
  project   = var.project_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api.email}"
}

resource "google_secret_manager_secret_iam_member" "api_db_password" {
  secret_id = google_secret_manager_secret.db_password.secret_id
  project   = var.project_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api.email}"
}

resource "google_secret_manager_secret_iam_member" "api_db_connection" {
  secret_id = google_secret_manager_secret.db_connection_string.secret_id
  project   = var.project_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api.email}"
}

resource "google_secret_manager_secret_iam_member" "worker_db_password" {
  secret_id = google_secret_manager_secret.db_password.secret_id
  project   = var.project_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.worker.email}"
}

resource "google_secret_manager_secret_iam_member" "worker_db_connection" {
  secret_id = google_secret_manager_secret.db_connection_string.secret_id
  project   = var.project_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.worker.email}"
}

# -----------------------------------------------------------------------------
# Modules
# -----------------------------------------------------------------------------

module "cloud_sql" {
  source = "../../modules/cloud-sql"

  project_id            = var.project_id
  region                = var.region
  environment           = var.environment
  tier                  = "db-f1-micro"
  deletion_protection   = false
  db_password_secret_id = google_secret_manager_secret.db_password.secret_id
}

module "storage" {
  source = "../../modules/storage"

  project_id   = var.project_id
  region       = var.region
  environment  = var.environment
  bucket_name  = "broodly-media-${var.environment}"
  cors_origins = ["http://localhost:8081", "http://localhost:19006"]
}

module "pubsub" {
  source = "../../modules/pubsub"

  project_id  = var.project_id
  environment = var.environment
}

module "firebase" {
  source = "../../modules/firebase"

  project_id   = var.project_id
  environment  = var.environment
  display_name = "Broodly Web"
}

module "cloud_run" {
  source = "../../modules/cloud-run"

  service_name          = "broodly-api-${var.environment}"
  project_id            = var.project_id
  region                = var.region
  image                 = "us-central1-docker.pkg.dev/${var.project_id}/broodly/api:latest"
  service_account_email = google_service_account.api.email
  db_connection_secret  = google_secret_manager_secret.db_connection_string.secret_id
  cors_origin              = "https://broodly-${var.environment}.web.app"
  min_instances            = 0
  max_instances            = 5
  allow_unauthenticated    = true # API validates Firebase tokens internally
}
