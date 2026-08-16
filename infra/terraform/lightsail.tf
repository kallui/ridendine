resource "aws_lightsail_key_pair" "main" {
  name       = "${var.project_name}-key"
  public_key = file("C:/Users/Niko/.ssh/ridendine_ed25519.pub")
  tags = {
    Name    = "${var.project_name}-key"
    Project = var.project_name
  }
}

resource "aws_lightsail_instance" "main" {
  name              = "ridendine"
  availability_zone = var.availability_zone
  blueprint_id      = var.blueprint_id
  bundle_id         = var.bundle_id
  key_pair_name     = aws_lightsail_key_pair.main.name
  tags = {
    Name    = "${var.project_name}-lightsail"
    Project = var.project_name
  }
}

# Lightsail static IP == similar to EC2 'Elastic IP'
resource "aws_lightsail_static_ip" "main" {
  name = "${var.project_name}-static-ip"
}

resource "aws_lightsail_static_ip_attachment" "main" {
  static_ip_name = aws_lightsail_static_ip.main.name
  instance_name  = aws_lightsail_instance.main.name
}

resource "aws_lightsail_instance_public_ports" "main" {
  instance_name = aws_lightsail_instance.main.name

  # SSH port
  port_info {
    protocol = "tcp"
    # from_port and to_port is a range of accepted ports
    # 22-22 ==> only port 22 is accepted
    from_port = 22
    to_port   = 22
    cidrs     = [var.ssh_cidr] #only my Ip is allowed to SSH in
  }

  # HTTP port
  port_info {
    protocol  = "tcp"
    from_port = 80
    to_port   = 80
    cidrs     = ["0.0.0.0/0"] #allow all traffic to HTTP
  }
  # HTTPS port 
  port_info {
    protocol  = "tcp"
    from_port = 443
    to_port   = 443
    cidrs     = ["0.0.0.0/0"] #allow all traffic to HTTPS
  }
}


output "static_ip" {
  value = "Lightsail static IP: ${aws_lightsail_static_ip.main.ip_address}"
}
output "ssh" {
  value = "ssh ubuntu@${aws_lightsail_static_ip.main.ip_address}"
}