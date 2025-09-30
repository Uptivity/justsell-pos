# JustSell POS Deployment Checklist

## Pre-Deployment Setup

### 🔐 Security Configuration
- [ ] Generate strong admin password
- [ ] Create admin password hash: `node scripts/generate-admin-hash.js "YourPassword123!"`
- [ ] Set `ADMIN_PASSWORD_HASH` environment variable
- [ ] Generate JWT secrets (64+ characters each):
  - [ ] `JWT_SECRET`
  - [ ] `JWT_REFRESH_SECRET`
  - [ ] `SESSION_SECRET`
- [ ] Generate encryption key (exactly 32 characters): `ENCRYPTION_KEY`
- [ ] Set database passwords:
  - [ ] `DB_PASSWORD`
  - [ ] `REDIS_PASSWORD`

### 📋 Required Environment Variables

#### Critical (Must Set)
```bash
# Security
JWT_SECRET="your-64-character-jwt-secret-here"
JWT_REFRESH_SECRET="your-64-character-refresh-secret-here"
SESSION_SECRET="your-64-character-session-secret-here"
ENCRYPTION_KEY="your-exactly-32-character-key-here"

# Database
DATABASE_URL="postgresql://user:pass@host:5432/dbname"
REDIS_URL="redis://default:password@host:6379"

# Admin Account
ADMIN_PASSWORD_HASH="$2b$12$hash-generated-by-script"
DEFAULT_ADMIN_USERNAME="admin"

# Basic Configuration
NODE_ENV="production"
CORS_ORIGIN="https://your-domain.com"
```

#### Optional
```bash
# QuickBooks Integration
QUICKBOOKS_CLIENT_ID="your-quickbooks-client-id"
QUICKBOOKS_CLIENT_SECRET="your-quickbooks-client-secret"

# Email Notifications
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@domain.com"
SMTP_PASS="your-app-password"

# Monitoring
SENTRY_DSN="your-sentry-dsn"
```

## Database Seeding Verification

The system automatically seeds essential data on first deployment:

### ✅ What Gets Seeded

#### 📜 **Policies & Legal Documents**
- [ ] **GDPR Compliance Policy** - Complete data protection regulation compliance
- [ ] **Privacy Policy** - Data collection and usage practices
- [ ] **Terms of Service** - User agreement and liability terms
- [ ] **Cookie Policy** - Cookie usage and user choices
- [ ] **Age Verification Policy** - Legal requirements for tobacco sales

#### ⚙️ **System Configuration**
- [ ] **Store Settings** - Timezone, currency, basic store info
- [ ] **Security Settings** - Session timeout, audit log retention
- [ ] **Compliance Settings** - Age verification, GDPR features
- [ ] **Business Settings** - Loyalty program, inventory thresholds

#### 📊 **Compliance Rules**
- [ ] **Federal Age Verification** - 21+ requirement for tobacco products
- [ ] **State Flavor Bans** - California, New York restrictions
- [ ] **Excise Tax Rules** - Federal tobacco tax calculations
- [ ] **Sales Channel Restrictions** - Online sales limitations

#### 📧 **Notification Templates**
- [ ] Age verification prompts
- [ ] Loyalty points notifications
- [ ] GDPR data request confirmations
- [ ] Low stock alerts
- [ ] Marketing opt-in confirmations

#### 👤 **Sample Data**
- [ ] **Admin User** - Default administrator account
- [ ] **Demo Store** - Sample store location and settings
- [ ] **Sample Products** - Tobacco pods and disposable vapes
- [ ] **Sample Customer** - Demo customer with loyalty data
- [ ] **Sample Offers** - Loyalty program discount example

## Deployment Steps

### 🐳 Docker Deployment
```bash
# 1. Clone repository
git clone https://github.com/Uptivity/justsell-pos.git
cd justsell-pos

# 2. Configure environment
cp .env.production .env
# Edit .env with your values

# 3. Generate admin password hash
node scripts/generate-admin-hash.js "YourSecurePassword123!"
# Copy hash to ADMIN_PASSWORD_HASH in .env

# 4. Deploy
chmod +x scripts/deploy.sh
./scripts/deploy.sh

# 5. Verify deployment
curl http://localhost/api/health
```

### ☁️ DigitalOcean App Platform
```bash
# 1. Install doctl CLI
# 2. Set environment variables in DO dashboard or via CLI
# 3. Deploy
doctl apps create --spec .do/app.yaml

# 4. Set secrets via dashboard:
# - ADMIN_PASSWORD_HASH
# - JWT_SECRET, JWT_REFRESH_SECRET, SESSION_SECRET
# - ENCRYPTION_KEY
# - Database passwords
```

## Post-Deployment Verification

### ✅ System Health Checks
- [ ] **Health endpoint**: `curl https://your-domain.com/api/health`
- [ ] **Database connectivity**: Check health response includes database: "healthy"
- [ ] **Redis connectivity**: Check health response includes redis: "healthy"
- [ ] **Application startup**: No error logs during startup

### ✅ Seeding Verification
- [ ] **Admin login works**: Login with configured admin credentials
- [ ] **Policies available**: Check admin panel for all 5 policy documents
- [ ] **System settings**: Verify settings in admin configuration
- [ ] **Sample data**: Confirm sample products and customer exist
- [ ] **Compliance rules**: Check that age verification is enforced

### ✅ Security Verification
- [ ] **HTTPS enabled**: All traffic uses SSL/TLS
- [ ] **Headers present**: Security headers in response
- [ ] **Rate limiting active**: Test API rate limits
- [ ] **CORS configured**: Verify CORS allows only your domain
- [ ] **Session security**: Login sessions expire correctly

### ✅ GDPR Compliance Features
- [ ] **Privacy policy displayed**: Accessible to users
- [ ] **Cookie consent**: Cookie policy and consent mechanism
- [ ] **Data access**: Customer can request their data
- [ ] **Marketing opt-in**: Explicit consent required
- [ ] **Data retention**: Configured retention periods

## Troubleshooting Common Issues

### 🔍 Seeding Problems
```bash
# Check if seeding ran
docker-compose logs app | grep "Database seeded"

# Force re-seed
docker-compose exec app npx prisma db seed

# Check admin user exists
docker-compose exec postgres psql -U justsell -d justsell_pos -c "SELECT username, role FROM \"User\" WHERE role = 'ADMIN';"
```

### 🔍 Login Issues
```bash
# Verify admin password hash
echo "Test password against hash"
node -e "
const bcrypt = require('bcryptjs');
const password = 'YourPassword123!';
const hash = 'your-hash-here';
console.log('Password matches:', bcrypt.compareSync(password, hash));
"

# Reset admin password
docker-compose exec app npx prisma db execute --stdin <<< "UPDATE \"User\" SET \"passwordHash\" = 'new-hash' WHERE role = 'ADMIN';"
```

### 🔍 Policy Missing
```bash
# Check policies in database
docker-compose exec postgres psql -U justsell -d justsell_pos -c "SELECT \"policyType\", title, \"isActive\" FROM \"Policy\";"

# Re-run seeding if needed
docker-compose exec app sh -c "SEED_DATABASE=true npx prisma db seed"
```

## Production Monitoring

### 📊 Key Metrics to Monitor
- [ ] **Health endpoint response time** (< 500ms)
- [ ] **Database connection pool usage** (< 80%)
- [ ] **Memory usage** (< 85%)
- [ ] **Error rate** (< 1%)
- [ ] **Age verification compliance rate** (> 99%)

### 🚨 Alerts to Configure
- [ ] Health check failures
- [ ] Database connection issues
- [ ] High error rates
- [ ] Memory/CPU usage spikes
- [ ] Failed login attempts
- [ ] Compliance violations

## Security Maintenance

### 🔄 Regular Tasks
- [ ] **Monthly**: Review audit logs for compliance
- [ ] **Quarterly**: Update dependencies and security patches
- [ ] **Annually**: Review and update policies
- [ ] **As needed**: Rotate JWT secrets and passwords

### 📋 Compliance Auditing
- [ ] Age verification logs complete
- [ ] GDPR data requests handled within 30 days
- [ ] Policy updates communicated to users
- [ ] Backup and recovery tested
- [ ] Staff training on compliance updated

## Success Criteria

✅ **Deployment Successful When:**
- Health checks pass consistently
- Admin can login and access all features
- Sample data is visible in admin panel
- All policies are accessible and properly formatted
- Age verification works for sample products
- Compliance rules are enforced
- GDPR features are functional
- System performance meets targets
- Security headers and protections are active

Your JustSell POS system is now ready for production use with comprehensive legal compliance, GDPR protection, and proper seed data! 🎉