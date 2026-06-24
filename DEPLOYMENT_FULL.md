# Furniture ERP - Vercel Production Deployment & Runbook

This runbook describes how to deploy, operate, and maintain the Furniture ERP application in production with Vercel hosting both the frontend and backend. The app remains a monorepo:

- `client/` - React + Vite frontend
- `server/` - Express API with Prisma and PostgreSQL
- `api/` - Vercel serverless entrypoints that mount the Express app

## Overview

Recommended production stack:

- Frontend: Vercel static build from `client/dist`
- Backend: Vercel Node.js Functions under `/api/*`
- Database: Supabase managed Postgres
- Redis/Cache: Upstash Redis
- File uploads: external object storage recommended for production

The Vercel setup is handled by:

- `vercel.json` - monorepo build, output directory, headers, and rewrites
- `api/[...path].ts` - catches backend API routes on Vercel
- `api/index.ts` - supports the `/api` entrypoint
- `server/src/app.ts` - creates the Express app without requiring `app.listen`

Important limitation: Vercel function storage is ephemeral. Product image uploads currently use local disk (`uploads/products`), so use S3, Supabase Storage, Cloudinary, or another persistent object store before relying on uploads in production.

## Architecture

- User -> Vercel-hosted SPA served over HTTPS
- SPA -> same Vercel deployment at `/api/*`
- Vercel Function -> Express app from `server/src/app.ts`
- Express -> Supabase Postgres through Prisma
- Express -> Upstash Redis for cache

Because frontend and backend share the same Vercel domain, the frontend can use:

```env
VITE_API_URL=/api
```

For a separate frontend/backend Vercel project split, set `VITE_API_URL` to the backend project's URL plus `/api`.

## Prerequisites

- GitHub repository connected to Vercel
- Vercel account
- Supabase account
- Upstash account
- Local Node.js/npm for verification
- Optional Vercel CLI:

```bash
npm install -g vercel
```

## Prepare The Repository

1. Confirm dependencies install and the frontend builds:

```bash
npm install
npm run generate --workspace server
npm run build --workspace client
```

2. Confirm the backend TypeScript still passes:

```bash
npm run lint --workspace server
```

3. Push the repository to GitHub:

```bash
git add .
git commit -m "Deploy backend on Vercel"
git push origin main
```

## Provision Managed Services

### Supabase Postgres

1. Create a Supabase project.
2. Copy the pooled Postgres connection string.
3. Save it as `DATABASE_URL` in Vercel.
4. If your migration workflow needs a direct connection, keep `DIRECT_URL` locally or in a secure CI secret.

### Upstash Redis

1. Create an Upstash Redis database.
2. Copy the Redis URL.
3. Save it as `REDIS_URL` in Vercel.

### JWT Secret

Generate a strong secret:

```bash
openssl rand -base64 32
```

Save it as `JWT_SECRET` in Vercel.

## Vercel Project Setup

Import the repository in Vercel and use these settings:

- Root directory: `.`
- Install command: `npm install`
- Build command: `npm run generate --workspace server && npm run build --workspace client`
- Output directory: `client/dist`
- Framework preset: Vite

These values are also committed in `vercel.json`, so Vercel should pick them up automatically.

## Vercel Environment Variables

Set these in Vercel Project Settings -> Environment Variables for Production, Preview, and Development as needed:

```env
NODE_ENV=production
DATABASE_URL=postgresql://postgres:...@...:6543/postgres?schema=public
JWT_SECRET=<generated-secret>
JWT_EXPIRES_IN=8h
REDIS_URL=redis://default:...@...:6379
CORS_ORIGIN=https://YOUR_VERCEL_PROJECT.vercel.app
VITE_API_URL=/api
```

If you add a custom domain, update `CORS_ORIGIN` to that exact origin. For multiple allowed origins, use a comma-separated value:

```env
CORS_ORIGIN=https://yourdomain.com,https://YOUR_VERCEL_PROJECT.vercel.app
```

`PORT` is not required for Vercel Functions. The existing `server/src/index.ts` still uses `PORT` for local or container deployments.

## Prisma Migrations

Vercel deploys the serverless function, but it should not be your primary migration runner. Run migrations intentionally before or during release.

Local migration against production:

```bash
cd server
DATABASE_URL="<your-supabase-pooled-url>" npx prisma migrate deploy
```

Optional seed:

```bash
cd server
DATABASE_URL="<your-supabase-pooled-url>" npm run seed
```

For CI, store `DATABASE_URL` as a protected GitHub Actions secret and run `npx prisma migrate deploy` before promoting a production deployment.

## Deployment

### Dashboard

1. Go to Vercel and import the GitHub repository.
2. Confirm the project settings above.
3. Add environment variables.
4. Deploy.

### CLI

```bash
vercel
vercel --prod
```

## DNS, SSL, And Domains

- Vercel manages HTTPS certificates for the frontend and API.
- Add your custom domain in the Vercel dashboard.
- Update `CORS_ORIGIN` after the domain is active.
- Keep `VITE_API_URL=/api` when the SPA and API share one deployment.

## Verification

Manual checks:

```bash
curl -i https://YOUR_VERCEL_PROJECT.vercel.app
curl -i https://YOUR_VERCEL_PROJECT.vercel.app/health
curl -i https://YOUR_VERCEL_PROJECT.vercel.app/api/health
```

Health-check script:

```bash
./health-check.sh https://YOUR_VERCEL_PROJECT.vercel.app https://YOUR_VERCEL_PROJECT.vercel.app
```

Then open the app and test:

- Login
- Dashboard load
- Product list
- Invoice creation
- PDF download
- Any Redis-backed dashboard/reporting endpoints

## CI/CD

Vercel deploys automatically on pushes to connected branches. Recommended CI checks before merge:

```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run lint --workspace server
      - run: npm run build --workspace client
```

Run production migrations as a separate protected release step, not on every preview deployment.

## Monitoring And Logs

- Vercel: deployment logs, function logs, runtime errors, and analytics
- Supabase: database usage, backups, slow queries, and connection count
- Upstash: Redis command usage and latency

Recommended additions:

- Sentry for client and server errors
- Uptime monitor pinging `/api/health`
- Database backup alerts

## Backups And Recovery

Enable Supabase backups. For manual backups:

```bash
pg_dump "$DATABASE_URL" > backup.sql
psql "$DATABASE_URL" < backup.sql
```

Keep backup copies outside the database provider and periodically test restore.

## Scaling And Performance

- Use Supabase connection pooling for `DATABASE_URL`.
- Keep Prisma queries efficient and indexed.
- Cache expensive dashboard/reporting endpoints in Upstash Redis.
- Move uploads to object storage before heavy product-image usage.
- Watch Vercel function duration and memory usage for PDF generation and large reports.

## Security Checklist

- [ ] Use a strong `JWT_SECRET`
- [ ] Store all secrets in Vercel, not in Git
- [ ] Set `CORS_ORIGIN` to exact production/preview origins
- [ ] Use Supabase pooled database URL
- [ ] Restrict database privileges where possible
- [ ] Keep Redis password-protected
- [ ] Keep dependencies updated
- [ ] Replace local disk uploads with persistent object storage

## Troubleshooting

1. API returns 500:
   Check Vercel Function logs, `DATABASE_URL`, `JWT_SECRET`, and whether migrations ran.

2. Prisma client missing or stale:
   Confirm the Vercel build command includes `npm run generate --workspace server`.

3. CORS errors:
   Confirm `CORS_ORIGIN` exactly matches the browser origin, including `https://`.

4. Frontend calls the wrong backend:
   Use `VITE_API_URL=/api` for the single-project Vercel setup and redeploy after changing env vars.

5. Uploads disappear:
   This is expected on Vercel's ephemeral function filesystem. Move image storage to a persistent provider.

6. Long report or PDF requests fail:
   Check Vercel function duration limits and optimize the query/PDF generation path.

## Useful Commands

```bash
# Local frontend build
npm run build --workspace client

# Generate Prisma client
npm run generate --workspace server

# Server type check
npm run lint --workspace server

# Deploy with Vercel CLI
vercel --prod

# Production migrations
cd server
DATABASE_URL="<url>" npx prisma migrate deploy
```

## Environment Variable Reference

- `NODE_ENV` - `production`
- `DATABASE_URL` - Supabase pooled Postgres URL
- `JWT_SECRET` - required strong random string
- `JWT_EXPIRES_IN` - optional, defaults to `8h`
- `REDIS_URL` - Upstash Redis URL
- `CORS_ORIGIN` - frontend origin(s), comma-separated if needed
- `VITE_API_URL` - `/api` for single-project Vercel deployments

*Updated on June 22, 2026.*
