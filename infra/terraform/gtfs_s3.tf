resource "aws_s3_bucket" "gtfs" {
  bucket = "${var.project_name}-gtfs"
  tags = {
    Name    = "${var.project_name}-gtfs"
    Project = var.project_name
  }
}

resource "aws_s3_bucket_public_access_block" "gtfs" {
  bucket = aws_s3_bucket.gtfs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "gtfs" {
  bucket = aws_s3_bucket.gtfs.id
  rule {
    object_ownership = "BucketOwnerEnforced" #disable ACL. Only owner OWNS the bucket and objects inside.
  }
}

# S3 encryps bucket at rest
# at rest: when data is sitting on disk
resource "aws_s3_bucket_server_side_encryption_configuration" "gtfs" {
  bucket = aws_s3_bucket.gtfs.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256" # SSE-S3 (AWS manage the keys, free)
    }
  }
}

output "gtfs_bucket_name" {
  value       = aws_s3_bucket.gtfs.id
  description = "Name of the gtfs bucket"
}