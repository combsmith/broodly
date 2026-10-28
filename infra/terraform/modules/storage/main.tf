resource "google_storage_bucket" "media" {
  name     = var.bucket_name
  project  = var.project_id
  location = var.region

  uniform_bucket_level_access = true
  force_destroy               = var.environment == "dev" ? true : false

  versioning {
    enabled = true
  }

  logging {
    log_bucket        = google_storage_bucket.access_logs.name
    log_object_prefix = var.bucket_name
  }

  dynamic "cors" {
    for_each = length(var.cors_origins) > 0 ? [1] : []
    content {
      origin          = var.cors_origins
      method          = ["GET", "PUT", "POST", "HEAD"]
      response_header = ["Content-Type", "Content-Disposition", "Content-Length"]
      max_age_seconds = 3600
    }
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type          = "SetStorageClass"
      storage_class = "ARCHIVE"
    }
  }
}

# Destination for media bucket usage/storage access logs. This bucket is the
# log sink itself, so it does not log its own access (that would recurse).
resource "google_storage_bucket" "access_logs" { # NOSONAR — terraform:S6258 confirmed safe: this is the access-log sink
  name     = "${var.bucket_name}-access-logs"
  project  = var.project_id
  location = var.region

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = var.environment == "dev" ? true : false

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type = "Delete"
    }
  }
}

# Cloud Storage writes usage and storage logs as this Google-managed group.
resource "google_storage_bucket_iam_member" "access_logs_writer" {
  bucket = google_storage_bucket.access_logs.name
  role   = "roles/storage.objectCreator"
  member = "group:cloud-storage-analytics@google.com"
}
