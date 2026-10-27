variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for the storage bucket"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "bucket_name" {
  description = "Name of the GCS bucket for media storage"
  type        = string

  # The access-log bucket is "<bucket_name>-access-logs" (12 chars appended);
  # keep the derived name within the 63-char limit and free of dots, which
  # would turn it into a domain-style name with different naming rules.
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9_-]{1,49}[a-z0-9]$", var.bucket_name))
    error_message = "bucket_name must be 3-51 chars of lowercase letters, digits, hyphens or underscores (no dots), starting and ending with a letter or digit, so the derived '-access-logs' bucket name stays valid."
  }
}

variable "cors_origins" {
  description = "List of allowed CORS origins for signed URL uploads. Must be explicitly set per environment."
  type        = list(string)
  default     = []
}
