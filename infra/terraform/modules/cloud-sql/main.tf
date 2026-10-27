resource "google_sql_database_instance" "main" {
  name                = "broodly-${var.environment}"
  project             = var.project_id
  region              = var.region
  database_version    = "POSTGRES_16"
  deletion_protection = var.deletion_protection

  settings {
    tier              = var.tier
    availability_type = var.availability_type

    # Public-IP connections must go through the Cloud SQL connector (IAM
    # authorization + TLS); direct client connections are rejected.
    connector_enforcement = "REQUIRED"

    database_flags {
      name  = "cloudsql.enable_pgvector"
      value = "on"
    }

    # Audit logging: record session lifecycle, checkpoints, and lock waits.
    database_flags {
      name  = "log_connections"
      value = "on"
    }

    database_flags {
      name  = "log_disconnections"
      value = "on"
    }

    database_flags {
      name  = "log_checkpoints"
      value = "on"
    }

    database_flags {
      name  = "log_lock_waits"
      value = "on"
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "03:00"
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = 7
        retention_unit   = "COUNT"
      }
    }

    ip_configuration {
      # Public IP is required: Cloud Run reaches the instance through the
      # Cloud SQL connector (/cloudsql socket), and there is no VPC/private
      # service access in this project. connector_enforcement = "REQUIRED"
      # (see settings above) rejects any connection that bypasses the connector,
      # so even a caller-supplied authorized_networks range cannot open direct
      # access; connector traffic is IAM-authorized and TLS-encrypted.
      ipv4_enabled = true # NOSONAR — terraform:S6329 confirmed safe, see comment above

      # Reject unencrypted connections; the Cloud SQL connector always uses TLS.
      ssl_mode = "ENCRYPTED_ONLY"

      dynamic "authorized_networks" {
        for_each = var.authorized_networks
        content {
          name  = authorized_networks.value.name
          value = authorized_networks.value.value
        }
      }
    }

    insights_config {
      query_insights_enabled = true
    }
  }
}

resource "google_sql_database" "broodly" {
  name     = var.database_name
  instance = google_sql_database_instance.main.name
  project  = var.project_id
}

data "google_secret_manager_secret_version" "db_password" {
  secret  = var.db_password_secret_id
  project = var.project_id
}

# NOTE: Password will be stored in Terraform state. Ensure state backend
# (GCS bucket) has restricted IAM access. Consider migrating to Cloud SQL
# IAM DB authentication for production environments.
resource "google_sql_user" "app" {
  name     = "broodly-app"
  instance = google_sql_database_instance.main.name
  project  = var.project_id
  password = data.google_secret_manager_secret_version.db_password.secret_data
}
