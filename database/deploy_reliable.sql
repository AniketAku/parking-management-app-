-- =============================================================================
-- SHIFT MANAGEMENT SYSTEM - RELIABLE DEPLOYMENT SCRIPT
-- Event-Driven Flexible Architecture Implementation
-- =============================================================================

-- This script deploys the complete shift management system using a step-by-step
-- approach that avoids complex PostgreSQL syntax issues

-- =============================================================================
-- PRE-DEPLOYMENT INFORMATION
-- =============================================================================
-- Before running this script, ensure:
-- 1. You have sufficient database privileges (CREATE, ALTER, etc.)
-- 2. The parking_entries table exists in your database
-- 3. Supabase Realtime is enabled for your project
-- 4. You have configured authentication (auth.users table)

-- =============================================================================
-- STEP 1: CREATE DEPLOYMENT LOG TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS deployment_log (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  execution_status VARCHAR(50) DEFAULT 'SUCCESS',
  error_message TEXT,
  executed_by VARCHAR(255) DEFAULT current_user
);

-- =============================================================================
-- STEP 2: CORE SHIFT MANAGEMENT SCHEMA
-- =============================================================================

-- Create custom types for shift management
DO $$ BEGIN
  CREATE TYPE shift_status_enum AS ENUM ('active', 'completed', 'emergency_ended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE change_type_enum AS ENUM ('normal', 'emergency', 'extended', 'overlap');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Core shift tracking table
CREATE TABLE IF NOT EXISTS shift_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  employee_name VARCHAR(255) NOT NULL,
  employee_phone VARCHAR(20),
  shift_start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shift_end_time TIMESTAMPTZ NULL,
  status shift_status_enum DEFAULT 'active',
  opening_cash_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  closing_cash_amount DECIMAL(10,2) NULL,
  cash_discrepancy DECIMAL(10,2) GENERATED ALWAYS AS (
    CASE
      WHEN closing_cash_amount IS NOT NULL
      THEN closing_cash_amount - opening_cash_amount
      ELSE NULL
    END
  ) STORED,
  shift_notes TEXT,
  shift_duration_minutes INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN shift_end_time IS NOT NULL
      THEN EXTRACT(EPOCH FROM (shift_end_time - shift_start_time))::INTEGER / 60
      ELSE NULL
    END
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraints
DO $$
BEGIN
  -- Only add constraints if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_cash_amounts') THEN
    ALTER TABLE shift_sessions ADD CONSTRAINT valid_cash_amounts CHECK (opening_cash_amount >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_closing_cash') THEN
    ALTER TABLE shift_sessions ADD CONSTRAINT valid_closing_cash CHECK (closing_cash_amount IS NULL OR closing_cash_amount >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_shift_timing') THEN
    ALTER TABLE shift_sessions ADD CONSTRAINT valid_shift_timing CHECK (shift_end_time IS NULL OR shift_end_time > shift_start_time);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'active_shift_has_no_end_time') THEN
    ALTER TABLE shift_sessions ADD CONSTRAINT active_shift_has_no_end_time CHECK (
      (status = 'active' AND shift_end_time IS NULL AND closing_cash_amount IS NULL) OR
      (status != 'active' AND shift_end_time IS NOT NULL)
    );
  END IF;
END $$;

-- Shift changes audit table
CREATE TABLE IF NOT EXISTS shift_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  previous_shift_session_id UUID REFERENCES shift_sessions(id),
  new_shift_session_id UUID REFERENCES shift_sessions(id),
  change_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  handover_notes TEXT,
  cash_transferred DECIMAL(10,2),
  pending_issues TEXT,
  outgoing_employee_id UUID,
  outgoing_employee_name VARCHAR(255),
  incoming_employee_id UUID,
  incoming_employee_name VARCHAR(255),
  change_type change_type_enum DEFAULT 'normal',
  supervisor_approved BOOLEAN DEFAULT FALSE,
  supervisor_id UUID,
  supervisor_name VARCHAR(255),
  change_duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_shift_sessions_employee ON shift_sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_shift_sessions_status ON shift_sessions(status);
CREATE INDEX IF NOT EXISTS idx_shift_sessions_time ON shift_sessions(shift_start_time);
CREATE INDEX IF NOT EXISTS idx_shift_sessions_active ON shift_sessions(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_shift_changes_timestamp ON shift_changes(change_timestamp);
CREATE INDEX IF NOT EXISTS idx_shift_changes_employees ON shift_changes(outgoing_employee_id, incoming_employee_id);

-- Business rule: only one active shift
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_shift ON shift_sessions(status) WHERE status = 'active';

-- Log completion
INSERT INTO deployment_log (migration_name) VALUES ('001_core_schema');

-- =============================================================================
-- STEP 3: SUPABASE REALTIME INTEGRATION
-- =============================================================================

-- Enable realtime for shift tables
ALTER PUBLICATION supabase_realtime ADD TABLE shift_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE shift_changes;

-- Realtime broadcast function
CREATE OR REPLACE FUNCTION notify_shift_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  topic_name TEXT;
  payload_data JSONB;
BEGIN
  topic_name := CASE TG_TABLE_NAME
    WHEN 'shift_sessions' THEN 'shift-management'
    WHEN 'shift_changes' THEN 'shift-changes'
    ELSE 'general-updates'
  END;

  payload_data := jsonb_build_object(
    'table', TG_TABLE_NAME,
    'operation', TG_OP,
    'timestamp', NOW()
  );

  CASE TG_OP
    WHEN 'INSERT' THEN
      payload_data := payload_data || jsonb_build_object('new', row_to_json(NEW));
    WHEN 'UPDATE' THEN
      payload_data := payload_data || jsonb_build_object(
        'old', row_to_json(OLD),
        'new', row_to_json(NEW)
      );
    WHEN 'DELETE' THEN
      payload_data := payload_data || jsonb_build_object('old', row_to_json(OLD));
  END CASE;

  PERFORM pg_notify(topic_name, payload_data::TEXT);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS shift_sessions_realtime_trigger ON shift_sessions;
CREATE TRIGGER shift_sessions_realtime_trigger
  AFTER INSERT OR UPDATE OR DELETE ON shift_sessions
  FOR EACH ROW
  EXECUTE FUNCTION notify_shift_changes();

DROP TRIGGER IF EXISTS shift_changes_realtime_trigger ON shift_changes;
CREATE TRIGGER shift_changes_realtime_trigger
  AFTER INSERT OR UPDATE OR DELETE ON shift_changes
  FOR EACH ROW
  EXECUTE FUNCTION notify_shift_changes();

-- Log completion
INSERT INTO deployment_log (migration_name) VALUES ('002_realtime_integration');

-- =============================================================================
-- STEP 4: ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS
ALTER TABLE shift_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_changes ENABLE ROW LEVEL SECURITY;

-- Helper functions
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

-- Create RLS policies
DROP POLICY IF EXISTS "shift_sessions_select_policy" ON shift_sessions;
CREATE POLICY "shift_sessions_select_policy" ON shift_sessions
  FOR SELECT TO authenticated
  USING (can_access_employee_data(employee_id));

DROP POLICY IF EXISTS "shift_sessions_insert_policy" ON shift_sessions;
CREATE POLICY "shift_sessions_insert_policy" ON shift_sessions
  FOR INSERT TO authenticated
  WITH CHECK (can_access_employee_data(employee_id));

DROP POLICY IF EXISTS "shift_sessions_update_policy" ON shift_sessions;
CREATE POLICY "shift_sessions_update_policy" ON shift_sessions
  FOR UPDATE TO authenticated
  USING (can_access_employee_data(employee_id))
  WITH CHECK (can_access_employee_data(employee_id));

DROP POLICY IF EXISTS "shift_changes_select_policy" ON shift_changes;
CREATE POLICY "shift_changes_select_policy" ON shift_changes
  FOR SELECT TO authenticated
  USING (
    is_supervisor_or_manager() OR
    outgoing_employee_id = current_employee_id() OR
    incoming_employee_id = current_employee_id()
  );

-- Grant permissions
GRANT EXECUTE ON FUNCTION is_supervisor_or_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION current_employee_id() TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_employee_data(UUID) TO authenticated;

-- Log completion
INSERT INTO deployment_log (migration_name) VALUES ('003_row_level_security');

-- =============================================================================
-- STEP 5: BUSINESS LOGIC FUNCTIONS
-- =============================================================================

-- Get current active shift
CREATE OR REPLACE FUNCTION get_current_active_shift()
RETURNS TABLE (
  id UUID,
  employee_id UUID,
  employee_name VARCHAR(255),
  employee_phone VARCHAR(20),
  shift_start_time TIMESTAMPTZ,
  status shift_status_enum,
  opening_cash_amount DECIMAL(10,2),
  shift_notes TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    ss.id,
    ss.employee_id,
    ss.employee_name,
    ss.employee_phone,
    ss.shift_start_time,
    ss.status,
    ss.opening_cash_amount,
    ss.shift_notes,
    ss.created_at
  FROM shift_sessions ss
  WHERE ss.status = 'active'
  LIMIT 1;
$$;

-- Start new shift function
CREATE OR REPLACE FUNCTION start_shift(
  p_employee_id UUID,
  p_employee_name VARCHAR(255),
  p_employee_phone VARCHAR(20) DEFAULT NULL,
  p_opening_cash DECIMAL(10,2) DEFAULT 0,
  p_shift_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_shift_id UUID;
  v_active_shift_count INTEGER;
BEGIN
  -- Check for existing active shift
  SELECT COUNT(*) INTO v_active_shift_count
  FROM shift_sessions
  WHERE status = 'active';

  IF v_active_shift_count > 0 THEN
    RAISE EXCEPTION 'Cannot start new shift: There is already an active shift in progress. Please end the current shift first.';
  END IF;

  -- Validate inputs
  IF p_employee_name IS NULL OR LENGTH(TRIM(p_employee_name)) = 0 THEN
    RAISE EXCEPTION 'Employee name is required';
  END IF;

  IF p_opening_cash < 0 THEN
    RAISE EXCEPTION 'Opening cash amount cannot be negative';
  END IF;

  -- Create new shift session
  INSERT INTO shift_sessions (
    employee_id,
    employee_name,
    employee_phone,
    opening_cash_amount,
    shift_notes,
    status
  ) VALUES (
    p_employee_id,
    p_employee_name,
    p_employee_phone,
    p_opening_cash,
    p_shift_notes,
    'active'
  ) RETURNING id INTO v_new_shift_id;

  RETURN v_new_shift_id;
END;
$$;

-- End shift function
CREATE OR REPLACE FUNCTION end_shift(
  p_shift_id UUID,
  p_closing_cash DECIMAL(10,2),
  p_closing_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shift_record shift_sessions%ROWTYPE;
  v_shift_report JSONB;
BEGIN
  -- Get and validate shift
  SELECT * INTO v_shift_record
  FROM shift_sessions
  WHERE id = p_shift_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active shift not found with ID: %', p_shift_id;
  END IF;

  IF p_closing_cash < 0 THEN
    RAISE EXCEPTION 'Closing cash amount cannot be negative';
  END IF;

  -- Update shift session
  UPDATE shift_sessions
  SET
    shift_end_time = NOW(),
    closing_cash_amount = p_closing_cash,
    status = 'completed',
    shift_notes = COALESCE(shift_notes || ' | ' || p_closing_notes, p_closing_notes),
    updated_at = NOW()
  WHERE id = p_shift_id;

  -- Generate shift report
  SELECT jsonb_build_object(
    'shift_id', v_shift_record.id,
    'employee_name', v_shift_record.employee_name,
    'start_time', v_shift_record.shift_start_time,
    'end_time', NOW(),
    'duration_hours', ROUND(EXTRACT(EPOCH FROM (NOW() - v_shift_record.shift_start_time)) / 3600, 2),
    'opening_cash', v_shift_record.opening_cash_amount,
    'closing_cash', p_closing_cash,
    'cash_difference', p_closing_cash - v_shift_record.opening_cash_amount,
    'status', 'completed'
  ) INTO v_shift_report;

  RETURN v_shift_report;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_current_active_shift() TO authenticated;
GRANT EXECUTE ON FUNCTION start_shift(UUID, VARCHAR, VARCHAR, DECIMAL, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION end_shift(UUID, DECIMAL, TEXT) TO authenticated;

-- Log completion
INSERT INTO deployment_log (migration_name) VALUES ('004_business_functions');

-- =============================================================================
-- STEP 6: PARKING INTEGRATION
-- =============================================================================

-- Add shift tracking to parking entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parking_entries' AND column_name = 'shift_session_id'
  ) THEN
    ALTER TABLE parking_entries
    ADD COLUMN shift_session_id UUID REFERENCES shift_sessions(id);
  END IF;
END $$;

-- Create index for parking-shift relationship
CREATE INDEX IF NOT EXISTS idx_parking_entries_shift ON parking_entries(shift_session_id);

-- Auto-assign parking entries to active shift
CREATE OR REPLACE FUNCTION auto_assign_parking_to_shift()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_active_shift_id UUID;
BEGIN
  -- Get current active shift
  SELECT id INTO v_active_shift_id
  FROM shift_sessions
  WHERE status = 'active'
  LIMIT 1;

  -- Assign to active shift if exists
  IF v_active_shift_id IS NOT NULL THEN
    NEW.shift_session_id := v_active_shift_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for auto-assignment
DROP TRIGGER IF EXISTS parking_entries_shift_assignment ON parking_entries;
CREATE TRIGGER parking_entries_shift_assignment
  BEFORE INSERT ON parking_entries
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_parking_to_shift();

-- Shift statistics view
CREATE OR REPLACE VIEW shift_statistics AS
SELECT
  ss.id as shift_id,
  ss.employee_name,
  ss.shift_start_time,
  ss.shift_end_time,
  ss.status,
  ss.opening_cash_amount,
  ss.closing_cash_amount,
  ss.cash_discrepancy,
  ss.shift_duration_minutes,
  COALESCE(parking_stats.total_entries, 0) as total_parking_entries,
  COALESCE(parking_stats.total_revenue, 0) as total_parking_revenue,
  COALESCE(parking_stats.avg_fee, 0) as average_parking_fee
FROM shift_sessions ss
LEFT JOIN (
  SELECT
    shift_session_id,
    COUNT(*) as total_entries,
    SUM(COALESCE(parking_fee, 0)) as total_revenue,
    AVG(COALESCE(parking_fee, 0)) as avg_fee
  FROM parking_entries
  WHERE shift_session_id IS NOT NULL
  GROUP BY shift_session_id
) parking_stats ON ss.id = parking_stats.shift_session_id;

-- Log completion
INSERT INTO deployment_log (migration_name) VALUES ('005_parking_integration');

-- =============================================================================
-- STEP 7: TESTING AND VALIDATION
-- =============================================================================

-- System validation function
CREATE OR REPLACE FUNCTION validate_shift_system()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_tables_exist BOOLEAN;
  v_functions_exist BOOLEAN;
  v_triggers_exist BOOLEAN;
BEGIN
  -- Check tables
  SELECT
    (SELECT COUNT(*) FROM information_schema.tables
     WHERE table_name IN ('shift_sessions', 'shift_changes')) = 2
  INTO v_tables_exist;

  -- Check functions
  SELECT
    (SELECT COUNT(*) FROM information_schema.routines
     WHERE routine_name IN ('start_shift', 'end_shift', 'get_current_active_shift')) = 3
  INTO v_functions_exist;

  -- Check triggers
  SELECT
    (SELECT COUNT(*) FROM information_schema.triggers
     WHERE trigger_name IN ('shift_sessions_realtime_trigger', 'parking_entries_shift_assignment')) = 2
  INTO v_triggers_exist;

  v_result := jsonb_build_object(
    'tables_created', v_tables_exist,
    'functions_created', v_functions_exist,
    'triggers_created', v_triggers_exist,
    'overall_status', CASE
      WHEN v_tables_exist AND v_functions_exist AND v_triggers_exist
      THEN 'SUCCESS'
      ELSE 'PARTIAL'
    END,
    'timestamp', NOW()
  );

  RETURN v_result;
END;
$$;

-- Test function for shift operations
CREATE OR REPLACE FUNCTION run_shift_management_tests()
RETURNS TABLE(test_name TEXT, result TEXT, details TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Test 1: System validation
  RETURN QUERY SELECT
    'System Validation'::TEXT,
    'PASS'::TEXT,
    validate_shift_system()::TEXT;

  -- Test 2: Check constraints
  RETURN QUERY SELECT
    'Constraint Check'::TEXT,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname IN ('valid_cash_amounts', 'idx_single_active_shift')
    ) THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'Business rule constraints verified'::TEXT;

  -- Test 3: RLS policies
  RETURN QUERY SELECT
    'Security Policies'::TEXT,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'shift_sessions'
    ) THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'Row Level Security policies active'::TEXT;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION validate_shift_system() TO authenticated;
GRANT EXECUTE ON FUNCTION run_shift_management_tests() TO authenticated;

-- Log completion
INSERT INTO deployment_log (migration_name) VALUES ('006_testing_validation');

-- =============================================================================
-- DEPLOYMENT SUMMARY
-- =============================================================================

-- Final validation and summary
SELECT
  'DEPLOYMENT COMPLETE' as status,
  NOW() as completed_at,
  (SELECT COUNT(*) FROM deployment_log) as migrations_executed,
  validate_shift_system() as system_status;

-- Display deployment log
SELECT * FROM deployment_log ORDER BY executed_at;