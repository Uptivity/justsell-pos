# Coolify Deployment Guide for JustSell POS

## What is Coolify?
Coolify is an open-source, self-hostable Heroku/Netlify alternative. It provides:
- One-click deployments
- Automatic SSL certificates
- Built-in database management
- GitHub integration
- Monitoring & logs
- Backup management
- Zero downtime deployments

## YES - Coolify is PERFECT for JustSell POS!

### Benefits for Your POS System:
1. **Easy Management** - Web UI for all operations
2. **Automatic SSL** - Secure connections out of the box
3. **Database GUI** - Manage PostgreSQL easily
4. **One-Click Updates** - Deploy new versions instantly
5. **Built-in Backups** - Automated database backups
6. **Resource Monitoring** - Track CPU, RAM, disk usage
7. **Multi-environment** - Run staging and production

## Digital Ocean Droplet Requirements

### For Coolify + JustSell POS:
- **Minimum**: 4 GB RAM / 2 vCPUs / **80 GB SSD** ($24/month)
- **Recommended**: 8 GB RAM / 4 vCPUs / **160 GB SSD** ($48/month)

**Why this disk size?**
- Coolify itself: ~10GB
- Docker images: ~15GB
- PostgreSQL data: ~10GB
- Application files: ~5GB
- Logs & backups: ~20GB
- System overhead: ~20GB
- **Total: ~80GB minimum**

## Step-by-Step Coolify Installation

### 1. Create Digital Ocean Droplet
```
- Image: Ubuntu 22.04 LTS
- Size: 4GB RAM / 80GB SSD minimum
- Region: Closest to your location
- Add SSH key for secure access
```

### 2. Install Coolify (One Command!)
```bash
# SSH into your droplet
ssh root@your-droplet-ip

# Install Coolify (v4)
curl -fsSL https://get.coolify.io | bash
```

### 3. Access Coolify Dashboard
- Navigate to: `http://your-droplet-ip:8000`
- Complete initial setup
- Set admin email and password

### 4. Configure Domain & SSL
1. Point your domain to droplet IP
2. In Coolify: Settings → Domains
3. Add your domain
4. Enable "Auto SSL" with Let's Encrypt

## Deploying JustSell POS on Coolify

### Method 1: GitHub Integration (Recommended)

1. **Connect GitHub**
   - Settings → Git Providers
   - Add GitHub connection
   - Authorize Coolify

2. **Create New Project**
   - Projects → Add Project
   - Name: "JustSell POS"

3. **Add Application**
   - Add Resource → Application
   - Source: GitHub
   - Repository: your-repo
   - Branch: main

4. **Configure Build**
   ```yaml
   # Build Configuration
   Build Command: npm run build
   Install Command: npm install
   Start Command: npm run start:prod
   Port: 3000
   ```

5. **Environment Variables**
   - Add all from .env.production
   - Coolify encrypts these automatically

6. **Add PostgreSQL**
   - Add Resource → Database
   - Choose PostgreSQL 15
   - Auto-generates connection string

7. **Add Redis**
   - Add Resource → Database
   - Choose Redis 7
   - Auto-generates connection URL

### Method 2: Docker Compose Upload

1. **Create Application**
   - Add Resource → Docker Compose

2. **Upload Compose File**
   - Use our docker-compose.prod.yml
   - Coolify handles networking automatically

3. **Configure Domains**
   - Set public domain for app service
   - Coolify handles SSL automatically

## Coolify-Specific Configuration

### coolify.json (Add to repository root)
```json
{
  "version": "1.0",
  "project": "justsell-pos",
  "services": {
    "app": {
      "build": {
        "dockerfile": "Dockerfile",
        "context": "."
      },
      "ports": ["3000", "5173"],
      "environment": {
        "NODE_ENV": "production"
      },
      "volumes": [
        "./uploads:/app/uploads",
        "./logs:/app/logs"
      ],
      "healthcheck": {
        "endpoint": "/api/health",
        "interval": 30
      }
    }
  },
  "databases": {
    "postgres": {
      "type": "postgresql",
      "version": "15"
    },
    "redis": {
      "type": "redis",
      "version": "7"
    }
  }
}
```

## Backup Configuration in Coolify

1. **Automatic Backups**
   - Settings → Backups
   - Schedule: Daily at 2 AM
   - Retention: 30 days

2. **S3 Integration** (Optional)
   - Connect Digital Ocean Spaces
   - Automatic upload of backups

## Monitoring in Coolify

1. **Resource Monitoring**
   - Real-time CPU, RAM, Disk usage
   - Historical graphs

2. **Logs**
   - Application logs
   - Build logs
   - Database logs

3. **Alerts**
   - Email notifications
   - Webhook integration
   - Health check failures

## Updating Your Application

### With GitHub Integration:
1. Push to main branch
2. Coolify auto-deploys
3. Zero downtime with rolling updates

### Manual Update:
1. Dashboard → Your App
2. Click "Redeploy"
3. Monitors deployment progress

## Cost Comparison

### Without Coolify:
- Droplet: $24/month
- Separate DB hosting: $15/month
- SSL certificate: $0-10/month
- Monitoring tool: $10/month
- **Total: ~$59/month**

### With Coolify:
- Droplet (larger for Coolify): $24-48/month
- Everything included!
- **Total: $24-48/month**

## Troubleshooting

### Coolify Won't Start
```bash
# Check Coolify status
systemctl status coolify

# Restart Coolify
systemctl restart coolify

# View logs
journalctl -u coolify -f
```

### Database Connection Issues
- Check firewall rules
- Verify network in Coolify dashboard
- Use Coolify's internal DNS names

### Performance Issues
- Upgrade droplet size
- Enable swap memory
- Check Docker disk usage

## Advanced Features

### Multi-Store Deployment
- Create separate projects per store
- Share database or isolate
- Central management dashboard

### Staging Environment
- Clone production settings
- Different domain
- Separate database
- Test updates before production

### Custom Domains per Store
- store1.yourdomain.com
- store2.yourdomain.com
- Central admin.yourdomain.com

## Security with Coolify

- ✅ Automatic SSL/TLS
- ✅ Encrypted secrets
- ✅ Network isolation
- ✅ Automatic security updates
- ✅ Built-in firewall rules
- ✅ DDoS protection (with Cloudflare)

## Recommended Setup for Production

1. **Droplet**: 8GB RAM / 160GB SSD
2. **Coolify**: Latest v4
3. **Backups**: Daily to DO Spaces
4. **Monitoring**: Enable all alerts
5. **Domain**: Use Cloudflare for CDN
6. **Updates**: Weekly maintenance window

## Support Resources

- Coolify Docs: https://coolify.io/docs
- Discord: https://discord.gg/coolify
- GitHub: https://github.com/coollabsio/coolify
- YouTube Tutorials: Search "Coolify deployment"