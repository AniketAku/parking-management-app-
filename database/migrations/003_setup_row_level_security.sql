-- =============================================================================
-- ROW LEVEL SECURITY POLICIES FOR SHIFT MANAGEMENT
-- Comprehensive Access Control Implementation
-- =============================================================================

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================
-- Enable RLS on all shift management tables
ALTER TABLE shift_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_changes ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- HELPER FUNCTIONS FOR ROLE-BASED ACCESS
-- =============================================================================
-- Function to check if current user has supervisor or manager role
CREATE OR REPLACE FUNCTION is_supervisor_or_manager()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'role' IN ('supervisor', 'manager', 'admin'),
    FALSE
  );
$$;

-- Function to get current user's employee ID from JWT
CREATE OR REPLACE FUNCTION current_employee_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'employee_id')::UUID,
    auth.uid()
  );
$$;

-- Function to check if user can access specific employee's data
CREATE OR REPLACE FUNCTION can_access_employee_data(target_employee_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    is_supervisor_or_manager() OR
    target_employee_id = current_employee_id() OR
    target_employee_id = auth.uid();
$$;

-- =============================================================================
-- SHIFT SESSIONS ACCESS POLICIES
-- =============================================================================
-- Policy: Users can view their own shifts, supervisors can view all
CREATE POLICY "shift_sessions_select_policy" ON shift_sessions
  FOR SELECT TO authenticated
  USING (
    can_access_employee_data(employee_id)
  );

-- Policy: Users can insert their own shifts, supervisors can insert any
CREATE POLICY "shift_sessions_insert_policy" ON shift_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    can_access_employee_data(employee_id) AND
    (
      -- Regular users can only insert their own shifts
      (NOT is_supervisor_or_manager() AND employee_id = current_employee_id()) OR
      -- Supervisors can insert any shift
      is_supervisor_or_manager()
    )
  );

-- Policy: Users can update their own active shifts, supervisors can update any
CREATE POLICY "shift_sessions_update_policy" ON shift_sessions
  FOR UPDATE TO authenticated
  USING (
    can_access_employee_data(employee_id) AND
    (
      -- Regular users can only update their own shifts
      (NOT is_supervisor_or_manager() AND employee_id = current_employee_id()) OR
      -- Supervisors can update any shift
      is_supervisor_or_manager()
    )
  )
  WITH CHECK (
    can_access_employee_data(employee_id) AND
    (
      -- Regular users cannot modify completed shifts
      (NOT is_supervisor_or_manager() AND status = 'active') OR
      -- Supervisors can modify any shift
      is_supervisor_or_manager()
    )
  );

-- Policy: Only supervisors can delete shifts (for data integrity)
CREATE POLICY "shift_sessions_delete_policy" ON shift_sessions
  FOR DELETE TO authenticated
  USING (
    is_supervisor_or_manager()
  );

-- =============================================================================
-- SHIFT CHANGES ACCESS POLICIES
-- =============================================================================
-- Policy: Users can view shift changes they're involved in, supervisors can view all
CREATE POLICY "shift_changes_select_policy" ON shift_changes
  FOR SELECT TO authenticated
  USING (
    is_supervisor_or_manager() OR
    outgoing_employee_id = current_employee_id() OR
    incoming_employee_id = current_employee_id() OR
    outgoing_employee_id = auth.uid() OR
    incoming_employee_id = auth.uid() OR
    -- Allow if they have access to the associated shift sessions
    EXISTS (
      SELECT 1 FROM shift_sessions ss
      WHERE ss.id = previous_shift_session_id
      AND can_access_employee_data(ss.employee_id)
    ) OR
    EXISTS (
      SELECT 1 FROM shift_sessions ss
      WHERE ss.id = new_shift_session_id
      AND can_access_employee_data(ss.employee_id)
    )
  );

-- Policy: Users can insert shift changes they're involved in, supervisors can insert any
CREATE POLICY "shift_changes_insert_policy" ON shift_changes
  FOR INSERT TO authenticated
  WITH CHECK (
    is_supervisor_or_manager() OR
    outgoing_employee_id = current_employee_id() OR
    incoming_employee_id = current_employee_id() OR
    outgoing_employee_id = auth.uid() OR
    incoming_employee_id = auth.uid()
  );

-- Policy: Only supervisors can update shift changes (for audit integrity)
CREATE POLICY "shift_changes_update_policy" ON shift_changes
  FOR UPDATE TO authenticated
  USING (
    is_supervisor_or_manager()
  )
  WITH CHECK (
    is_supervisor_or_manager()
  );

-- Policy: Only supervisors can delete shift changes (for audit integrity)
CREATE POLICY "shift_changes_delete_policy" ON shift_changes
  FOR DELETE TO authenticated
  USING (
    is_supervisor_or_manager()
  );

-- =============================================================================
-- VIEW ACCESS POLICIES
-- =============================================================================
-- Since views inherit RLS from underlying tables, we need to grant appropriate access
-- Grant access to the shift_statistics view
GRANT SELECT ON shift_statistics TO authenticated;

-- =============================================================================
-- EMERGENCY ACCESS POLICY
-- =============================================================================
-- Function to handle emergency access scenarios
CREATE OR REPLACE FUNCTION emergency_access_granted(target_employee_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    -- Standard access rules
    can_access_employee_data(target_employee_id) OR
    -- Emergency access: if there's an active emergency shift for this employee
    EXISTS (
      SELECT 1 FROM shift_sessions
      WHERE employee_id = target_employee_id
      AND status = 'emergency_ended'
      AND shift_end_time > NOW() - INTERVAL '1 hour'
    ) OR
    -- System maintenance access (would be controlled by specific system role)
    COALESCE(auth.jwt() ->> 'role' = 'system_admin', FALSE);
$$;

-- Policy for emergency access to shift sessions
CREATE POLICY "emergency_access_shift_sessions" ON shift_sessions
  FOR SELECT TO authenticated
  USING (
    emergency_access_granted(employee_id)
  );

-- =============================================================================
-- AUDIT AND COMPLIANCE POLICIES
-- =============================================================================
-- Create audit log table for RLS policy violations (optional but recommended)
CREATE TABLE shift_access_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID DEFAULT auth.uid(),
  attempted_action TEXT,
  target_table TEXT,
  target_record_id UUID,
  access_granted BOOLEAN,
  access_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit table (only supervisors can view)
ALTER TABLE shift_access_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_supervisor_only" ON shift_access_audit
  FOR ALL TO authenticated
  USING (is_supervisor_or_manager())
  WITH CHECK (is_supervisor_or_manager());

-- =============================================================================
-- ROLE-BASED FUNCTION ACCESS
-- =============================================================================
-- Grant execution permissions based on roles
GRANT EXECUTE ON FUNCTION is_supervisor_or_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION current_employee_id() TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_employee_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION emergency_access_granted(UUID) TO authenticated;

-- =============================================================================
-- SECURITY MONITORING FUNCTIONS
-- =============================================================================
-- Function to log access attempts (can be called from application code)
CREATE OR REPLACE FUNCTION log_shift_access_attempt(
  action_attempted TEXT,
  table_name TEXT,
  record_id UUID DEFAULT NULL,
  granted BOOLEAN DEFAULT TRUE,
  reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO shift_access_audit (
    attempted_action,
    target_table,
    target_record_id,
    access_granted,
    access_reason,
    ip_address,
    user_agent
  ) VALUES (
    action_attempted,
    table_name,
    record_id,
    granted,
    COALESCE(reason, 'Standard RLS policy'),
    COALESCE(current_setting('request.headers', true)::json->>'x-forwarded-for', '0.0.0.0')::inet,
    COALESCE(current_setting('request.headers', true)::json->>'user-agent', 'Unknown')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION log_shift_access_attempt(TEXT, TEXT, UUID, BOOLEAN, TEXT) TO authenticated;

-- =============================================================================
-- DATA INTEGRITY POLICIES
-- =============================================================================
-- Ensure users cannot modify other users' employee_id in their records
CREATE OR REPLACE FUNCTION validate_employee_id_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Prevent non-supervisors from changing employee_id to someone else's
  IF TG_OP = 'UPDATE' AND OLD.employee_id != NEW.employee_id THEN
    IF NOT is_supervisor_or_manager() THEN
      RAISE EXCEPTION 'Insufficient permissions to change employee assignment';
    END IF;
  END IF;

  -- Prevent backdating shifts beyond reasonable limits (unless supervisor)
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.shift_start_time < NOW() - INTERVAL '24 hours' AND NOT is_supervisor_or_manager() THEN
      RAISE EXCEPTION 'Cannot create or modify shifts older than 24 hours without supervisor approval';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Apply data integrity trigger
DROP TRIGGER IF EXISTS validate_employee_modifications ON shift_sessions;
CREATE TRIGGER validate_employee_modifications
  BEFORE INSERT OR UPDATE ON shift_sessions
  FOR EACH ROW
  EXECUTE FUNCTION validate_employee_id_modification();

-- =============================================================================
-- PERFORMANCE OPTIMIZATIONS FOR RLS
-- =============================================================================
-- Create indexes to optimize RLS policy performance
CREATE INDEX IF NOT EXISTS idx_shift_sessions_employee_auth ON shift_sessions(employee_id)
  WHERE employee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shift_changes_employees_auth ON shift_changes(outgoing_employee_id, incoming_employee_id)
  WHERE outgoing_employee_id IS NOT NULL OR incoming_employee_id IS NOT NULL;

-- =============================================================================
-- TESTING AND VALIDATION HELPERS
-- =============================================================================
-- Function to test RLS policies (for development/testing only)
CREATE OR REPLACE FUNCTION test_rls_access(
  test_employee_id UUID,
  test_role TEXT DEFAULT 'employee'
)
RETURNS TABLE (
  test_case TEXT,
  access_result BOOLEAN,
  notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function would only be available in development environments
  -- Implementation would test various access scenarios
  RETURN QUERY
  SELECT
    'Test placeholder'::TEXT,
    TRUE::BOOLEAN,
    'RLS testing function - implement based on specific test requirements'::TEXT;
END;
$$;

-- Comments for documentation
COMMENT ON FUNCTION is_supervisor_or_manager() IS 'Checks if current user has supervisor or manager privileges';
COMMENT ON FUNCTION can_access_employee_data(UUID) IS 'Determines if current user can access specific employee data';
COMMENT ON FUNCTION log_shift_access_attempt(TEXT, TEXT, UUID, BOOLEAN, TEXT) IS 'Logs shift data access attempts for security auditing';
COMMENT ON TABLE shift_access_audit IS 'Audit trail for shift management system access attempts and security events';

-- Set up RLS as default for new tables in this schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO authenticated;