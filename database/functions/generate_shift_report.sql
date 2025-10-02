-- =============================================================================
-- SHIFT REPORT GENERATION WITH PRECISE TIME-BOUNDARY LOGIC
-- Automatic report generation based on actual shift change events
-- =============================================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS generate_shift_report(UUID);

-- Comprehensive shift report generation function
CREATE OR REPLACE FUNCTION generate_shift_report(p_shift_id UUID)
RETURNS JSON AS $$
DECLARE
  v_shift shift_sessions%ROWTYPE;
  v_previous_shift_end TIMESTAMPTZ;
  v_report_data JSON;
  v_employee_name TEXT;
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
BEGIN
  -- Get current shift details
  SELECT s.*, e.full_name
  INTO v_shift, v_employee_name
  FROM shift_sessions s
  LEFT JOIN employees e ON s.employee_id = e.id
  WHERE s.id = p_shift_id;

  IF v_shift.id IS NULL THEN
    RAISE EXCEPTION 'Shift not found with ID: %', p_shift_id;
  END IF;

  -- Get previous shift end time for precise report boundary
  SELECT COALESCE(shift_end_time, v_shift.shift_start_time)
  INTO v_previous_shift_end
  FROM shift_sessions
  WHERE shift_end_time < v_shift.shift_start_time
    AND status IN ('completed', 'emergency_ended')
  ORDER BY shift_end_time DESC
  LIMIT 1;

  -- If no previous shift found, use shift start time minus 1 hour
  v_previous_shift_end := COALESCE(v_previous_shift_end, v_shift.shift_start_time - INTERVAL '1 hour');

  -- Set precise report boundaries
  v_period_start := v_previous_shift_end;
  v_period_end := COALESCE(v_shift.shift_end_time, NOW());

  -- Generate comprehensive report with precise time boundaries
  WITH shift_period AS (
    SELECT
      v_period_start as period_start,
      v_period_end as period_end
  ),
  vehicle_activity AS (
    SELECT
      -- Vehicles that entered during this shift period
      COUNT(*) FILTER (
        WHERE entry_time >= sp.period_start
        AND entry_time < sp.period_end
      ) as vehicles_entered,

      -- Vehicles that exited during this shift period
      COUNT(*) FILTER (
        WHERE exit_time >= sp.period_start
        AND exit_time < sp.period_end
        AND exit_time IS NOT NULL
      ) as vehicles_exited,

      -- Vehicles currently parked (entered before period end, not yet exited)
      COUNT(*) FILTER (
        WHERE entry_time < sp.period_end
        AND (exit_time IS NULL OR exit_time >= sp.period_end)
      ) as currently_parked,

      -- Inherited exits (vehicles entered before period, exited during period)
      COUNT(*) FILTER (
        WHERE entry_time < sp.period_start
        AND exit_time >= sp.period_start
        AND exit_time < sp.period_end
        AND exit_time IS NOT NULL
      ) as inherited_exits,

      -- Cross-shift vehicles (entered in previous shift, still active)
      COUNT(*) FILTER (
        WHERE entry_time < sp.period_start
        AND (exit_time IS NULL OR exit_time >= sp.period_start)
      ) as cross_shift_vehicles,

      -- Vehicle entries with full details
      COALESCE(json_agg(
        json_build_object(
          'id', pe.id,
          'vehicle_number', pe.vehicle_number,
          'transport_name', pe.transport_name,
          'entry_time', pe.entry_time,
          'exit_time', pe.exit_time,
          'space_number', pe.space_number,
          'parking_fee', pe.parking_fee,
          'payment_mode', pe.payment_mode,
          'payment_status', pe.payment_status,
          'payment_time', pe.payment_time,
          'duration_minutes', CASE
            WHEN pe.exit_time IS NOT NULL
            THEN EXTRACT(EPOCH FROM (pe.exit_time - pe.entry_time))/60
            ELSE NULL
          END
        )
        ORDER BY pe.entry_time
      ) FILTER (
        WHERE pe.entry_time >= sp.period_start
        AND pe.entry_time < sp.period_end
      ), '[]'::json) as vehicle_entries,

      -- Vehicle exits with full details
      COALESCE(json_agg(
        json_build_object(
          'id', pe.id,
          'vehicle_number', pe.vehicle_number,
          'transport_name', pe.transport_name,
          'entry_time', pe.entry_time,
          'exit_time', pe.exit_time,
          'duration_minutes', EXTRACT(EPOCH FROM (pe.exit_time - pe.entry_time))/60,
          'parking_fee', pe.parking_fee,
          'payment_mode', pe.payment_mode,
          'payment_status', pe.payment_status,
          'payment_time', pe.payment_time
        )
        ORDER BY pe.exit_time
      ) FILTER (
        WHERE pe.exit_time >= sp.period_start
        AND pe.exit_time < sp.period_end
        AND pe.exit_time IS NOT NULL
      ), '[]'::json) as vehicle_exits,

      -- Vehicle type breakdown
      COALESCE(json_object_agg(
        COALESCE(pe.vehicle_type, 'Unknown'),
        COUNT(*)
      ) FILTER (
        WHERE pe.entry_time >= sp.period_start
        AND pe.entry_time < sp.period_end
      ), '{}'::json) as vehicle_type_breakdown

    FROM parking_entries pe
    CROSS JOIN shift_period sp
    WHERE pe.shift_session_id = p_shift_id
       OR (pe.entry_time < sp.period_end AND pe.entry_time >= sp.period_start - INTERVAL '24 hours')
  ),
  financial_summary AS (
    SELECT
      -- Revenue from payments made during shift period
      COALESCE(SUM(pe.parking_fee) FILTER (
        WHERE pe.payment_time >= sp.period_start
        AND pe.payment_time < sp.period_end
        AND pe.payment_status = 'paid'
      ), 0) as total_revenue,

      -- Cash revenue during shift period
      COALESCE(SUM(pe.parking_fee) FILTER (
        WHERE pe.payment_time >= sp.period_start
        AND pe.payment_time < sp.period_end
        AND pe.payment_mode = 'cash'
        AND pe.payment_status = 'paid'
      ), 0) as cash_revenue,

      -- Digital revenue during shift period
      COALESCE(SUM(pe.parking_fee) FILTER (
        WHERE pe.payment_time >= sp.period_start
        AND pe.payment_time < sp.period_end
        AND pe.payment_mode IN ('card', 'upi', 'wallet', 'digital')
        AND pe.payment_status = 'paid'
      ), 0) as digital_revenue,

      -- Pending payments (entries during period, not yet paid)
      COALESCE(SUM(pe.parking_fee) FILTER (
        WHERE pe.payment_status = 'pending'
        AND pe.entry_time >= sp.period_start
        AND pe.entry_time < sp.period_end
      ), 0) as pending_revenue,

      -- Failed/refunded payments
      COALESCE(SUM(pe.parking_fee) FILTER (
        WHERE pe.payment_status IN ('failed', 'refunded')
        AND pe.payment_time >= sp.period_start
        AND pe.payment_time < sp.period_end
      ), 0) as failed_revenue,

      -- Payment mode breakdown
      COALESCE(json_object_agg(
        COALESCE(pe.payment_mode, 'Unknown'),
        COUNT(*)
      ) FILTER (
        WHERE pe.payment_time >= sp.period_start
        AND pe.payment_time < sp.period_end
        AND pe.payment_status = 'paid'
      ), '{}'::json) as payment_mode_breakdown,

      -- Transaction count by status
      COALESCE(json_object_agg(
        pe.payment_status,
        COUNT(*)
      ) FILTER (
        WHERE pe.entry_time >= sp.period_start
        AND pe.entry_time < sp.period_end
      ), '{}'::json) as payment_status_breakdown

    FROM parking_entries pe
    CROSS JOIN shift_period sp
    WHERE pe.shift_session_id = p_shift_id
       OR (pe.entry_time >= sp.period_start AND pe.entry_time < sp.period_end)
  ),
  performance_metrics AS (
    SELECT
      -- Average session duration for completed sessions
      ROUND(COALESCE(AVG(
        EXTRACT(EPOCH FROM (pe.exit_time - pe.entry_time))/60
      ) FILTER (
        WHERE pe.exit_time >= sp.period_start
        AND pe.exit_time < sp.period_end
        AND pe.exit_time IS NOT NULL
      ), 0), 2) as avg_session_duration_minutes,

      -- Vehicles processed per hour
      ROUND(COALESCE(
        (SELECT vehicles_entered FROM vehicle_activity) /
        GREATEST(EXTRACT(EPOCH FROM (sp.period_end - sp.period_start))/3600, 0.1), 0
      ), 2) as vehicles_per_hour,

      -- Revenue per hour
      ROUND(COALESCE(
        (SELECT total_revenue FROM financial_summary) /
        GREATEST(EXTRACT(EPOCH FROM (sp.period_end - sp.period_start))/3600, 0.1), 0
      ), 2) as revenue_per_hour,

      -- Average transaction value
      ROUND(COALESCE(
        (SELECT total_revenue FROM financial_summary) /
        NULLIF((SELECT vehicles_entered FROM vehicle_activity), 0), 0
      ), 2) as avg_transaction_value,

      -- Occupancy efficiency (percentage of time slots occupied)
      ROUND(COALESCE(
        ((SELECT vehicles_entered FROM vehicle_activity) *
         (SELECT avg_session_duration_minutes FROM performance_metrics LIMIT 1) / 60) /
        (EXTRACT(EPOCH FROM (sp.period_end - sp.period_start))/3600) * 100, 0
      ), 2) as occupancy_efficiency_percent,

      -- Peak hour analysis
      json_build_object(
        'peak_entry_hour', (
          SELECT EXTRACT(HOUR FROM pe.entry_time) as hour
          FROM parking_entries pe
          CROSS JOIN shift_period sp
          WHERE pe.entry_time >= sp.period_start
            AND pe.entry_time < sp.period_end
          GROUP BY EXTRACT(HOUR FROM pe.entry_time)
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ),
        'peak_exit_hour', (
          SELECT EXTRACT(HOUR FROM pe.exit_time) as hour
          FROM parking_entries pe
          CROSS JOIN shift_period sp
          WHERE pe.exit_time >= sp.period_start
            AND pe.exit_time < sp.period_end
            AND pe.exit_time IS NOT NULL
          GROUP BY EXTRACT(HOUR FROM pe.exit_time)
          ORDER BY COUNT(*) DESC
          LIMIT 1
        )
      ) as peak_hours

    FROM shift_period sp
  ),
  cash_reconciliation AS (
    SELECT
      v_shift.opening_cash_amount as opening_cash,
      v_shift.closing_cash_amount as closing_cash,
      COALESCE(v_shift.closing_cash_amount - v_shift.opening_cash_amount, 0) as cash_difference,
      (SELECT cash_revenue FROM financial_summary) as expected_cash_increase,
      COALESCE(
        v_shift.closing_cash_amount - v_shift.opening_cash_amount -
        (SELECT cash_revenue FROM financial_summary), 0
      ) as cash_variance
  )

  -- Build comprehensive report JSON with precise time boundaries
  SELECT json_build_object(
    'shift_info', json_build_object(
      'shift_id', v_shift.id,
      'employee_id', v_shift.employee_id,
      'employee_name', COALESCE(v_employee_name, 'Unknown Employee'),
      'shift_start_time', v_shift.shift_start_time,
      'shift_end_time', v_shift.shift_end_time,
      'shift_status', v_shift.status,
      'report_period_start', v_period_start,
      'report_period_end', v_period_end,
      'shift_duration_hours', ROUND(
        EXTRACT(EPOCH FROM (v_period_end - v_shift.shift_start_time))/3600, 2
      ),
      'report_period_hours', ROUND(
        EXTRACT(EPOCH FROM (v_period_end - v_period_start))/3600, 2
      ),
      'shift_notes', v_shift.shift_notes,
      'emergency_reason', v_shift.emergency_reason
    ),
    'vehicle_activity', (SELECT row_to_json(vehicle_activity.*) FROM vehicle_activity),
    'financial_summary', (SELECT row_to_json(financial_summary.*) FROM financial_summary),
    'performance_metrics', (SELECT row_to_json(performance_metrics.*) FROM performance_metrics),
    'cash_reconciliation', (SELECT row_to_json(cash_reconciliation.*) FROM cash_reconciliation),
    'report_metadata', json_build_object(
      'report_generated_at', NOW(),
      'report_version', '2.0',
      'time_boundary_logic', 'precise_shift_boundaries',
      'includes_cross_shift_data', true,
      'data_completeness_check', CASE
        WHEN v_shift.shift_end_time IS NULL THEN 'active_shift_partial_data'
        ELSE 'complete_shift_data'
      END
    )
  ) INTO v_report_data;

  -- Log report generation
  INSERT INTO shift_reports (shift_session_id, report_data, generated_at, report_type)
  VALUES (p_shift_id, v_report_data, NOW(), 'comprehensive')
  ON CONFLICT (shift_session_id)
  DO UPDATE SET
    report_data = EXCLUDED.report_data,
    generated_at = EXCLUDED.generated_at,
    updated_at = NOW();

  RETURN v_report_data;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return error response
    RAISE LOG 'Error generating shift report for shift %: % %', p_shift_id, SQLSTATE, SQLERRM;

    RETURN json_build_object(
      'error', true,
      'message', 'Failed to generate shift report',
      'details', SQLERRM,
      'shift_id', p_shift_id,
      'generated_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_shift_report(UUID) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION generate_shift_report(UUID) IS
'Generates comprehensive shift reports with precise time-boundary logic.
Report period: from previous shift end to current shift end.
Handles cross-shift vehicles and edge cases properly.
Includes vehicle activity, financial summary, performance metrics, and cash reconciliation.';

-- Create shift_reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS shift_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_session_id UUID NOT NULL REFERENCES shift_sessions(id) ON DELETE CASCADE,
  report_data JSONB NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'comprehensive',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_shift_report UNIQUE (shift_session_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shift_reports_shift_id ON shift_reports(shift_session_id);
CREATE INDEX IF NOT EXISTS idx_shift_reports_generated_at ON shift_reports(generated_at);
CREATE INDEX IF NOT EXISTS idx_shift_reports_report_type ON shift_reports(report_type);