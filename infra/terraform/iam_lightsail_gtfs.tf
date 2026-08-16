# Create an IAM user for Lightsail instead of using Roles because Lightsail does not support roles like EC2 does.
# Seems the best workaround is just to create a user and use access keys.

resource "aws_iam_user" "lightsail_gtfs_read" {
  name = "${var.project_name}-lightsail-gtfs-read"
  tags = {
    Name    = "${var.project_name}-lightsail-gtfs-read"
    Project = var.project_name
  }
}


# "aws_iam_policy_document" is a terraform helper.
# Generates an IAM policy document in JSON format for use with resources that expect policy documents
# https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
data "aws_iam_policy_document" "lightsail_gtfs_read" {
  statement {
    sid       = "ListGTFSBucket"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.gtfs.arn]
    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["gtfs", "gtfs/*"]
    }
  }
  statement {
    sid       = "ReadGTFSObjects"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.gtfs.arn}/gtfs/*"]
  }
}

resource "aws_iam_user_policy" "lightsail_gtfs_read" {
  name   = "${var.project_name}-lightsail-gtfs-read"
  user   = aws_iam_user.lightsail_gtfs_read.name
  policy = data.aws_iam_policy_document.lightsail_gtfs_read.json
}

output "lightsail_gtfs_read_user_name" {
  value       = aws_iam_user.lightsail_gtfs_read.name
  description = "IAM User for Lightsail GTFS pull data."
}


