variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for the serverless egress subnet"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "serverless_subnet_cidr" {
  description = "CIDR range for the Cloud Run Direct VPC egress subnet (at least a /26)"
  type        = string
  default     = "10.10.0.0/24"

  validation {
    condition     = can(cidrhost(var.serverless_subnet_cidr, 0)) && tonumber(split("/", var.serverless_subnet_cidr)[1]) <= 26
    error_message = "serverless_subnet_cidr must be a valid CIDR of /26 or larger (Direct VPC egress requirement)."
  }
}

variable "private_services_prefix_length" {
  description = "Prefix length of the Private Service Access range reserved for Cloud SQL"
  type        = number
  default     = 16

  validation {
    condition     = var.private_services_prefix_length >= 8 && var.private_services_prefix_length <= 24
    error_message = "private_services_prefix_length must be between 8 and 24."
  }
}
