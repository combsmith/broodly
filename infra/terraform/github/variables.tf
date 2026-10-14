variable "github_token" {
  description = "GitHub personal access token with administration:write scope"
  type        = string
  sensitive   = true
}

variable "github_owner" {
  description = "GitHub organization or user name"
  type        = string
  default     = "combsmith"
}

variable "repository_name" {
  description = "GitHub repository name"
  type        = string
  default     = "broodly"
}
