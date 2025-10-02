-- =============================================================================
-- SHIFT MANAGEMENT HELPER FUNCTIONS
-- Business Logic and Operations Support
-- =============================================================================

-- =============================================================================
-- CORE SHIFT OPERATIONS FUNCTIONS
-- =============================================================================

-- Function to start a new shift with validation
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
  v_shift_id UUID;
  v_active_shift_count INTEGER;
BEGIN
  -- Validate inputs
  IF p_employee_id IS NULL OR p_employee_name IS NULL THEN
    RAISE EXCEPTION 'Employee ID and name are required';
  END IF;

  IF p_opening_cash < 0 THEN
    RAISE EXCEPTION 'Opening cash amount cannot be negative: %', p_opening_cash;
  END IF;

  -- Check for existing active shifts
  SELECT COUNT(*) INTO v_active_shift_count
  FROM shift_sessions
  WHERE status = 'active';

  IF v_active_shift_count > 0 THEN
    RAISE EXCEPTION 'Cannot start new shift: Another shift is already active. Complete handover first.';
  END IF;

  -- Create new shift session
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

  -- Log the shift start
  PERFORM log_shift_access_attempt(
    'SHIFT_STARTED',
    'shift_sessions',
    v_shift_id,
    TRUE,
    'New shift started successfully'
  );

  RETURN v_shift_id;
END;
$$;

-- Function to end a shift with proper validation and reporting
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
AS $$
DECLARE
  v_shift RECORD;
  v_new_status shift_status_enum;
  v_shift_report JSONB;
  v_cash_discrepancy DECIMAL(10,2);
BEGIN
  -- Validate inputs
  IF p_closing_cash < 0 THEN
    RAISE EXCEPTION 'Closing cash amount cannot be negative: %', p_closing_cash;
  END IF;

  -- Get current shift details
  SELECT * INTO v_shift
  FROM shift_sessions
  WHERE id = p_shift_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active shift not found with ID: %', p_shift_id;
  END IF;

  -- Determine new status
  v_new_status := CASE
    WHEN p_emergency_end THEN 'emergency_ended'::shift_status_enum
    ELSE 'completed'::shift_status_enum
  END;

  -- Validate emergency end requires supervisor (in production, check actual permissions)
  IF p_emergency_end AND p_supervisor_id IS NULL THEN
    RAISE EXCEPTION 'Emergency shift end requires supervisor approval';
  END IF;

  -- Calculate cash discrepancy
  v_cash_discrepancy := p_closing_cash - v_shift.opening_cash_amount;

  -- Update shift session
  UPDATE shift_sessions
  SET
    shift_end_time = NOW(),
    closing_cash_amount = p_closing_cash,
    status = v_new_status,
    shift_notes = COALESCE(p_shift_notes, shift_notes),
    updated_at = NOW()
  WHERE id = p_shift_id;

  -- Generate shift report
  v_shift_report := generate_shift_report(p_shift_id);

  -- Log the shift end
  PERFORM log_shift_access_attempt(
    CASE WHEN p_emergency_end THEN 'EMERGENCY_SHIFT_END' ELSE 'SHIFT_ENDED' END,
    'shift_sessions',
    p_shift_id,
    TRUE,
    'Shift ended successfully'
  );

  RETURN jsonb_build_object(
    'shift_id', p_shift_id,
    'status', v_new_status,
    'cash_discrepancy', v_cash_discrepancy,
    'shift_report', v_shift_report,
    'ended_at', NOW()
  );
END;
$$;

-- Function to perform shift handover
CREATE OR REPLACE FUNCTION perform_shift_handover(
  p_outgoing_shift_id UUID,
  p_incoming_employee_id UUID,
  p_incoming_employee_name VARCHAR(255),
  p_incoming_employee_phone VARCHAR(20) DEFAULT NULL,
  p_closing_cash DECIMAL(10,2),
  p_opening_cash DECIMAL(10,2),
  p_handover_notes TEXT DEFAULT NULL,
  p_pending_issues TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_outgoing_shift RECORD;
  v_new_shift_id UUID;
  v_shift_change_id UUID;
  v_handover_result JSONB;
BEGIN
  -- Start transaction for atomic handover
  BEGIN
    -- Get outgoing shift details
    SELECT * INTO v_outgoing_shift
    FROM shift_sessions
    WHERE id = p_outgoing_shift_id AND status = 'active';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Active outgoing shift not found: %', p_outgoing_shift_id;
    END IF;

    -- End the outgoing shift
    SELECT * INTO v_handover_result
    FROM end_shift(
      p_outgoing_shift_id,
      p_closing_cash,
      p_handover_notes,
      FALSE -- Not emergency end
    );

    -- Start the new shift
    SELECT start_shift(
      p_incoming_employee_id,
      p_incoming_employee_name,
      p_incoming_employee_phone,
      p_opening_cash,
      'Shift started via handover'
    ) INTO v_new_shift_id;

    -- Create shift change record
    INSERT INTO shift_changes (
      previous_shift_session_id,
      new_shift_session_id,
      change_timestamp,
      handover_notes,
      cash_transferred,
      pending_issues,
      outgoing_employee_id,
      outgoing_employee_name,
      incoming_employee_id,
      incoming_employee_name,
      change_type
    ) VALUES (
      p_outgoing_shift_id,
      v_new_shift_id,
      NOW(),
      p_handover_notes,
      p_closing_cash,
      p_pending_issues,
      v_outgoing_shift.employee_id,
      v_outgoing_shift.employee_name,
      p_incoming_employee_id,
      p_incoming_employee_name,
      'normal'
    )
    RETURNING id INTO v_shift_change_id;

    -- Return handover summary
    RETURN jsonb_build_object(
      'handover_id', v_shift_change_id,
      'outgoing_shift_report', v_handover_result,
      'new_shift_id', v_new_shift_id,
      'handover_timestamp', NOW(),
      'cash_transferred', p_closing_cash,
      'pending_issues', p_pending_issues
    );

  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback will happen automatically
      RAISE EXCEPTION 'Handover failed: %', SQLERRM;
  END;
END;
$$;

-- =============================================================================
-- SHIFT REPORTING FUNCTIONS
-- =============================================================================

-- Function to generate comprehensive shift report
CREATE OR REPLACE FUNCTION generate_shift_report(p_shift_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shift RECORD;
  v_report JSONB;
  v_parking_stats JSONB;
  v_financial_summary JSONB;
  v_performance_metrics JSONB;
BEGIN
  -- Get shift details
  SELECT * INTO v_shift
  FROM shift_sessions
  WHERE id = p_shift_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shift not found: %', p_shift_id;
  END IF;

  -- Calculate parking statistics (placeholder - will be enhanced when parking integration is added)
  v_parking_stats := jsonb_build_object(
    'vehicles_entered', 0,
    'vehicles_exited', 0,
    'current_occupancy', 0,
    'peak_occupancy', 0,
    'average_stay_duration', 0
  );

  -- Calculate financial summary
  v_financial_summary := jsonb_build_object(
    'opening_cash', v_shift.opening_cash_amount,
    'closing_cash', v_shift.closing_cash_amount,
    'cash_discrepancy', v_shift.cash_discrepancy,
    'revenue_collected', 0.00, -- Will be calculated from parking entries
    'outstanding_payments', 0.00,
    'net_cash_flow', COALESCE(v_shift.closing_cash_amount - v_shift.opening_cash_amount, 0)
  );

  -- Calculate performance metrics
  v_performance_metrics := jsonb_build_object(
    'shift_duration_minutes', v_shift.shift_duration_minutes,
    'shift_duration_hours', ROUND(COALESCE(v_shift.shift_duration_minutes, 0) / 60.0, 2),
    'vehicles_per_hour', 0, -- Will be calculated from parking data
    'revenue_per_hour', 0.00,
    'efficiency_score', 0.0
  );

  -- Build comprehensive report
  v_report := jsonb_build_object(
    'shift_id', v_shift.id,
    'employee_id', v_shift.employee_id,
    'employee_name', v_shift.employee_name,
    'shift_start_time', v_shift.shift_start_time,
    'shift_end_time', v_shift.shift_end_time,
    'status', v_shift.status,
    'shift_notes', v_shift.shift_notes,
    'parking_statistics', v_parking_stats,
    'financial_summary', v_financial_summary,
    'performance_metrics', v_performance_metrics,
    'report_generated_at', NOW(),
    'report_period', jsonb_build_object(
      'start', v_shift.shift_start_time,
      'end', COALESCE(v_shift.shift_end_time, NOW())
    )
  );

  RETURN v_report;
END;
$$;

-- Function to get active shift information
CREATE OR REPLACE FUNCTION get_current_active_shift()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT to_jsonb(ss) || jsonb_build_object(
    'current_duration_seconds', EXTRACT(EPOCH FROM (NOW() - shift_start_time))::INTEGER,
    'current_duration_minutes', EXTRACT(EPOCH FROM (NOW() - shift_start_time))::INTEGER / 60
  )
  FROM shift_sessions ss
  WHERE status = 'active'
  LIMIT 1;
$$;

-- Function to get shift history for an employee
CREATE OR REPLACE FUNCTION get_employee_shift_history(
  p_employee_id UUID,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
)
RETURNS SETOF shift_sessions
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT *
  FROM shift_sessions
  WHERE employee_id = p_employee_id
  ORDER BY shift_start_time DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- =============================================================================
-- SHIFT VALIDATION FUNCTIONS
-- =============================================================================

-- Function to validate shift timing constraints
CREATE OR REPLACE FUNCTION validate_shift_timing(
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if start time is reasonable (not too far in past or future)
  IF p_start_time < NOW() - INTERVAL '24 hours' THEN
    RAISE EXCEPTION 'Shift start time cannot be more than 24 hours in the past';
  END IF;

  IF p_start_time > NOW() + INTERVAL '1 hour' THEN
    RAISE EXCEPTION 'Shift start time cannot be more than 1 hour in the future';
  END IF;

  -- If end time provided, validate relationship
  IF p_end_time IS NOT NULL THEN
    IF p_end_time <= p_start_time THEN
      RAISE EXCEPTION 'Shift end time must be after start time';
    END IF;

    IF p_end_time - p_start_time > INTERVAL '24 hours' THEN
      RAISE EXCEPTION 'Shift duration cannot exceed 24 hours';
    END IF;
  END IF;

  RETURN TRUE;
END;
$$;

-- Function to check if emergency shift end is allowed
CREATE OR REPLACE FUNCTION can_emergency_end_shift(
  p_shift_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shift RECORD;
  v_is_supervisor BOOLEAN;
BEGIN
  -- Get shift details
  SELECT * INTO v_shift
  FROM shift_sessions
  WHERE id = p_shift_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Check if user is supervisor or the shift owner
  v_is_supervisor := is_supervisor_or_manager();

  RETURN (
    v_shift.status = 'active' AND
    (v_is_supervisor OR v_shift.employee_id = COALESCE(p_user_id, current_employee_id()))
  );
END;
$$;

-- =============================================================================
-- SHIFT STATISTICS FUNCTIONS
-- =============================================================================

-- Function to get real-time shift statistics
CREATE OR REPLACE FUNCTION get_shift_statistics(p_shift_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats JSONB;
BEGIN
  -- Get statistics from the view (enhanced when parking integration is added)
  SELECT to_jsonb(ss) INTO v_stats
  FROM shift_statistics ss
  WHERE id = p_shift_id;

  IF v_stats IS NULL THEN
    RAISE EXCEPTION 'Shift not found: %', p_shift_id;
  END IF;

  RETURN v_stats;
END;
$$;

-- Function to get daily shift summary
CREATE OR REPLACE FUNCTION get_daily_shift_summary(p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'date', p_date,
    'total_shifts', COUNT(*),
    'total_shift_hours', ROUND(SUM(COALESCE(shift_duration_minutes, 0)) / 60.0, 2),
    'total_cash_collected', SUM(COALESCE(closing_cash_amount - opening_cash_amount, 0)),
    'emergency_ends', COUNT(*) FILTER (WHERE status = 'emergency_ended'),
    'shifts', jsonb_agg(
      jsonb_build_object(
        'shift_id', id,
        'employee_name', employee_name,
        'start_time', shift_start_time,
        'end_time', shift_end_time,
        'duration_minutes', shift_duration_minutes,
        'status', status
      ) ORDER BY shift_start_time
    )
  )
  FROM shift_sessions
  WHERE DATE(shift_start_time) = p_date;
$$;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================
-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION start_shift(UUID, VARCHAR, VARCHAR, DECIMAL, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION end_shift(UUID, DECIMAL, TEXT, BOOLEAN, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION perform_shift_handover(UUID, UUID, VARCHAR, VARCHAR, DECIMAL, DECIMAL, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_shift_report(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_active_shift() TO authenticated;
GRANT EXECUTE ON FUNCTION get_employee_shift_history(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_shift_timing(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION can_emergency_end_shift(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_shift_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_shift_summary(DATE) TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION start_shift(UUID, VARCHAR, VARCHAR, DECIMAL, TEXT) IS 'Starts a new shift with validation and returns shift ID';
COMMENT ON FUNCTION end_shift(UUID, DECIMAL, TEXT, BOOLEAN, UUID) IS 'Ends an active shift and generates comprehensive report';
COMMENT ON FUNCTION perform_shift_handover(UUID, UUID, VARCHAR, VARCHAR, DECIMAL, DECIMAL, TEXT, TEXT) IS 'Performs atomic shift handover between employees';
COMMENT ON FUNCTION generate_shift_report(UUID) IS 'Generates comprehensive shift performance report';
COMMENT ON FUNCTION get_current_active_shift() IS 'Returns current active shift information with real-time duration';
COMMENT ON FUNCTION get_daily_shift_summary(DATE) IS 'Returns summary of all shifts for a specific date';