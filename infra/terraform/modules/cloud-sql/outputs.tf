output "connection_name" {
  description = "Cloud SQL instance connection name for Cloud SQL Proxy"
  value       = google_sql_database_instance.main.connection_name
}

output "ip_address" {
  description = "Private IP address of the Cloud SQL instance (no public IP is assigned)"
  value       = google_sql_database_instance.main.private_ip_address
}

output "database_name" {
  description = "Name of the created database"
  value       = google_sql_database.broodly.name
}

output "instance_name" {
  description = "Name of the Cloud SQL instance"
  value       = google_sql_database_instance.main.name
}
