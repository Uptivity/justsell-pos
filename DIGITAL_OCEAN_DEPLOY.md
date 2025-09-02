# Digital Ocean Deployment Guide for JustSell POS

## Droplet Requirements

### Recommended Droplet Specs
- **Size**: Basic or General Purpose
  - Minimum: 2 GB RAM / 1 vCPU / 50 GB SSD ($12/month)
  - Recommended: 4 GB RAM / 2 vCPUs / 80 GB SSD ($24/month)
- **Region**: Choose closest to your business location
- **OS**: Ubuntu 22.04 LTS

## Deployment Options

### Option A: Direct Docker Deployment (Simple)
1. Create Ubuntu 22.04 droplet
2. SSH into droplet
3. Install Docker and Docker Compose
4. Clone repository
5. Run docker-compose with production config

### Option B: Using Coolify (Recommended) 
- See COOLIFY_SETUP.md for detailed instructions
- Provides GUI management, SSL, backups, monitoring

## Quick Deployment Script

Save this as `deploy.sh` on your droplet:

```bash
#!/bin/bash

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install nginx for reverse proxy
apt install -y nginx certbot python3-certbot-nginx

# Clone your repository (replace with your repo URL)
git clone https://github.com/yourusername/justsell-pos.git /opt/justsell
cd /opt/justsell

# Setup environment
cp .env.production .env

# Build and start services
npm install
npm run build
docker-compose -f docker-compose.prod.yml up -d

echo "Deployment complete! Configure nginx and SSL next."
```

## Environment Variables for Production

Create `.env.production`:

```env
# Database
DATABASE_URL=postgresql://postgres:STRONG_PASSWORD@localhost:5432/justsell
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=generate-a-64-character-random-string
JWT_REFRESH_SECRET=generate-another-64-character-random-string
ENCRYPTION_KEY=generate-32-character-key

# App Config
NODE_ENV=production
PORT=3000
CLIENT_URL=https://your-domain.com

# QuickBooks (if using)
QB_CLIENT_ID=your-quickbooks-client-id
QB_CLIENT_SECRET=your-quickbooks-client-secret
QB_REDIRECT_URI=https://your-domain.com/api/quickbooks/callback

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## SSL Setup with Let's Encrypt

```bash
# After nginx is configured
certbot --nginx -d your-domain.com
```

## Monitoring & Maintenance

### Health Check Endpoint
- `GET /api/health` - Returns system status

### Backup Script
```bash
#!/bin/bash
# Run daily via cron
pg_dump $DATABASE_URL > /backups/justsell-$(date +%Y%m%d).sql
# Upload to Digital Ocean Spaces or S3
```

### Logs
- Application logs: `/opt/justsell/logs/`
- Nginx logs: `/var/log/nginx/`
- Docker logs: `docker-compose logs -f`

## Security Checklist
- [ ] Change all default passwords
- [ ] Configure firewall (ufw)
- [ ] Setup SSL certificate
- [ ] Enable automatic security updates
- [ ] Configure backup strategy
- [ ] Set up monitoring (Uptime Robot, etc.)
- [ ] Configure rate limiting
- [ ] Set up fail2ban for SSH protection

## Cost Estimate (Monthly)
- Droplet (4GB): $24
- Managed Database (optional): $15
- Spaces (backups): $5
- Domain: $1
- **Total: ~$45/month**

## Support Resources
- Digital Ocean Community: https://www.digitalocean.com/community
- Tutorials: https://www.digitalocean.com/community/tutorials
- Support Ticket: Available with your account