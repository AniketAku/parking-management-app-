-- =============================================================================
-- SHIFT LINKING ATOMIC UPDATE FUNCTIONS
-- Database functions for real-time shift statistics updates with atomic operations
-- =============================================================================

-- Function to update shift statistics for vehicle entry
CREATE OR REPLACE FUNCTION update_shift_entry_stats(
  p_shift_id UUID,
  p_vehicle_type TEXT DEFAULT 'unknown'
)
RETURNS JSON AS $$
DECLARE
  v_shift_exists BOOLEAN;
  v_updated_stats JSON;
BEGIN
  -- Validate shift exists and is active
  SELECT EXISTS (
    SELECT 1 FROM shift_sessions
    WHERE id = p_shift_id
    AND status = 'active'
  ) INTO v_shift_exists;

  IF NOT v_shift_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Active shift not found',
      'shift_id', p_shift_id
    );
  END IF;

  -- Update shift statistics atomically
  UPDATE shift_sessions
  SET
    vehicles_entered = COALESCE(vehicles_entered, 0) + 1,
    currently_parked = COALESCE(currently_parked, 0) + 1,
    updated_at = NOW(),
    -- Update vehicle type breakdown in metadata
    metadata = COALESCE(metadata, '{}'::jsonb) ||
      jsonb_build_object(
        'vehicle_types',
        COALESCE((metadata->>'vehicle_types')::jsonb, '{}'::jsonb) ||
        jsonb_build_object(
          p_vehicle_type,
          COALESCE(((metadata->>'vehicle_types')::jsonb->>p_vehicle_type)::integer, 0) + 1
        )
      )
  WHERE id = p_shift_id;

  -- Get updated statistics
  SELECT json_build_object(
    'vehicles_entered', vehicles_entered,
    'currently_parked', currently_parked,
    'total_revenue', COALESCE(total_revenue, 0),
    'vehicle_types', metadata->'vehicle_types'
  ) INTO v_updated_stats
  FROM shift_sessions
  WHERE id = p_shift_id;

  -- Send real-time notification
  PERFORM pg_notify(
    'shift_stats_updated',
    json_build_object(
      'type', 'vehicle_entry',
      'shift_id', p_shift_id,
      'vehicle_type', p_vehicle_type,
      'timestamp', NOW(),
      'stats', v_updated_stats
    )::text
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Entry statistics updated',
    'shift_id', p_shift_id,
    'stats', v_updated_stats
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'shift_id', p_shift_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update shift statistics for vehicle exit
CREATE OR REPLACE FUNCTION update_shift_exit_stats(
  p_shift_id UUID,
  p_vehicle_type TEXT DEFAULT 'unknown',
  p_duration_minutes INTEGER DEFAULT 0
)
RETURNS JSON AS $$
DECLARE
  v_shift_exists BOOLEAN;
  v_updated_stats JSON;
  v_avg_duration NUMERIC;
BEGIN
  -- Validate shift exists
  SELECT EXISTS (
    SELECT 1 FROM shift_sessions
    WHERE id = p_shift_id
  ) INTO v_shift_exists;

  IF NOT v_shift_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Shift not found',
      'shift_id', p_shift_id
    );
  END IF;

  -- Calculate new average duration
  SELECT
    CASE
      WHEN COALESCE(vehicles_exited, 0) = 0 THEN p_duration_minutes
      ELSE (
        (COALESCE((metadata->>'total_duration_minutes')::integer, 0) + p_duration_minutes) /
        (COALESCE(vehicles_exited, 0) + 1)
      )
    END INTO v_avg_duration
  FROM shift_sessions
  WHERE id = p_shift_id;

  -- Update shift statistics atomically
  UPDATE shift_sessions
  SET
    vehicles_exited = COALESCE(vehicles_exited, 0) + 1,
    currently_parked = GREATEST(COALESCE(currently_parked, 0) - 1, 0),
    updated_at = NOW(),
    -- Update metadata with duration tracking
    metadata = COALESCE(metadata, '{}'::jsonb) ||
      jsonb_build_object(
        'total_duration_minutes',
        COALESCE((metadata->>'total_duration_minutes')::integer, 0) + p_duration_minutes,
        'avg_duration_minutes',
        v_avg_duration,
        'exit_vehicle_types',
        COALESCE((metadata->>'exit_vehicle_types')::jsonb, '{}'::jsonb) ||
        jsonb_build_object(
          p_vehicle_type,
          COALESCE(((metadata->>'exit_vehicle_types')::jsonb->>p_vehicle_type)::integer, 0) + 1
        )
      )
  WHERE id = p_shift_id;

  -- Get updated statistics
  SELECT json_build_object(
    'vehicles_exited', vehicles_exited,
    'currently_parked', currently_parked,
    'avg_duration_minutes', v_avg_duration,
    'total_revenue', COALESCE(total_revenue, 0)
  ) INTO v_updated_stats
  FROM shift_sessions
  WHERE id = p_shift_id;

  -- Send real-time notification
  PERFORM pg_notify(
    'shift_stats_updated',
    json_build_object(
      'type', 'vehicle_exit',
      'shift_id', p_shift_id,
      'vehicle_type', p_vehicle_type,
      'duration_minutes', p_duration_minutes,
      'timestamp', NOW(),
      'stats', v_updated_stats
    )::text
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Exit statistics updated',
    'shift_id', p_shift_id,
    'stats', v_updated_stats
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'shift_id', p_shift_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update shift statistics for payments
CREATE OR REPLACE FUNCTION update_shift_payment_stats(
  p_shift_id UUID,
  p_amount NUMERIC,
  p_payment_mode TEXT
)
RETURNS JSON AS $$
DECLARE
  v_shift_exists BOOLEAN;
  v_updated_stats JSON;
  v_cash_amount NUMERIC := 0;
  v_digital_amount NUMERIC := 0;
BEGIN
  -- Validate shift exists
  SELECT EXISTS (
    SELECT 1 FROM shift_sessions
    WHERE id = p_shift_id
  ) INTO v_shift_exists;

  IF NOT v_shift_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Shift not found',
      'shift_id', p_shift_id
    );
  END IF;

  -- Calculate payment mode amounts
  IF p_payment_mode = 'cash' THEN
    v_cash_amount := p_amount;
  ELSE
    v_digital_amount := p_amount;
  END IF;

  -- Update shift statistics atomically
  UPDATE shift_sessions
  SET
    total_revenue = COALESCE(total_revenue, 0) + p_amount,
    cash_collected = COALESCE(cash_collected, 0) + v_cash_amount,
    digital_payments = COALESCE(digital_payments, 0) + v_digital_amount,
    updated_at = NOW(),
    -- Update payment breakdown in metadata
    metadata = COALESCE(metadata, '{}'::jsonb) ||
      jsonb_build_object(
        'payment_modes',
        COALESCE((metadata->>'payment_modes')::jsonb, '{}'::jsonb) ||
        jsonb_build_object(
          p_payment_mode,
          COALESCE(((metadata->>'payment_modes')::jsonb->>p_payment_mode)::numeric, 0) + p_amount
        ),
        'total_transactions',
        COALESCE((metadata->>'total_transactions')::integer, 0) + 1
      )
  WHERE id = p_shift_id;

  -- Get updated statistics
  SELECT json_build_object(
    'total_revenue', total_revenue,
    'cash_collected', cash_collected,
    'digital_payments', digital_payments,
    'payment_modes', metadata->'payment_modes',
    'total_transactions', metadata->'total_transactions'
  ) INTO v_updated_stats
  FROM shift_sessions
  WHERE id = p_shift_id;

  -- Send real-time notification
  PERFORM pg_notify(
    'shift_stats_updated',
    json_build_object(
      'type', 'payment_received',
      'shift_id', p_shift_id,
      'amount', p_amount,
      'payment_mode', p_payment_mode,
      'timestamp', NOW(),
      'stats', v_updated_stats
    )::text
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Payment statistics updated',
    'shift_id', p_shift_id,
    'stats', v_updated_stats
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'shift_id', p_shift_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current active shift (optimized for frequent calls)
CREATE OR REPLACE FUNCTION get_current_active_shift()
RETURNS UUID AS $$
DECLARE
  v_shift_id UUID;
BEGIN
  SELECT id INTO v_shift_id
  FROM shift_sessions
  WHERE status = 'active'
  ORDER BY shift_start_time DESC
  LIMIT 1;

  RETURN v_shift_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to automatically link parking session on insert
CREATE OR REPLACE FUNCTION auto_link_parking_session()
RETURNS TRIGGER AS $$
DECLARE
  v_active_shift_id UUID;
BEGIN
  -- Get current active shift if not already assigned
  IF NEW.shift_session_id IS NULL THEN
    v_active_shift_id := get_current_active_shift();

    IF v_active_shift_id IS NOT NULL THEN
      NEW.shift_session_id := v_active_shift_id;

      -- Update shift statistics
      PERFORM update_shift_entry_stats(
        v_active_shift_id,
        COALESCE(NEW.vehicle_type, 'unknown')
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically link payment on insert
CREATE OR REPLACE FUNCTION auto_link_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_active_shift_id UUID;
BEGIN
  -- Get current active shift if not already assigned
  IF NEW.shift_session_id IS NULL THEN
    v_active_shift_id := get_current_active_shift();

    IF v_active_shift_id IS NOT NULL THEN
      NEW.shift_session_id := v_active_shift_id;

      -- Update shift statistics
      PERFORM update_shift_payment_stats(
        v_active_shift_id,
        NEW.amount,
        NEW.payment_mode
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle parking session exit updates
CREATE OR REPLACE FUNCTION handle_parking_session_exit()
RETURNS TRIGGER AS $$
DECLARE
  v_duration_minutes INTEGER;
BEGIN
  -- Only process if exit_time was added
  IF OLD.exit_time IS NULL AND NEW.exit_time IS NOT NULL THEN

    -- Calculate duration in minutes
    v_duration_minutes := EXTRACT(EPOCH FROM (NEW.exit_time - NEW.entry_time)) / 60;

    -- Update shift statistics if linked to a shift
    IF NEW.shift_session_id IS NOT NULL THEN
      PERFORM update_shift_exit_stats(
        NEW.shift_session_id,
        COALESCE(NEW.vehicle_type, 'unknown'),
        v_duration_minutes
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic linking
DROP TRIGGER IF EXISTS trigger_auto_link_parking_session ON parking_sessions;
CREATE TRIGGER trigger_auto_link_parking_session
  BEFORE INSERT ON parking_sessions
  FOR EACH ROW EXECUTE FUNCTION auto_link_parking_session();

DROP TRIGGER IF EXISTS trigger_auto_link_payment ON payments;
CREATE TRIGGER trigger_auto_link_payment
  BEFORE INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION auto_link_payment();

DROP TRIGGER IF EXISTS trigger_handle_parking_exit ON parking_sessions;
CREATE TRIGGER trigger_handle_parking_exit
  AFTER UPDATE ON parking_sessions
  FOR EACH ROW EXECUTE FUNCTION handle_parking_session_exit();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_shift_entry_stats(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_shift_exit_stats(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_shift_payment_stats(UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_active_shift() TO authenticated;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_shift_sessions_status_active
  ON shift_sessions(status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_parking_sessions_shift_id_entry
  ON parking_sessions(shift_session_id, entry_time) WHERE shift_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_shift_id_time
  ON payments(shift_session_id, payment_time) WHERE shift_session_id IS NOT NULL;

-- Function to repair linking for existing data
CREATE OR REPLACE FUNCTION repair_shift_linking(
  p_shift_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_end_time TIMESTAMPTZ;
  v_sessions_linked INTEGER := 0;
  v_payments_linked INTEGER := 0;
  v_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Default end time to now if not provided
  v_end_time := COALESCE(p_end_time, NOW());

  -- Link parking sessions
  BEGIN
    WITH session_updates AS (
      UPDATE parking_sessions
      SET shift_session_id = p_shift_id,
          updated_at = NOW()
      WHERE shift_session_id IS NULL
        AND entry_time >= p_start_time
        AND entry_time <= v_end_time
      RETURNING 1
    )
    SELECT COUNT(*) INTO v_sessions_linked FROM session_updates;
  EXCEPTION
    WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'Error linking parking sessions: ' || SQLERRM);
  END;

  -- Link payments
  BEGIN
    WITH payment_updates AS (
      UPDATE payments
      SET shift_session_id = p_shift_id,
          updated_at = NOW()
      WHERE shift_session_id IS NULL
        AND payment_time >= p_start_time
        AND payment_time <= v_end_time
      RETURNING 1
    )
    SELECT COUNT(*) INTO v_payments_linked FROM payment_updates;
  EXCEPTION
    WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'Error linking payments: ' || SQLERRM);
  END;

  -- Recalculate shift statistics
  BEGIN
    PERFORM recalculate_shift_statistics(p_shift_id);
  EXCEPTION
    WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'Error recalculating statistics: ' || SQLERRM);
  END;

  RETURN json_build_object(
    'success', array_length(v_errors, 1) IS NULL,
    'sessions_linked', v_sessions_linked,
    'payments_linked', v_payments_linked,
    'errors', v_errors
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission for repair function
GRANT EXECUTE ON FUNCTION repair_shift_linking(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION update_shift_entry_stats(UUID, TEXT) IS
'Atomically updates shift statistics when a vehicle enters parking';

COMMENT ON FUNCTION update_shift_exit_stats(UUID, TEXT, INTEGER) IS
'Atomically updates shift statistics when a vehicle exits parking';

COMMENT ON FUNCTION update_shift_payment_stats(UUID, NUMERIC, TEXT) IS
'Atomically updates shift statistics when a payment is received';

COMMENT ON FUNCTION get_current_active_shift() IS
'Returns the ID of the currently active shift, optimized for frequent calls';

COMMENT ON FUNCTION repair_shift_linking(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Repairs shift linking for existing data within a time range and recalculates statistics';