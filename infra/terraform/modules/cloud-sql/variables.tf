variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for the Cloud SQL instance"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "tier" {
  description = "Cloud SQL machine tier"
  type        = string
  default     = "db-f1-micro"
}

variable "deletion_protection" {
  description = "Whether to enable deletion protection on the instance"
  type        = bool
  default     = false
}

variable "database_name" {
  description = "Name of the database to create"
  type        = string
  default     = "broodly"
}

variable "db_password_secret_id" {
  description = "Secret Manager secret ID containing the database password"
  type        = string
}

variable "private_network" {
  description = "VPC network ID with Private Service Access established. The instance gets only a private IP on this network (no public IPv4)."
  type        = string

  validation {
    condition     = length(trimspace(var.private_network)) > 0
    error_message = "private_network must be a non-empty VPC network ID."
  }
}

variable "availability_type" {
  description = "Availability type: REGIONAL for HA, ZONAL for single zone"
  type        = string
  default     = "ZONAL"
}
