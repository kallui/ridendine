# Migration to AWS

Plan on migrating from Vercel to AWS due to Vercel serverless limitation.

Limitiation: GTFS data can be quite big, especially when app starts to cover more cities and countries. Vercel serverless in memory wont be able to hold every GTFS data, and also introduces cold starts as well. A fix for this would be a dedicated VPS that holds GTFS data in the server, and perform a weekly sync on that GTFS data.

## Planned stack

- **Lightsail**
- **S3** — durable GTFS zip / parsed cache storage
- **IAM** — least-privilege access (app ↔ S3, sync job credentials)
- **EventBridge** — schedule weekly GTFS sync
- **CloudWatch** — logs + alarms for sync / app health

## GTFS weekly sync

- Refetch registered feed URLs on a weekly schedule
- **Validate** download (real zip + expected GTFS files)
- **Keep last good** — only publish a new feed version after validation; on failure keep the previous good copy in S3 and alert
