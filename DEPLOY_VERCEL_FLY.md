# Deploy to Vercel (Frontend + Backend)

This guide deploys your ERP on one Vercel project:

- Frontend: Vercel static build from `client/dist`
- Backend: Vercel Node.js Functions under `/api/*`
- Database: Supabase PostgreSQL
- Cache: Upstash Redis

For the full runbook, use `DEPLOYMENT_FULL.md`.

## Prerequisites

1. GitHub account
2. Vercel account
3. Supabase account
4. Upstash account

Optional CLI:

```bash
npm install -g vercel
```

## Step 1: Set Up Supabase

1. Create a Supabase project.
2. Open Settings -> Database.
3. Copy the pooled connection string.
4. Save it as `DATABASE_URL` in Vercel.

## Step 2: Set Up Upstash Redis

1. Create a Redis database in Upstash.
2. Copy the Redis URL.
3. Save it as `REDIS_URL` in Vercel.

## Step 3: Configure Vercel

Import the repo in Vercel and use:

- Root directory: `.`
- Install command: `npm install`
- Build command: `npm run generate --workspace server && npm run build --workspace client`
- Output directory: `client/dist`
- Framework preset: Vite

Add environment variables:

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=<generate with openssl rand -base64 32>
REDIS_URL=redis://...
CORS_ORIGIN=https://YOUR_VERCEL_PROJECT.vercel.app
VITE_API_URL=/api
```

## Step 4: Run Prisma Migrations

Run this before production release:

```bash
cd server
DATABASE_URL="<your-supabase-pooled-url>" npx prisma migrate deploy
```

Optional seed:

```bash
cd server
DATABASE_URL="<your-supabase-pooled-url>" npm run seed
```

## Step 5: Deploy

Dashboard deployment happens automatically after import. CLI deployment:

```bash
cd /home/manish/Documents/ERP
vercel --prod
```

## Step 6: Verify

```bash
curl https://YOUR_VERCEL_PROJECT.vercel.app
curl https://YOUR_VERCEL_PROJECT.vercel.app/health
curl https://YOUR_VERCEL_PROJECT.vercel.app/api/health
./health-check.sh https://YOUR_VERCEL_PROJECT.vercel.app https://YOUR_VERCEL_PROJECT.vercel.app
```

## Common Issues

1. CORS error:
   Ensure `CORS_ORIGIN` exactly matches the browser origin.

2. Prisma connection error:
   Use the pooled Supabase URL and confirm migrations ran.

3. Frontend calling wrong API:
   Set `VITE_API_URL=/api` and redeploy.

4. Product uploads disappear:
   Vercel function storage is ephemeral. Move uploads to persistent object storage.

## Redeploy Workflow

Vercel auto-deploys on git push. Manual trigger:

```bash
git add .
git commit -m "deploy update"
git push origin main
```
