# Create a OIDC Identity Provider in IAM. OIDC allows external services like GH to authenticate with AWS.
resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com" # Token Issuer that we will trust
  client_id_list = ["sts.amazonaws.com"]                         # Similar to AUD (audience). Who is this token for? AWS STS
}

# Generate json Assume policy document for the role that will be assumed by the GitHub Actions.
data "aws_iam_policy_document" "github_oidc_assume_role_policy" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    # 
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud" # aud = audience. Who is this token for? AWS STS
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub" # sub = subject. Who is using this token? GitHub repo
      values   = ["repo:kallui@90471072/ridendine@1088410404:*"]
    }
  }
}

# Create a IAM role that will be assumed by the GitHub Actions. Attach Assume policy to the role.
resource "aws_iam_role" "github_gtfs_sync" {
  name               = "${var.project_name}-github_gtfs_sync"
  assume_role_policy = data.aws_iam_policy_document.github_oidc_assume_role_policy.json

  tags = {
    Name    = "${var.project_name}-github_gtfs_sync"
    Project = var.project_name
  }

}

# Permissions policy for the role.
data "aws_iam_policy_document" "github_gtfs_sync" {
  statement {
    sid       = "ListGTFSBucket"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.gtfs.arn] # Bucket arn level
    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["gtfs", "gtfs/*"]
    }
  }
  statement {
    sid       = "ReadWriteGTFSObjects"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.gtfs.arn}/gtfs/*"] # Inside the bucket level
  }
}

# Attach the permissions policy to the role.
resource "aws_iam_role_policy" "github_gtfs_sync" {
  name   = "${var.project_name}-github_gtfs_sync"
  role   = aws_iam_role.github_gtfs_sync.id
  policy = data.aws_iam_policy_document.github_gtfs_sync.json
}

output "github_actions_role_arn" {
  description = "ARN of the IAM role for GitHub Actions"
  value       = aws_iam_role.github_gtfs_sync.arn
}