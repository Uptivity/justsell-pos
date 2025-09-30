-- Database initialization script for JustSell POS
-- This script runs on first container startup

-- Create extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set default encoding
SET client_encoding = 'UTF8';

-- Create schemas if needed
CREATE SCHEMA IF NOT EXISTS public;

-- Grant permissions
GRANT ALL ON SCHEMA public TO PUBLIC;
GRANT ALL ON SCHEMA public TO postgres;

-- Set search path
ALTER DATABASE justsell_pos SET search_path TO public;

-- Create audit log table if it doesn't exist (backup for offline logs)
CREATE TABLE IF NOT EXISTS audit_logs_backup (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    resource VARCHAR(50),
    resource_id VARCHAR(255),
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs_backup(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs_backup(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs_backup(action);

-- Create function for updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create database backup function
CREATE OR REPLACE FUNCTION backup_database()
RETURNS void AS $$
BEGIN
    EXECUTE format('COPY (SELECT * FROM pg_dump_snapshot()) TO ''/backups/backup_%s.sql''', to_char(NOW(), 'YYYYMMDD_HH24MISS'));
END;
$$ LANGUAGE plpgsql;

-- Set up performance configurations
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

-- Log configurations for debugging (can be adjusted in production)
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = on;
ALTER SYSTEM SET log_min_duration_statement = 100; -- Log queries taking more than 100ms

-- Connection settings
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET idle_in_transaction_session_timeout = '30min';

-- Apply configuration changes
SELECT pg_reload_conf();