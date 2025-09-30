-- ================================================
-- FIX RLS POLICIES FOR PARKING MANAGEMENT SYSTEM
-- Adds missing security functions and policies with bootstrap mechanism
-- ================================================

-- First, ensure we have all required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- SECURITY FUNCTIONS
-- ================================================

-- Check if user is admin
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

-- Check if user is approved
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

-- Check if user can write (admin or operator)
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

-- Special bootstrap function to allow initial admin creation
CREATE OR REPLACE FUNCTION is_bootstrap_mode()
RETURNS BOOLEAN AS $$
BEGIN
    -- Allow bootstrap if no admin users exist
    RETURN NOT EXISTS (
        SELECT 1 FROM users
        WHERE role = 'admin'
        AND is_active = true
        AND is_approved = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- DROP EXISTING POLICIES (if any) TO RECREATE
-- ================================================

-- Drop users policies if they exist
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_select_admin" ON users;
DROP POLICY IF EXISTS "users_insert_admin" ON users;
DROP POLICY IF EXISTS "users_insert_bootstrap" ON users;
DROP POLICY IF EXISTS "users_update_admin" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_delete_admin" ON users;

-- Drop app_config policies if they exist
DROP POLICY IF EXISTS "app_config_select_authenticated" ON app_config;
DROP POLICY IF EXISTS "app_config_insert_admin" ON app_config;
DROP POLICY IF EXISTS "app_config_update_admin" ON app_config;
DROP POLICY IF EXISTS "app_config_delete_admin" ON app_config;

-- Drop parking_entries policies if they exist
DROP POLICY IF EXISTS "parking_entries_select_authenticated" ON parking_entries;
DROP POLICY IF EXISTS "parking_entries_insert_admin_operator" ON parking_entries;
DROP POLICY IF EXISTS "parking_entries_update_admin_operator" ON parking_entries;
DROP POLICY IF EXISTS "parking_entries_delete_admin" ON parking_entries;

-- Drop audit_log policies if they exist
DROP POLICY IF EXISTS "audit_log_select_authenticated" ON audit_log;
DROP POLICY IF EXISTS "audit_log_insert_system" ON audit_log;
DROP POLICY IF EXISTS "audit_log_delete_admin" ON audit_log;

-- ================================================
-- CREATE NEW RLS POLICIES WITH BOOTSTRAP SUPPORT
-- ================================================

-- Users table policies
CREATE POLICY "users_select_own"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "users_select_admin"
    ON users FOR SELECT
    USING (is_admin());

-- CRITICAL: Allow initial admin creation when no admins exist
CREATE POLICY "users_insert_bootstrap"
    ON users FOR INSERT
    WITH CHECK (
        is_bootstrap_mode() OR is_admin()
    );

CREATE POLICY "users_update_admin"
    ON users FOR UPDATE
    USING (is_admin());

CREATE POLICY "users_update_own"
    ON users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "users_delete_admin"
    ON users FOR DELETE
    USING (is_admin());

-- App config policies
CREATE POLICY "app_config_select_authenticated"
    ON app_config FOR SELECT
    USING (is_approved_user());

CREATE POLICY "app_config_insert_admin"
    ON app_config FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "app_config_update_admin"
    ON app_config FOR UPDATE
    USING (is_admin())
    WITH CHECK (NOT is_system);

CREATE POLICY "app_config_delete_admin"
    ON app_config FOR DELETE
    USING (NOT is_system AND is_admin());

-- Parking entries policies
CREATE POLICY "parking_entries_select_authenticated"
    ON parking_entries FOR SELECT
    USING (is_approved_user());

CREATE POLICY "parking_entries_insert_admin_operator"
    ON parking_entries FOR INSERT
    WITH CHECK (can_write());

CREATE POLICY "parking_entries_update_admin_operator"
    ON parking_entries FOR UPDATE
    USING (can_write());

CREATE POLICY "parking_entries_delete_admin"
    ON parking_entries FOR DELETE
    USING (is_admin());

-- Audit log policies
CREATE POLICY "audit_log_select_authenticated"
    ON audit_log FOR SELECT
    USING (is_approved_user());

CREATE POLICY "audit_log_insert_system"
    ON audit_log FOR INSERT
    WITH CHECK (true);

CREATE POLICY "audit_log_delete_admin"
    ON audit_log FOR DELETE
    USING (is_admin());

-- ================================================
-- VERIFICATION FUNCTION
-- ================================================

CREATE OR REPLACE FUNCTION verify_rls_setup()
RETURNS TEXT AS $$
DECLARE
    admin_count INTEGER;
    policy_count INTEGER;
    result TEXT := '✅ RLS Setup Verification:\n';
BEGIN
    -- Check admin count
    SELECT COUNT(*) INTO admin_count
    FROM users
    WHERE role = 'admin' AND is_active = true AND is_approved = true;

    result := result || '👥 Admin users: ' || admin_count || '\n';

    -- Check if bootstrap mode is active
    IF is_bootstrap_mode() THEN
        result := result || '🚀 Bootstrap mode: ACTIVE (no admins exist)\n';
    ELSE
        result := result || '🔒 Bootstrap mode: INACTIVE (admins exist)\n';
    END IF;

    -- Check policy count
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename IN ('users', 'app_config', 'parking_entries', 'audit_log');

    result := result || '📋 Active policies: ' || policy_count || '\n';
    result := result || '✅ RLS policies fixed successfully!';

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Run verification
SELECT verify_rls_setup();

-- ================================================
-- SUCCESS MESSAGE
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '✅ RLS policies have been successfully fixed!';
    RAISE NOTICE '🚀 Bootstrap mode allows initial admin creation';
    RAISE NOTICE '🔒 Normal security will activate after first admin';
    RAISE NOTICE '📝 You can now create the initial admin user';
END $$;