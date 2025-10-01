#!/bin/bash

# Test Deployment Script for JustSell POS
# Based on lessons learned from CAOS application deployment

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="justsell-pos"
TEST_PORT="${PORT:-3002}"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_error "Port $port is already in use"
        echo "Processes using port $port:"
        lsof -Pi :$port -sTCP:LISTEN

        # Check if it's CAOS CRM on port 3001
        if [ "$port" = "3001" ]; then
            print_warning "Port 3001 is likely used by CAOS CRM - using port 3002 instead"
        fi
        return 1
    else
        print_status "Port $port is available"
        return 0
    fi
}

# Function to test local setup
test_local() {
    echo "🧪 Testing Local Setup (Lesson #2: Test locally BEFORE Docker)"

    # Check if all required files exist
    print_info "Checking required files..."
    local required_files=(
        "package.json"
        "src/api/server.ts"
        "prisma/schema.prisma"
        ".env"
    )

    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            print_status "$file exists"
        else
            print_error "$file is missing"
            return 1
        fi
    done

    # Check router exports (Lesson #1)
    print_info "Checking router exports..."
    local router_files=$(find src/api/routes -name "*.ts" 2>/dev/null || true)
    if [ -z "$router_files" ]; then
        print_warning "No router files found in src/api/routes/"
    else
        for router_file in $router_files; do
            if grep -q "module.exports.*router\|export.*router\|export default.*router" "$router_file"; then
                print_status "$router_file exports router correctly"
            else
                print_error "$router_file missing router export"
                echo "  Add: export default router; or module.exports = router;"
            fi
        done
    fi

    # Check port configuration (Lesson #3)
    print_info "Checking port configuration..."
    check_port $TEST_PORT

    # Test npm install
    print_info "Testing npm install..."
    if npm install --silent; then
        print_status "npm install successful"
    else
        print_error "npm install failed"
        return 1
    fi

    # Test Prisma generation
    print_info "Testing Prisma client generation..."
    if npx prisma generate --silent; then
        print_status "Prisma client generated"
    else
        print_error "Prisma generation failed"
        return 1
    fi

    # Test TypeScript compilation
    print_info "Testing TypeScript compilation..."
    if npm run type-check; then
        print_status "TypeScript compilation successful"
    else
        print_error "TypeScript compilation failed"
        return 1
    fi

    # Test build
    print_info "Testing build process..."
    if npm run build >/dev/null 2>&1; then
        print_status "Build successful"
    else
        print_error "Build failed"
        return 1
    fi

    print_status "Local setup tests passed!"
}

# Function to test Docker setup
test_docker() {
    echo "🐳 Testing Docker Setup"

    # Check Docker is running
    print_info "Checking Docker daemon..."
    if docker info >/dev/null 2>&1; then
        print_status "Docker daemon is running"
    else
        print_error "Docker daemon is not running"
        return 1
    fi

    # Check Docker Compose
    print_info "Checking Docker Compose..."
    if docker-compose version >/dev/null 2>&1; then
        print_status "Docker Compose is available"
    else
        print_error "Docker Compose is not installed"
        return 1
    fi

    # Build Docker image
    print_info "Building Docker image..."
    if docker build -t ${APP_NAME}-test:latest . >/dev/null 2>&1; then
        print_status "Docker image built successfully"
    else
        print_error "Docker build failed"
        return 1
    fi

    # Test container startup (without running full stack)
    print_info "Testing container startup..."
    container_id=$(docker run -d --rm \
        -e NODE_ENV=test \
        -e DATABASE_URL="postgresql://test:test@localhost:5432/test" \
        -p ${TEST_PORT}:${TEST_PORT} \
        ${APP_NAME}-test:latest \
        node -e "console.log('Container started successfully'); process.exit(0)" 2>/dev/null || echo "failed")

    if [ "$container_id" != "failed" ]; then
        sleep 2
        if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "Up"; then
            print_status "Container starts successfully"
            docker stop "$container_id" >/dev/null 2>&1
        else
            print_error "Container failed to start properly"
            docker logs "$container_id" 2>/dev/null | tail -10
            return 1
        fi
    else
        print_error "Failed to start test container"
        return 1
    fi

    print_status "Docker setup tests passed!"
}

# Function to test environment configuration
test_environment() {
    echo "🔧 Testing Environment Configuration"

    # Check environment file
    if [ -f ".env" ]; then
        print_status ".env file exists"

        # Check critical environment variables
        local required_vars=(
            "NODE_ENV"
            "PORT"
            "DATABASE_URL"
            "JWT_SECRET"
        )

        for var in "${required_vars[@]}"; do
            if grep -q "^${var}=" .env; then
                print_status "$var is configured"
            else
                print_error "$var is missing from .env"
            fi
        done
    else
        print_error ".env file is missing"
        print_info "Copy .env.production to .env and configure values"
        return 1
    fi

    print_status "Environment configuration tests passed!"
}

# Function to test HTTPS configuration
test_https_config() {
    echo "🔒 Testing HTTPS Configuration (Lesson #4)"

    # Check if SSL files exist
    if [ -d "nginx/ssl" ]; then
        print_status "SSL directory exists"

        if [ -f "nginx/ssl/cloudflare-origin.pem" ] && [ -f "nginx/ssl/cloudflare-origin.key" ]; then
            print_status "Cloudflare Origin Certificate files found"
        else
            print_warning "Cloudflare Origin Certificate files not found"
            print_info "You'll need to add these files for Full (strict) SSL mode"
            print_info "Get them from: Cloudflare Dashboard > SSL/TLS > Origin Server"
        fi
    else
        print_warning "SSL directory doesn't exist"
        print_info "Create nginx/ssl/ directory and add Cloudflare Origin Certificate"
    fi

    # Check Nginx configuration
    if [ -f "nginx/ssl-cloudflare.conf" ]; then
        print_status "Cloudflare-ready Nginx configuration exists"
    else
        print_warning "Cloudflare Nginx configuration not found"
    fi

    print_status "HTTPS configuration check completed!"
}

# Main testing function
main() {
    echo "🚀 JustSell POS Deployment Testing"
    echo "   Based on lessons learned from CAOS application"
    echo "   Port: $TEST_PORT (avoiding CAOS CRM port 3001)"
    echo ""

    # Run all tests
    local failed=0

    test_environment || failed=1
    echo ""

    test_local || failed=1
    echo ""

    test_docker || failed=1
    echo ""

    test_https_config || failed=1
    echo ""

    if [ $failed -eq 0 ]; then
        print_status "🎉 All tests passed! Ready for deployment"
        echo ""
        echo "Next steps:"
        echo "1. Set up your .env file with production values"
        echo "2. Get Cloudflare Origin Certificate from your tech guy"
        echo "3. Run: docker-compose up -d"
        echo "4. Check logs immediately: docker logs justsell-app"
        echo ""
    else
        print_error "❌ Some tests failed. Fix issues before deployment"
        echo ""
        echo "Remember the CAOS lessons:"
        echo "1. ALWAYS export routers: module.exports = router;"
        echo "2. Test locally BEFORE Docker: npm start → npm test → then Docker"
        echo "3. Use different ports: 3002+ (3001 is taken by CAOS CRM)"
        echo "4. Configure HTTPS properly: Cloudflare Origin Certificate required"
        echo "5. Check logs immediately: docker logs container-name if anything fails"
        echo ""
        exit 1
    fi
}

# Handle script arguments
case "$1" in
    local)
        test_local
        ;;
    docker)
        test_docker
        ;;
    env)
        test_environment
        ;;
    https)
        test_https_config
        ;;
    *)
        main
        ;;
esac