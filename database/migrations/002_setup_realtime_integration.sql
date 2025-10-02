-- =============================================================================
-- SUPABASE REALTIME INTEGRATION FOR SHIFT MANAGEMENT
-- Event-Driven Architecture Implementation
-- =============================================================================

-- =============================================================================
-- ENABLE REALTIME FOR SHIFT TABLES
-- =============================================================================
-- Add shift management tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE shift_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE shift_changes;
-- Note: parking_entries will be added when we update that table

-- =============================================================================
-- REALTIME BROADCAST TRIGGER FUNCTION
-- =============================================================================
-- Generic function to broadcast changes to Supabase Realtime
CREATE OR REPLACE FUNCTION notify_shift_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  topic_name TEXT;
  payload_data JSONB;
BEGIN
  -- Determine topic based on table
  CASE TG_TABLE_NAME
    WHEN 'shift_sessions' THEN
      topic_name := 'shift-management';
    WHEN 'shift_changes' THEN
      topic_name := 'shift-changes';
    WHEN 'parking_entries' THEN
      topic_name := 'parking-updates';
    ELSE
      topic_name := 'general-updates';
  END CASE;

  -- Prepare payload data
  payload_data := jsonb_build_object(
    'table', TG_TABLE_NAME,
    'operation', TG_OP,
    'timestamp', NOW()
  );

  -- Add record data based on operation
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

  -- Broadcast the change
  PERFORM realtime.broadcast_changes(
    topic_name,
    TG_OP,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN OLD ELSE NULL END
  );

  -- Also send to pg_notify for additional listeners
  PERFORM pg_notify(
    topic_name,
    payload_data::TEXT
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- =============================================================================
-- SHIFT-SPECIFIC BROADCAST FUNCTIONS
-- =============================================================================
-- Function specifically for shift session changes with enhanced data
CREATE OR REPLACE FUNCTION notify_shift_session_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_data JSONB;
  active_shift_count INTEGER;
BEGIN
  -- Count active shifts for validation
  SELECT COUNT(*) INTO active_shift_count
  FROM shift_sessions
  WHERE status = 'active';

  -- Prepare enhanced notification data
  notification_data := jsonb_build_object(
    'table', 'shift_sessions',
    'operation', TG_OP,
    'timestamp', NOW(),
    'active_shift_count', active_shift_count
  );

  -- Add specific shift data
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
        'shift_ended', (OLD.shift_end_time IS NULL AND NEW.shift_end_time IS NOT NULL),
        'old_status', OLD.status,
        'new_status', NEW.status
      );

      -- Add end-of-shift data if shift was completed
      IF OLD.shift_end_time IS NULL AND NEW.shift_end_time IS NOT NULL THEN
        notification_data := notification_data || jsonb_build_object(
          'shift_completed', true,
          'closing_cash', NEW.closing_cash_amount,
          'cash_discrepancy', NEW.cash_discrepancy,
          'shift_duration', NEW.shift_duration_minutes
        );
      END IF;

    WHEN 'DELETE' THEN
      notification_data := notification_data || jsonb_build_object(
        'shift_deleted', true,
        'shift_id', OLD.id,
        'employee_name', OLD.employee_name
      );
  END CASE;

  -- Broadcast to Supabase Realtime
  PERFORM realtime.broadcast_changes(
    'shift-management',
    TG_OP,
    TG_OP,
    'shift_sessions',
    'public',
    CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN OLD ELSE NULL END
  );

  -- Send enhanced notification
  PERFORM pg_notify('shift-management', notification_data::TEXT);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- =============================================================================
-- CREATE TRIGGERS FOR REALTIME UPDATES
-- =============================================================================
-- Trigger for shift_sessions table with enhanced notifications
DROP TRIGGER IF EXISTS shift_sessions_realtime_trigger ON shift_sessions;
CREATE TRIGGER shift_sessions_realtime_trigger
  AFTER INSERT OR UPDATE OR DELETE ON shift_sessions
  FOR EACH ROW
  EXECUTE FUNCTION notify_shift_session_changes();

-- Trigger for shift_changes table
DROP TRIGGER IF EXISTS shift_changes_realtime_trigger ON shift_changes;
CREATE TRIGGER shift_changes_realtime_trigger
  AFTER INSERT OR UPDATE OR DELETE ON shift_changes
  FOR EACH ROW
  EXECUTE FUNCTION notify_shift_changes();

-- =============================================================================
-- UPDATE TIMESTAMP TRIGGER FUNCTION
-- =============================================================================
-- Generic function to update 'updated_at' timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply update timestamp trigger to shift_sessions
DROP TRIGGER IF EXISTS update_shift_sessions_timestamp ON shift_sessions;
CREATE TRIGGER update_shift_sessions_timestamp
  BEFORE UPDATE ON shift_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- BUSINESS LOGIC TRIGGERS
-- =============================================================================
-- Trigger to validate business rules before shift operations
CREATE OR REPLACE FUNCTION validate_shift_operations()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  active_shifts_count INTEGER;
  overlapping_shifts_count INTEGER;
BEGIN
  -- For INSERT operations (new shifts)
  IF TG_OP = 'INSERT' THEN
    -- Check for existing active shifts
    SELECT COUNT(*) INTO active_shifts_count
    FROM shift_sessions
    WHERE status = 'active' AND id != NEW.id;

    IF active_shifts_count > 0 AND NEW.status = 'active' THEN
      RAISE EXCEPTION 'Cannot start new shift: Another shift is already active. Complete handover first.';
    END IF;

    -- Validate opening cash amount
    IF NEW.opening_cash_amount < 0 THEN
      RAISE EXCEPTION 'Opening cash amount cannot be negative: %', NEW.opening_cash_amount;
    END IF;
  END IF;

  -- For UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    -- Validate shift end operations
    IF OLD.shift_end_time IS NULL AND NEW.shift_end_time IS NOT NULL THEN
      -- Shift is being ended
      IF NEW.closing_cash_amount IS NULL THEN
        RAISE EXCEPTION 'Closing cash amount is required when ending a shift';
      END IF;

      IF NEW.status = 'active' THEN
        RAISE EXCEPTION 'Cannot end shift while status is still active';
      END IF;
    END IF;

    -- Prevent modification of completed shifts (except by supervisors)
    IF OLD.status IN ('completed', 'emergency_ended') AND OLD.status != NEW.status THEN
      -- This would need to be enhanced with actual user role checking
      RAISE EXCEPTION 'Cannot modify completed shift without supervisor approval';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply business logic validation trigger
DROP TRIGGER IF EXISTS validate_shift_operations_trigger ON shift_sessions;
CREATE TRIGGER validate_shift_operations_trigger
  BEFORE INSERT OR UPDATE ON shift_sessions
  FOR EACH ROW
  EXECUTE FUNCTION validate_shift_operations();

-- =============================================================================
-- SHIFT CHANGE AUDIT TRIGGER
-- =============================================================================
-- Automatically create shift_changes records for important shift events
CREATE OR REPLACE FUNCTION auto_create_shift_change_record()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create shift change record when a shift ends
  IF TG_OP = 'UPDATE' AND OLD.shift_end_time IS NULL AND NEW.shift_end_time IS NOT NULL THEN
    INSERT INTO shift_changes (
      previous_shift_session_id,
      change_timestamp,
      handover_notes,
      cash_transferred,
      outgoing_employee_id,
      outgoing_employee_name,
      change_type
    ) VALUES (
      NEW.id,
      NEW.shift_end_time,
      NEW.shift_notes,
      NEW.closing_cash_amount,
      NEW.employee_id,
      NEW.employee_name,
      CASE
        WHEN NEW.status = 'emergency_ended' THEN 'emergency'::change_type_enum
        ELSE 'normal'::change_type_enum
      END
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Apply auto audit trigger
DROP TRIGGER IF EXISTS auto_shift_change_audit_trigger ON shift_sessions;
CREATE TRIGGER auto_shift_change_audit_trigger
  AFTER UPDATE ON shift_sessions
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_shift_change_record();

-- =============================================================================
-- REALTIME SUBSCRIPTION HELPERS
-- =============================================================================
-- Function to get current active shift information for real-time subscriptions
CREATE OR REPLACE FUNCTION get_active_shift_info()
RETURNS TABLE (
  shift_id UUID,
  employee_id UUID,
  employee_name VARCHAR,
  shift_start_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  status shift_status_enum,
  opening_cash DECIMAL,
  current_timestamp TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    id,
    employee_id,
    employee_name,
    shift_start_time,
    EXTRACT(EPOCH FROM (NOW() - shift_start_time))::INTEGER / 60,
    status,
    opening_cash_amount,
    NOW()
  FROM shift_sessions
  WHERE status = 'active'
  LIMIT 1;
$$;

-- Grant necessary permissions for realtime
GRANT USAGE ON SCHEMA realtime TO authenticated;
GRANT SELECT ON shift_sessions TO authenticated;
GRANT SELECT ON shift_changes TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_shift_info() TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION notify_shift_changes() IS 'Generic trigger function for broadcasting database changes to Supabase Realtime';
COMMENT ON FUNCTION notify_shift_session_changes() IS 'Enhanced trigger function specifically for shift session changes with business context';
COMMENT ON FUNCTION validate_shift_operations() IS 'Business logic validation trigger preventing invalid shift operations';
COMMENT ON FUNCTION get_active_shift_info() IS 'Helper function to get current active shift information for real-time dashboard updates';