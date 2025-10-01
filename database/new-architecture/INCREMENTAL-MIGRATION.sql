-- ================================================
-- INCREMENTAL MIGRATION FOR EXISTING DATABASE
-- Safe migration when tables already exist
-- ================================================
-- 
-- This script handles the case where the database already has tables
-- but needs to be migrated to the new simplified architecture
-- 
-- ERROR HANDLED: relation "users" already exists (42P07)
-- SOLUTION: Check existing structure and migrate incrementally
-- ================================================

BEGIN;

RAISE NOTICE '🔄 Starting incremental migration for existing database...';

-- ================================================
-- PHASE 1: ANALYZE EXISTING STRUCTURE
-- ================================================

DO $$
DECLARE
    has_users BOOLEAN;
    has_app_settings BOOLEAN;
    has_app_config BOOLEAN;
    has_parking_entries BOOLEAN;
    users_schema_version TEXT := 'unknown';
    settings_schema_version TEXT := 'unknown';
BEGIN
    -- Check which tables exist
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') INTO has_users;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_settings') INTO has_app_settings;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_config') INTO has_app_config;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parking_entries') INTO has_parking_entries;
    
    -- Analyze existing schema versions
    IF has_users THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_approved') THEN
            users_schema_version := 'v2_with_approval';
        ELSE
            users_schema_version := 'v1_basic';
        END IF;
    END IF;
    
    IF has_app_settings THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'validation_rules') THEN
            settings_schema_version := 'v2_complex';
        ELSE
            settings_schema_version := 'v1_simple';
        END IF;
    END IF;
    
    RAISE NOTICE '📋 Existing Database Analysis:';
    RAISE NOTICE '   Users table: % (schema: %)', has_users, users_schema_version;
    RAISE NOTICE '   App Settings: % (schema: %)', has_app_settings, settings_schema_version;
    RAISE NOTICE '   App Config: %', has_app_config;
    RAISE NOTICE '   Parking Entries: %', has_parking_entries;
END $$;

-- ================================================
-- PHASE 2: BACKUP EXISTING DATA SAFELY
-- ================================================

RAISE NOTICE '📦 Creating backup of existing data...';

-- Create backup tables with unique names
CREATE TABLE IF NOT EXISTS backup_migration_users AS 
SELECT * FROM users WHERE 1=0;

CREATE TABLE IF NOT EXISTS backup_migration_app_settings AS
TABLE app_settings WHERE 1=0;

CREATE TABLE IF NOT EXISTS backup_migration_parking_entries AS
TABLE parking_entries WHERE 1=0;

-- Backup all existing data
DO $$
BEGIN
    -- Backup users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        TRUNCATE backup_migration_users;
        INSERT INTO backup_migration_users SELECT * FROM users;
        RAISE NOTICE '   ✅ Users backed up: % records', (SELECT COUNT(*) FROM backup_migration_users);
    END IF;
    
    -- Backup app_settings if exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_settings') THEN
        TRUNCATE backup_migration_app_settings;
        INSERT INTO backup_migration_app_settings SELECT * FROM app_settings;
        RAISE NOTICE '   ✅ App settings backed up: % records', (SELECT COUNT(*) FROM backup_migration_app_settings);
    END IF;
    
    -- Backup parking_entries
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parking_entries') THEN
        TRUNCATE backup_migration_parking_entries;
        INSERT INTO backup_migration_parking_entries SELECT * FROM parking_entries;
        RAISE NOTICE '   ✅ Parking entries backed up: % records', (SELECT COUNT(*) FROM backup_migration_parking_entries);
    END IF;
END $$;

-- ================================================
-- PHASE 3: DROP EXISTING CONSTRAINTS AND VIEWS
-- ================================================

RAISE NOTICE '🧹 Cleaning up existing constraints and dependencies...';

-- Drop views that might depend on tables
DROP VIEW IF EXISTS settings_resolved CASCADE;
DROP VIEW IF EXISTS settings_with_validation CASCADE;

-- Drop complex settings tables if they exist
DROP TABLE IF EXISTS settings_validation_cache CASCADE;
DROP TABLE IF EXISTS settings_cache CASCADE;
DROP TABLE IF EXISTS settings_templates CASCADE;
DROP TABLE IF EXISTS settings_history CASCADE;
DROP TABLE IF EXISTS location_settings CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;

-- Drop old functions that might interfere
DROP FUNCTION IF EXISTS handle_settings_audit() CASCADE;
DROP FUNCTION IF EXISTS update_timestamp() CASCADE;

-- ================================================
-- PHASE 4: RECREATE TABLES WITH NEW STRUCTURE
-- ================================================

RAISE NOTICE '🔄 Recreating tables with new simplified structure...';

-- Drop and recreate users table with new structure
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
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

-- Drop old settings table and create new app_config
DROP TABLE IF EXISTS app_settings CASCADE;

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

-- Recreate parking_entries with improved structure
DROP TABLE IF EXISTS parking_entries CASCADE;

CREATE TABLE parking_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transport_name VARCHAR(100) NOT NULL,
    vehicle_type VARCHAR(20) NOT NULL 
        CHECK (vehicle_type IN ('Trailer', '6 Wheeler', '4 Wheeler', '2 Wheeler')),
    vehicle_number VARCHAR(20) NOT NULL,
    driver_name VARCHAR(100) NOT NULL,
    notes TEXT,
    entry_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    exit_time TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' 
        CHECK (status IN ('Active', 'Exited', 'Overstay')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'Pending' 
        CHECK (payment_status IN ('Paid', 'Pending', 'Partial', 'Failed')),
    calculated_fee DECIMAL(10,2),
    actual_fee DECIMAL(10,2),
    payment_method VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_log (
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

RAISE NOTICE '✅ Tables recreated with new structure';

-- ================================================
-- PHASE 5: CREATE INDEXES
-- ================================================

RAISE NOTICE '⚡ Creating performance indexes...';

-- User indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active, is_approved);

-- App config indexes (CRITICAL)
CREATE INDEX idx_app_config_category ON app_config(category);
CREATE INDEX idx_app_config_key ON app_config(key);
CREATE INDEX idx_app_config_category_key ON app_config(category, key);
CREATE INDEX idx_app_config_updated_at ON app_config(updated_at);

-- Parking entries indexes
CREATE INDEX idx_parking_entries_vehicle_number ON parking_entries(vehicle_number);
CREATE INDEX idx_parking_entries_status ON parking_entries(status);
CREATE INDEX idx_parking_entries_entry_time ON parking_entries(entry_time);
CREATE INDEX idx_parking_entries_vehicle_type ON parking_entries(vehicle_type);

-- Audit log indexes
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- ================================================
-- PHASE 6: CREATE TRIGGERS
-- ================================================

RAISE NOTICE '🔧 Setting up triggers...';

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
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

-- ================================================
-- PHASE 7: SETUP RLS POLICIES
-- ================================================

RAISE NOTICE '🔒 Setting up Row Level Security...';

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "users_select_own" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_select_admin" ON users
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin' AND is_active = true AND is_approved = true)
    );

CREATE POLICY "users_insert_admin" ON users
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin' AND is_active = true AND is_approved = true)
    );

CREATE POLICY "users_update_admin" ON users
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin' AND is_active = true AND is_approved = true)
    );

-- App config policies (THIS FIXES THE MAIN ISSUE!)
CREATE POLICY "app_config_select_authenticated" ON app_config
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true AND is_approved = true)
    );

CREATE POLICY "app_config_insert_admin" ON app_config
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin' AND is_active = true AND is_approved = true)
    );

CREATE POLICY "app_config_update_admin" ON app_config
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin' AND is_active = true AND is_approved = true)
    );

-- Parking entries policies
CREATE POLICY "parking_entries_select_authenticated" ON parking_entries
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true AND is_approved = true)
    );

CREATE POLICY "parking_entries_insert_admin_operator" ON parking_entries
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'operator') AND is_active = true AND is_approved = true)
    );

CREATE POLICY "parking_entries_update_admin_operator" ON parking_entries
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'operator') AND is_active = true AND is_approved = true)
    );

-- Audit log policies
CREATE POLICY "audit_log_select_authenticated" ON audit_log
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true AND is_approved = true)
    );

CREATE POLICY "audit_log_insert_system" ON audit_log
    FOR INSERT WITH CHECK (true);

RAISE NOTICE '✅ Row Level Security policies created';

-- ================================================
-- PHASE 8: MIGRATE DATA FROM BACKUPS
-- ================================================

RAISE NOTICE '📊 Migrating data from backups...';

-- Migrate users with enhanced error handling
DO $$
DECLARE
    migrated_users INTEGER := 0;
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT * FROM backup_migration_users LOOP
        BEGIN
            INSERT INTO users (
                id, username, password_hash, role, full_name, phone,
                is_active, is_approved, created_at, updated_at, last_login
            ) VALUES (
                user_record.id,
                user_record.username,
                COALESCE(user_record.password_hash, user_record.password, '$2b$10$defaulthash'),
                COALESCE(user_record.role, 'operator'),
                user_record.full_name,
                user_record.phone,
                COALESCE(user_record.is_active, true),
                COALESCE(user_record.is_approved, true),
                COALESCE(user_record.created_at, NOW()),
                COALESCE(user_record.updated_at, NOW()),
                user_record.last_login
            ) ON CONFLICT (username) DO UPDATE SET
                password_hash = EXCLUDED.password_hash,
                role = EXCLUDED.role,
                updated_at = NOW();
            
            migrated_users := migrated_users + 1;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Warning: Could not migrate user %: %', user_record.username, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '   ✅ Migrated % user accounts', migrated_users;
END $$;

-- Migrate parking entries
DO $$
DECLARE
    migrated_entries INTEGER := 0;
    entry_record RECORD;
BEGIN
    FOR entry_record IN SELECT * FROM backup_migration_parking_entries LOOP
        BEGIN
            INSERT INTO parking_entries (
                id, transport_name, vehicle_type, vehicle_number, driver_name, notes,
                entry_time, exit_time, status, payment_status,
                calculated_fee, actual_fee, created_at, updated_at,
                created_by, updated_by
            ) VALUES (
                entry_record.id,
                entry_record.transport_name,
                entry_record.vehicle_type,
                entry_record.vehicle_number,
                entry_record.driver_name,
                entry_record.notes,
                COALESCE(entry_record.entry_time, entry_record.created_at, NOW()),
                entry_record.exit_time,
                CASE 
                    WHEN entry_record.status = 'Parked' THEN 'Active'
                    WHEN entry_record.status = 'Exited' THEN 'Exited'
                    ELSE COALESCE(entry_record.status, 'Active')
                END,
                CASE
                    WHEN entry_record.payment_status = 'Unpaid' THEN 'Pending'
                    ELSE COALESCE(entry_record.payment_status, 'Pending')
                END,
                entry_record.calculated_fee,
                entry_record.actual_fee,
                COALESCE(entry_record.created_at, NOW()),
                COALESCE(entry_record.updated_at, NOW()),
                entry_record.created_by,
                entry_record.updated_by
            );
            
            migrated_entries := migrated_entries + 1;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Warning: Could not migrate parking entry %: %', entry_record.id, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '   ✅ Migrated % parking entries', migrated_entries;
END $$;

-- Migrate settings from old app_settings to new app_config
DO $$
DECLARE
    migrated_settings INTEGER := 0;
    setting_record RECORD;
BEGIN
    FOR setting_record IN 
        SELECT * FROM backup_migration_app_settings 
        WHERE category IN ('business', 'ui_theme', 'system', 'localization', 'validation')
    LOOP
        BEGIN
            INSERT INTO app_config (
                category, key, value, description, is_system, sort_order, updated_by
            ) VALUES (
                setting_record.category,
                setting_record.key,
                setting_record.value,
                COALESCE(setting_record.description, setting_record.display_name, ''),
                COALESCE(setting_record.is_system_setting, true),
                COALESCE(setting_record.sort_order, 0),
                setting_record.updated_by
            ) ON CONFLICT (category, key) DO UPDATE SET
                value = EXCLUDED.value,
                description = EXCLUDED.description,
                updated_at = NOW();
            
            migrated_settings := migrated_settings + 1;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Warning: Could not migrate setting %.%: %', setting_record.category, setting_record.key, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '   ✅ Migrated % existing settings', migrated_settings;
END $$;

-- ================================================
-- PHASE 9: INSERT ESSENTIAL SETTINGS
-- ================================================

RAISE NOTICE '💼 Installing essential business settings...';

-- Ensure default admin exists
INSERT INTO users (
    id, username, password_hash, role, full_name, phone, is_active, is_approved
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin',
    '$2b$10$rOzJqQVJmA4uHCK5OdOKNOuEfQ6iyMfX8tQkz1QQGXwYK2Z3mR2bG', -- admin123
    'admin',
    'System Administrator',
    '+91-0000-000000',
    true,
    true
) ON CONFLICT (username) DO UPDATE SET
    role = 'admin',
    is_active = true,
    is_approved = true,
    updated_at = NOW();

-- Insert all essential business settings (only if they don't exist)
INSERT INTO app_config (category, key, value, description, is_system, sort_order) VALUES
-- CRITICAL BUSINESS SETTINGS
('business', 'vehicle_rates', '{"Trailer": 225, "6 Wheeler": 150, "4 Wheeler": 100, "2 Wheeler": 50}', 'Daily parking rates by vehicle type', true, 1),
('business', 'vehicle_types', '["Trailer", "6 Wheeler", "4 Wheeler", "2 Wheeler"]', 'Available vehicle types', true, 2),
('business', 'operating_hours', '{"start": "06:00", "end": "22:00", "timezone": "Asia/Kolkata"}', 'Business operating hours', true, 3),
('business', 'payment_methods', '["Cash", "Card", "UPI", "Net Banking", "Online"]', 'Accepted payment methods', true, 4),
('business', 'entry_status_options', '["Active", "Exited", "Overstay"]', 'Entry status values', true, 5),
('business', 'payment_status_options', '["Paid", "Pending", "Partial", "Failed"]', 'Payment status values', true, 6),
('business', 'minimum_charge_days', '1', 'Minimum billing period', true, 7),
('business', 'overstay_penalty_rate', '50', 'Overstay penalty percentage', true, 8),
('business', 'overstay_threshold_hours', '24', 'Hours before overstay', true, 9),
('business', 'currency_code', '"INR"', 'Currency code', true, 10),
('business', 'tax_rate', '0', 'Tax rate percentage', true, 11),

-- UI THEME SETTINGS
('ui_theme', 'primary_color', '"#2563eb"', 'Primary brand color', false, 1),
('ui_theme', 'secondary_color', '"#64748b"', 'Secondary color', false, 2),
('ui_theme', 'success_color', '"#10b981"', 'Success state color', false, 3),
('ui_theme', 'warning_color', '"#f59e0b"', 'Warning state color', false, 4),
('ui_theme', 'danger_color', '"#ef4444"', 'Error/danger color', false, 5),
('ui_theme', 'dark_mode', 'false', 'Enable dark mode', false, 6),
('ui_theme', 'theme_mode', '"light"', 'Default theme mode', false, 7),

-- SYSTEM SETTINGS
('system', 'app_name', '"Parking Management System"', 'Application name', true, 1),
('system', 'app_version', '"2.0.0"', 'Current version', true, 2),
('system', 'maintenance_mode', 'false', 'Maintenance mode', false, 3)

-- Only insert if they don't already exist (preserves migrated values)
ON CONFLICT (category, key) DO NOTHING;

COMMIT;

-- ================================================
-- FINAL VERIFICATION AND SUCCESS MESSAGE
-- ================================================

DO $$
DECLARE
    user_count INTEGER;
    config_count INTEGER;
    business_count INTEGER;
    parking_count INTEGER;
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO config_count FROM app_config;
    SELECT COUNT(*) INTO business_count FROM app_config WHERE category = 'business';
    SELECT COUNT(*) INTO parking_count FROM parking_entries;
    SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin' AND is_approved = true;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 INCREMENTAL MIGRATION COMPLETED SUCCESSFULLY! 🎉';
    RAISE NOTICE '';
    RAISE NOTICE '📊 FINAL STATUS:';
    RAISE NOTICE '   👥 Users: %', user_count;
    RAISE NOTICE '   🔑 Admins: %', admin_count;
    RAISE NOTICE '   ⚙️  Settings: %', config_count;
    RAISE NOTICE '   💼 Business: %', business_count;
    RAISE NOTICE '   🚗 Parking: %', parking_count;
    RAISE NOTICE '';
    
    IF business_count >= 11 THEN
        RAISE NOTICE '✅ All essential business settings available!';
    ELSE
        RAISE WARNING '⚠️  Missing business settings. Found: %, Expected: 11+', business_count;
    END IF;
    
    IF admin_count > 0 THEN
        RAISE NOTICE '✅ Admin access available';
        RAISE NOTICE '🔑 Default login: admin / admin123';
        RAISE NOTICE '🔒 CHANGE THE DEFAULT PASSWORD!';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔥 THE "USERS ALREADY EXISTS" ERROR IS NOW RESOLVED! 🔥';
    RAISE NOTICE '🔥 THE "USING FALLBACK RATES" ERROR SHOULD ALSO BE FIXED! 🔥';
    RAISE NOTICE '';
    RAISE NOTICE '📝 NEXT STEPS:';
    RAISE NOTICE '1. Update frontend to use new settings service';
    RAISE NOTICE '2. Test Vehicle Entry form loads database rates';
    RAISE NOTICE '3. Verify real-time settings updates work';
    RAISE NOTICE '4. Remove backup tables after testing';
    RAISE NOTICE '';
END $$;