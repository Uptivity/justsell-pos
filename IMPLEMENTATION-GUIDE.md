# JustSell POS System - Implementation & Hosting Guide

## 📋 Overview

This guide provides step-by-step instructions for deploying and hosting the JustSell POS system in production environments. The system is a complete Progressive Web App (PWA) with full offline capabilities, QuickBooks integration, and compliance features for tobacco retail.

## 🏗️ System Architecture

- **Frontend**: React 19 + TypeScript + Vite + PWA
- **Backend**: Node.js + Express + Prisma ORM
- **Database**: PostgreSQL 14+
- **Cache/Session**: Redis (optional but recommended)
- **Integration**: QuickBooks Online API
- **Deployment**: Docker containers or traditional hosting

## 🔧 Prerequisites

### Required Software
- **Node.js** 20+ with npm
- **PostgreSQL** 14+ database server
- **Redis** 6+ (optional but recommended)
- **Docker** & Docker Compose (for containerized deployment)
- **SSL Certificate** (required for PWA features)

### Hardware Requirements

#### Minimum (Small Store)
- **CPU**: 2 cores, 2.0 GHz
- **RAM**: 4 GB
- **Storage**: 50 GB SSD
- **Network**: 10 Mbps upload/download

#### Recommended (Multiple Stores)
- **CPU**: 4 cores, 2.5+ GHz  
- **RAM**: 8 GB
- **Storage**: 100 GB NVMe SSD
- **Network**: 50+ Mbps upload/download
- **Backup**: Automated daily backups

## 🚀 Deployment Options

### Option 1: Docker Deployment (Recommended)

#### Step 1: Prepare Environment
```bash
# Clone the repository
git clone <repository-url>
cd justsell-pos

# Create production environment file
cp .env.example .env.production
```

#### Step 2: Configure Environment Variables
```bash
# Edit .env.production
nano .env.production
```

**Required Environment Variables:**
```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/justsell_pos?schema=public"
REDIS_URL="redis://localhost:6379"

# JWT Configuration
JWT_SECRET="your-super-secure-jwt-secret-key-here"
JWT_REFRESH_SECRET="your-super-secure-refresh-secret-key-here"

# QuickBooks Integration
QB_CLIENT_ID="your-quickbooks-app-client-id"
QB_CLIENT_SECRET="your-quickbooks-app-client-secret"
QB_REDIRECT_URI="https://yourdomain.com/admin/quickbooks/callback"
QB_SANDBOX="false"

# Application Settings
NODE_ENV="production"
PORT="3000"
API_BASE_URL="https://yourdomain.com/api"
APP_BASE_URL="https://yourdomain.com"

# Email Configuration (for notifications)
SMTP_HOST="smtp.youremailprovider.com"
SMTP_PORT="587"
SMTP_USER="your-smtp-username"
SMTP_PASS="your-smtp-password"
SMTP_FROM="noreply@yourdomain.com"

# Security
BCRYPT_ROUNDS="12"
RATE_LIMIT_WINDOW="15"
RATE_LIMIT_MAX="100"

# Audit & Compliance
AUDIT_RETENTION_DAYS="2555"  # 7 years for compliance
```

#### Step 3: Build and Deploy with Docker
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Run database migrations
docker-compose -f docker-compose.prod.yml exec app npm run prisma:migrate:deploy

# Generate Prisma client
docker-compose -f docker-compose.prod.yml exec app npm run prisma:generate

# Create initial admin user
docker-compose -f docker-compose.prod.yml exec app npm run seed:admin
```

#### Docker Compose Production Configuration
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build: 
      context: .
      dockerfile: Dockerfile.prod
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads

  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: justsell_pos
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    command: redis-server --appendonly yes

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Option 2: Traditional VPS/Server Deployment

#### Step 1: Server Setup (Ubuntu 22.04 LTS)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install Redis
sudo apt install redis-server -y
sudo systemctl start redis
sudo systemctl enable redis

# Install Nginx
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx

# Install PM2 for process management
sudo npm install -g pm2
```

#### Step 2: Database Setup
```bash
# Switch to postgres user
sudo -u postgres psql

-- Create database and user
CREATE DATABASE justsell_pos;
CREATE USER justsell_admin WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE justsell_pos TO justsell_admin;
\q
```

#### Step 3: Application Deployment
```bash
# Create application directory
sudo mkdir -p /var/www/justsell-pos
sudo chown $USER:$USER /var/www/justsell-pos

# Clone and setup application
cd /var/www/justsell-pos
git clone <repository-url> .
npm install --production

# Build application
npm run build

# Setup environment
cp .env.example .env
nano .env  # Configure as shown above

# Run database migrations
npm run prisma:migrate:deploy
npm run prisma:generate

# Create initial admin user
npm run seed:admin

# Start with PM2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

#### PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'justsell-pos',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
}
```

## 🌐 Reverse Proxy Configuration (Nginx)

```nginx
# /etc/nginx/sites-available/justsell-pos
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;

    # Security headers for PWA
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://sandbox-quickbooks.api.intuit.com https://quickbooks.api.intuit.com;";

    # PWA-specific headers
    location /manifest.json {
        add_header Cache-Control "public, max-age=604800";
    }

    location /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # API routes
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static assets
    location /assets/ {
        root /var/www/justsell-pos/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Main application
    location / {
        root /var/www/justsell-pos/dist;
        try_files $uri $uri/ /index.html;
        
        # PWA caching headers
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:3000/health;
    }
}
```

## 🔒 SSL Certificate Setup (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Monitoring & Health Checks

### Health Check Endpoint
```bash
# Add to your application
curl https://yourdomain.com/health
# Should return: {"status":"healthy","timestamp":"...","version":"1.0.0"}
```

### Log Monitoring
```bash
# PM2 logs
pm2 logs justsell-pos

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Application logs
tail -f /var/www/justsell-pos/logs/combined.log
```

### System Monitoring
```bash
# Install monitoring tools
sudo apt install htop iotop nethogs -y

# Database monitoring
sudo -u postgres psql -c "SELECT datname, numbackends, xact_commit, xact_rollback FROM pg_stat_database WHERE datname='justsell_pos';"
```

## 💾 Backup & Recovery

### Automated Database Backup
```bash
#!/bin/bash
# /home/ubuntu/backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
DB_NAME="justsell_pos"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U justsell_admin -h localhost $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +30 -delete

# Backup application files
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz -C /var/www/justsell-pos .

echo "Backup completed: $DATE"
```

```bash
# Make executable and schedule
chmod +x /home/ubuntu/backup-db.sh
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup-db.sh
```

## 🔧 Performance Optimization

### Database Optimization
```sql
-- Add database indexes for performance
CREATE INDEX CONCURRENTLY idx_transactions_store_date ON transactions(store_id, transaction_date);
CREATE INDEX CONCURRENTLY idx_products_category_active ON products(category, is_active);
CREATE INDEX CONCURRENTLY idx_customers_phone ON customers(phone_number);
CREATE INDEX CONCURRENTLY idx_audit_logs_timestamp ON audit_logs(timestamp);
```

### Redis Configuration
```bash
# /etc/redis/redis.conf
maxmemory 1gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### Node.js Optimization
```javascript
// Add to package.json
{
  "scripts": {
    "start": "node --max-old-space-size=2048 dist/server.js"
  }
}
```

## 🚨 Security Checklist

### Server Security
- [ ] SSH key-only authentication
- [ ] Firewall configured (UFW)
- [ ] Regular security updates
- [ ] Non-root user for application
- [ ] File permissions properly set

### Application Security  
- [ ] Environment variables secured
- [ ] HTTPS enforced
- [ ] Rate limiting enabled
- [ ] SQL injection protection
- [ ] XSS protection headers
- [ ] CSRF protection enabled

### Database Security
- [ ] Strong database passwords
- [ ] Database user with minimal permissions
- [ ] Regular security updates
- [ ] Encrypted backups
- [ ] Network access restricted

## 📞 Support & Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check logs
pm2 logs justsell-pos
# Check database connection
npm run prisma:generate
npm run prisma:migrate:status
```

#### Database Connection Issues
```bash
# Test connection
psql -U justsell_admin -h localhost -d justsell_pos
# Check PostgreSQL status
sudo systemctl status postgresql
```

#### PWA Not Installing
- Verify HTTPS is working
- Check manifest.json is accessible
- Validate service worker registration
- Check browser console for errors

### Performance Issues
```bash
# Check system resources
htop
df -h
free -h

# Database performance
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity WHERE datname='justsell_pos';"
```

### Emergency Recovery
1. Stop application: `pm2 stop justsell-pos`
2. Restore database from backup
3. Check configuration files
4. Restart services: `pm2 start justsell-pos`

## 🎯 Production Deployment Checklist

- [ ] SSL certificate installed and auto-renewal configured
- [ ] Environment variables set and secured
- [ ] Database migrations completed successfully
- [ ] Initial admin user created
- [ ] Nginx reverse proxy configured
- [ ] PM2 process manager setup
- [ ] Automated backups scheduled
- [ ] Log rotation configured
- [ ] Monitoring and health checks working
- [ ] Firewall rules configured
- [ ] Security headers implemented
- [ ] PWA functionality tested
- [ ] QuickBooks integration configured
- [ ] Performance optimizations applied
- [ ] Documentation updated with server details

## 📚 Additional Resources

- **Prisma Documentation**: https://www.prisma.io/docs/
- **PWA Best Practices**: https://web.dev/pwa-checklist/
- **QuickBooks API**: https://developer.intuit.com/app/developer/qbo/docs/api
- **Node.js Security**: https://nodejs.org/en/docs/guides/security/
- **Nginx Configuration**: https://nginx.org/en/docs/

---

**Need Help?** Contact the development team or refer to the Admin Configuration Guide for ongoing maintenance and support procedures.