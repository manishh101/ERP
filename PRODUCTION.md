# Production README

## Quick Links

- **Application**: https://yourdomain.com
- **API**: https://yourdomain.com/api
- **Database Admin**: https://yourdomain.com:8080 (PgAdmin)
- **Health Check**: https://yourdomain.com/api/health
- **Deployment Guide**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Deployment Checklist**: See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

## Architecture

### Services

| Service | Port | Purpose | Status |
|---------|------|---------|--------|
| API | 4000 | Express.js backend | `/api/health` |
| Client | 80/443 | React frontend (Nginx) | `/health` |
| Database | 5432 | PostgreSQL | Connection string |
| Cache | 6379 | Redis | Connection string |
| Admin | 8080 | PgAdmin | Web UI |

### Technology Stack

**Frontend:**
- React 18.3.1
- React Router 7.1.5
- React Query 5.66.8
- TailwindCSS 3.4.17
- Vite 6.0.11

**Backend:**
- Node.js 22 LTS
- Express.js 4.21.2
- Prisma 6.5.0
- TypeScript 6.0.3

**Infrastructure:**
- Docker & Docker Compose
- PostgreSQL 17
- Redis 7
- Nginx (reverse proxy)

## Quick Start

### Using Docker (Recommended)

```bash
# Clone and navigate
git clone <repo> && cd furniture-erp

# Configure
cp .env.production .env
# Edit .env with your production values

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Verify
docker-compose -f docker-compose.prod.yml ps
curl http://localhost/api/health
```

### Local Deployment

```bash
# Setup
npm install
npm run build

# Configure database
npm run migrate --workspace server

# Run
NODE_ENV=production npm run start --workspace server
```

## Common Operations

### Database

```bash
# View data
docker-compose -f docker-compose.prod.yml exec db psql -U postgres furniture_erp

# Backup
docker-compose -f docker-compose.prod.yml exec db pg_dump -U postgres furniture_erp > backup.sql

# Restore
docker-compose -f docker-compose.prod.yml exec -T db psql -U postgres furniture_erp < backup.sql
```

### Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml logs -f client
```

### Updates

```bash
# Pull latest
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

## Environment Variables

### Required
- `JWT_SECRET` - JWT signing key (set strong value!)
- `DATABASE_URL` - PostgreSQL connection string
- `CORS_ORIGIN` - Production domain

### Optional
- `PORT` - API port (default: 4000)
- `NODE_ENV` - Environment (default: production)
- `JWT_EXPIRES_IN` - Token expiration (default: 8h)
- `REDIS_URL` - Redis connection (default: redis://redis:6379)

See `.env.production` for full reference.

## Security Notes

1. **Secrets**: All secrets are in `.env`, never in code
2. **SSL/TLS**: Use reverse proxy with valid certificates
3. **Database**: Strong password, network restrictions
4. **Rate Limiting**: 100 requests per 15 minutes per IP
5. **CORS**: Configured for production domain only

## Monitoring

### Health Checks
- API: `GET /api/health`
- UI: `GET /health`
- Database: Automatic PostgreSQL health check
- Cache: Automatic Redis health check

### Metrics to Monitor
- API response time
- Error rate
- Database connection pool usage
- Redis memory usage
- Disk space
- CPU & memory usage

## Troubleshooting

### Application Won't Start
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs api

# Verify environment
docker-compose -f docker-compose.prod.yml config
```

### Database Connection Failed
```bash
# Check database is running
docker-compose -f docker-compose.prod.yml ps db

# Test connection
docker-compose -f docker-compose.prod.yml exec db psql -U postgres -c "SELECT 1"
```

### Port Already in Use
```bash
# Find process
lsof -i :80
lsof -i :4000

# Kill process
kill -9 <PID>
```

## Support & Documentation

- **API Docs**: Consult server README
- **Database**: See `server/prisma/schema.prisma`
- **Components**: See `client/src/components/`
- **Routes**: See `server/src/routes/`
- **Types**: See `client/src/types/` and `server/src/types/`

## Contacts

- **DevOps**: [team contact]
- **Backend**: [team contact]
- **Frontend**: [team contact]
- **On-Call**: [emergency contact]

## Related Files

- Architecture: [README.md](./README.md)
- Deployment: [DEPLOYMENT.md](./DEPLOYMENT.md)
- Checklist: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- Docker: [docker-compose.prod.yml](./docker-compose.prod.yml)
