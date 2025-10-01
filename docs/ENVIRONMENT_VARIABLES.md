# JustSell POS Environment Variables

Complete list of environment variables needed for deployment. Based on lessons learned from CAOS application deployment.

## 🔴 **CRITICAL - Must Set These First**

### Application Basic Configuration
```bash
# Application Environment
NODE_ENV=production

# Port Configuration (Lesson: Use 3002+ to avoid CAOS CRM on 3001)
PORT=3002
API_PORT=3002

# Domain Configuration
API_URL=https://your-domain.com
FRONTEND_URL=https://your-domain.com
CORS_ORIGIN=https://your-domain.com
```

### Security Keys (Generate These)
```bash
# JWT Secrets (Generate 64+ character strings)
JWT_SECRET="GENERATE_64_CHAR_SECRET_HERE"
JWT_REFRESH_SECRET="GENERATE_DIFFERENT_64_CHAR_SECRET_HERE"
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Session Security
SESSION_SECRET="GENERATE_ANOTHER_64_CHAR_SECRET_HERE"

# Encryption Key (EXACTLY 32 characters)
ENCRYPTION_KEY="GENERATE_EXACTLY_32_CHAR_KEY_HERE"
```

### Database Configuration
```bash
# PostgreSQL Database
DATABASE_URL="postgresql://username:password@hostname:5432/database_name?schema=public&connect_timeout=60"

# Or separate components:
DB_HOST=your-db-host.com
DB_PORT=5432
DB_NAME=justsell_pos
DB_USER=justsell
DB_PASSWORD="STRONG_DATABASE_PASSWORD_HERE"
DB_CONNECTION_POOL_SIZE=20
```

### Redis Configuration
```bash
# Redis Cache
REDIS_URL="redis://default:password@hostname:6379"

# Or separate components:
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD="STRONG_REDIS_PASSWORD_HERE"
REDIS_MAX_RETRIES=3
```

### Admin Account Setup
```bash
# Database Seeding
SEED_DATABASE=true
DEFAULT_ADMIN_USERNAME=admin

# Generate with: node scripts/generate-admin-hash.js "YourPassword123!"
ADMIN_PASSWORD_HASH="$2b$12$GENERATED_BCRYPT_HASH_HERE"
```

## 🟡 **IMPORTANT - Recommended Settings**

### File Upload Configuration
```bash
# File Upload Limits
MAX_FILE_SIZE=5242880  # 5MB in bytes
UPLOAD_DIR=/app/uploads
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf
```

### Logging & Monitoring
```bash
# Logging Configuration
LOG_LEVEL=info
ENABLE_AUDIT_LOG=true
AUDIT_LOG_DIR=/app/logs/audit
LOG_RETENTION_DAYS=2555  # 7 years for compliance
```

### Security Settings
```bash
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Security Configuration
SESSION_TIMEOUT_MINUTES=30
SECURITY_LEVEL=standard
COMPLIANCE_MODE=basic
PCI_COMPLIANCE_MODE=disabled
```

### GDPR & Privacy
```bash
# GDPR Compliance
GDPR_COMPLIANCE_ENABLED=true
DATA_RETENTION_CUSTOMER_DAYS=1095  # 3 years
MARKETING_OPT_IN_REQUIRED=true
```

### Business Configuration
```bash
# Store Configuration
STORE_TIMEZONE=America/Los_Angeles
CURRENCY_CODE=USD

# Features
TAX_CALCULATION_ENABLED=true
AGE_VERIFICATION_REQUIRED=true
LOYALTY_PROGRAM_ENABLED=true
MINIMUM_AGE_TOBACCO=21

# Inventory
LOW_STOCK_THRESHOLD=10
```

## 🟢 **OPTIONAL - Integration Services**

### Email Configuration (Optional)
```bash
# SMTP Settings for notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@your-domain.com
ENABLE_EMAIL_NOTIFICATIONS=false
```

### QuickBooks Integration (Optional)
```bash
# QuickBooks Online Integration
QUICKBOOKS_CLIENT_ID=your-quickbooks-client-id
QUICKBOOKS_CLIENT_SECRET=your-quickbooks-client-secret
QUICKBOOKS_REDIRECT_URI=https://your-domain.com/api/quickbooks/callback
QUICKBOOKS_ENVIRONMENT=production  # or sandbox
QUICKBOOKS_WEBHOOK_TOKEN=your-webhook-token
ENABLE_QUICKBOOKS=false
```

### Monitoring & Analytics (Optional)
```bash
# Error Tracking
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Performance Monitoring
NEW_RELIC_LICENSE_KEY=your-new-relic-key
DATADOG_API_KEY=your-datadog-key

# Feature Flag
ENABLE_MONITORING=false
```

### Backup Configuration (Optional)
```bash
# Automated Backups
BACKUP_ENABLED=true
BACKUP_SCHEDULE="0 3 * * *"  # Daily at 3 AM
BACKUP_RETENTION_DAYS=30
BACKUP_FREQUENCY_HOURS=24

# AWS S3 for Backups (if using)
BACKUP_S3_BUCKET=your-backup-bucket
BACKUP_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
```

### Hardware Integration (Optional)
```bash
# Receipt Printer
RECEIPT_PRINTER_TYPE=THERMAL  # THERMAL, LASER, or NONE

# ID Scanner
ID_SCAN_ENABLED=false
ID_SCANNER_TYPE=manual  # manual, camera, or hardware
```

## 🛠️ **How to Generate Required Values**

### 1. Generate Strong Secrets
```bash
# Generate JWT secrets (64+ characters)
openssl rand -base64 64

# Generate encryption key (exactly 32 characters)
openssl rand -base64 24

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64').slice(0,32))"
```

### 2. Generate Admin Password Hash
```bash
# Use the provided script
node scripts/generate-admin-hash.js "YourSecurePassword123!"

# This will output a bcrypt hash like:
# $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewbh6lrWHN6OsZOu
```

### 3. Database URL Format
```bash
# PostgreSQL URL format
postgresql://username:password@hostname:port/database?schema=public&connect_timeout=60

# Examples:
# Local: postgresql://justsell:password@localhost:5432/justsell_pos
# DigitalOcean: postgresql://doadmin:password@db-postgresql-nyc3-12345-do-user-12345.b.db.ondigitalocean.com:25060/defaultdb
```

### 4. Redis URL Format
```bash
# Redis URL format
redis://default:password@hostname:port

# Examples:
# Local: redis://default:password@localhost:6379
# DigitalOcean: redis://default:password@redis-cluster-12345-do-user-12345.b.db.ondigitalocean.com:25061
```

## 📋 **Environment File Templates**

### Production `.env` Template
```bash
# Copy this template and fill in your values

# === CRITICAL SETTINGS ===
NODE_ENV=production
PORT=3002
API_PORT=3002
API_URL=https://your-domain.com
FRONTEND_URL=https://your-domain.com
CORS_ORIGIN=https://your-domain.com

# === SECURITY KEYS ===
JWT_SECRET="PASTE_YOUR_64_CHAR_SECRET_HERE"
JWT_REFRESH_SECRET="PASTE_YOUR_DIFFERENT_64_CHAR_SECRET_HERE"
SESSION_SECRET="PASTE_YOUR_SESSION_SECRET_HERE"
ENCRYPTION_KEY="PASTE_YOUR_32_CHAR_KEY_HERE"

# === DATABASE ===
DATABASE_URL="postgresql://username:password@hostname:5432/database"
REDIS_URL="redis://default:password@hostname:6379"

# === ADMIN ACCOUNT ===
ADMIN_PASSWORD_HASH="PASTE_BCRYPT_HASH_FROM_SCRIPT"
SEED_DATABASE=true

# === FEATURES ===
GDPR_COMPLIANCE_ENABLED=true
AGE_VERIFICATION_REQUIRED=true
LOYALTY_PROGRAM_ENABLED=true
```

### DigitalOcean App Platform Template
For DigitalOcean App Platform, set these as environment variables in the dashboard:
- Set sensitive values (passwords, secrets) as "SECRET" type
- Set configuration values as "GENERAL" type
- Database and Redis URLs are auto-generated by managed services

## 🚨 **Security Notes**

### Never Commit These to Git:
- `.env` files with real values
- Database passwords
- API keys and secrets
- JWT secrets
- Encryption keys

### Use Environment Variables For:
- All passwords and secrets
- API endpoints and URLs
- Feature flags
- Service configurations

### Password Security:
- Use strong passwords (12+ characters, mixed case, numbers, symbols)
- Use different passwords for each service
- Rotate passwords regularly
- Use a password manager

## 🔍 **Validation Checklist**

Before deployment, verify:
- [ ] All CRITICAL variables are set
- [ ] JWT secrets are 64+ characters long
- [ ] Encryption key is exactly 32 characters
- [ ] Database connection string is correct
- [ ] Admin password hash is generated properly
- [ ] CORS origin matches your domain
- [ ] Port is set to 3002 (not 3001 - CAOS CRM conflict)
- [ ] All passwords are strong and unique

## 🆘 **Troubleshooting**

### Common Issues:
1. **Port 3001 already in use**: CAOS CRM uses this port, use 3002+
2. **Database connection failed**: Check DATABASE_URL format and credentials
3. **JWT errors**: Ensure secrets are long enough (64+ characters)
4. **Admin login fails**: Verify ADMIN_PASSWORD_HASH was generated correctly
5. **HTTPS issues**: Need Cloudflare Origin Certificate for Full (strict) mode

### Debug Commands:
```bash
# Test environment variables
docker-compose exec app env | grep -E "(NODE_ENV|DATABASE_URL|JWT_SECRET)"

# Test database connection
docker-compose exec app npx prisma db pull

# Check logs (Lesson #5: Check logs immediately)
docker logs justsell-app --tail=50 -f
```

Use this list to gather all your keys and configure your deployment! 🚀