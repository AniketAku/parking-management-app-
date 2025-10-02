-- =============================================================================
-- PARKING ENTRIES INTEGRATION WITH SHIFT MANAGEMENT
-- Link parking activities to shift sessions for comprehensive reporting
-- =============================================================================

-- =============================================================================
-- UPDATE PARKING ENTRIES TABLE
-- =============================================================================
-- Add shift tracking column if it doesn't exist
ALTER TABLE parking_entries
ADD COLUMN IF NOT EXISTS shift_session_id UUID REFERENCES shift_sessions(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_parking_entries_shift ON parking_entries(shift_session_id);

-- Add constraint to ensure entries have shift association (after migration period)
-- ALTER TABLE parking_entries
-- ADD CONSTRAINT parking_entries_require_shift
-- CHECK (shift_session_id IS NOT NULL);

-- =============================================================================
-- AUTO-ASSIGN ACTIVE SHIFT TRIGGER
-- =============================================================================
-- Function to automatically assign current active shift to new parking entries
CREATE OR REPLACE FUNCTION auto_assign_active_shift()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_active_shift_id UUID;
BEGIN
  -- Only assign shift for INSERT operations
  IF TG_OP = 'INSERT' THEN
    -- If shift_session_id is not already set
    IF NEW.shift_session_id IS NULL THEN
      -- Get current active shift
      SELECT id INTO v_active_shift_id
      FROM shift_sessions
      WHERE status = 'active'
      LIMIT 1;

      -- Assign active shift if found
      IF v_active_shift_id IS NOT NULL THEN
        NEW.shift_session_id := v_active_shift_id;
      ELSE
        -- Log warning but allow entry (could be system maintenance)
        RAISE WARNING 'No active shift found for parking entry. Entry created without shift assignment.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Apply trigger to parking_entries
DROP TRIGGER IF EXISTS auto_assign_shift_trigger ON parking_entries;
CREATE TRIGGER auto_assign_shift_trigger
  BEFORE INSERT ON parking_entries
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_active_shift();

-- =============================================================================
-- UPDATE SHIFT STATISTICS WITH REAL PARKING DATA
-- =============================================================================
-- Enhanced shift statistics view with actual parking data
DROP VIEW IF EXISTS shift_statistics;
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

    -- Vehicle entry/exit statistics
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

    -- Financial statistics
    COALESCE(SUM(pe.parking_fee) FILTER (
      WHERE pe.payment_status = 'Paid'
      AND pe.shift_session_id = ss.id
    ), 0) as revenue_collected,

    COALESCE(SUM(pe.parking_fee) FILTER (
      WHERE pe.payment_status = 'Unpaid'
      AND pe.shift_session_id = ss.id
    ), 0) as outstanding_payments,

    -- Performance metrics
    CASE
      WHEN ss.shift_duration_minutes > 0
      THEN COUNT(pe.*) FILTER (
        WHERE pe.entry_time >= ss.shift_start_time
        AND pe.entry_time < COALESCE(ss.shift_end_time, NOW())
      ) / (ss.shift_duration_minutes / 60.0)
      ELSE 0
    END as vehicles_per_hour,

    -- Current shift duration in seconds
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

-- Grant access to the updated view
GRANT SELECT ON shift_statistics TO authenticated;

-- =============================================================================
-- ENHANCED SHIFT REPORTING WITH PARKING DATA
-- =============================================================================
-- Update the shift report generation function to include real parking data
CREATE OR REPLACE FUNCTION generate_shift_report(p_shift_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shift RECORD;
  v_parking_stats JSONB;
  v_financial_summary JSONB;
  v_performance_metrics JSONB;
  v_detailed_entries JSONB;
  v_peak_occupancy INTEGER;
  v_avg_stay_duration DECIMAL;
BEGIN
  -- Get shift details with parking statistics
  SELECT * INTO v_shift
  FROM shift_statistics
  WHERE shift_id = p_shift_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shift not found: %', p_shift_id;
  END IF;

  -- Calculate peak occupancy during shift
  WITH hourly_occupancy AS (
    SELECT
      DATE_TRUNC('hour', pe.entry_time) as hour_start,
      COUNT(*) as entries_in_hour
    FROM parking_entries pe
    WHERE pe.shift_session_id = p_shift_id
      AND pe.entry_time >= v_shift.shift_start_time
      AND pe.entry_time < COALESCE(v_shift.shift_end_time, NOW())
    GROUP BY DATE_TRUNC('hour', pe.entry_time)
  )
  SELECT COALESCE(MAX(entries_in_hour), 0) INTO v_peak_occupancy
  FROM hourly_occupancy;

  -- Calculate average stay duration
  WITH completed_stays AS (
    SELECT
      EXTRACT(EPOCH FROM (exit_time - entry_time)) / 3600.0 as stay_hours
    FROM parking_entries
    WHERE shift_session_id = p_shift_id
      AND exit_time IS NOT NULL
      AND entry_time >= v_shift.shift_start_time
  )
  SELECT ROUND(COALESCE(AVG(stay_hours), 0), 2) INTO v_avg_stay_duration
  FROM completed_stays;

  -- Build parking statistics
  v_parking_stats := jsonb_build_object(
    'vehicles_entered', v_shift.vehicles_entered,
    'vehicles_exited', v_shift.vehicles_exited,
    'vehicles_currently_parked', v_shift.vehicles_currently_parked,
    'peak_occupancy', v_peak_occupancy,
    'average_stay_duration_hours', v_avg_stay_duration,
    'occupancy_rate', CASE
      WHEN v_shift.vehicles_entered > 0
      THEN ROUND((v_shift.vehicles_currently_parked::DECIMAL / v_shift.vehicles_entered) * 100, 2)
      ELSE 0
    END
  );

  -- Enhanced financial summary
  v_financial_summary := jsonb_build_object(
    'opening_cash', v_shift.opening_cash_amount,
    'closing_cash', v_shift.closing_cash_amount,
    'cash_discrepancy', v_shift.cash_discrepancy,
    'revenue_collected', v_shift.revenue_collected,
    'outstanding_payments', v_shift.outstanding_payments,
    'net_cash_flow', COALESCE(v_shift.closing_cash_amount - v_shift.opening_cash_amount, 0),
    'total_potential_revenue', v_shift.revenue_collected + v_shift.outstanding_payments,
    'collection_rate', CASE
      WHEN (v_shift.revenue_collected + v_shift.outstanding_payments) > 0
      THEN ROUND((v_shift.revenue_collected / (v_shift.revenue_collected + v_shift.outstanding_payments)) * 100, 2)
      ELSE 0
    END
  );

  -- Enhanced performance metrics
  v_performance_metrics := jsonb_build_object(
    'shift_duration_minutes', v_shift.shift_duration_minutes,
    'shift_duration_hours', ROUND(COALESCE(v_shift.shift_duration_minutes, 0) / 60.0, 2),
    'vehicles_per_hour', ROUND(v_shift.vehicles_per_hour, 2),
    'revenue_per_hour', ROUND(v_shift.revenue_per_hour, 2),
    'efficiency_score', v_shift.efficiency_score,
    'average_processing_time_minutes', CASE
      WHEN v_shift.vehicles_entered > 0 AND v_shift.shift_duration_minutes > 0
      THEN ROUND(v_shift.shift_duration_minutes::DECIMAL / v_shift.vehicles_entered, 2)
      ELSE 0
    END
  );

  -- Get detailed parking entries for the shift
  SELECT jsonb_agg(
    jsonb_build_object(
      'entry_id', pe.id,
      'vehicle_number', pe.vehicle_number,
      'vehicle_type', pe.vehicle_type,
      'entry_time', pe.entry_time,
      'exit_time', pe.exit_time,
      'status', pe.status,
      'parking_fee', pe.parking_fee,
      'payment_status', pe.payment_status,
      'payment_type', pe.payment_type
    ) ORDER BY pe.entry_time DESC
  ) INTO v_detailed_entries
  FROM parking_entries pe
  WHERE pe.shift_session_id = p_shift_id;

  -- Build comprehensive report
  RETURN jsonb_build_object(
    'shift_id', v_shift.shift_id,
    'employee_name', v_shift.employee_name,
    'shift_start_time', v_shift.shift_start_time,
    'shift_end_time', v_shift.shift_end_time,
    'status', v_shift.status,
    'parking_statistics', v_parking_stats,
    'financial_summary', v_financial_summary,
    'performance_metrics', v_performance_metrics,
    'detailed_entries', COALESCE(v_detailed_entries, '[]'::jsonb),
    'report_generated_at', NOW(),
    'report_period', jsonb_build_object(
      'start', v_shift.shift_start_time,
      'end', COALESCE(v_shift.shift_end_time, NOW())
    )
  );
END;
$$;

-- =============================================================================
-- PARKING-SPECIFIC SHIFT FUNCTIONS
-- =============================================================================
-- Function to get parking activity for current shift
CREATE OR REPLACE FUNCTION get_current_shift_parking_activity()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH active_shift AS (
    SELECT id, shift_start_time
    FROM shift_sessions
    WHERE status = 'active'
    LIMIT 1
  ),
  recent_activity AS (
    SELECT
      pe.vehicle_number,
      pe.vehicle_type,
      pe.entry_time,
      pe.exit_time,
      pe.status,
      pe.parking_fee,
      pe.payment_status
    FROM parking_entries pe
    JOIN active_shift ash ON pe.shift_session_id = ash.id
    ORDER BY COALESCE(pe.exit_time, pe.entry_time) DESC
    LIMIT 10
  )
  SELECT jsonb_build_object(
    'recent_activity', COALESCE(jsonb_agg(to_jsonb(recent_activity)), '[]'::jsonb)
  )
  FROM recent_activity;
$$;

-- Function to get parking revenue breakdown by payment type for a shift
CREATE OR REPLACE FUNCTION get_shift_revenue_breakdown(p_shift_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'revenue_by_payment_type', jsonb_object_agg(
      COALESCE(payment_type, 'Unknown'),
      revenue_amount
    ),
    'revenue_by_vehicle_type', jsonb_object_agg(
      COALESCE(vehicle_type, 'Unknown'),
      vehicle_revenue
    )
  )
  FROM (
    SELECT
      payment_type,
      SUM(parking_fee) as revenue_amount
    FROM parking_entries
    WHERE shift_session_id = p_shift_id
      AND payment_status = 'Paid'
    GROUP BY payment_type
  ) payment_breakdown
  FULL OUTER JOIN (
    SELECT
      vehicle_type,
      SUM(parking_fee) as vehicle_revenue
    FROM parking_entries
    WHERE shift_session_id = p_shift_id
      AND payment_status = 'Paid'
    GROUP BY vehicle_type
  ) vehicle_breakdown ON TRUE;
$$;

-- Function to migrate existing parking entries to active shift
CREATE OR REPLACE FUNCTION migrate_unassigned_parking_entries()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_active_shift_id UUID;
  v_updated_count INTEGER;
BEGIN
  -- Get current active shift
  SELECT id INTO v_active_shift_id
  FROM shift_sessions
  WHERE status = 'active'
  LIMIT 1;

  IF v_active_shift_id IS NULL THEN
    RAISE EXCEPTION 'No active shift found. Cannot migrate parking entries.';
  END IF;

  -- Update unassigned entries from today
  UPDATE parking_entries
  SET shift_session_id = v_active_shift_id
  WHERE shift_session_id IS NULL
    AND entry_time >= CURRENT_DATE
    AND entry_time < CURRENT_DATE + INTERVAL '1 day';

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RETURN v_updated_count;
END;
$$;

-- =============================================================================
-- REALTIME TRIGGERS FOR PARKING UPDATES
-- =============================================================================
-- Enable realtime for parking_entries if not already enabled
ALTER PUBLICATION supabase_realtime ADD TABLE parking_entries;

-- Update parking entries to trigger shift statistics updates
CREATE OR REPLACE FUNCTION notify_parking_shift_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Call the existing shift change notification
  PERFORM notify_shift_changes();

  -- Send specific parking update notification
  PERFORM pg_notify(
    'parking-updates',
    jsonb_build_object(
      'table', 'parking_entries',
      'operation', TG_OP,
      'shift_session_id', COALESCE(NEW.shift_session_id, OLD.shift_session_id),
      'timestamp', NOW(),
      'vehicle_number', COALESCE(NEW.vehicle_number, OLD.vehicle_number)
    )::TEXT
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply parking update trigger
DROP TRIGGER IF EXISTS parking_realtime_trigger ON parking_entries;
CREATE TRIGGER parking_realtime_trigger
  AFTER INSERT OR UPDATE OR DELETE ON parking_entries
  FOR EACH ROW
  EXECUTE FUNCTION notify_parking_shift_updates();

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================
GRANT EXECUTE ON FUNCTION get_current_shift_parking_activity() TO authenticated;
GRANT EXECUTE ON FUNCTION get_shift_revenue_breakdown(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION migrate_unassigned_parking_entries() TO authenticated;

-- =============================================================================
-- UPDATE RLS POLICIES FOR PARKING ENTRIES
-- =============================================================================
-- Enable RLS on parking_entries if not already enabled
ALTER TABLE parking_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can access parking entries for shifts they have access to
DROP POLICY IF EXISTS "parking_entries_shift_access" ON parking_entries;
CREATE POLICY "parking_entries_shift_access" ON parking_entries
  FOR ALL TO authenticated
  USING (
    shift_session_id IS NULL OR -- Allow unassigned entries during migration
    EXISTS (
      SELECT 1 FROM shift_sessions ss
      WHERE ss.id = shift_session_id
      AND can_access_employee_data(ss.employee_id)
    )
  );

-- Comments for documentation
COMMENT ON FUNCTION auto_assign_active_shift() IS 'Automatically assigns current active shift to new parking entries';
COMMENT ON FUNCTION get_current_shift_parking_activity() IS 'Returns recent parking activity for the current active shift';
COMMENT ON FUNCTION get_shift_revenue_breakdown(UUID) IS 'Returns detailed revenue breakdown by payment and vehicle type for a shift';
COMMENT ON FUNCTION migrate_unassigned_parking_entries() IS 'Migrates existing unassigned parking entries to current active shift';
COMMENT ON VIEW shift_statistics IS 'Enhanced view with real parking data for comprehensive shift performance metrics';