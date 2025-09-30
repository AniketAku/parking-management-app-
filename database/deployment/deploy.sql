-- ================================================
-- PARKING MANAGEMENT SYSTEM - MASTER DEPLOYMENT SCRIPT
-- Complete database setup for Supabase deployment
-- ================================================

-- This script deploys the complete parking management system database
-- Run this on a fresh Supabase project to set up all tables, policies, and data

BEGIN;

-- ================================================
-- DEPLOYMENT INFORMATION
-- ================================================

-- Application: Parking Management System v2.0
-- Database: PostgreSQL 13+ (Supabase)
-- Features: RLS Security, Real-time Updates, Audit Logging
-- Deployment Date: Current timestamp

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Starting Parking Management System deployment...';
    RAISE NOTICE '📅 Deployment Time: %', NOW();
    RAISE NOTICE '🔧 Database Version: %', version();
    RAISE NOTICE '';
END $$;

-- ================================================
-- STEP 1: CREATE UNIFIED DATABASE SCHEMA
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '📊 Step 1: Creating database schema...';
END $$;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table with clear roles and proper structure
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- bcrypt hash
    role VARCHAR(20) NOT NULL DEFAULT 'operator'
        CHECK (role IN ('admin', 'operator', 'viewer')),
    full_name VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_approved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- Unified settings table
CREATE TABLE app_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    UNIQUE(category, key)
);

-- Core parking business data with reconciled fields
CREATE TABLE parking_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial INTEGER GENERATED ALWAYS AS IDENTITY,
    transport_name VARCHAR(100) NOT NULL,
    vehicle_type VARCHAR(20) NOT NULL
        CHECK (vehicle_type IN ('Trailer', '6 Wheeler', '4 Wheeler', '2 Wheeler')),
    vehicle_number VARCHAR(20) NOT NULL,
    driver_name VARCHAR(100) NOT NULL,
    driver_phone VARCHAR(20),
    notes TEXT,
    entry_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    exit_time TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'Active'
        CHECK (status IN ('Active', 'Exited', 'Overstay')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'Pending'
        CHECK (payment_status IN ('Paid', 'Pending', 'Partial', 'Failed')),
    parking_fee DECIMAL(10,2),
    payment_type VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    last_modified TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log for change tracking
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(10) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Create all indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active, is_approved);
CREATE INDEX idx_app_config_category ON app_config(category);
CREATE INDEX idx_app_config_key ON app_config(key);
CREATE INDEX idx_app_config_category_key ON app_config(category, key);
CREATE INDEX idx_app_config_updated_at ON app_config(updated_at);
CREATE INDEX idx_parking_entries_serial ON parking_entries(serial);
CREATE INDEX idx_parking_entries_vehicle_number ON parking_entries(vehicle_number);
CREATE INDEX idx_parking_entries_status ON parking_entries(status);
CREATE INDEX idx_parking_entries_payment_status ON parking_entries(payment_status);
CREATE INDEX idx_parking_entries_entry_time ON parking_entries(entry_time);
CREATE INDEX idx_parking_entries_vehicle_type ON parking_entries(vehicle_type);
CREATE INDEX idx_parking_entries_transport_name ON parking_entries(transport_name);
CREATE INDEX idx_parking_entries_created_at ON parking_entries(created_at);
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- Create timestamp update function and triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    IF TG_TABLE_NAME = 'parking_entries' THEN
        NEW.last_modified = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_config_updated_at
    BEFORE UPDATE ON app_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parking_entries_updated_at
    BEFORE UPDATE ON parking_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    RAISE NOTICE '✅ Step 1 completed: Database schema created successfully';
END $$;

-- ================================================
-- STEP 2: CREATE ACCESS POLICIES
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '🔒 Step 2: Setting up Row Level Security policies...';
END $$;

-- Create utility functions
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'admin'
        AND is_active = true
        AND is_approved = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_approved_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND is_active = true
        AND is_approved = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_write()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role IN ('admin', 'operator')
        AND is_active = true
        AND is_approved = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users table policies
CREATE POLICY "users_select_own" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_select_admin" ON users FOR SELECT USING (is_admin());
CREATE POLICY "users_insert_admin" ON users FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "users_update_admin" ON users FOR UPDATE USING (is_admin());
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "users_delete_admin" ON users FOR DELETE USING (is_admin());

-- App config policies
CREATE POLICY "app_config_select_authenticated" ON app_config FOR SELECT USING (is_approved_user());
CREATE POLICY "app_config_insert_admin" ON app_config FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "app_config_update_admin" ON app_config FOR UPDATE USING (is_admin()) WITH CHECK (NOT is_system);
CREATE POLICY "app_config_delete_admin" ON app_config FOR DELETE USING (NOT is_system AND is_admin());

-- Parking entries policies
CREATE POLICY "parking_entries_select_authenticated" ON parking_entries FOR SELECT USING (is_approved_user());
CREATE POLICY "parking_entries_insert_admin_operator" ON parking_entries FOR INSERT WITH CHECK (can_write());
CREATE POLICY "parking_entries_update_admin_operator" ON parking_entries FOR UPDATE USING (can_write());
CREATE POLICY "parking_entries_delete_admin" ON parking_entries FOR DELETE USING (is_admin());

-- Audit log policies
CREATE POLICY "audit_log_select_authenticated" ON audit_log FOR SELECT USING (is_approved_user());
CREATE POLICY "audit_log_insert_system" ON audit_log FOR INSERT WITH CHECK (true);
CREATE POLICY "audit_log_delete_admin" ON audit_log FOR DELETE USING (is_admin());

DO $$
BEGIN
    RAISE NOTICE '✅ Step 2 completed: Access policies configured successfully';
END $$;

-- ================================================
-- STEP 3: SEED ESSENTIAL DATA
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '🌱 Step 3: Seeding essential data...';
END $$;

-- Create default admin user
INSERT INTO users (
    username, password_hash, role, full_name, phone, is_active, is_approved, created_at
) VALUES (
    'admin',
    '$2b$10$8K8zjf6Vm4pRGYPgFEgkdub0D6J9lOyOqq2O0Hxy7qYGvVP5mzIWm',
    'admin', 'System Administrator', '+91-9999999999', true, true, NOW()
) ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash, role = EXCLUDED.role,
    full_name = EXCLUDED.full_name, phone = EXCLUDED.phone,
    is_active = EXCLUDED.is_active, is_approved = EXCLUDED.is_approved, updated_at = NOW();

-- Business settings
INSERT INTO app_config (category, key, value, description, is_system, sort_order) VALUES
('business', 'vehicle_rates', '{"Trailer": 225, "6 Wheeler": 150, "4 Wheeler": 100, "2 Wheeler": 50}', 'Daily parking rates by vehicle type in rupees', true, 1),
('business', 'vehicle_types', '["Trailer", "6 Wheeler", "4 Wheeler", "2 Wheeler"]', 'Available vehicle types for parking', true, 2),
('business', 'operating_hours', '{"start": "06:00", "end": "22:00", "timezone": "Asia/Kolkata"}', 'Business operating hours', true, 3),
('business', 'payment_methods', '["Cash", "Card", "UPI", "Net Banking", "Online"]', 'Accepted payment methods', true, 4),
('business', 'entry_status_options', '["Active", "Exited", "Overstay"]', 'Available entry status values', true, 5),
('business', 'payment_status_options', '["Paid", "Pending", "Partial", "Failed"]', 'Available payment status values', true, 6),
('business', 'minimum_charge_days', '1', 'Minimum billing period in days', true, 7),
('business', 'overstay_penalty_rate', '50', 'Additional charge for overstay (percentage)', true, 8),
('business', 'overstay_threshold_hours', '24', 'Hours before vehicle is considered overstay', true, 9),
('business', 'currency_code', '"INR"', 'Currency code for pricing', true, 10),
('business', 'tax_rate', '0', 'Tax rate percentage (if applicable)', true, 11),

-- UI theme settings
('ui_theme', 'primary_color', '"#2563eb"', 'Primary brand color', false, 1),
('ui_theme', 'secondary_color', '"#64748b"', 'Secondary color', false, 2),
('ui_theme', 'success_color', '"#10b981"', 'Success state color', false, 3),
('ui_theme', 'warning_color', '"#f59e0b"', 'Warning state color', false, 4),
('ui_theme', 'danger_color', '"#ef4444"', 'Error/danger color', false, 5),
('ui_theme', 'dark_mode', 'false', 'Enable dark mode by default', false, 6),
('ui_theme', 'theme_mode', '"light"', 'Default theme mode (light/dark/auto)', false, 7),

-- Localization settings
('localization', 'currency_symbol', '"₹"', 'Currency symbol for display', true, 1),
('localization', 'currency_code', '"INR"', 'ISO currency code', true, 2),
('localization', 'locale', '"en-IN"', 'Default locale for formatting', true, 3),
('localization', 'time_format', '"24h"', 'Time format (12h/24h)', false, 4),
('localization', 'timezone', '"Asia/Kolkata"', 'Default timezone', true, 5),
('localization', 'date_format', '"DD/MM/YYYY"', 'Date display format', false, 6),

-- System settings
('system', 'app_name', '"Parking Management System"', 'Application name', true, 1),
('system', 'app_version', '"2.0.0"', 'Current application version', true, 2),
('system', 'max_parking_duration_hours', '72', 'Maximum allowed parking duration', false, 3),
('system', 'auto_exit_enabled', 'false', 'Automatically mark vehicles as exited', false, 4),
('system', 'backup_retention_days', '30', 'Days to retain backup data', true, 5),
('system', 'maintenance_mode', 'false', 'Enable maintenance mode', false, 6),
('system', 'real_time_enabled', 'true', 'Enable real-time updates', false, 7)

ON CONFLICT (category, key) DO UPDATE SET
    value = EXCLUDED.value, description = EXCLUDED.description, updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE '✅ Step 3 completed: Essential data seeded successfully';
END $$;

-- ================================================
-- DEPLOYMENT COMPLETION
-- ================================================

DO $$
DECLARE
    user_count INTEGER;
    config_count INTEGER;
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO config_count FROM app_config;
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE schemaname = 'public';

    RAISE NOTICE '';
    RAISE NOTICE '🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Deployment Summary:';
    RAISE NOTICE '   ✅ Users created: %', user_count;
    RAISE NOTICE '   ✅ Configuration items: %', config_count;
    RAISE NOTICE '   ✅ Security policies: %', policy_count;
    RAISE NOTICE '   ✅ Tables created: 4 (users, app_config, parking_entries, audit_log)';
    RAISE NOTICE '   ✅ Indexes created: 16';
    RAISE NOTICE '   ✅ RLS enabled on all tables';
    RAISE NOTICE '';
    RAISE NOTICE '🔐 Default Login Credentials:';
    RAISE NOTICE '   Username: admin';
    RAISE NOTICE '   Password: admin123';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT SECURITY NOTES:';
    RAISE NOTICE '   🔴 Change the default admin password immediately!';
    RAISE NOTICE '   🔴 Review and approve all user accounts';
    RAISE NOTICE '   🔴 Verify RLS policies are working correctly';
    RAISE NOTICE '   🔴 Update environment variables in your application';
    RAISE NOTICE '';
    RAISE NOTICE '📖 Next Steps:';
    RAISE NOTICE '   1. Test database connection from your application';
    RAISE NOTICE '   2. Update VITE_SUPABASE_URL in your .env.local';
    RAISE NOTICE '   3. Update VITE_SUPABASE_ANON_KEY with your project key';
    RAISE NOTICE '   4. Set VITE_DISABLE_REALTIME=false to enable real-time updates';
    RAISE NOTICE '   5. Run application tests to verify functionality';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Your Parking Management System is ready to use!';
    RAISE NOTICE '';
END $$;

COMMIT;

-- ================================================
-- END OF DEPLOYMENT SCRIPT
-- ================================================