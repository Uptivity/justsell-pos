# JustSell POS - Deployment Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Deployment Options](#deployment-options)
- [DigitalOcean Deployment](#digitalocean-deployment)
- [Docker Deployment](#docker-deployment)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Monitoring & Logging](#monitoring--logging)
- [Troubleshooting](#troubleshooting)
- [Rollback Procedures](#rollback-procedures)

## Prerequisites

### Required Tools
- Docker 20.10+ and Docker Compose 2.0+
- Node.js 20+ (for local development)
- Git
- PostgreSQL client tools (for database management)
- SSL certificates (for production)

### System Requirements
- **Minimum**: 2 CPU cores, 4GB RAM, 20GB storage
- **Recommended**: 4 CPU cores, 8GB RAM, 50GB storage
- **OS**: Ubuntu 22.04 LTS or similar Linux distribution

## Deployment Options

### 1. DigitalOcean App Platform (Recommended)
- Fully managed platform
- Auto-scaling capabilities
- Built-in SSL/TLS
- Integrated monitoring

### 2. Docker Compose (Self-Managed)
- Full control over infrastructure
- Custom networking options
- Manual scaling required
- Self-managed SSL/TLS

### 3. Kubernetes (Enterprise)
- High availability
- Auto-scaling
- Load balancing
- Complex setup

## DigitalOcean Deployment

### Step 1: Create DigitalOcean Account
1. Sign up at [DigitalOcean](https://www.digitalocean.com)
2. Add payment method
3. Generate API token from API settings

### Step 2: Install doctl CLI
```bash
# macOS
brew install doctl

# Linux
cd ~
wget https://github.com/digitalocean/doctl/releases/download/v1.94.0/doctl-1.94.0-linux-amd64.tar.gz
tar xf ~/doctl-1.94.0-linux-amd64.tar.gz
sudo mv ~/doctl /usr/local/bin

# Authenticate
doctl auth init
```

### Step 3: Deploy Using App Platform
```bash
# Create app from spec
doctl apps create --spec .do/app.yaml

# Get app ID
doctl apps list

# Update app
doctl apps update <APP_ID> --spec .do/app.yaml
```

### Step 4: Configure Environment Variables
```bash
# Set production secrets
doctl apps update <APP_ID> --env \
  JWT_SECRET=your-secret-here \
  JWT_REFRESH_SECRET=your-refresh-secret \
  SESSION_SECRET=your-session-secret \
  ENCRYPTION_KEY=your-32-char-encryption-key \
  REDIS_PASSWORD=your-redis-password
```

### Step 5: Configure Domain
```bash
# Add custom domain
doctl apps update <APP_ID> --domain yourdomain.com

# Update DNS records
# Add CNAME record pointing to your-app.ondigitalocean.app
```

## Docker Deployment

### Step 1: Clone Repository
```bash
git clone https://github.com/Uptivity/justsell-pos.git
cd justsell-pos
```

### Step 2: Configure Environment
```bash
# Copy production environment template
cp .env.production .env

# Edit configuration
nano .env

# Required variables:
# - DATABASE_URL
# - REDIS_URL
# - JWT_SECRET (generate with: openssl rand -base64 64)
# - JWT_REFRESH_SECRET (generate with: openssl rand -base64 64)
# - SESSION_SECRET (generate with: openssl rand -base64 64)
# - ENCRYPTION_KEY (must be exactly 32 characters)
```

### Step 3: Build and Deploy
```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 4: Run Migrations
```bash
# Run database migrations
docker-compose exec app npx prisma migrate deploy

# Seed initial data (optional)
docker-compose exec app npx prisma db seed
```

### Step 5: Verify Deployment
```bash
# Check health endpoint
curl http://localhost/api/health

# Check application
open http://localhost
```

## Environment Configuration

### Core Settings
```env
# Application
NODE_ENV=production
PORT=3000
API_URL=https://your-domain.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname
DB_CONNECTION_POOL_SIZE=20

# Redis
REDIS_URL=redis://default:password@host:6379
REDIS_MAX_RETRIES=3

# Security
JWT_SECRET=<64-character-secret>
JWT_REFRESH_SECRET=<64-character-secret>
SESSION_SECRET=<64-character-secret>
ENCRYPTION_KEY=<32-character-key>
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

### Advanced Settings
```env
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Uploads
MAX_FILE_SIZE=5242880
UPLOAD_DIR=/app/uploads

# Logging
LOG_LEVEL=info
ENABLE_AUDIT_LOG=true
AUDIT_LOG_DIR=/app/logs/audit
LOG_RETENTION_DAYS=90

# QuickBooks Integration (Optional)
QUICKBOOKS_CLIENT_ID=
QUICKBOOKS_CLIENT_SECRET=
QUICKBOOKS_REDIRECT_URI=https://your-domain.com/api/quickbooks/callback
QUICKBOOKS_ENVIRONMENT=production
```

## Database Setup

### PostgreSQL Configuration
```sql
-- Optimize for production
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET random_page_cost = 1.1;

-- Apply changes
SELECT pg_reload_conf();
```

### Backup Strategy
```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/justsell_${TIMESTAMP}.sql.gz"

# Create backup
docker-compose exec -T postgres pg_dump \
  -U justsell -d justsell_pos | gzip > $BACKUP_FILE

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup created: $BACKUP_FILE"
EOF

# Schedule daily backups
crontab -e
# Add: 0 3 * * * /path/to/backup.sh
```

### Restore Procedure
```bash
# Restore from backup
gunzip < backup.sql.gz | docker-compose exec -T postgres \
  psql -U justsell -d justsell_pos
```

## SSL/TLS Configuration

### Using Let's Encrypt
```bash
# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

### Update Nginx Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # ... rest of configuration
}
```

## Monitoring & Logging

### Health Checks
```bash
# Basic health check
curl https://your-domain.com/health

# Detailed health check
curl https://your-domain.com/api/health | jq '.'
```

### Log Management
```bash
# View application logs
docker-compose logs -f app

# View specific service logs
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f nginx

# Export logs
docker-compose logs > deployment.log
```

### Monitoring Setup
```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

## Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check database status
docker-compose exec postgres pg_isready

# Check connection string
docker-compose exec app npx prisma db push

# Reset database
docker-compose down -v
docker-compose up -d
docker-compose exec app npx prisma migrate deploy
```

#### Redis Connection Failed
```bash
# Check Redis status
docker-compose exec redis redis-cli ping

# Check Redis logs
docker-compose logs redis

# Flush Redis cache
docker-compose exec redis redis-cli FLUSHALL
```

#### Application Won't Start
```bash
# Check logs
docker-compose logs app

# Rebuild application
docker-compose build --no-cache app
docker-compose up -d

# Check environment variables
docker-compose exec app env | grep -E "(NODE_ENV|DATABASE_URL)"
```

#### Nginx 502 Bad Gateway
```bash
# Check upstream service
docker-compose ps app

# Check Nginx configuration
docker-compose exec nginx nginx -t

# Reload Nginx
docker-compose exec nginx nginx -s reload
```

### Performance Issues

#### Slow Database Queries
```sql
-- Find slow queries
SELECT query, calls, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_transactions_created_at
ON transactions(created_at);
```

#### High Memory Usage
```bash
# Check memory usage
docker stats

# Limit container memory
# Update docker-compose.yml:
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G
```

## Rollback Procedures

### Quick Rollback
```bash
# Tag current version as backup
docker tag justsell-pos:latest justsell-pos:backup

# Deploy previous version
docker tag justsell-pos:previous justsell-pos:latest
docker-compose up -d
```

### Database Rollback
```bash
# Restore from backup
./scripts/restore.sh backup-20240101.sql.gz

# Or rollback migration
docker-compose exec app npx prisma migrate resolve \
  --rolled-back 20240101000000_migration_name
```

### Full System Restore
```bash
# Stop all services
docker-compose down

# Restore database
gunzip < backup.sql.gz | docker-compose exec -T postgres \
  psql -U justsell -d justsell_pos

# Restore application version
git checkout <previous-version-tag>
docker-compose build
docker-compose up -d
```

## Security Checklist

- [ ] SSL/TLS certificates installed and configured
- [ ] All secrets stored in environment variables
- [ ] Database password changed from default
- [ ] Redis password configured
- [ ] Firewall rules configured (only ports 80/443 open)
- [ ] Regular security updates scheduled
- [ ] Backup strategy implemented and tested
- [ ] Monitoring and alerting configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Security headers implemented
- [ ] Regular vulnerability scanning scheduled

## Support

For deployment issues, please:
1. Check the troubleshooting section
2. Review logs with `docker-compose logs`
3. Open an issue on [GitHub](https://github.com/Uptivity/justsell-pos/issues)

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [DigitalOcean App Platform Docs](https://docs.digitalocean.com/products/app-platform/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)