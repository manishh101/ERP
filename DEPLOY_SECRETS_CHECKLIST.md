# Deployment Secrets Checklist (Vercel + Render)

Keep this file private and never commit real secrets.

## Accounts
- [ ] Vercel
- [ ] Render
- [ ] Supabase
- [ ] Upstash
- [ ] GitHub

## Secrets to prepare

```env
DATABASE_URL=postgresql://postgres:...@...:6543/postgres?schema=public
REDIS_URL=redis://default:...@...:6379
JWT_SECRET=<generate with openssl rand -base64 32>
CORS_ORIGIN=https://YOUR_VERCEL_PROJECT.vercel.app
VITE_API_URL=https://furniture-erp-api.onrender.com/api
```

Generate JWT secret:
```bash
openssl rand -base64 32
```

## Render setup

1. Import repo as Blueprint or Web Service.
2. If manual service:
   - Type: Web Service
   - Environment: Docker
   - Dockerfile path: `server/Dockerfile`
   - Health check: `/health`
3. Add env vars:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `REDIS_URL`
   - `CORS_ORIGIN`
4. Deploy.
5. Open Render Shell and run:
```bash
npx prisma migrate deploy
```

## Vercel setup

1. Import repo in Vercel.
2. Build command:
```bash
npm run build --workspace client
```
3. Output directory: `client/dist`
4. Install command:
```bash
npm install
```
5. Add env var:
```env
VITE_API_URL=https://furniture-erp-api.onrender.com/api
```
6. Deploy.

## Validation

```bash
curl https://furniture-erp-api.onrender.com/health
curl https://furniture-erp-api.onrender.com/api/health
curl https://YOUR_VERCEL_PROJECT.vercel.app
./health-check.sh https://YOUR_VERCEL_PROJECT.vercel.app https://furniture-erp-api.onrender.com
```

## Troubleshooting

1. CORS: update `CORS_ORIGIN` in Render and redeploy.
2. API 500: check Render logs and `DATABASE_URL`.
3. Prisma migration failed: rerun `npx prisma migrate deploy` in Render Shell.
4. Frontend using old API URL: update Vercel env and redeploy.
