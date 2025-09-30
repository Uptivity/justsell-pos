#!/bin/sh

# Database Migration Script for JustSell POS
# This script ensures database is ready and migrations are applied

set -e

echo "🔄 Starting database migration process..."

# Function to check if database is ready
wait_for_db() {
    echo "⏳ Waiting for database to be ready..."
    max_attempts=30
    attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if npx prisma db push --skip-generate 2>/dev/null; then
            echo "✅ Database is ready!"
            return 0
        fi

        attempt=$((attempt + 1))
        echo "   Attempt $attempt/$max_attempts - Database not ready yet..."
        sleep 2
    done

    echo "❌ Database connection timeout after $max_attempts attempts"
    exit 1
}

# Function to run migrations
run_migrations() {
    echo "📦 Running database migrations..."

    # Generate Prisma client
    echo "   Generating Prisma client..."
    npx prisma generate

    # Run migrations in production
    if [ "$NODE_ENV" = "production" ]; then
        echo "   Deploying production migrations..."
        npx prisma migrate deploy
    else
        echo "   Running development migrations..."
        npx prisma migrate dev --name auto-migration
    fi

    echo "✅ Migrations completed successfully!"
}

# Function to seed initial data
seed_database() {
    echo "🌱 Checking if seeding is needed..."

    # Check if database has any data (look for admin user)
    user_count=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM \"User\" WHERE role = 'ADMIN';" 2>/dev/null | grep -o '[0-9]*' | tail -1 || echo "0")

    if [ "$user_count" = "0" ] || [ "$SEED_DATABASE" = "true" ]; then
        echo "   Database appears empty or seeding forced. Seeding with initial data..."
        npx prisma db seed
        echo "✅ Database seeded successfully!"
        echo "   📋 Seeded data includes:"
        echo "      • GDPR Compliance Policy"
        echo "      • Privacy Policy & Terms of Service"
        echo "      • Cookie Policy & Age Verification Policy"
        echo "      • System settings and configurations"
        echo "      • Compliance rules for multiple jurisdictions"
        echo "      • Notification templates"
        echo "      • Sample products and customer data"
        echo "      • Default admin user account"
    else
        echo "   Database already has data. Skipping seeding."
        echo "   Set SEED_DATABASE=true to force re-seeding"
    fi
}

# Main execution
main() {
    echo "🚀 JustSell POS Database Migration"
    echo "   Environment: $NODE_ENV"
    echo "   Database URL: ${DATABASE_URL%@*}@***" # Hide password in logs

    # Wait for database
    wait_for_db

    # Run migrations
    run_migrations

    # Seed if needed
    seed_database

    echo "🎉 Database setup completed successfully!"
    echo ""
}

# Run main function
main

# Start the application after migrations
echo "🚀 Starting JustSell POS application..."
exec "$@"