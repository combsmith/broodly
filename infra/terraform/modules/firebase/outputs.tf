output "web_app_id" {
  description = "Firebase web app ID"
  value       = google_firebase_web_app.app.app_id
}

output "api_key" {
  description = "Firebase web API key"
  value       = data.google_firebase_web_app_config.app.api_key
  sensitive   = true
}

output "auth_domain" {
  description = "Firebase auth domain"
  value       = data.google_firebase_web_app_config.app.auth_domain
}

output "project_id" {
  description = "Firebase project ID"
  value       = var.project_id
}
