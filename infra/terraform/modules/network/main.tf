# Private networking for Cloud SQL (terraform:S6329, issue #649).
#
# Cloud SQL has no public IPv4 endpoint. It gets a private IP from a Private
# Service Access (PSA) range peered into this VPC. Cloud Run reaches it through
# Direct VPC egress on the subnet below.

resource "google_compute_network" "main" {
  name                    = "broodly-${var.environment}"
  project                 = var.project_id
  auto_create_subnetworks = false
}

# Subnet for Cloud Run Direct VPC egress (needs at least a /26).
resource "google_compute_subnetwork" "serverless" {
  name                     = "broodly-${var.environment}-serverless"
  project                  = var.project_id
  region                   = var.region
  network                  = google_compute_network.main.id
  ip_cidr_range            = var.serverless_subnet_cidr
  private_ip_google_access = true
}

# Internal range that Google-managed services (Cloud SQL) allocate IPs from.
resource "google_compute_global_address" "private_services" {
  name          = "broodly-${var.environment}-private-services"
  project       = var.project_id
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = var.private_services_prefix_length
  network       = google_compute_network.main.id
}

resource "google_service_networking_connection" "private_services" {
  network                 = google_compute_network.main.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_services.name]
}
