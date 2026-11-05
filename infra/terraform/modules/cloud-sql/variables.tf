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

variable "authorized_networks" {
  description = "List of authorized networks for database access"
  type = list(object({
    name  = string
    value = string
  }))
  default = []

  validation {
    condition     = alltrue([for n in var.authorized_networks : !contains(["0.0.0.0/0", "::/0"], n.value)])
    error_message = "authorized_networks must not include 0.0.0.0/0 or ::/0 (open to the internet)."
  }
}

variable "availability_type" {
  description = "Availability type: REGIONAL for HA, ZONAL for single zone"
  type        = string
  default     = "ZONAL"
}
