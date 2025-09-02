# JustSell POS - Localhost Setup Guide

## Quick Start (Windows/Mac/Linux)

### Prerequisites
1. **Node.js 20+** - Download from https://nodejs.org/
2. **Docker Desktop** - Download from https://www.docker.com/products/docker-desktop/
3. **Git** (optional) - For cloning the repo

### Step-by-Step Setup

1. **Extract/Copy the Project**
   - Extract the ZIP file to a folder (e.g., `C:\JustSell` or `~/JustSell`)
   - Open terminal/command prompt in that folder

2. **Configure Environment**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env file with your settings (or use defaults for testing)
   ```

3. **Start Database Services**
   ```bash
   # Start PostgreSQL and Redis using Docker
   docker-compose up -d
   
   # Verify containers are running
   docker ps
   ```

4. **Install Dependencies**
   ```bash
   # Install all npm packages
   npm install
   ```

5. **Setup Database**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Run database migrations
   npx prisma migrate dev
   
   # (Optional) Seed with sample data
   npx prisma db seed
   ```

6. **Start the Application**
   ```bash
   # Start development server
   npm run dev
   ```

7. **Access the Application**
   - POS Interface: http://localhost:5173
   - Admin Interface: http://localhost:5173/admin
   - API Documentation: http://localhost:5173/api-docs

### Default Credentials
- **Admin User**: admin@justsell.com / admin123
- **Manager**: manager@justsell.com / manager123
- **Cashier**: cashier@justsell.com / cashier123

### Troubleshooting

**Port Already in Use:**
- Change the port in `vite.config.ts` (default: 5173)
- Or kill the process using the port

**Docker Not Running:**
- Make sure Docker Desktop is running
- On Windows, ensure WSL2 is enabled

**Database Connection Failed:**
- Check if PostgreSQL container is running: `docker ps`
- Verify DATABASE_URL in .env file
- Default: `postgresql://postgres:postgres@localhost:5432/justsell`

**Missing Dependencies:**
- Run `npm install` again
- Clear npm cache: `npm cache clean --force`

### Quick Commands Reference
```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build

# Database
docker-compose up -d # Start databases
docker-compose down  # Stop databases
npx prisma studio    # GUI for database

# Testing
npm run test         # Run all tests
npm run lint         # Check code quality
npm run type-check   # TypeScript validation
```

### Features to Demo
1. **Product Management** - Add/edit products, manage inventory
2. **POS Transaction** - Process sales, multiple payment methods
3. **Age Verification** - ID scanning simulation for tobacco
4. **Loyalty Program** - Customer tiers and rewards
5. **Tax Calculation** - Dynamic state-based tax rates
6. **Receipt Generation** - HTML and thermal printer formats
7. **Audit Logging** - Compliance tracking
8. **QuickBooks Integration** - Accounting sync (requires QB account)

### System Requirements
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: 2GB free space
- **Browser**: Chrome, Firefox, Safari (latest versions)
- **Screen**: 1024x768 minimum (1920x1080 recommended)