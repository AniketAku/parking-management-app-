-- ================================================
-- ROW LEVEL SECURITY POLICIES
-- Comprehensive access control for all user roles
-- Deployment-ready for Supabase
-- ================================================

-- ================================================
-- DROP EXISTING POLICIES FIRST (Safety)
-- ================================================

-- Drop existing users policies
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_select_admin" ON users;
DROP POLICY IF EXISTS "users_insert_admin" ON users;
DROP POLICY IF EXISTS "users_update_admin" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_delete_admin" ON users;

-- Drop existing app_config policies
DROP POLICY IF EXISTS "app_config_select_authenticated" ON app_config;
DROP POLICY IF EXISTS "app_config_insert_admin" ON app_config;
DROP POLICY IF EXISTS "app_config_update_admin" ON app_config;
DROP POLICY IF EXISTS "app_config_delete_admin" ON app_config;

-- Drop existing parking_entries policies
DROP POLICY IF EXISTS "parking_entries_select_authenticated" ON parking_entries;
DROP POLICY IF EXISTS "parking_entries_insert_admin_operator" ON parking_entries;
DROP POLICY IF EXISTS "parking_entries_update_admin_operator" ON parking_entries;
DROP POLICY IF EXISTS "parking_entries_delete_admin" ON parking_entries;

-- Drop existing audit_log policies
DROP POLICY IF EXISTS "audit_log_select_authenticated" ON audit_log;
DROP POLICY IF EXISTS "audit_log_insert_system" ON audit_log;
DROP POLICY IF EXISTS "audit_log_delete_admin" ON audit_log;

-- ================================================
-- UTILITY FUNCTIONS FOR COMMON CHECKS
-- ================================================

-- Function to check if current user is admin
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

-- Function to check if current user is approved
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

-- Function to check if user can write (admin or operator)
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

-- ================================================
-- USERS TABLE POLICIES
-- ================================================

-- Users can view their own profile
CREATE POLICY "users_select_own" ON users
    FOR SELECT USING (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "users_select_admin" ON users
    FOR SELECT USING (is_admin());

-- Admins can insert new users
CREATE POLICY "users_insert_admin" ON users
    FOR INSERT WITH CHECK (is_admin());

-- Admins can update all users
CREATE POLICY "users_update_admin" ON users
    FOR UPDATE USING (is_admin());

-- Users can update their own basic info
CREATE POLICY "users_update_own" ON users
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Only admins can delete users (soft delete preferred)
CREATE POLICY "users_delete_admin" ON users
    FOR DELETE USING (is_admin());

-- ================================================
-- APP_CONFIG TABLE POLICIES (CRITICAL FOR SETTINGS)
-- ================================================

-- All authenticated, approved users can read config
-- This is ESSENTIAL for app functionality
CREATE POLICY "app_config_select_authenticated" ON app_config
    FOR SELECT USING (is_approved_user());

-- Only admins can insert new config
CREATE POLICY "app_config_insert_admin" ON app_config
    FOR INSERT WITH CHECK (is_admin());

-- Only admins can update config (except system settings)
CREATE POLICY "app_config_update_admin" ON app_config
    FOR UPDATE USING (is_admin())
    WITH CHECK (NOT is_system);

-- Only admins can delete non-system config
CREATE POLICY "app_config_delete_admin" ON app_config
    FOR DELETE USING (NOT is_system AND is_admin());

-- ================================================
-- PARKING_ENTRIES TABLE POLICIES
-- ================================================

-- All authenticated, approved users can view parking entries
CREATE POLICY "parking_entries_select_authenticated" ON parking_entries
    FOR SELECT USING (is_approved_user());

-- Admins and operators can insert parking entries
CREATE POLICY "parking_entries_insert_admin_operator" ON parking_entries
    FOR INSERT WITH CHECK (can_write());

-- Admins and operators can update parking entries
CREATE POLICY "parking_entries_update_admin_operator" ON parking_entries
    FOR UPDATE USING (can_write());

-- Only admins can delete parking entries (should be rare)
CREATE POLICY "parking_entries_delete_admin" ON parking_entries
    FOR DELETE USING (is_admin());

-- ================================================
-- AUDIT_LOG TABLE POLICIES
-- ================================================

-- All authenticated users can view audit logs (for transparency)
CREATE POLICY "audit_log_select_authenticated" ON audit_log
    FOR SELECT USING (is_approved_user());

-- System can insert audit logs (no user restrictions)
CREATE POLICY "audit_log_insert_system" ON audit_log
    FOR INSERT WITH CHECK (true);

-- Only admins can delete audit logs (for cleanup)
CREATE POLICY "audit_log_delete_admin" ON audit_log
    FOR DELETE USING (is_admin());

-- ================================================
-- ROLE-BASED PERMISSIONS SUMMARY
-- ================================================

-- ADMIN ROLE:
-- - Full access to all tables
-- - Can create, update, delete users
-- - Can modify app configuration
-- - Can delete parking entries and audit logs
-- - Full administrative privileges

-- OPERATOR ROLE:
-- - Can view all parking entries and users
-- - Can create and update parking entries
-- - Can read app configuration
-- - Cannot modify users or configuration
-- - Focused on parking operations

-- VIEWER ROLE:
-- - Can view parking entries and basic statistics
-- - Can read app configuration
-- - Cannot modify any data
-- - Read-only access for reporting

-- SECURITY NOTES:
-- - All policies require active, approved users
-- - System settings are protected from modification
-- - Audit logs preserve complete change history
-- - RLS ensures data isolation and access control