# Furniture ERP — Production Deployment & Runbook

This document is a single, detailed runbook describing how to deploy, operate, and maintain the Furniture ERP application in production (Vercel frontend + Render backend). It includes step-by-step commands, required environment variables, troubleshooting, monitoring, scaling guidance, and maintenance best-practices.

---

## Table of Contents

- Overview
- Architecture
- Prerequisites
- Preparing the repository
- Provision managed services (Supabase, Upstash)
- Backend deployment (Render)
  - Render Blueprint (recommended)
  - Manual Web Service
  - Secrets and env vars
  - Run migrations & seed
- Frontend deployment (Vercel)
  - Project settings
  - Build & environment variables
- DNS, SSL, and custom domains
- Verification and health checks
- CI/CD & automated deploys
- Monitoring, logs, and alerting
- Backups & recovery
- Scaling & performance
- Security checklist
- Troubleshooting common issues
- Useful commands & quick reference

---

## Overview

This repo contains a full-stack ERP application with two workspaces:
- `client/` — React + Vite frontend
- `server/` — Express API with Prisma & PostgreSQL

Recommended production stack (free-friendly):
- Frontend: Vercel (static SPA)
- Backend: Render (Docker Web Service)
- Database: Supabase (managed Postgres)
- Redis/Cache: Upstash (serverless Redis)

The existing repo includes the following production-ready artifacts:
- `server/Dockerfile` — multi-stage Docker build for the API
- `client/nginx.conf` and `client/Dockerfile` — optional static server
- `render.yaml` — Render blueprint for backend
- `vercel.json` — Vercel config for frontend
- `docker-compose.prod.yml` — optional docker-compose for VPS-based deployments
- `validate-production.sh` and `health-check.sh` — validation and health scripts

---

## Architecture

- User -> Vercel-hosted SPA (`client/dist`) served over HTTPS
- SPA → Backend API (`/api/*`) hosted on Render
- Backend → Supabase (Postgres) for persistent data
- Backend → Upstash/Redis for caching, session/state
- Prisma client in backend connects to Postgres; use pooled connection URL
- Files and uploads stored in `server/uploads` (mounted volume on Render if needed)

---

## Prerequisites

- GitHub repository (connected to Vercel and Render)
- Accounts: Vercel, Render, Supabase, Upstash, GitHub
- Local tools (optional but helpful): `vercel`, `flyctl` not needed now, `render` CLI optional

Install CLI tools (optional):

```bash
npm install -g vercel
# Render CLI optional: curl -sL https://cdn.render.com/cli/install.sh | bash
```

---

## Preparing the repository

1. Ensure your repository is on GitHub and up-to-date:

```bash
cd /home/manish/Documents/ERP
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

2. Confirm build artifacts locally:

```bash
npm run build
# check outputs
ls -lh client/dist
ls -lh server/dist
```

3. Run validation script to ensure setup is correct:

```bash
./validate-production.sh
```

If the validation script reports any issues, resolve them before proceeding.

---

## Provision managed services

### Supabase (Postgres)

1. Create a new project on https://app.supabase.com
2. Select a project name (e.g., `furniture-erp`) and region
3. Record the **Connection pooling** Postgres URL (use pooled connection to avoid idle connection limits)
4. Save that URL as `DATABASE_URL` (see env var list below)

### Upstash (Redis)

1. Create a Redis database at https://console.upstash.com
2. Copy the Redis connection URL (e.g. `redis://default:<token>@<host>:6379`)
3. Save as `REDIS_URL`

Environment secrets / values you will collect:
- `DATABASE_URL` (Supabase pooled connection string)
- `REDIS_URL` (Upstash)
- `JWT_SECRET` (generate: `openssl rand -base64 32`)
- `CORS_ORIGIN` (set to the final frontend domain, e.g., `https://your-app.vercel.app`)

---

## Backend deployment (Render)

We recommend using the `render.yaml` blueprint in the repo so Render can create the service automatically.

### A — Render Blueprint (recommended)

1. Push your GitHub repo
2. Go to https://dashboard.render.com → New → Blueprint
3. Connect your GitHub repo and select the repository
4. Render will detect `render.yaml` and propose a service. Confirm.
5. In Render service settings, add the required secrets (Environment > Encrypted env vars):
   - `DATABASE_URL` (Supabase pooled URL)
   - `JWT_SECRET`
   - `REDIS_URL`
   - `CORS_ORIGIN`
6. Deploy — Render will build using `server/Dockerfile` and run the container.

### B — Manual Web Service

1. Dashboard → New → Web Service
2. Connect GitHub repo and choose service type `Docker`
3. Set Dockerfile path: `server/Dockerfile`
4. Set Health check path: `/health`
5. Add environment variables (same list above)
6. Deploy

### Secrets and environment variables (Render)

- `NODE_ENV=production`
- `PORT=4000`
- `DATABASE_URL` (required)
- `JWT_SECRET` (required)
- `REDIS_URL` (required if caching/session used)
- `CORS_ORIGIN` (frontend domain)

Set these in the Render dashboard under the service’s Environment tab (Encrypted).

### Run migrations & seed on Render

Open the Render Shell (from the service) and run:

```bash
npx prisma migrate deploy
# optional
npm run seed
```

If you prefer local migration against the same `DATABASE_URL` you can run:

```bash
DATABASE_URL="<your-supabase-url>" npx prisma migrate deploy
```

---

## Frontend deployment (Vercel)

1. Go to https://vercel.com/new and import the GitHub repository.
2. When configuring the project, set:
   - Root directory: `.` (repo root)
   - Install command: `npm install`
   - Build command: `npm run build --workspace client`
   - Output directory: `client/dist`
3. Add Environment Variable (in Vercel project settings):
   - `VITE_API_URL` = `https://<render-service>.onrender.com/api` (or your custom API domain)
4. Deploy — Vercel will build and publish the static site.

Notes: Vercel performs automatic deployments on each push.

---

## DNS, SSL, and custom domains

- Vercel will manage SSL for your frontend domain automatically when you add a custom domain.
- For API (Render) you can use the `.onrender.com` domain or add a custom subdomain (`api.yourdomain.com`) via the Render dashboard and create the DNS CNAME entry.
- After setting the custom domains, update `CORS_ORIGIN` on Render and `VITE_API_URL` on Vercel to match the live domains.

---

## Verification & health checks

Use the health-check script to confirm both frontend and backend are responsive:

```bash
./health-check.sh https://YOUR_VERCEL_PROJECT.vercel.app https://furniture-erp-api.onrender.com
```

Manual checks:

```bash
# Backend
curl -i https://furniture-erp-api.onrender.com/health
curl -i https://furniture-erp-api.onrender.com/api/health

# Frontend
curl -i https://YOUR_VERCEL_PROJECT.vercel.app
```

Open the site and perform the main user flows (login, list pages, create records).

---

## CI/CD & automated deploys

- Vercel: automatic on push to configured branches (e.g., `main`).
- Render: automatic on push if enabled (Blueprint or manual). Render also supports webhooks for custom pipelines.

Recommended GitHub Actions (example):
- Run tests and TypeScript checks on PRs
- Run `npm run build` on `main` before merge

Example GitHub Action skeleton (create `.github/workflows/ci.yml`):

```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run lint
      - run: npm run build --workspace client
      - run: npm run build --workspace server
```

Deployments will be handled by Vercel/Render on push.

---

## Monitoring, logs, and alerting

- **Render**: view logs in service → Logs. Use Render alerts for failure or deployment issues.
- **Vercel**: check Deployments page and logs for build/runtime issues.
- **Supabase**: monitor database usage, backups, slow queries.
- **Upstash**: monitor command usage and latency.

Recommended additions:
- Sentry for error tracking in both client and server
- Prometheus/Grafana or a hosted APM (Datadog/New Relic) for traces and metrics
- Uptime monitor (UptimeRobot, Healthchecks.io) pinging `/health` endpoints

---

## Backups & recovery

- Supabase: enable automated snapshots and daily backups (check project settings)
- Manual backup using `pg_dump`:

```bash
# create backup from a machine with access to DB
pg_dump $DATABASE_URL > backup.sql
# restore
psql $DATABASE_URL < backup.sql
```

- Keep backup copies off-site (S3, bucket) and test restore procedures periodically.

---

## Scaling & performance

- Render scales by increasing plan or concurrent instances.
- Use Redis (Upstash) to cache expensive queries and sessions.
- Add database indexes where queries are slow; profile via Supabase query logs.
- For frontend, enable CDN (Vercel provides this by default) and set long cache headers for static assets.
- Use gzip compression (already enabled in `server/app.ts` and Nginx) and image optimization.

---

## Security checklist

- [ ] Use a strong `JWT_SECRET` and rotate periodically
- [ ] Do not commit `.env` files to Git; use Render/Vercel secret stores
- [ ] Configure `CORS_ORIGIN` to only allow your frontend domains
- [ ] Ensure TLS/HTTPS everywhere (Vercel & Render manage certificates)
- [ ] Limit database user privileges and avoid exposing DB to public internet
- [ ] Ensure Redis access is limited and password-protected
- [ ] Enable rate limiting and security middleware (helmet, rate-limit) — already present
- [ ] Keep dependencies up-to-date and schedule monthly audits

---

## Troubleshooting common issues

1. CORS errors:
   - Confirm `CORS_ORIGIN` value on Render matches Vercel domain exactly (including https://)
2. Prisma connection errors:
   - Make sure `DATABASE_URL` is the pooled connection string
   - Check DB network & allowed IPs
3. Backend 500 errors:
   - Check Render logs and stack traces
   - Re-run migrations
4. Frontend build fails on Vercel:
   - Run `npm run build --workspace client` locally to reproduce
   - Ensure `VITE_API_URL` is set in Vercel environment variables
5. Uploads not persisting:
   - Ensure `server/uploads` is persisted (on Render use persistent disk or external object storage)

---

## Useful commands & quick reference

```bash
# Build locally
npm run build

# Validate production readiness
./validate-production.sh

# Health check
./health-check.sh https://YOUR_VERCEL_PROJECT.vercel.app https://furniture-erp-api.onrender.com

# Render: manual deploy (if using CLI)
# (Render CLI install instructions are on Render docs)
render deploy --service furniture-erp-api

# Vercel: deploy via CLI
vercel --prod

# Prisma migrations locally
DATABASE_URL="<url>" npx prisma migrate deploy
npx prisma db seed

# Backup DB
pg_dump $DATABASE_URL > backup.sql

# Restore DB
psql $DATABASE_URL < backup.sql
```

---

## Appendix: Environment variables (full list)

- `NODE_ENV` — `production`
- `PORT` — `4000` (Render will set HTTP port)
- `DATABASE_URL` — Supabase pooled Postgres URL (required)
- `JWT_SECRET` — strong random string (required)
- `JWT_EXPIRES_IN` — e.g. `8h` (optional)
- `REDIS_URL` — Upstash URL (optional but recommended)
- `CORS_ORIGIN` — frontend domain, e.g., `https://your-app.vercel.app`
- `VITE_API_URL` — set in Vercel to point to Render API (e.g., `https://furniture-erp-api.onrender.com/api`)

---

## Final notes

- This runbook aims to be complete and actionable. Follow the steps in the order provided.
- Keep `DEPLOY_SECRETS_CHECKLIST.md` private; never commit secrets.
- If you want, I can now: (A) walk you through Render’s Blueprint import step-by-step, (B) run the Vercel CLI deploy locally, or (C) prepare a PR with these docs and the required `render.yaml` already added (done).

---

*Created on May 11, 2026.*
