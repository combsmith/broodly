terraform {
  required_providers {
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
}

# Enables Firebase on the GCP project (requires firebase.googleapis.com).
resource "google_firebase_project" "this" {
  provider = google-beta
  project  = var.project_id
}

resource "google_firebase_web_app" "app" {
  provider     = google-beta
  project      = var.project_id
  display_name = var.display_name

  depends_on = [google_firebase_project.this]
}

data "google_firebase_web_app_config" "app" {
  provider   = google-beta
  project    = var.project_id
  web_app_id = google_firebase_web_app.app.app_id
}
