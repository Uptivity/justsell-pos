#!/bin/bash

# JustSell POS DigitalOcean Deployment Script
# This script automates the deployment process to DigitalOcean

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="justsell-pos"
REGISTRY_URL="${DOCKER_REGISTRY:-docker.io}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
ENVIRONMENT="${ENVIRONMENT:-production}"

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

# Function to check prerequisites
check_prerequisites() {
    echo "🔍 Checking prerequisites..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    print_status "Docker found"

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    print_status "Docker Compose found"

    # Check environment file
    if [ ! -f ".env.${ENVIRONMENT}" ]; then
        print_error ".env.${ENVIRONMENT} file not found"
        exit 1
    fi
    print_status "Environment file found"

    # Check if logged in to Docker registry
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running"
        exit 1
    fi
    print_status "Docker daemon is running"
}

# Function to build Docker images
build_images() {
    echo "🔨 Building Docker images..."

    # Build application image
    docker build \
        --target runner \
        --tag ${APP_NAME}:${IMAGE_TAG} \
        --tag ${APP_NAME}:latest \
        --build-arg NODE_ENV=${ENVIRONMENT} \
        --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
        --build-arg VCS_REF=$(git rev-parse --short HEAD) \
        .

    print_status "Application image built successfully"
}

# Function to tag and push images
push_images() {
    echo "📤 Pushing images to registry..."

    # Tag for registry
    docker tag ${APP_NAME}:${IMAGE_TAG} ${REGISTRY_URL}/${APP_NAME}:${IMAGE_TAG}
    docker tag ${APP_NAME}:latest ${REGISTRY_URL}/${APP_NAME}:latest

    # Push to registry
    docker push ${REGISTRY_URL}/${APP_NAME}:${IMAGE_TAG}
    docker push ${REGISTRY_URL}/${APP_NAME}:latest

    print_status "Images pushed to registry"
}

# Function to deploy with Docker Compose
deploy_compose() {
    echo "🚀 Deploying with Docker Compose..."

    # Export environment variables
    export DOCKER_IMAGE="${REGISTRY_URL}/${APP_NAME}:${IMAGE_TAG}"

    # Copy environment file
    cp .env.${ENVIRONMENT} .env

    # Pull latest images
    docker-compose pull

    # Stop existing containers
    docker-compose down --remove-orphans

    # Start new containers
    docker-compose up -d

    # Wait for health checks
    echo "⏳ Waiting for services to be healthy..."
    sleep 10

    # Check health status
    if docker-compose ps | grep -q "unhealthy"; then
        print_error "Some services are unhealthy"
        docker-compose logs --tail=50
        exit 1
    fi

    print_status "Services deployed successfully"
}

# Function to run database migrations
run_migrations() {
    echo "🗄️ Running database migrations..."

    # Run migrations in the app container
    docker-compose exec -T app npx prisma migrate deploy

    print_status "Migrations completed successfully"
}

# Function to perform health check
health_check() {
    echo "🏥 Performing health check..."

    # Wait for service to be ready
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost/health &> /dev/null; then
            print_status "Health check passed"

            # Get detailed health status
            curl -s http://localhost/api/health | jq '.'
            return 0
        fi

        echo "  Attempt $attempt/$max_attempts - Service not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done

    print_error "Health check failed after $max_attempts attempts"
    return 1
}

# Function to backup database before deployment
backup_database() {
    echo "💾 Backing up database..."

    local backup_file="backup-$(date +%Y%m%d-%H%M%S).sql"

    # Create backup
    docker-compose exec -T postgres pg_dump \
        -U ${DB_USER:-justsell} \
        -d ${DB_NAME:-justsell_pos} \
        > backups/${backup_file}

    # Compress backup
    gzip backups/${backup_file}

    print_status "Database backed up to backups/${backup_file}.gz"
}

# Function to rollback deployment
rollback() {
    echo "⏪ Rolling back deployment..."

    # Stop current containers
    docker-compose down

    # Restore previous version
    docker tag ${REGISTRY_URL}/${APP_NAME}:previous ${REGISTRY_URL}/${APP_NAME}:${IMAGE_TAG}

    # Start containers with previous version
    docker-compose up -d

    print_status "Rollback completed"
}

# Function to cleanup old images
cleanup() {
    echo "🧹 Cleaning up old images..."

    # Remove dangling images
    docker image prune -f

    # Remove old tagged images (keep last 3)
    docker images ${APP_NAME} --format "{{.Tag}}" | \
        grep -v latest | \
        sort -V | \
        head -n -3 | \
        xargs -I {} docker rmi ${APP_NAME}:{} 2>/dev/null || true

    print_status "Cleanup completed"
}

# Main deployment function
main() {
    echo "🚀 JustSell POS Deployment Script"
    echo "  Environment: ${ENVIRONMENT}"
    echo "  Image Tag: ${IMAGE_TAG}"
    echo ""

    # Check prerequisites
    check_prerequisites

    # Create necessary directories
    mkdir -p backups

    # Backup database (if in production)
    if [ "$ENVIRONMENT" = "production" ]; then
        backup_database
    fi

    # Build images
    build_images

    # Push to registry (optional)
    if [ "$PUSH_TO_REGISTRY" = "true" ]; then
        push_images
    fi

    # Deploy with Docker Compose
    deploy_compose

    # Run migrations
    run_migrations

    # Perform health check
    if health_check; then
        print_status "Deployment completed successfully!"

        # Cleanup old images
        cleanup
    else
        print_error "Deployment failed!"

        # Rollback if health check fails
        if [ "$AUTO_ROLLBACK" = "true" ]; then
            rollback
        fi
        exit 1
    fi
}

# Handle script arguments
case "$1" in
    build)
        build_images
        ;;
    push)
        push_images
        ;;
    deploy)
        deploy_compose
        ;;
    migrate)
        run_migrations
        ;;
    health)
        health_check
        ;;
    backup)
        backup_database
        ;;
    rollback)
        rollback
        ;;
    cleanup)
        cleanup
        ;;
    *)
        main
        ;;
esac