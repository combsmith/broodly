resource "google_firebase_web_app" "app" {
  project      = var.project_id
  display_name = var.display_name
}
