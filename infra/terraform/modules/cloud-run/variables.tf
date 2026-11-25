variable "service_name" {
  description = "Name of the Cloud Run service"
  type        = string
}

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for the Cloud Run service"
  type        = string
}

variable "image" {
  description = "Container image to deploy (full Artifact Registry path)"
  type        = string
}

variable "service_account_email" {
  description = "Service account email for the Cloud Run service"
  type        = string
}

variable "cpu" {
  description = "CPU limit for the container"
  type        = string
  default     = "1"
}

variable "memory" {
  description = "Memory limit for the container"
  type        = string
  default     = "512Mi"
}

variable "min_instances" {
  description = "Minimum number of instances (0 allows scale-to-zero)"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum number of instances"
  type        = number
  default     = 10
}

variable "db_connection_secret" {
  description = "Secret Manager secret ID containing the database connection string"
  type        = string
}

variable "cors_origin" {
  description = "Allowed CORS origin for the API"
  type        = string
  default     = ""
}

variable "allow_unauthenticated" {
  description = "Whether to allow unauthenticated access to the Cloud Run service. The API validates Firebase tokens internally, so this must be true for client access. Default false for safety — set explicitly per environment."
  type        = bool
  default     = false
}

variable "vpc_network" {
  description = "VPC network ID for Direct VPC egress. Set together with vpc_subnetwork; null disables VPC egress."
  type        = string
  default     = null
}

variable "vpc_subnetwork" {
  description = "Subnetwork ID for Direct VPC egress (needed to reach the private-IP Cloud SQL instance). Null disables VPC egress."
  type        = string
  default     = null

  validation {
    condition     = var.vpc_subnetwork == null || length(trimspace(var.vpc_subnetwork)) > 0
    error_message = "vpc_subnetwork must be null or a non-empty subnetwork ID."
  }
}
