# Digital Ocean Deployment Guide for JustSell POS

## Prerequisites

1. **Digital Ocean Account**: Sign up at [digitalocean.com](https://digitalocean.com)
2. **GitHub Account**: Required to host your code repository
3. **Domain Name** (Optional): For custom domain setup

## Overview

This guide covers three deployment methods on Digital Ocean:
1. **App Platform** (Recommended) - Fully managed platform
2. **Docker Container** - Using Digital Ocean Container Registry
3. **Droplet Deployment** - Traditional VPS setup

## Method 1: Digital Ocean App Platform (Recommended)

### Step 1: Prepare Your Repository

Ensure your code is pushed to GitHub:

```bash
git add .
git commit -m "Prepare for Digital Ocean deployment"
git push origin main
```

### Step 2: Create App Platform Application

1. Log in to [Digital Ocean Control Panel](https://cloud.digitalocean.com)
2. Navigate to **Apps** → **Create App**
3. Choose **GitHub** as source
4. Select your `justsell-pos` repository
5. Choose `main` branch
6. Digital Ocean will auto-detect the app configuration from `.do/app.yaml`

### Step 3: Configure Environment Variables

In the App Platform dashboard, add these environment variables:

#### Required Variables

```env
# Database (Auto-provided by Digital Ocean)
DATABASE_URL=${justsell-db.DATABASE_URL}

# Security (Generate secure random strings)
JWT_SECRET=your-secure-jwt-secret-64-chars
JWT_REFRESH_SECRET=your-secure-refresh-secret-64-chars
SESSION_SECRET=your-secure-session-secret-64-chars

# Admin Account
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=your-bcrypt-hashed-password

# Application
NODE_ENV=production
API_PORT=8080
```

#### Optional Variables

```env
# Payment Processing
SQUARE_ACCESS_TOKEN=your-square-production-token
STRIPE_SECRET_KEY=your-stripe-production-key

# QuickBooks Integration
QUICKBOOKS_CLIENT_ID=your-quickbooks-client-id
QUICKBOOKS_CLIENT_SECRET=your-quickbooks-client-secret
QUICKBOOKS_ENVIRONMENT=production

# Analytics & Monitoring
SENTRY_DSN=your-sentry-dsn
GOOGLE_ANALYTICS_ID=your-ga-id
```

### Step 4: Deploy

1. Click **Create Resources**
2. Digital Ocean will build and deploy your application
3. Monitor the build logs for any issues
4. Once deployed, your app will be available at the provided URL

## Method 2: Docker Container Deployment

### Step 1: Build and Push Docker Image

```bash
# Build the Docker image
docker build -t justsell-pos .

# Tag for Digital Ocean Container Registry
docker tag justsell-pos registry.digitalocean.com/your-registry/justsell-pos:latest

# Push to registry (requires doctl setup)
docker push registry.digitalocean.com/your-registry/justsell-pos:latest
```

### Step 2: Create Database

1. Go to **Databases** → **Create Database Cluster**
2. Choose PostgreSQL
3. Select appropriate plan
4. Note the connection details

### Step 3: Deploy Container

1. Go to **Apps** → **Create App**
2. Choose **Docker Hub** or **DigitalOcean Container Registry**
3. Configure environment variables as above
4. Set health check endpoint to `/health`

## Method 3: Droplet Deployment

### Step 1: Create Droplet

```bash
# Using doctl CLI
doctl compute droplet create justsell-pos \
  --size s-2vcpu-2gb \
  --image ubuntu-22-04-x64 \
  --region nyc1 \
  --ssh-keys your-ssh-key-id
```

### Step 2: Setup Environment

```bash
# SSH into droplet
ssh root@your-droplet-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# Install PostgreSQL
apt install postgresql postgresql-contrib -y

# Install PM2 for process management
npm install -g pm2

# Install nginx for reverse proxy
apt install nginx -y
```

### Step 3: Deploy Application

```bash
# Clone repository
git clone https://github.com/uptivity/justsell-pos.git
cd justsell-pos

# Install dependencies
npm ci

# Build application
npm run build

# Setup database
sudo -u postgres createdb justsell_pos
sudo -u postgres createuser justsell_user

# Run migrations
npx prisma migrate deploy

# Start with PM2
pm2 start dist/server.js --name "justsell-api"
pm2 save
pm2 startup
```

## Environment Variables Setup

### Generate Secure Secrets

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Using OpenSSL
openssl rand -hex 64
```

### Generate Admin Password Hash

```bash
# Install bcryptjs globally
npm install -g bcryptjs

# Generate hash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your-password', 10).then(console.log)"
```

## Database Configuration

### PostgreSQL Setup

For App Platform, database is auto-configured. For manual setup:

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database and user
CREATE DATABASE justsell_pos;
CREATE USER justsell_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE justsell_pos TO justsell_user;

-- Set connection string
DATABASE_URL="postgresql://justsell_user:secure_password@localhost:5432/justsell_pos"
```

## SSL/HTTPS Configuration

### App Platform
- HTTPS is automatically enabled
- SSL certificates are managed automatically

### Droplet with Nginx

```nginx
# /etc/nginx/sites-available/justsell-pos
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Monitoring and Logging

### App Platform Monitoring

1. Go to **Apps** → Your App → **Insights**
2. Monitor CPU, Memory, and Network usage
3. Set up alerts for performance issues

### Log Access

```bash
# App Platform - via dashboard or CLI
doctl apps logs your-app-id

# Droplet - using PM2
pm2 logs justsell-api

# System logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## Backup and Recovery

### Database Backups

```bash
# Manual backup
pg_dump -h localhost -U justsell_user justsell_pos > backup.sql

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U justsell_user justsell_pos > backup_$DATE.sql
```

### App Platform Auto-Backups

Digital Ocean App Platform automatically backs up databases daily.

## Scaling

### App Platform Auto-Scaling

1. Go to **Apps** → Your App → **Settings**
2. Configure **Auto-scaling** settings
3. Set min/max instances based on load

### Load Balancer Setup

For high traffic, add a Load Balancer:

1. Go to **Networking** → **Load Balancers**
2. Create new load balancer
3. Add your app instances as targets

## Cost Optimization

### App Platform Pricing (as of 2024)

- **Basic**: $5/month (512MB RAM, 1 vCPU)
- **Professional**: $12/month (1GB RAM, 1 vCPU)
- **Database**: $15/month (1GB RAM, 1 vCPU, 10GB storage)

### Droplet Pricing

- **Basic**: $6/month (1GB RAM, 1 vCPU, 25GB SSD)
- **General Purpose**: $12/month (2GB RAM, 1 vCPU, 50GB SSD)

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version (requires 20+)
   - Verify package.json scripts
   - Check build logs for specific errors

2. **Database Connection Issues**
   - Verify DATABASE_URL format
   - Check database service status
   - Ensure migrations have run

3. **Environment Variables**
   - Check variable names and values
   - Ensure secrets are properly set
   - Verify scope (build-time vs runtime)

### Debug Commands

```bash
# Check app status
doctl apps list

# View app details
doctl apps get your-app-id

# View build logs
doctl apps logs your-app-id --type build

# View runtime logs
doctl apps logs your-app-id --type deploy
```

## Security Checklist

- [ ] Changed all default secrets
- [ ] Set strong admin password
- [ ] Enabled HTTPS
- [ ] Configured CORS properly
- [ ] Set up database backups
- [ ] Enabled monitoring
- [ ] Reviewed firewall settings
- [ ] Updated dependencies

## Support Resources

- Digital Ocean Documentation: [docs.digitalocean.com](https://docs.digitalocean.com)
- Digital Ocean Community: [community.digitalocean.com](https://community.digitalocean.com)
- App Platform Docs: [docs.digitalocean.com/products/app-platform](https://docs.digitalocean.com/products/app-platform)

## Next Steps

1. **Configure Payment Processing**: Add production API keys
2. **Set Up Domain**: Configure custom domain and SSL
3. **Initialize Data**: Import products and customers
4. **Staff Training**: Use USER-GUIDE.md for training
5. **Monitoring**: Set up alerts and monitoring

Your JustSell POS system should now be deployed and accessible at your Digital Ocean App Platform URL!