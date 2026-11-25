resource "google_cloud_run_v2_service" "api" {
  name     = var.service_name
  location = var.region

  template {
    service_account = var.service_account_email

    containers {
      image = var.image

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = var.cpu
          memory = var.memory
        }
      }

      env {
        name  = "FIREBASE_PROJECT_ID"
        value = var.project_id
      }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = var.db_connection_secret
            version = "latest"
          }
        }
      }

      env {
        name  = "CORS_ORIGIN"
        value = var.cors_origin
      }
    }

    # Direct VPC egress so the service reaches the private-IP-only Cloud SQL
    # instance (issue #649). Only RFC 1918 traffic uses the VPC; public egress
    # (Firebase, Google APIs) is unchanged.
    dynamic "vpc_access" {
      for_each = var.vpc_subnetwork == null ? [] : [1]
      content {
        egress = "PRIVATE_RANGES_ONLY"
        network_interfaces {
          network    = var.vpc_network
          subnetwork = var.vpc_subnetwork
        }
      }
    }

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

# SECURITY: Allow unauthenticated HTTP access to Cloud Run.
# This is intentional — the Go API validates Firebase ID tokens in its own
# auth middleware (internal/auth/middleware.go). Cloud Run's built-in IAM
# auth is bypassed because mobile/web clients send Bearer tokens directly.
# Removing this binding would block all client traffic.
resource "google_cloud_run_v2_service_iam_member" "public" { # NOSONAR — intentional, see comment above
  count    = var.allow_unauthenticated ? 1 : 0
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
