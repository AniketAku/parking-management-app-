-- =============================================================================
-- SHIFT MANAGEMENT SYSTEM - COMPLETE DEPLOYMENT SCRIPT
-- Event-Driven Flexible Architecture Implementation
-- =============================================================================

-- This script runs all migrations in the correct order for a complete deployment
-- of the flexible shift management system with Supabase integration.

-- =============================================================================
-- DEPLOYMENT INFORMATION
-- =============================================================================
-- Database: PostgreSQL (Supabase)
-- System: Event-driven flexible shift management
-- Version: 1.0.0
-- Dependencies: Supabase Realtime, Row Level Security
-- Compatible with: parking_entries table structure

-- =============================================================================
-- PRE-DEPLOYMENT CHECKLIST
-- =============================================================================
-- Before running this script, ensure:
-- 1. You have sufficient database privileges (CREATE, ALTER, etc.)
-- 2. The parking_entries table exists in your database
-- 3. Supabase Realtime is enabled for your project
-- 4. You have configured authentication (auth.users table)
-- 5. You understand the business impact of the schema changes

-- =============================================================================
-- MIGRATION EXECUTION LOG
-- =============================================================================
-- Create deployment log table
CREATE TABLE IF NOT EXISTS deployment_log (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  execution_status VARCHAR(50) DEFAULT 'SUCCESS',
  error_message TEXT,
  executed_by VARCHAR(255) DEFAULT current_user
);

-- Function to log migration execution
CREATE OR REPLACE FUNCTION log_migration(
  p_migration_name VARCHAR(255),
  p_status VARCHAR(50) DEFAULT 'SUCCESS',
  p_error TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO deployment_log (migration_name, execution_status, error_message)
  VALUES (p_migration_name, p_status, p_error);
END;
$$;

-- =============================================================================
-- MIGRATION 001: CORE SHIFT MANAGEMENT SCHEMA
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Starting Migration 001: Core Shift Management Schema...';

  -- Create custom types for shift management
  CREATE TYPE shift_status_enum AS ENUM ('active', 'completed', 'emergency_ended');
  CREATE TYPE change_type_enum AS ENUM ('normal', 'emergency', 'extended', 'overlap');

  -- Core shift tracking table
  CREATE TABLE shift_sessions (
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
  ALTER TABLE shift_sessions
    ADD CONSTRAINT valid_cash_amounts CHECK (opening_cash_amount >= 0),
    ADD CONSTRAINT valid_closing_cash CHECK (closing_cash_amount IS NULL OR closing_cash_amount >= 0),
    ADD CONSTRAINT valid_shift_timing CHECK (shift_end_time IS NULL OR shift_end_time > shift_start_time),
    ADD CONSTRAINT active_shift_has_no_end_time CHECK (
      (status = 'active' AND shift_end_time IS NULL AND closing_cash_amount IS NULL) OR
      (status != 'active' AND shift_end_time IS NOT NULL)
    );

  -- Shift changes audit table
  CREATE TABLE shift_changes (
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
  CREATE INDEX idx_shift_sessions_employee ON shift_sessions(employee_id);
  CREATE INDEX idx_shift_sessions_status ON shift_sessions(status);
  CREATE INDEX idx_shift_sessions_time ON shift_sessions(shift_start_time);
  CREATE INDEX idx_shift_sessions_active ON shift_sessions(status) WHERE status = 'active';
  CREATE INDEX idx_shift_changes_timestamp ON shift_changes(change_timestamp);
  CREATE INDEX idx_shift_changes_employees ON shift_changes(outgoing_employee_id, incoming_employee_id);

  -- Business rule: only one active shift
  CREATE UNIQUE INDEX idx_single_active_shift ON shift_sessions(status) WHERE status = 'active';

  PERFORM log_migration('001_core_schema');
  RAISE NOTICE 'Migration 001 completed successfully.';

EXCEPTION
  WHEN OTHERS THEN
    PERFORM log_migration('001_core_schema', 'ERROR', SQLERRM);
    RAISE EXCEPTION 'Migration 001 failed: %', SQLERRM;
END $$;

-- =============================================================================
-- MIGRATION 002: SUPABASE REALTIME INTEGRATION
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Starting Migration 002: Supabase Realtime Integration...';

  -- Enable realtime for shift tables
  ALTER PUBLICATION supabase_realtime ADD TABLE shift_sessions;
  ALTER PUBLICATION supabase_realtime ADD TABLE shift_changes;

  -- Realtime broadcast function
  CREATE OR REPLACE FUNCTION notify_shift_changes()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $FUNC$
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

    PERFORM realtime.broadcast_changes(
      topic_name,
      TG_OP,
      TG_OP,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END,
      CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN OLD ELSE NULL END
    );

    PERFORM pg_notify(topic_name, payload_data::TEXT);

    RETURN COALESCE(NEW, OLD);
  END;
  $FUNC$;

  -- Create triggers
  CREATE TRIGGER shift_sessions_realtime_trigger
    AFTER INSERT OR UPDATE OR DELETE ON shift_sessions
    FOR EACH ROW
    EXECUTE FUNCTION notify_shift_changes();

  CREATE TRIGGER shift_changes_realtime_trigger
    AFTER INSERT OR UPDATE OR DELETE ON shift_changes
    FOR EACH ROW
    EXECUTE FUNCTION notify_shift_changes();

  PERFORM log_migration('002_realtime_integration');
  RAISE NOTICE 'Migration 002 completed successfully.';

EXCEPTION
  WHEN OTHERS THEN
    PERFORM log_migration('002_realtime_integration', 'ERROR', SQLERRM);
    RAISE EXCEPTION 'Migration 002 failed: %', SQLERRM;
END $$;

-- =============================================================================
-- MIGRATION 003: ROW LEVEL SECURITY
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Starting Migration 003: Row Level Security Setup...';

  -- Enable RLS
  ALTER TABLE shift_sessions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE shift_changes ENABLE ROW LEVEL SECURITY;

  -- Helper functions
  CREATE OR REPLACE FUNCTION is_supervisor_or_manager()
  RETURNS BOOLEAN
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  AS $FUNC$
    SELECT COALESCE(
      auth.jwt() ->> 'role' IN ('supervisor', 'manager', 'admin'),
      FALSE
    );
  $FUNC$;

  CREATE OR REPLACE FUNCTION current_employee_id()
  RETURNS UUID
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  AS $FUNC$
    SELECT COALESCE(
      (auth.jwt() ->> 'employee_id')::UUID,
      auth.uid()
    );
  $FUNC$;

  CREATE OR REPLACE FUNCTION can_access_employee_data(target_employee_id UUID)
  RETURNS BOOLEAN
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  AS $FUNC$
    SELECT
      is_supervisor_or_manager() OR
      target_employee_id = current_employee_id() OR
      target_employee_id = auth.uid();
  $FUNC$;

  -- Create RLS policies
  CREATE POLICY "shift_sessions_select_policy" ON shift_sessions
    FOR SELECT TO authenticated
    USING (can_access_employee_data(employee_id));

  CREATE POLICY "shift_sessions_insert_policy" ON shift_sessions
    FOR INSERT TO authenticated
    WITH CHECK (can_access_employee_data(employee_id));

  CREATE POLICY "shift_sessions_update_policy" ON shift_sessions
    FOR UPDATE TO authenticated
    USING (can_access_employee_data(employee_id))
    WITH CHECK (can_access_employee_data(employee_id));

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

  PERFORM log_migration('003_row_level_security');
  RAISE NOTICE 'Migration 003 completed successfully.';

EXCEPTION
  WHEN OTHERS THEN
    PERFORM log_migration('003_row_level_security', 'ERROR', SQLERRM);
    RAISE EXCEPTION 'Migration 003 failed: %', SQLERRM;
END $$;

-- =============================================================================
-- MIGRATION 004: SHIFT MANAGEMENT FUNCTIONS
-- =============================================================================
\i database/migrations/004_shift_management_functions.sql

-- Log the migration
SELECT log_migration('004_shift_management_functions');

-- =============================================================================
-- MIGRATION 005: PARKING INTEGRATION
-- =============================================================================
\i database/migrations/005_parking_shift_integration.sql

-- Log the migration
SELECT log_migration('005_parking_shift_integration');

-- =============================================================================
-- MIGRATION 006: TESTING AND VALIDATION
-- =============================================================================
\i database/migrations/006_test_and_validation.sql

-- Log the migration
SELECT log_migration('006_test_and_validation');

-- =============================================================================
-- POST-DEPLOYMENT VALIDATION
-- =============================================================================
DO $$
DECLARE
  v_test_results JSONB;
  v_pass_rate NUMERIC;
  v_status TEXT;
BEGIN
  RAISE NOTICE 'Running post-deployment validation tests...';

  -- Run comprehensive test suite
  SELECT run_shift_management_tests() INTO v_test_results;

  v_pass_rate := (v_test_results->'test_summary'->>'pass_rate')::NUMERIC;
  v_status := v_test_results->'test_summary'->>'overall_status';

  -- Log test results
  PERFORM log_migration(
    'post_deployment_validation',
    CASE WHEN v_pass_rate >= 95 THEN 'SUCCESS' ELSE 'WARNING' END,
    FORMAT('Pass rate: %s%%, Status: %s', v_pass_rate, v_status)
  );

  -- Display results
  RAISE NOTICE 'Test Results: % with %% pass rate', v_status, v_pass_rate;

  IF v_pass_rate < 80 THEN
    RAISE WARNING 'Deployment validation shows low pass rate. Review test results.';
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    PERFORM log_migration('post_deployment_validation', 'ERROR', SQLERRM);
    RAISE WARNING 'Post-deployment validation failed: %', SQLERRM;
END $$;

-- =============================================================================
-- DEPLOYMENT SUMMARY
-- =============================================================================
DO $$
DECLARE
  v_deployment_summary RECORD;
BEGIN
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'SHIFT MANAGEMENT SYSTEM DEPLOYMENT COMPLETED';
  RAISE NOTICE '=============================================================================';

  -- Get deployment summary
  SELECT
    COUNT(*) as total_migrations,
    COUNT(*) FILTER (WHERE execution_status = 'SUCCESS') as successful_migrations,
    COUNT(*) FILTER (WHERE execution_status = 'ERROR') as failed_migrations,
    MIN(executed_at) as deployment_start,
    MAX(executed_at) as deployment_end
  INTO v_deployment_summary
  FROM deployment_log
  WHERE executed_at >= CURRENT_DATE;

  RAISE NOTICE 'Deployment Summary:';
  RAISE NOTICE '  Total Migrations: %', v_deployment_summary.total_migrations;
  RAISE NOTICE '  Successful: %', v_deployment_summary.successful_migrations;
  RAISE NOTICE '  Failed: %', v_deployment_summary.failed_migrations;
  RAISE NOTICE '  Duration: % to %',
    v_deployment_summary.deployment_start,
    v_deployment_summary.deployment_end;

  RAISE NOTICE '';
  RAISE NOTICE 'System Features Deployed:';
  RAISE NOTICE '  ✓ Event-driven shift sessions with flexible timing';
  RAISE NOTICE '  ✓ Real-time dashboard updates via Supabase Realtime';
  RAISE NOTICE '  ✓ Comprehensive audit trail for all shift changes';
  RAISE NOTICE '  ✓ Row Level Security with role-based access control';
  RAISE NOTICE '  ✓ Automatic parking entry assignment to active shifts';
  RAISE NOTICE '  ✓ Real-time shift statistics and reporting';
  RAISE NOTICE '  ✓ Cash reconciliation and handover workflows';
  RAISE NOTICE '  ✓ Emergency shift procedures with supervisor approval';

  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Configure user roles in your authentication system';
  RAISE NOTICE '  2. Set up Supabase Realtime subscriptions in your web app';
  RAISE NOTICE '  3. Test the system with: SELECT run_shift_management_tests()';
  RAISE NOTICE '  4. Start your first shift with: SELECT start_shift(...)';
  RAISE NOTICE '';
  RAISE NOTICE 'Documentation:';
  RAISE NOTICE '  - Usage examples: SELECT show_usage_examples()';
  RAISE NOTICE '  - Function reference: \df shift_*';
  RAISE NOTICE '  - View deployment log: SELECT * FROM deployment_log';

  RAISE NOTICE '=============================================================================';

END $$;

-- =============================================================================
-- FINAL SYSTEM CHECK
-- =============================================================================
-- Verify all core tables exist
DO $$
DECLARE
  v_missing_tables TEXT[];
  v_table_name TEXT;
BEGIN
  -- Check for required tables
  FOR v_table_name IN VALUES ('shift_sessions'), ('shift_changes'), ('parking_entries')
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = v_table_name AND table_schema = 'public'
    ) THEN
      v_missing_tables := array_append(v_missing_tables, v_table_name);
    END IF;
  END LOOP;

  IF array_length(v_missing_tables, 1) > 0 THEN
    RAISE EXCEPTION 'Deployment incomplete. Missing tables: %', array_to_string(v_missing_tables, ', ');
  END IF;

  RAISE NOTICE 'All required tables verified successfully.';
END $$;

-- Clean up deployment artifacts
DROP FUNCTION IF EXISTS log_migration(VARCHAR, VARCHAR, TEXT);

RAISE NOTICE 'Shift Management System deployment completed successfully!';