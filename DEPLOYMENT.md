# Furniture ERP - Production Deployment Guide

## Prerequisites

- Docker & Docker Compose
- Node.js 22+ (for local deployment without Docker)
- PostgreSQL 17+ (if not using Docker)
- Redis 7+ (if not using Docker)

## Quick Start with Docker

### 1. Clone & Setup

```bash
git clone <repository-url>
cd furniture-erp
```

### 2. Configure Environment Variables

```bash
# Copy and edit production environment file
cp .env.production .env

# Edit .env with production settings:
nano .env
```

**Key variables to set:**
- `JWT_SECRET` - Use a strong random string (generate: `openssl rand -base64 32`)
- `CORS_ORIGIN` - Your production domain (e.g., https://yourdomain.com)
- `DB_PASSWORD` - Strong database password
- `REDIS_PASSWORD` - Redis password (optional but recommended)
- `PGADMIN_EMAIL` & `PGADMIN_PASSWORD` - PgAdmin credentials

### 3. Deploy with Docker Compose

```bash
# Using production compose file
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml logs -f client
```

### 4. Database Setup

```bash
# Run migrations
docker-compose -f docker-compose.prod.yml exec api npm run migrate

# Seed initial data (optional)
docker-compose -f docker-compose.prod.yml exec api npm run seed
```

### 5. Access Application

- **Application**: http://localhost (or your domain)
- **API Health**: http://localhost/api/health
- **PgAdmin**: http://localhost:8080 (default: admin@admin.com / admin)

## Local Deployment (without Docker)

### 1. Setup Database

```bash
# Start PostgreSQL and Redis locally
# Or use Docker for just the services:
docker-compose up db redis -d
```

### 2. Configure Environment

```bash
cp .env.production .env
# Edit .env with local database URL and settings
nano .env
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Setup Database Schema

```bash
# Generate Prisma client
npm run generate --workspace server

# Run migrations
npm run migrate --workspace server

# Seed data (optional)
npm run seed --workspace server
```

### 5. Build & Start

```bash
# Build both workspaces
npm run build

# Start server (requires NODE_ENV=production)
NODE_ENV=production npm run start --workspace server

# In another terminal, start client
NODE_ENV=production npm run preview --workspace client
```

## Production Checklist

- [ ] Set strong `JWT_SECRET` 
- [ ] Configure `CORS_ORIGIN` for your domain
- [ ] Set strong database password
- [ ] Enable Redis password if accessible from network
- [ ] Configure SSL/TLS (use Nginx reverse proxy or load balancer)
- [ ] Set up database backups
- [ ] Configure monitoring and alerting
- [ ] Set up log aggregation
- [ ] Configure rate limiting appropriately for your load
- [ ] Test all API endpoints
- [ ] Setup health check monitoring
- [ ] Document any custom configurations
- [ ] Test disaster recovery procedures

## SSL/TLS Setup

### Option 1: Nginx Reverse Proxy with Let's Encrypt

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Configure Nginx with certificate
# See nginx-prod-ssl.conf example
```

### Option 2: Docker with Let's Encrypt (Recommended)

```yaml
# Add to docker-compose.prod.yml
nginx:
  image: nginx:alpine
  ports:
    - "443:443"
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf:ro
    - ./certbot/conf:/etc/letsencrypt:ro
    - ./certbot/www:/var/www/certbot:ro
```

## Monitoring & Logs

### Health Checks

All services include health checks:
- API: `GET /api/health`
- Client: Health check via Nginx
- Database: PostgreSQL health check
- Redis: Redis health check

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml logs -f client
docker-compose -f docker-compose.prod.yml logs -f db
```

### Backup & Recovery

```bash
# Backup database
docker-compose -f docker-compose.prod.yml exec db pg_dump -U postgres furniture_erp > backup.sql

# Restore database
docker-compose -f docker-compose.prod.yml exec -T db psql -U postgres furniture_erp < backup.sql
```

## Scaling & Performance

### Increase Rate Limiting Thresholds

Edit `server/src/app.ts` rate limiter config for your load:
```typescript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increase for higher load
});
```

### Database Connection Pool

Configure in `.env`:
```
DATABASE_URL="postgresql://user:pass@host/db?connection_limit=20"
```

### Redis Cache Configuration

Adjust Redis memory and persistence in `docker-compose.prod.yml`

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :80
lsof -i :4000
# Kill process
kill -9 <PID>
```

### Database Connection Errors

```bash
# Check database is running
docker-compose -f docker-compose.prod.yml ps db

# Check logs
docker-compose -f docker-compose.prod.yml logs db
```

### API Health Check Failing

```bash
# Test endpoint directly
curl http://localhost:4000/api/health

# Check logs
docker-compose -f docker-compose.prod.yml logs api
```

### Migrations Not Running

```bash
# Run manually
docker-compose -f docker-compose.prod.yml exec api npm run migrate

# Force reset (WARNING: loses data)
docker-compose -f docker-compose.prod.yml exec api npx prisma db push --force-reset
```

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | production | Application environment |
| `PORT` | 4000 | API server port |
| `DATABASE_URL` | - | PostgreSQL connection string (required) |
| `JWT_SECRET` | - | JWT signing secret (required, set strong) |
| `JWT_EXPIRES_IN` | 8h | JWT token expiration |
| `CORS_ORIGIN` | https://yourdomain.com | Allowed CORS origin |
| `REDIS_URL` | redis://redis:6379 | Redis connection string |
| `VITE_API_URL` | /api | Client API endpoint |

## Updating Application

```bash
# Pull latest code
git pull origin main

# Rebuild images
docker-compose -f docker-compose.prod.yml build

# Restart services
docker-compose -f docker-compose.prod.yml up -d
```

## Support & Documentation

- API Documentation: Available at `/api/docs` (if Swagger configured)
- Database Schema: Check `server/prisma/schema.prisma`
- Client Components: Located in `client/src/components/`
- API Routes: Located in `server/src/routes/`

## Security Notes

1. **JWT Secret**: Change immediately in production. Generate strong secret:
   ```bash
   openssl rand -base64 32
   ```

2. **Database**: 
   - Change default PostgreSQL password
   - Restrict network access
   - Enable SSL connections

3. **Redis**:
   - Set password for production
   - Restrict network access
   - Enable persistence

4. **API**:
   - Monitor rate limit usage
   - Keep dependencies updated
   - Enable HTTPS/TLS
   - Use strong CORS policy

5. **Regular Maintenance**:
   - Weekly database backups
   - Monthly security updates
   - Monitor disk space
   - Review access logs
