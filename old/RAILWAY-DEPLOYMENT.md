# Railway Deployment Guide for JustSell POS

## Prerequisites

1. **GitHub Account**: Required to host your code repository
2. **Railway Account**: Sign up at [railway.app](https://railway.app)
3. **QuickBooks Developer Account** (Optional): For accounting integration

## Step 1: Prepare GitHub Repository

### Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `justsell-pos`
3. Set to Public or Private
4. Do NOT initialize with README (we have one)
5. Create repository

### Push Code to GitHub

```bash
# If not already done, initialize git
git init

# Add all files
git add -A

# Commit
git commit -m "Initial commit: JustSell POS System"

# Add remote origin
git remote add origin https://github.com/uptivity/justsell-pos.git

# Push to GitHub
git push -u origin master
```

## Step 2: Deploy to Railway

### Method 1: Deploy from GitHub (Recommended)

1. Log in to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Authorize Railway to access your GitHub account
5. Select the `justsell-pos` repository
6. Railway will automatically detect the configuration

### Method 2: Deploy via CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project in your local directory
railway init

# Link to your project
railway link

# Deploy
railway up
```

## Step 3: Configure Services

### Add PostgreSQL Database

1. In Railway dashboard, click "New" → "Database" → "Add PostgreSQL"
2. Railway will automatically set `DATABASE_URL` environment variable

### Add Redis (Optional, for caching)

1. Click "New" → "Database" → "Add Redis"
2. Railway will automatically set `REDIS_URL` environment variable

## Step 4: Set Environment Variables

In Railway dashboard, go to your project → Variables tab, and add:

### Required Variables

```env
# Security (MUST CHANGE)
JWT_SECRET=generate-secure-random-string-here
JWT_REFRESH_SECRET=generate-another-secure-random-string-here
SESSION_SECRET=generate-third-secure-random-string-here

# Admin Account
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<bcrypt-hash-of-your-password>

# Application
NODE_ENV=production
```

### Optional Variables

```env
# Payment Processing
SQUARE_ACCESS_TOKEN=your-square-production-token
STRIPE_SECRET_KEY=your-stripe-production-key

# QuickBooks Integration
QUICKBOOKS_CLIENT_ID=your-quickbooks-client-id
QUICKBOOKS_CLIENT_SECRET=your-quickbooks-client-secret
QUICKBOOKS_ENVIRONMENT=production

# Error Tracking
SENTRY_DSN=your-sentry-dsn

# Analytics
GOOGLE_ANALYTICS_ID=your-ga-id
```

### Generate Secure Secrets

To generate secure random strings for secrets:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 64
```

To generate bcrypt hash for admin password:

```bash
# Install bcryptjs globally
npm install -g bcryptjs

# Generate hash (you'll be prompted for password)
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your-password-here', 10).then(console.log)"
```

## Step 5: Deploy and Initialize

### First Deployment

1. Railway will automatically run the build command from `package.json`
2. Database migrations will run automatically on first start
3. The app will be available at your Railway-provided URL

### Verify Deployment

1. Check deployment logs in Railway dashboard
2. Visit your app URL (shown in Railway dashboard)
3. Default login (if using seed data):
   - Username: `admin`
   - Password: (the password you hashed)

## Step 6: Custom Domain (Optional)

### Add Custom Domain

1. In Railway dashboard, go to Settings → Domains
2. Add your custom domain
3. Update your DNS records as instructed by Railway

### Update Environment Variables

After adding custom domain, update:

```env
FRONTEND_URL=https://your-domain.com
VITE_API_URL=https://your-domain.com/api
CORS_ORIGIN=https://your-domain.com
QUICKBOOKS_REDIRECT_URI=https://your-domain.com/api/quickbooks/callback
```

## Step 7: Production Setup

### Enable HTTPS

Railway provides HTTPS automatically for all deployments.

### Set Up Backups

1. Go to PostgreSQL service in Railway
2. Enable automatic backups
3. Configure backup retention period

### Monitor Application

1. View logs: Railway dashboard → Deployments → View logs
2. Monitor metrics: Railway dashboard → Metrics
3. Set up alerts: Railway dashboard → Settings → Notifications

## Maintenance

### Update Application

```bash
# Make changes locally
git add .
git commit -m "Update: description of changes"
git push origin master

# Railway will automatically redeploy
```

### Database Migrations

Migrations run automatically on deploy. To run manually:

```bash
# Via Railway CLI
railway run npm run db:migrate
```

### View Logs

```bash
# Via Railway CLI
railway logs

# Or in dashboard
# Go to Deployments → Select deployment → View logs
```

## Troubleshooting

### Common Issues

1. **Build Fails**
   - Check Node.js version (requires 20+)
   - Verify all dependencies in package.json
   - Check build logs for specific errors

2. **Database Connection Issues**
   - Verify DATABASE_URL is set correctly
   - Check if PostgreSQL service is running
   - Ensure migrations have run

3. **App Not Starting**
   - Check start command in railway.json
   - Verify PORT environment variable (Railway sets automatically)
   - Check application logs for errors

4. **QuickBooks Integration Issues**
   - Verify redirect URI matches your Railway URL
   - Ensure client ID/secret are correct
   - Check QuickBooks app settings

### Support Resources

- Railway Documentation: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- JustSell POS Issues: [github.com/uptivity/justsell-pos/issues](https://github.com/uptivity/justsell-pos/issues)

## Security Checklist

- [ ] Changed all default secrets (JWT_SECRET, etc.)
- [ ] Set strong admin password
- [ ] Enabled HTTPS (automatic on Railway)
- [ ] Configured CORS properly
- [ ] Set up database backups
- [ ] Enabled monitoring/alerts
- [ ] Reviewed environment variables
- [ ] Tested payment processing in production mode

## Next Steps

1. **Configure Payment Processing**: Add your production payment API keys
2. **Set Up QuickBooks**: Configure OAuth and connect your QuickBooks account
3. **Import Data**: Use admin interface to import products and customers
4. **Train Staff**: Use the included USER-GUIDE.md for staff training
5. **Monitor Performance**: Set up monitoring and analytics

## Cost Estimation

Railway pricing (as of 2024):
- **Starter**: $5/month (includes $5 of usage)
- **PostgreSQL**: ~$5-20/month depending on size
- **Redis**: ~$5-10/month (optional)
- **Total**: ~$10-35/month for small to medium stores

For high-volume stores, consider Railway's Team or Enterprise plans.

## Done!

Your JustSell POS system should now be live on Railway! 

Default admin login:
- URL: `https://your-app.railway.app`
- Username: `admin` (or what you configured)
- Password: (what you set during setup)

For ongoing maintenance and configuration, refer to:
- `ADMIN-GUIDE.md` - Administrative tasks
- `USER-GUIDE.md` - Daily operations
- `IMPLEMENTATION-GUIDE.md` - Technical details