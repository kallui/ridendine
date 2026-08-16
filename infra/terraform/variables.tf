

variable "aws_region" {
  description = "The AWS region to deploy the infrastructure to"
  type        = string
  default     = "us-west-2"
}

variable "availability_zone" {
  description = "The availability zone to deploy the infrastructure to"
  type        = string
  default     = "us-west-2a"
}

variable "project_name" {
  default = "ridendine"
}

variable "blueprint_id" { default = "ubuntu_24_04" }
variable "bundle_id" { default = "small_3_0" } # 2gb (potentially upgrade to 4gb later)

# Value is set in terraform.tfvars file
# .tfvars is kinda like local .env file
variable "ssh_cidr" {
  description = "Public IP /32"
  type        = string
}