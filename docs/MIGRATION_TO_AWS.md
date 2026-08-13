# Migration to AWS

Plan on migrating from Vercel to AWS due to Vercel serverless limitation.

Limitiation: GTFS data can be quite big, especially when app starts to cover more cities and countries. Vercel serverless in memory wont be able to hold every GTFS data, and also introduces cold starts as well. A fix for this would be a dedicated VPS that holds GTFS data in the server, and perform a weekly sync on that GTFS data.

## Planned stack

- **Lightsail**:
  - Region: us-west-2
  - Instance size: 2GB RAM first see how it performs (upgrade to 4gb if needed using snapshot)
  - OS: Ubuntu 24.04
  - App: Next on host (`next start` + systemd) + Redis in Docker
  - TLS: nginx + Certbot (Let's Encrypt)
  - Static IP from day one
- **DNS**: Cloudflare (keep; A record → Lightsail static IP)
- **IaC**: Terraform from the start
- **Deploy**: GitHub Actions (OIDC to AWS, SSH to instance)
- **Secrets**: `.env` on the box to start
- **S3** — durable GTFS zip / parsed cache storage
- **IAM** — least-privilege access (app ↔ S3, sync job credentials)
- **EventBridge** — schedule weekly GTFS sync
- **CloudWatch** — logs + alarms for sync / app health
- **CloudFront** - CDN

## Drop Upstash Redis

Drop Upstash Redis and just run a Docker Redis inside of the VPS.

## Analytics

Drop vercel analytics and use new approach

## GTFS weekly sync

Use EventBridge

- Refetch registered feed URLs on a weekly schedule
- **Validate** download (real zip + expected GTFS files)
- **Keep last good** — only publish a new feed version after validation; on failure keep the previous good copy in S3 and alert
