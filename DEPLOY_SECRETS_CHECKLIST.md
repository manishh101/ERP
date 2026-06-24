# Deployment Secrets Checklist (Vercel)

Keep this file private and never commit real secrets.

## Accounts

- [ ] Vercel
- [ ] Supabase
- [ ] Upstash
- [ ] GitHub

## Secrets To Prepare

```env
DATABASE_URL=postgresql://postgres:...@...:6543/postgres?schema=public&pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres:...@...:5432/postgres?schema=public
REDIS_URL=redis://default:...@...:6379
JWT_SECRET=<generate with openssl rand -base64 32>
CORS_ORIGIN=https://YOUR_VERCEL_PROJECT.vercel.app
VITE_API_URL=/api
```

Generate JWT secret:

```bash
openssl rand -base64 32
```

## Vercel Setup

1. Import repo in Vercel.
2. Root directory: `.`
3. Install command:

```bash
npm install
```

4. Build command:

```bash
npm run generate --workspace server && npm run build --workspace client
```

5. Output directory: `client/dist`
6. Add env vars:

```env
NODE_ENV=production
DATABASE_URL=postgresql://postgres:...@...:6543/postgres?schema=public&pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres:...@...:5432/postgres?schema=public
JWT_SECRET=<generated-secret>
REDIS_URL=redis://default:...@...:6379
CORS_ORIGIN=https://YOUR_VERCEL_PROJECT.vercel.app
VITE_API_URL=/api
```

7. Deploy.

## Migrations

Run migrations before production release:

```bash
cd server
DATABASE_URL="<your-supabase-pooled-url>" DIRECT_URL="<your-supabase-direct-url>" npx prisma migrate deploy
```

## Validation

```bash
curl https://YOUR_VERCEL_PROJECT.vercel.app
curl https://YOUR_VERCEL_PROJECT.vercel.app/health
curl https://YOUR_VERCEL_PROJECT.vercel.app/api/health
./health-check.sh https://YOUR_VERCEL_PROJECT.vercel.app https://YOUR_VERCEL_PROJECT.vercel.app
```

## Troubleshooting

1. CORS: update `CORS_ORIGIN` in Vercel and redeploy.
2. API 500: check Vercel Function logs, `DATABASE_URL`, `DIRECT_URL`, and `JWT_SECRET`.
3. Prisma migration failed: rerun `npx prisma migrate deploy` with production `DATABASE_URL` and `DIRECT_URL`.
4. Frontend using old API URL: set `VITE_API_URL=/api` and redeploy.
5. Uploads disappearing: move product images to persistent object storage.
