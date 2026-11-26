output "network_id" {
  description = "VPC network ID (for Cloud Run Direct VPC egress)"
  value       = google_compute_network.main.id
}

output "serverless_subnetwork_id" {
  description = "Subnetwork ID for Cloud Run Direct VPC egress"
  value       = google_compute_subnetwork.serverless.id
}

# Read from the PSA connection, not the network, so consumers (Cloud SQL)
# implicitly wait for the peering to exist before requesting a private IP.
output "private_services_network_id" {
  description = "VPC network ID with Private Service Access established (for Cloud SQL private_network)"
  value       = google_service_networking_connection.private_services.network
}
