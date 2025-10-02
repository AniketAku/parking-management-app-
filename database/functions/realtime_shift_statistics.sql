-- =============================================================================
-- REAL-TIME SHIFT STATISTICS TRACKING
-- Automatic updates for shift statistics as parking events occur
-- =============================================================================

-- Drop existing functions and triggers if they exist
DROP TRIGGER IF EXISTS update_shift_stats_on_parking_entry ON parking_entries;
DROP TRIGGER IF EXISTS update_shift_stats_on_parking_update ON parking_entries;
DROP TRIGGER IF EXISTS update_shift_stats_on_payment ON parking_entries;
DROP FUNCTION IF EXISTS update_shift_statistics_on_entry();
DROP FUNCTION IF EXISTS update_shift_statistics_on_update();
DROP FUNCTION IF EXISTS recalculate_shift_statistics(UUID);

-- Function to get current active shift
CREATE OR REPLACE FUNCTION get_current_active_shift()
RETURNS UUID AS $$
DECLARE
  active_shift_id UUID;
BEGIN
  SELECT id INTO active_shift_id
  FROM shift_sessions
  WHERE status = 'active'
    AND shift_end_time IS NULL
  ORDER BY shift_start_time DESC
  LIMIT 1;

  RETURN active_shift_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update shift statistics when parking entry is created
CREATE OR REPLACE FUNCTION update_shift_statistics_on_entry()
RETURNS TRIGGER AS $$
DECLARE
  current_shift_id UUID;
BEGIN
  -- Get current active shift if not already assigned
  IF NEW.shift_session_id IS NULL THEN
    NEW.shift_session_id := get_current_active_shift();
  END IF;

  current_shift_id := NEW.shift_session_id;

  -- Only proceed if we have a valid shift
  IF current_shift_id IS NOT NULL THEN
    -- Update shift statistics atomically
    UPDATE shift_sessions
    SET
      vehicles_entered = COALESCE(vehicles_entered, 0) + 1,
      currently_parked = COALESCE(currently_parked, 0) + 1,
      updated_at = NOW()
    WHERE id = current_shift_id;

    -- Send real-time notification
    PERFORM pg_notify(
      'shift_statistics_updated',
      json_build_object(
        'type', 'vehicle_entry',
        'shift_id', current_shift_id,
        'vehicle_number', NEW.vehicle_number,
        'entry_time', NEW.entry_time,
        'space_number', NEW.space_number,
        'timestamp', NOW()
      )::text
    );

    RAISE LOG 'Updated shift statistics for vehicle entry: % in shift %',
      NEW.vehicle_number, current_shift_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update shift statistics when parking entry is updated (exit/payment)
CREATE OR REPLACE FUNCTION update_shift_statistics_on_update()
RETURNS TRIGGER AS $$
DECLARE
  shift_id UUID;
  revenue_change NUMERIC := 0;
  cash_change NUMERIC := 0;
  digital_change NUMERIC := 0;
BEGIN
  shift_id := COALESCE(NEW.shift_session_id, OLD.shift_session_id);

  -- Only proceed if we have a valid shift
  IF shift_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Handle vehicle exit (when exit_time is set for first time)
  IF NEW.exit_time IS NOT NULL AND OLD.exit_time IS NULL THEN
    UPDATE shift_sessions
    SET
      vehicles_exited = COALESCE(vehicles_exited, 0) + 1,
      currently_parked = GREATEST(COALESCE(currently_parked, 0) - 1, 0),
      updated_at = NOW()
    WHERE id = shift_id;

    -- Send real-time notification
    PERFORM pg_notify(
      'shift_statistics_updated',
      json_build_object(
        'type', 'vehicle_exit',
        'shift_id', shift_id,
        'vehicle_number', NEW.vehicle_number,
        'exit_time', NEW.exit_time,
        'duration_minutes', EXTRACT(EPOCH FROM (NEW.exit_time - NEW.entry_time))/60,
        'timestamp', NOW()
      )::text
    );
  END IF;

  -- Handle payment status changes
  IF NEW.payment_status != OLD.payment_status OR
     NEW.parking_fee != OLD.parking_fee OR
     NEW.payment_mode != OLD.payment_mode THEN

    -- Calculate revenue changes
    IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
      revenue_change := COALESCE(NEW.parking_fee, 0);

      IF NEW.payment_mode = 'cash' THEN
        cash_change := revenue_change;
      ELSE
        digital_change := revenue_change;
      END IF;

    ELSIF OLD.payment_status = 'paid' AND NEW.payment_status != 'paid' THEN
      -- Payment was reversed
      revenue_change := -COALESCE(OLD.parking_fee, 0);

      IF OLD.payment_mode = 'cash' THEN
        cash_change := revenue_change;
      ELSE
        digital_change := revenue_change;
      END IF;

    ELSIF NEW.payment_status = 'paid' AND OLD.payment_status = 'paid' THEN
      -- Payment amount or method changed
      revenue_change := COALESCE(NEW.parking_fee, 0) - COALESCE(OLD.parking_fee, 0);

      -- Handle payment mode changes
      IF NEW.payment_mode != OLD.payment_mode THEN
        -- Remove old payment method amount
        IF OLD.payment_mode = 'cash' THEN
          cash_change := -COALESCE(OLD.parking_fee, 0);
          digital_change := COALESCE(NEW.parking_fee, 0);
        ELSE
          digital_change := -COALESCE(OLD.parking_fee, 0);
          cash_change := COALESCE(NEW.parking_fee, 0);
        END IF;
      ELSE
        -- Same payment method, just amount change
        IF NEW.payment_mode = 'cash' THEN
          cash_change := revenue_change;
        ELSE
          digital_change := revenue_change;
        END IF;
      END IF;
    END IF;

    -- Update shift statistics if there are changes
    IF revenue_change != 0 OR cash_change != 0 OR digital_change != 0 THEN
      UPDATE shift_sessions
      SET
        total_revenue = COALESCE(total_revenue, 0) + revenue_change,
        cash_collected = COALESCE(cash_collected, 0) + cash_change,
        digital_collected = COALESCE(digital_collected, 0) + digital_change,
        updated_at = NOW()
      WHERE id = shift_id;

      -- Send real-time notification
      PERFORM pg_notify(
        'shift_statistics_updated',
        json_build_object(
          'type', 'payment_update',
          'shift_id', shift_id,
          'vehicle_number', NEW.vehicle_number,
          'payment_status', NEW.payment_status,
          'payment_mode', NEW.payment_mode,
          'amount', NEW.parking_fee,
          'revenue_change', revenue_change,
          'timestamp', NOW()
        )::text
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic shift statistics updates
CREATE TRIGGER update_shift_stats_on_parking_entry
  BEFORE INSERT ON parking_entries
  FOR EACH ROW EXECUTE FUNCTION update_shift_statistics_on_entry();

CREATE TRIGGER update_shift_stats_on_parking_update
  AFTER UPDATE ON parking_entries
  FOR EACH ROW EXECUTE FUNCTION update_shift_statistics_on_update();

-- Function to recalculate shift statistics (for data consistency)
CREATE OR REPLACE FUNCTION recalculate_shift_statistics(p_shift_id UUID)
RETURNS JSON AS $$
DECLARE
  v_stats RECORD;
  v_result JSON;
BEGIN
  -- Calculate accurate statistics from parking_entries
  SELECT
    COUNT(*) as vehicles_entered,
    COUNT(*) FILTER (WHERE exit_time IS NOT NULL) as vehicles_exited,
    COUNT(*) FILTER (WHERE exit_time IS NULL) as currently_parked,
    COALESCE(SUM(parking_fee) FILTER (WHERE payment_status = 'paid'), 0) as total_revenue,
    COALESCE(SUM(parking_fee) FILTER (WHERE payment_status = 'paid' AND payment_mode = 'cash'), 0) as cash_collected,
    COALESCE(SUM(parking_fee) FILTER (WHERE payment_status = 'paid' AND payment_mode IN ('card', 'upi', 'wallet', 'digital')), 0) as digital_collected,
    ROUND(AVG(parking_fee) FILTER (WHERE payment_status = 'paid'), 2) as average_transaction,
    ROUND(AVG(EXTRACT(EPOCH FROM (exit_time - entry_time))/60) FILTER (WHERE exit_time IS NOT NULL), 2) as average_duration_minutes
  INTO v_stats
  FROM parking_entries
  WHERE shift_session_id = p_shift_id;

  -- Update shift_sessions with calculated statistics
  UPDATE shift_sessions
  SET
    vehicles_entered = v_stats.vehicles_entered,
    vehicles_exited = v_stats.vehicles_exited,
    currently_parked = v_stats.currently_parked,
    total_revenue = v_stats.total_revenue,
    cash_collected = v_stats.cash_collected,
    digital_collected = v_stats.digital_collected,
    average_transaction = v_stats.average_transaction,
    average_duration_minutes = v_stats.average_duration_minutes,
    updated_at = NOW()
  WHERE id = p_shift_id;

  -- Return the updated statistics
  SELECT json_build_object(
    'shift_id', p_shift_id,
    'vehicles_entered', v_stats.vehicles_entered,
    'vehicles_exited', v_stats.vehicles_exited,
    'currently_parked', v_stats.currently_parked,
    'total_revenue', v_stats.total_revenue,
    'cash_collected', v_stats.cash_collected,
    'digital_collected', v_stats.digital_collected,
    'average_transaction', v_stats.average_transaction,
    'average_duration_minutes', v_stats.average_duration_minutes,
    'recalculated_at', NOW()
  ) INTO v_result;

  -- Send notification about recalculation
  PERFORM pg_notify(
    'shift_statistics_updated',
    json_build_object(
      'type', 'statistics_recalculated',
      'shift_id', p_shift_id,
      'statistics', v_result,
      'timestamp', NOW()
    )::text
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error recalculating shift statistics for %: %', p_shift_id, SQLERRM;
    RETURN json_build_object(
      'error', true,
      'message', 'Failed to recalculate statistics',
      'shift_id', p_shift_id,
      'details', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to batch update shift statistics (for performance optimization)
CREATE OR REPLACE FUNCTION batch_update_shift_statistics()
RETURNS TABLE(
  shift_id UUID,
  updates_applied INTEGER,
  processing_time NUMERIC
) AS $$
DECLARE
  processing_start TIMESTAMPTZ;
  shift_record RECORD;
  updates_count INTEGER := 0;
BEGIN
  processing_start := NOW();

  -- Process all active shifts that need statistics updates
  FOR shift_record IN
    SELECT s.id, s.updated_at
    FROM shift_sessions s
    WHERE s.status = 'active'
      AND EXISTS (
        SELECT 1 FROM parking_entries pe
        WHERE pe.shift_session_id = s.id
          AND pe.updated_at > s.updated_at
      )
    ORDER BY s.shift_start_time
  LOOP
    -- Recalculate statistics for this shift
    PERFORM recalculate_shift_statistics(shift_record.id);
    updates_count := updates_count + 1;

    -- Return progress for this shift
    RETURN QUERY SELECT
      shift_record.id,
      updates_count,
      EXTRACT(EPOCH FROM (NOW() - processing_start))::NUMERIC;
  END LOOP;

  -- Log batch processing completion
  RAISE LOG 'Batch updated statistics for % shifts in % seconds',
    updates_count, EXTRACT(EPOCH FROM (NOW() - processing_start));

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle edge cases when no active shift exists
CREATE OR REPLACE FUNCTION handle_orphaned_parking_entries()
RETURNS INTEGER AS $$
DECLARE
  orphaned_count INTEGER := 0;
  default_shift_id UUID;
BEGIN
  -- Check for parking entries without shift assignment
  SELECT COUNT(*) INTO orphaned_count
  FROM parking_entries
  WHERE shift_session_id IS NULL
    AND entry_time >= CURRENT_DATE;

  IF orphaned_count > 0 THEN
    -- Try to get the most recent active shift
    SELECT id INTO default_shift_id
    FROM shift_sessions
    WHERE status = 'active'
    ORDER BY shift_start_time DESC
    LIMIT 1;

    IF default_shift_id IS NOT NULL THEN
      -- Assign orphaned entries to the active shift
      UPDATE parking_entries
      SET shift_session_id = default_shift_id
      WHERE shift_session_id IS NULL
        AND entry_time >= CURRENT_DATE;

      -- Recalculate statistics for the shift
      PERFORM recalculate_shift_statistics(default_shift_id);

      RAISE LOG 'Assigned % orphaned parking entries to shift %', orphaned_count, default_shift_id;
    ELSE
      RAISE LOG 'Found % orphaned parking entries but no active shift available', orphaned_count;
    END IF;
  END IF;

  RETURN orphaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get real-time shift statistics
CREATE OR REPLACE FUNCTION get_realtime_shift_statistics(p_shift_id UUID)
RETURNS JSON AS $$
DECLARE
  v_shift RECORD;
  v_live_stats JSON;
  v_duration_minutes NUMERIC;
BEGIN
  -- Get shift basic info with live calculations
  SELECT
    ss.*,
    EXTRACT(EPOCH FROM (COALESCE(ss.shift_end_time, NOW()) - ss.shift_start_time))/60 as duration_minutes
  INTO v_shift
  FROM shift_sessions ss
  WHERE ss.id = p_shift_id;

  IF v_shift.id IS NULL THEN
    RETURN json_build_object('error', true, 'message', 'Shift not found');
  END IF;

  -- Calculate real-time statistics
  WITH live_calculations AS (
    SELECT
      COUNT(*) as total_entries,
      COUNT(*) FILTER (WHERE exit_time IS NOT NULL) as completed_sessions,
      COUNT(*) FILTER (WHERE exit_time IS NULL) as active_sessions,
      COALESCE(SUM(parking_fee) FILTER (WHERE payment_status = 'paid'), 0) as confirmed_revenue,
      COALESCE(SUM(parking_fee) FILTER (WHERE payment_status = 'pending'), 0) as pending_revenue,
      COALESCE(SUM(parking_fee) FILTER (WHERE payment_mode = 'cash' AND payment_status = 'paid'), 0) as cash_revenue,
      COALESCE(SUM(parking_fee) FILTER (WHERE payment_mode != 'cash' AND payment_status = 'paid'), 0) as digital_revenue,
      ROUND(AVG(parking_fee) FILTER (WHERE payment_status = 'paid'), 2) as avg_transaction,
      ROUND(AVG(EXTRACT(EPOCH FROM (exit_time - entry_time))/60) FILTER (WHERE exit_time IS NOT NULL), 2) as avg_duration_minutes,
      ROUND(COUNT(*) / (v_shift.duration_minutes / 60.0), 2) as vehicles_per_hour,
      ROUND(COALESCE(SUM(parking_fee) FILTER (WHERE payment_status = 'paid'), 0) / (v_shift.duration_minutes / 60.0), 2) as revenue_per_hour
    FROM parking_entries
    WHERE shift_session_id = p_shift_id
  )
  SELECT json_build_object(
    'shift_id', v_shift.id,
    'employee_id', v_shift.employee_id,
    'shift_status', v_shift.status,
    'shift_start_time', v_shift.shift_start_time,
    'shift_end_time', v_shift.shift_end_time,
    'duration_minutes', v_shift.duration_minutes,
    'opening_cash', v_shift.opening_cash_amount,
    'closing_cash', v_shift.closing_cash_amount,

    -- Live statistics
    'vehicles_entered', lc.total_entries,
    'vehicles_exited', lc.completed_sessions,
    'currently_parked', lc.active_sessions,
    'total_revenue', lc.confirmed_revenue,
    'pending_revenue', lc.pending_revenue,
    'cash_collected', lc.cash_revenue,
    'digital_collected', lc.digital_revenue,
    'average_transaction', lc.avg_transaction,
    'average_duration_minutes', lc.avg_duration_minutes,

    -- Performance metrics
    'vehicles_per_hour', lc.vehicles_per_hour,
    'revenue_per_hour', lc.revenue_per_hour,
    'occupancy_rate', CASE
      WHEN lc.active_sessions > 0 THEN ROUND((lc.active_sessions::NUMERIC / 100) * 100, 2) -- Assuming 100 total spaces
      ELSE 0
    END,

    -- Real-time indicators
    'last_updated', NOW(),
    'is_active', (v_shift.status = 'active'),
    'has_recent_activity', EXISTS(
      SELECT 1 FROM parking_entries
      WHERE shift_session_id = p_shift_id
        AND (entry_time > NOW() - INTERVAL '5 minutes' OR
             exit_time > NOW() - INTERVAL '5 minutes' OR
             payment_time > NOW() - INTERVAL '5 minutes')
    )
  ) INTO v_live_stats
  FROM live_calculations lc;

  RETURN v_live_stats;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'error', true,
      'message', 'Failed to get real-time statistics',
      'details', SQLERRM,
      'shift_id', p_shift_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_current_active_shift() TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_shift_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION batch_update_shift_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_orphaned_parking_entries() TO authenticated;
GRANT EXECUTE ON FUNCTION get_realtime_shift_statistics(UUID) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_current_active_shift() IS 'Returns the ID of the currently active shift session';
COMMENT ON FUNCTION update_shift_statistics_on_entry() IS 'Automatically updates shift statistics when a parking entry is created';
COMMENT ON FUNCTION update_shift_statistics_on_update() IS 'Automatically updates shift statistics when parking entries are updated (exits/payments)';
COMMENT ON FUNCTION recalculate_shift_statistics(UUID) IS 'Recalculates all shift statistics from parking_entries data for accuracy';
COMMENT ON FUNCTION batch_update_shift_statistics() IS 'Batch processes shift statistics updates for performance optimization';
COMMENT ON FUNCTION handle_orphaned_parking_entries() IS 'Handles parking entries that were created without a shift assignment';
COMMENT ON FUNCTION get_realtime_shift_statistics(UUID) IS 'Returns comprehensive real-time statistics for a shift with live calculations';