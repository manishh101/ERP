# Deploy to Vercel (Frontend) + Render (Backend)

This guide deploys your ERP with a free-friendly stack:
- Frontend: Vercel (React + Vite)
- Backend: Render (Docker Web Service)
- Database: Supabase (PostgreSQL)
- Cache: Upstash (Redis)

## Prerequisites

1. GitHub account
2. Vercel account
3. Render account
4. Supabase account
5. Upstash account

Optional CLI tools:
```bash
npm install -g vercel
```

## Step 1: Set up Supabase (PostgreSQL)

1. Create project in Supabase.
2. Open Settings -> Database.
3. Copy the pooled connection string (`postgresql://...`).
4. Save it as `DATABASE_URL`.

## Step 2: Set up Upstash Redis

1. Create Redis database in Upstash.
2. Copy Redis URL (`redis://...`).
3. Save it as `REDIS_URL`.

## Step 3: Deploy backend on Render

Use `render.yaml` from repo root.

### Option A: Render Blueprint (recommended)

1. Push repo to GitHub.
2. In Render Dashboard, select New -> Blueprint.
3. Connect your repo.
4. Render creates service from `render.yaml`.
5. Set secret env vars in Render:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `REDIS_URL`
   - `CORS_ORIGIN` (your Vercel URL)

### Option B: Manual Web Service

1. New -> Web Service in Render.
2. Connect GitHub repo.
3. Configure:
   - Environment: `Docker`
   - Dockerfile path: `server/Dockerfile`
   - Health check path: `/health`
4. Add env vars above.
5. Deploy.

After deploy, backend URL looks like:
`https://furniture-erp-api.onrender.com`

## Step 4: Run Prisma migration

Use Render Shell for backend service:
```bash
npx prisma migrate deploy
```

Optional seed:
```bash
npm run seed
```

## Step 5: Deploy frontend on Vercel

### Option A: Vercel dashboard

1. Import GitHub repo.
2. Root directory: repo root (`.`).
3. Build command:
```bash
npm run build --workspace client
```
4. Output directory: `client/dist`
5. Install command:
```bash
npm install
```
6. Add env var:
   - `VITE_API_URL=https://furniture-erp-api.onrender.com/api`

### Option B: Vercel CLI

```bash
cd /home/manish/Documents/ERP
vercel --prod
```

When prompted, set:
- Build command: `npm run build --workspace client`
- Output directory: `client/dist`
- Install command: `npm install`

## Step 6: Verify deployment

Backend health:
```bash
curl https://furniture-erp-api.onrender.com/health
```

API health:
```bash
curl https://furniture-erp-api.onrender.com/api/health
```

Frontend:
```bash
curl https://YOUR_VERCEL_PROJECT.vercel.app
```

End-to-end check:
```bash
./health-check.sh https://YOUR_VERCEL_PROJECT.vercel.app https://furniture-erp-api.onrender.com
```

## Required environment variables

Render backend:
- `NODE_ENV=production`
- `PORT=4000`
- `DATABASE_URL=postgresql://...`
- `JWT_SECRET=...`
- `REDIS_URL=redis://...`
- `CORS_ORIGIN=https://YOUR_VERCEL_PROJECT.vercel.app`

Vercel frontend:
- `VITE_API_URL=https://furniture-erp-api.onrender.com/api`

## Common issues

1. CORS error:
   - Ensure Render `CORS_ORIGIN` exactly matches Vercel domain.
2. Prisma connection error:
   - Use pooled Supabase URL.
3. Cold starts on Render free tier:
   - First request may be slow after inactivity.
4. Frontend calling wrong API:
   - Confirm `VITE_API_URL` in Vercel project env and redeploy.

## Redeploy workflow

Backend (Render): auto-deploy on git push.
Frontend (Vercel): auto-deploy on git push.

Manual trigger by push:
```bash
git add .
git commit -m "deploy update"
git push origin main
```
