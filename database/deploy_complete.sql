-- =============================================================================
-- SHIFT MANAGEMENT SYSTEM - COMPLETE PURE SQL DEPLOYMENT
-- Event-Driven Flexible Architecture - All Migrations Embedded
-- =============================================================================

-- This script contains ALL migrations inline as pure SQL
-- No psql meta-commands - compatible with all PostgreSQL clients
-- Version: 1.0.0 | Database: PostgreSQL (Supabase)

-- =============================================================================
-- PRE-DEPLOYMENT CHECKLIST
-- =============================================================================
-- ✓ Sufficient database privileges (CREATE, ALTER, etc.)
-- ✓ parking_entries table exists in your database
-- ✓ Supabase Realtime enabled for your project
-- ✓ Authentication configured (auth.users table)
-- ✓ Understand business impact of schema changes

-- =============================================================================
-- DEPLOYMENT LOG SETUP
-- =============================================================================
CREATE TABLE IF NOT EXISTS deployment_log (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  execution_status VARCHAR(50) DEFAULT 'SUCCESS',
  error_message TEXT,
  executed_by VARCHAR(255) DEFAULT current_user
);

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
  RAISE NOTICE '[001] Creating core shift management schema...';

  -- Create enums
  CREATE TYPE shift_status_enum AS ENUM ('active', 'completed', 'emergency_ended');
  CREATE TYPE change_type_enum AS ENUM ('normal', 'emergency', 'extended', 'overlap');

  -- Core shift sessions table
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
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_cash_amounts CHECK (opening_cash_amount >= 0),
    CONSTRAINT valid_closing_cash CHECK (closing_cash_amount IS NULL OR closing_cash_amount >= 0),
    CONSTRAINT valid_shift_timing CHECK (shift_end_time IS NULL OR shift_end_time > shift_start_time),
    CONSTRAINT active_shift_has_no_end_time CHECK (
      (status = 'active' AND shift_end_time IS NULL AND closing_cash_amount IS NULL) OR
      (status != 'active' AND shift_end_time IS NOT NULL)
    )
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
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_change_timing CHECK (change_timestamp <= NOW()),
    CONSTRAINT emergency_requires_supervisor CHECK (
      change_type != 'emergency' OR
      (supervisor_approved = TRUE AND supervisor_id IS NOT NULL)
    )
  );

  -- Performance indexes
  CREATE INDEX idx_shift_sessions_employee ON shift_sessions(employee_id);
  CREATE INDEX idx_shift_sessions_status ON shift_sessions(status);
  CREATE INDEX idx_shift_sessions_time ON shift_sessions(shift_start_time);
  CREATE INDEX idx_shift_sessions_active ON shift_sessions(status) WHERE status = 'active';
  CREATE INDEX idx_shift_changes_timestamp ON shift_changes(change_timestamp);
  CREATE INDEX idx_shift_changes_employees ON shift_changes(outgoing_employee_id, incoming_employee_id);
  CREATE INDEX idx_shift_changes_sessions ON shift_changes(previous_shift_session_id, new_shift_session_id);

  -- Business rule: only one active shift
  CREATE UNIQUE INDEX idx_single_active_shift ON shift_sessions(status) WHERE status = 'active';

  PERFORM log_migration('001_core_schema');
  RAISE NOTICE '[001] ✓ Core schema completed';

EXCEPTION
  WHEN OTHERS THEN
    PERFORM log_migration('001_core_schema', 'ERROR', SQLERRM);
    RAISE;
END $$;

-- =============================================================================
-- MIGRATION 002: SUPABASE REALTIME INTEGRATION
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE '[002] Setting up Supabase Realtime integration...';

  -- Enable realtime for shift tables
  ALTER PUBLICATION supabase_realtime ADD TABLE shift_sessions;
  ALTER PUBLICATION supabase_realtime ADD TABLE shift_changes;

  -- Enhanced realtime broadcast function
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
      WHEN 'parking_entries' THEN 'parking-updates'
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

  -- Enhanced shift-specific broadcast function
  CREATE OR REPLACE FUNCTION notify_shift_session_changes()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $FUNC$
  DECLARE
    notification_data JSONB;
    active_shift_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO active_shift_count
    FROM shift_sessions WHERE status = 'active';

    notification_data := jsonb_build_object(
      'table', 'shift_sessions',
      'operation', TG_OP,
      'timestamp', NOW(),
      'active_shift_count', active_shift_count
    );

    CASE TG_OP
      WHEN 'INSERT' THEN
        notification_data := notification_data || jsonb_build_object(
          'shift_started', true,
          'shift_id', NEW.id,
          'employee_id', NEW.employee_id,
          'employee_name', NEW.employee_name,
          'shift_start_time', NEW.shift_start_time,
          'opening_cash', NEW.opening_cash_amount
        );
      WHEN 'UPDATE' THEN
        notification_data := notification_data || jsonb_build_object(
          'shift_id', NEW.id,
          'status_changed', (OLD.status != NEW.status),
          'shift_ended', (OLD.shift_end_time IS NULL AND NEW.shift_end_time IS NOT NULL)
        );

        IF OLD.shift_end_time IS NULL AND NEW.shift_end_time IS NOT NULL THEN
          notification_data := notification_data || jsonb_build_object(
            'shift_completed', true,
            'closing_cash', NEW.closing_cash_amount,
            'cash_discrepancy', NEW.cash_discrepancy,
            'shift_duration', NEW.shift_duration_minutes
          );
        END IF;
    END CASE;

    PERFORM realtime.broadcast_changes(
      'shift-management',
      TG_OP,
      TG_OP,
      'shift_sessions',
      'public',
      CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END,
      CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN OLD ELSE NULL END
    );

    PERFORM pg_notify('shift-management', notification_data::TEXT);
    RETURN COALESCE(NEW, OLD);
  END;
  $FUNC$;

  -- Update timestamp function
  CREATE OR REPLACE FUNCTION update_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $FUNC$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $FUNC$;

  -- Create triggers
  CREATE TRIGGER shift_sessions_realtime_trigger
    AFTER INSERT OR UPDATE OR DELETE ON shift_sessions
    FOR EACH ROW
    EXECUTE FUNCTION notify_shift_session_changes();

  CREATE TRIGGER shift_changes_realtime_trigger
    AFTER INSERT OR UPDATE OR DELETE ON shift_changes
    FOR EACH ROW
    EXECUTE FUNCTION notify_shift_changes();

  CREATE TRIGGER update_shift_sessions_timestamp
    BEFORE UPDATE ON shift_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

  PERFORM log_migration('002_realtime_integration');
  RAISE NOTICE '[002] ✓ Realtime integration completed';

EXCEPTION
  WHEN OTHERS THEN
    PERFORM log_migration('002_realtime_integration', 'ERROR', SQLERRM);
    RAISE;
END $$;

-- =============================================================================
-- MIGRATION 003: ROW LEVEL SECURITY
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE '[003] Setting up Row Level Security...';

  -- Enable RLS
  ALTER TABLE shift_sessions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE shift_changes ENABLE ROW LEVEL SECURITY;

  -- Helper functions for role-based access
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

  -- Create RLS policies for shift_sessions
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

  CREATE POLICY "shift_sessions_delete_policy" ON shift_sessions
    FOR DELETE TO authenticated
    USING (is_supervisor_or_manager());

  -- Create RLS policies for shift_changes
  CREATE POLICY "shift_changes_select_policy" ON shift_changes
    FOR SELECT TO authenticated
    USING (
      is_supervisor_or_manager() OR
      outgoing_employee_id = current_employee_id() OR
      incoming_employee_id = current_employee_id() OR
      outgoing_employee_id = auth.uid() OR
      incoming_employee_id = auth.uid()
    );

  CREATE POLICY "shift_changes_insert_policy" ON shift_changes
    FOR INSERT TO authenticated
    WITH CHECK (
      is_supervisor_or_manager() OR
      outgoing_employee_id = current_employee_id() OR
      incoming_employee_id = current_employee_id()
    );

  CREATE POLICY "shift_changes_update_policy" ON shift_changes
    FOR UPDATE TO authenticated
    USING (is_supervisor_or_manager())
    WITH CHECK (is_supervisor_or_manager());

  CREATE POLICY "shift_changes_delete_policy" ON shift_changes
    FOR DELETE TO authenticated
    USING (is_supervisor_or_manager());

  -- Grant permissions
  GRANT EXECUTE ON FUNCTION is_supervisor_or_manager() TO authenticated;
  GRANT EXECUTE ON FUNCTION current_employee_id() TO authenticated;
  GRANT EXECUTE ON FUNCTION can_access_employee_data(UUID) TO authenticated;

  PERFORM log_migration('003_row_level_security');
  RAISE NOTICE '[003] ✓ Row Level Security completed';

EXCEPTION
  WHEN OTHERS THEN
    PERFORM log_migration('003_row_level_security', 'ERROR', SQLERRM);
    RAISE;
END $$;

-- =============================================================================
-- MIGRATION 004: SHIFT MANAGEMENT FUNCTIONS
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE '[004] Creating shift management functions...';

  -- Business logic validation function
  CREATE OR REPLACE FUNCTION validate_shift_operations()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $FUNC$
  DECLARE
    active_shifts_count INTEGER;
  BEGIN
    IF TG_OP = 'INSERT' THEN
      SELECT COUNT(*) INTO active_shifts_count
      FROM shift_sessions
      WHERE status = 'active' AND id != NEW.id;

      IF active_shifts_count > 0 AND NEW.status = 'active' THEN
        RAISE EXCEPTION 'Cannot start new shift: Another shift is already active. Complete handover first.';
      END IF;

      IF NEW.opening_cash_amount < 0 THEN
        RAISE EXCEPTION 'Opening cash amount cannot be negative: %', NEW.opening_cash_amount;
      END IF;
    END IF;

    IF TG_OP = 'UPDATE' THEN
      IF OLD.shift_end_time IS NULL AND NEW.shift_end_time IS NOT NULL THEN
        IF NEW.closing_cash_amount IS NULL THEN
          RAISE EXCEPTION 'Closing cash amount is required when ending a shift';
        END IF;
        IF NEW.status = 'active' THEN
          RAISE EXCEPTION 'Cannot end shift while status is still active';
        END IF;
      END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
  END;
  $FUNC$;

  -- Apply business logic trigger
  CREATE TRIGGER validate_shift_operations_trigger
    BEFORE INSERT OR UPDATE ON shift_sessions
    FOR EACH ROW
    EXECUTE FUNCTION validate_shift_operations();

  -- Function to start a new shift
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
  AS $FUNC$
  DECLARE
    v_shift_id UUID;
  BEGIN
    INSERT INTO shift_sessions (
      employee_id,
      employee_name,
      employee_phone,
      shift_start_time,
      status,
      opening_cash_amount,
      shift_notes
    ) VALUES (
      p_employee_id,
      p_employee_name,
      p_employee_phone,
      NOW(),
      'active',
      p_opening_cash,
      p_shift_notes
    )
    RETURNING id INTO v_shift_id;

    RETURN v_shift_id;
  END;
  $FUNC$;

  -- Function to end a shift
  CREATE OR REPLACE FUNCTION end_shift(
    p_shift_id UUID,
    p_closing_cash DECIMAL(10,2),
    p_shift_notes TEXT DEFAULT NULL,
    p_emergency_end BOOLEAN DEFAULT FALSE,
    p_supervisor_id UUID DEFAULT NULL
  )
  RETURNS JSONB
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $FUNC$
  DECLARE
    v_new_status shift_status_enum;
  BEGIN
    v_new_status := CASE
      WHEN p_emergency_end THEN 'emergency_ended'::shift_status_enum
      ELSE 'completed'::shift_status_enum
    END;

    UPDATE shift_sessions
    SET
      shift_end_time = NOW(),
      closing_cash_amount = p_closing_cash,
      status = v_new_status,
      shift_notes = COALESCE(p_shift_notes, shift_notes),
      updated_at = NOW()
    WHERE id = p_shift_id;

    RETURN jsonb_build_object(
      'shift_id', p_shift_id,
      'status', v_new_status,
      'ended_at', NOW()
    );
  END;
  $FUNC$;

  -- Function to get current active shift
  CREATE OR REPLACE FUNCTION get_current_active_shift()
  RETURNS JSONB
  LANGUAGE sql
  SECURITY DEFINER
  AS $FUNC$
    SELECT to_jsonb(ss) || jsonb_build_object(
      'current_duration_seconds', EXTRACT(EPOCH FROM (NOW() - shift_start_time))::INTEGER,
      'current_duration_minutes', EXTRACT(EPOCH FROM (NOW() - shift_start_time))::INTEGER / 60
    )
    FROM shift_sessions ss
    WHERE status = 'active'
    LIMIT 1;
  $FUNC$;

  -- Grant permissions
  GRANT EXECUTE ON FUNCTION start_shift(UUID, VARCHAR, VARCHAR, DECIMAL, TEXT) TO authenticated;
  GRANT EXECUTE ON FUNCTION end_shift(UUID, DECIMAL, TEXT, BOOLEAN, UUID) TO authenticated;
  GRANT EXECUTE ON FUNCTION get_current_active_shift() TO authenticated;

  PERFORM log_migration('004_shift_management_functions');
  RAISE NOTICE '[004] ✓ Shift management functions completed';

EXCEPTION
  WHEN OTHERS THEN
    PERFORM log_migration('004_shift_management_functions', 'ERROR', SQLERRM);
    RAISE;
END $$;

-- =============================================================================
-- MIGRATION 005: PARKING INTEGRATION
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE '[005] Setting up parking integration...';

  -- Add shift tracking to parking_entries
  ALTER TABLE parking_entries
  ADD COLUMN IF NOT EXISTS shift_session_id UUID REFERENCES shift_sessions(id);

  CREATE INDEX IF NOT EXISTS idx_parking_entries_shift ON parking_entries(shift_session_id);

  -- Enable realtime for parking_entries
  ALTER PUBLICATION supabase_realtime ADD TABLE parking_entries;

  -- Function to auto-assign active shift to parking entries
  CREATE OR REPLACE FUNCTION auto_assign_active_shift()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $FUNC$
  DECLARE
    v_active_shift_id UUID;
  BEGIN
    IF TG_OP = 'INSERT' AND NEW.shift_session_id IS NULL THEN
      SELECT id INTO v_active_shift_id
      FROM shift_sessions
      WHERE status = 'active'
      LIMIT 1;

      IF v_active_shift_id IS NOT NULL THEN
        NEW.shift_session_id := v_active_shift_id;
      END IF;
    END IF;

    RETURN NEW;
  END;
  $FUNC$;

  -- Apply auto-assignment trigger
  CREATE TRIGGER auto_assign_shift_trigger
    BEFORE INSERT ON parking_entries
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_active_shift();

  -- Create parking realtime trigger
  CREATE TRIGGER parking_realtime_trigger
    AFTER INSERT OR UPDATE OR DELETE ON parking_entries
    FOR EACH ROW
    EXECUTE FUNCTION notify_shift_changes();

  -- Enhanced shift statistics view with parking data
  CREATE VIEW shift_statistics AS
  WITH shift_parking_stats AS (
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

      COUNT(pe.*) FILTER (
        WHERE pe.entry_time >= ss.shift_start_time
        AND pe.entry_time < COALESCE(ss.shift_end_time, NOW())
      ) as vehicles_entered,

      COUNT(pe.*) FILTER (
        WHERE pe.exit_time >= ss.shift_start_time
        AND pe.exit_time < COALESCE(ss.shift_end_time, NOW())
        AND pe.exit_time IS NOT NULL
      ) as vehicles_exited,

      COUNT(pe.*) FILTER (
        WHERE pe.status = 'Parked'
        AND pe.shift_session_id = ss.id
      ) as vehicles_currently_parked,

      COALESCE(SUM(pe.parking_fee) FILTER (
        WHERE pe.payment_status = 'Paid'
        AND pe.shift_session_id = ss.id
      ), 0) as revenue_collected,

      COALESCE(SUM(pe.parking_fee) FILTER (
        WHERE pe.payment_status = 'Unpaid'
        AND pe.shift_session_id = ss.id
      ), 0) as outstanding_payments,

      CASE
        WHEN ss.shift_duration_minutes > 0
        THEN COUNT(pe.*) FILTER (
          WHERE pe.entry_time >= ss.shift_start_time
          AND pe.entry_time < COALESCE(ss.shift_end_time, NOW())
        ) / (ss.shift_duration_minutes / 60.0)
        ELSE 0
      END as vehicles_per_hour,

      CASE
        WHEN ss.shift_end_time IS NOT NULL
        THEN EXTRACT(EPOCH FROM (ss.shift_end_time - ss.shift_start_time))::INTEGER
        ELSE EXTRACT(EPOCH FROM (NOW() - ss.shift_start_time))::INTEGER
      END as current_duration_seconds

    FROM shift_sessions ss
    LEFT JOIN parking_entries pe ON pe.shift_session_id = ss.id
    GROUP BY ss.id, ss.employee_name, ss.shift_start_time, ss.shift_end_time,
             ss.status, ss.opening_cash_amount, ss.closing_cash_amount,
             ss.cash_discrepancy, ss.shift_duration_minutes
  )
  SELECT
    *,
    CASE
      WHEN shift_duration_minutes > 0
      THEN revenue_collected / (shift_duration_minutes / 60.0)
      ELSE 0
    END as revenue_per_hour,

    CASE
      WHEN vehicles_entered > 0 AND shift_duration_minutes > 0
      THEN ROUND(
        (vehicles_per_hour * 0.4 +
         (revenue_collected / GREATEST(vehicles_entered, 1)) * 0.6) / 100.0, 2
      )
      ELSE 0
    END as efficiency_score

  FROM shift_parking_stats;

  GRANT SELECT ON shift_statistics TO authenticated;

  -- Enable RLS for parking_entries
  ALTER TABLE parking_entries ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "parking_entries_shift_access" ON parking_entries
    FOR ALL TO authenticated
    USING (
      shift_session_id IS NULL OR
      EXISTS (
        SELECT 1 FROM shift_sessions ss
        WHERE ss.id = shift_session_id
        AND can_access_employee_data(ss.employee_id)
      )
    );

  PERFORM log_migration('005_parking_integration');
  RAISE NOTICE '[005] ✓ Parking integration completed';

EXCEPTION
  WHEN OTHERS THEN
    PERFORM log_migration('005_parking_integration', 'ERROR', SQLERRM);
    RAISE;
END $$;

-- =============================================================================
-- MIGRATION 006: TESTING AND VALIDATION
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE '[006] Setting up testing and validation...';

  -- Simple test function to validate installation
  CREATE OR REPLACE FUNCTION validate_shift_system()
  RETURNS JSONB
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $FUNC$
  DECLARE
    v_test_results JSONB := '{}';
    v_table_count INTEGER;
    v_function_count INTEGER;
    v_trigger_count INTEGER;
  BEGIN
    -- Check tables exist
    SELECT COUNT(*) INTO v_table_count
    FROM information_schema.tables
    WHERE table_name IN ('shift_sessions', 'shift_changes', 'parking_entries')
    AND table_schema = 'public';

    -- Check functions exist
    SELECT COUNT(*) INTO v_function_count
    FROM information_schema.routines
    WHERE routine_name IN ('start_shift', 'end_shift', 'get_current_active_shift')
    AND routine_schema = 'public';

    -- Check triggers exist
    SELECT COUNT(*) INTO v_trigger_count
    FROM information_schema.triggers
    WHERE trigger_name LIKE '%shift%'
    AND trigger_schema = 'public';

    v_test_results := jsonb_build_object(
      'tables_created', v_table_count >= 3,
      'functions_created', v_function_count >= 3,
      'triggers_created', v_trigger_count >= 3,
      'overall_status', CASE
        WHEN v_table_count >= 3 AND v_function_count >= 3 AND v_trigger_count >= 3
        THEN 'SUCCESS'
        ELSE 'INCOMPLETE'
      END,
      'timestamp', NOW()
    );

    RETURN v_test_results;
  END;
  $FUNC$;

  GRANT EXECUTE ON FUNCTION validate_shift_system() TO authenticated;

  PERFORM log_migration('006_testing_validation');
  RAISE NOTICE '[006] ✓ Testing and validation completed';

EXCEPTION
  WHEN OTHERS THEN
    PERFORM log_migration('006_testing_validation', 'ERROR', SQLERRM);
    RAISE;
END $$;

-- =============================================================================
-- POST-DEPLOYMENT VALIDATION
-- =============================================================================
DO $$
DECLARE
  v_validation_results JSONB;
  v_status TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE '🎯 SHIFT MANAGEMENT SYSTEM DEPLOYMENT VALIDATION';
  RAISE NOTICE '=============================================================================';

  -- Run validation
  SELECT validate_shift_system() INTO v_validation_results;
  v_status := v_validation_results->>'overall_status';

  RAISE NOTICE 'Validation Results:';
  RAISE NOTICE '  Tables: %', CASE WHEN (v_validation_results->>'tables_created')::BOOLEAN THEN '✓' ELSE '✗' END;
  RAISE NOTICE '  Functions: %', CASE WHEN (v_validation_results->>'functions_created')::BOOLEAN THEN '✓' ELSE '✗' END;
  RAISE NOTICE '  Triggers: %', CASE WHEN (v_validation_results->>'triggers_created')::BOOLEAN THEN '✓' ELSE '✗' END;
  RAISE NOTICE '  Overall Status: %', v_status;

  IF v_status = 'SUCCESS' THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ DEPLOYMENT SUCCESSFUL!';
    RAISE NOTICE '';
    RAISE NOTICE 'System Features Available:';
    RAISE NOTICE '  🎯 Event-driven shift sessions with flexible timing';
    RAISE NOTICE '  🔄 Real-time dashboard updates via Supabase Realtime';
    RAISE NOTICE '  📊 Comprehensive audit trail for all shift changes';
    RAISE NOTICE '  🔒 Row Level Security with role-based access control';
    RAISE NOTICE '  🅿️ Automatic parking entry assignment to active shifts';
    RAISE NOTICE '  📈 Real-time shift statistics and reporting';
    RAISE NOTICE '';
    RAISE NOTICE 'Quick Start:';
    RAISE NOTICE '  1. Test: SELECT validate_shift_system();';
    RAISE NOTICE '  2. Start shift: SELECT start_shift(auth.uid(), ''Your Name'', ''+phone'', 100.00);';
    RAISE NOTICE '  3. Check active: SELECT get_current_active_shift();';
    RAISE NOTICE '  4. View stats: SELECT * FROM shift_statistics;';
  ELSE
    RAISE WARNING 'Deployment incomplete. Check deployment_log for errors.';
  END IF;

  RAISE NOTICE '=============================================================================';

END $$;

-- Clean up deployment helper
DROP FUNCTION log_migration(VARCHAR, VARCHAR, TEXT);

RAISE NOTICE '';
RAISE NOTICE '🚀 Ready for flexible shift management with real-time capabilities!';
RAISE NOTICE '';