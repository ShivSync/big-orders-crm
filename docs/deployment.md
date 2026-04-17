# Deployment

## Production Environment

| Component | Location |
|-----------|----------|
| AWS EC2 | 54.179.223.103 (ap-southeast-1) |
| CRM App | http://54.179.223.103:3000 |
| Supabase API | http://54.179.223.103:8000 (Kong gateway) |
| Coolify Dashboard | http://54.179.223.103:8080 |

## CI/CD

Coolify auto-deploys on push to `main` branch via GitHub webhook.

```
git push origin main → GitHub → Coolify webhook → Docker build → Deploy
```

No manual deployment steps needed for code changes.

## SSH Access

```bash
ssh -i ~/.ssh/shiv-ec2.pem ubuntu@54.179.223.103
```

Docker commands require `sudo`:
```bash
ssh -i ~/.ssh/shiv-ec2.pem ubuntu@54.179.223.103 "sudo docker ps"
```

## Running Migrations

Migrations are NOT auto-applied. After creating a new migration file, run it manually:

```bash
cat supabase/migrations/<file>.sql | \
  ssh -i ~/.ssh/shiv-ec2.pem ubuntu@54.179.223.103 \
  "sudo docker exec -i supabase-db-xi90e5re1c8yfxd2zx4gntof psql -U postgres -d postgres"
```

## Docker Containers

35 containers run on EC2:
- **Coolify core:** coolify, coolify-sentinel, coolify-realtime, coolify-redis, coolify-db
- **CRM app:** Next.js container (auto-deployed)
- **CRM Kong proxy:** alpine/socat container mapping host :8000 to Kong
- **CRM Supabase:** 14 containers (db, kong, rest, auth, storage, meta, studio, edge-functions, analytics, vector, minio, imgproxy, supavisor, realtime)
- **LMS Supabase:** 14 containers (separate instance)

## Server Health Check

```bash
ssh -i ~/.ssh/shiv-ec2.pem ubuntu@54.179.223.103 \
  "free -h && df -h / && sudo docker ps --format 'table {{.Names}}\t{{.Status}}' | head -10"
```

## Viewing App Logs

```bash
ssh -i ~/.ssh/shiv-ec2.pem ubuntu@54.179.223.103 \
  "sudo docker logs --tail 50 ljzfdlhn3y8u43mm11dm9fbw-133655279748"
```

## Known Issues

1. **Kong proxy fragility:** The `crm-kong-proxy` socat container routes to Kong via Docker DNS. If Kong restarts with a different container name, the proxy breaks. Fix: restart `crm-kong-proxy`.
2. **Sprint 1 table ownership:** Tables created by Coolify's Supabase setup are owned by `supabase_admin`. ALTER TABLE from `postgres` user may fail. Use `supabase_admin` role for DDL on Sprint 1 tables.
3. **No SSL:** HTTP only. Needs Coolify proxy (Traefik/Caddy) + Let's Encrypt for production.
4. **No automated backups:** No pg_dump cron configured yet.
