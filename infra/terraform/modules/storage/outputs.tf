output "bucket_name" {
  description = "Name of the media storage bucket"
  value       = google_storage_bucket.media.name
}

output "bucket_url" {
  description = "URL of the media storage bucket"
  value       = google_storage_bucket.media.url
}

output "bucket_self_link" {
  description = "Self link of the media storage bucket"
  value       = google_storage_bucket.media.self_link
}

output "access_logs_bucket_name" {
  description = "Name of the bucket receiving media bucket access logs"
  value       = google_storage_bucket.access_logs.name
}
