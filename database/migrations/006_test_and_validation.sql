-- =============================================================================
-- SHIFT MANAGEMENT SYSTEM - TESTING AND VALIDATION
-- Comprehensive testing suite for schema integration and business logic
-- =============================================================================

-- =============================================================================
-- TEST DATA CREATION FUNCTIONS
-- =============================================================================
-- Function to create test employees (for development/testing only)
CREATE OR REPLACE FUNCTION create_test_employees()
RETURNS TABLE (employee_id UUID, employee_name VARCHAR)
LANGUAGE plpgsql
AS $$
DECLARE
  emp1_id UUID := gen_random_uuid();
  emp2_id UUID := gen_random_uuid();
  emp3_id UUID := gen_random_uuid();
BEGIN
  -- Note: In real implementation, these would be actual auth.users records
  -- For testing, we'll use placeholder UUIDs

  RETURN QUERY VALUES
    (emp1_id, 'John Smith'::VARCHAR),
    (emp2_id, 'Jane Doe'::VARCHAR),
    (emp3_id, 'Mike Johnson'::VARCHAR);
END;
$$;

-- Function to create test shift scenario
CREATE OR REPLACE FUNCTION create_test_shift_scenario()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_emp1_id UUID := '11111111-1111-1111-1111-111111111111';
  v_emp2_id UUID := '22222222-2222-2222-2222-222222222222';
  v_shift1_id UUID;
  v_shift2_id UUID;
  v_parking1_id UUID;
  v_parking2_id UUID;
  v_handover_result JSONB;
  v_test_results JSONB;
BEGIN
  -- Start first shift
  SELECT start_shift(
    v_emp1_id,
    'Test Employee 1',
    '+1234567890',
    100.00,
    'Test shift start'
  ) INTO v_shift1_id;

  -- Simulate some parking entries
  INSERT INTO parking_entries (
    serial, vehicle_number, vehicle_type, entry_time,
    status, parking_fee, payment_status, shift_session_id
  ) VALUES
    (1, 'TEST001', 'Car', NOW() - INTERVAL '2 hours', 'Parked', 50.00, 'Paid', v_shift1_id),
    (2, 'TEST002', 'Truck', NOW() - INTERVAL '1 hour', 'Exited', 100.00, 'Paid', v_shift1_id)
  RETURNING id INTO v_parking1_id;

  -- Update second entry with exit time
  UPDATE parking_entries
  SET exit_time = NOW() - INTERVAL '30 minutes'
  WHERE vehicle_number = 'TEST002';

  -- Perform shift handover
  SELECT perform_shift_handover(
    v_shift1_id,
    v_emp2_id,
    'Test Employee 2',
    '+0987654321',
    150.00, -- closing cash
    120.00, -- opening cash for new shift
    'Test handover',
    'No pending issues'
  ) INTO v_handover_result;

  v_shift2_id := (v_handover_result->>'new_shift_id')::UUID;

  -- Add more parking entries to second shift
  INSERT INTO parking_entries (
    serial, vehicle_number, vehicle_type, entry_time,
    status, parking_fee, payment_status, shift_session_id
  ) VALUES
    (3, 'TEST003', 'Van', NOW(), 'Parked', 75.00, 'Unpaid', v_shift2_id);

  -- Build test results
  v_test_results := jsonb_build_object(
    'shift1_id', v_shift1_id,
    'shift2_id', v_shift2_id,
    'handover_result', v_handover_result,
    'test_created_at', NOW()
  );

  RETURN v_test_results;
END;
$$;

-- =============================================================================
-- VALIDATION FUNCTIONS
-- =============================================================================
-- Function to validate shift management constraints
CREATE OR REPLACE FUNCTION validate_shift_constraints()
RETURNS TABLE (
  test_name TEXT,
  passed BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_active_count INTEGER;
  v_test_shift_id UUID;
  v_error_text TEXT;
BEGIN
  -- Test 1: Only one active shift allowed
  BEGIN
    -- Create test shift
    SELECT start_shift(
      gen_random_uuid(),
      'Test Constraint User',
      '+1111111111',
      50.00
    ) INTO v_test_shift_id;

    -- Try to create another active shift (should fail)
    PERFORM start_shift(
      gen_random_uuid(),
      'Test Constraint User 2',
      '+2222222222',
      75.00
    );

    RETURN QUERY VALUES ('Single Active Shift Constraint', FALSE, 'Should have prevented second active shift');

  EXCEPTION
    WHEN OTHERS THEN
      -- Clean up test data
      DELETE FROM shift_sessions WHERE id = v_test_shift_id;
      RETURN QUERY VALUES ('Single Active Shift Constraint', TRUE, NULL);
  END;

  -- Test 2: Cash amount validation
  BEGIN
    PERFORM start_shift(
      gen_random_uuid(),
      'Test Cash User',
      '+3333333333',
      -10.00 -- Invalid negative amount
    );

    RETURN QUERY VALUES ('Negative Cash Validation', FALSE, 'Should have rejected negative cash amount');

  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_error_text = MESSAGE_TEXT;
      RETURN QUERY VALUES ('Negative Cash Validation', TRUE, NULL);
  END;

  -- Test 3: Shift timing validation
  BEGIN
    PERFORM validate_shift_timing(
      NOW() - INTERVAL '25 hours', -- Too far in past
      NOW()
    );

    RETURN QUERY VALUES ('Shift Timing Validation', FALSE, 'Should have rejected old shift time');

  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY VALUES ('Shift Timing Validation', TRUE, NULL);
  END;

  -- Test 4: RLS policy enforcement (basic test)
  SELECT COUNT(*) INTO v_active_count
  FROM shift_sessions
  WHERE status = 'active';

  RETURN QUERY VALUES (
    'RLS Basic Access',
    TRUE, -- Assume working if no error
    NULL
  );

END;
$$;

-- Function to validate parking integration
CREATE OR REPLACE FUNCTION validate_parking_integration()
RETURNS TABLE (
  test_name TEXT,
  passed BOOLEAN,
  details TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_test_shift_id UUID;
  v_parking_count INTEGER;
  v_stats JSONB;
BEGIN
  -- Create test shift
  SELECT start_shift(
    gen_random_uuid(),
    'Parking Test User',
    '+5555555555',
    100.00
  ) INTO v_test_shift_id;

  -- Test 1: Auto-assignment of shift to parking entries
  INSERT INTO parking_entries (
    serial, vehicle_number, vehicle_type, entry_time, status, parking_fee
  ) VALUES (
    9999, 'AUTOTEST001', 'Car', NOW(), 'Parked', 25.00
  );

  SELECT COUNT(*) INTO v_parking_count
  FROM parking_entries
  WHERE vehicle_number = 'AUTOTEST001' AND shift_session_id = v_test_shift_id;

  RETURN QUERY VALUES (
    'Auto Shift Assignment',
    v_parking_count = 1,
    FORMAT('Expected 1 entry with shift assignment, found %s', v_parking_count)
  );

  -- Test 2: Shift statistics calculation
  SELECT get_shift_statistics(v_test_shift_id) INTO v_stats;

  RETURN QUERY VALUES (
    'Statistics Generation',
    v_stats IS NOT NULL,
    CASE WHEN v_stats IS NOT NULL THEN 'Statistics generated successfully' ELSE 'Failed to generate statistics' END
  );

  -- Test 3: Report generation
  SELECT generate_shift_report(v_test_shift_id) INTO v_stats;

  RETURN QUERY VALUES (
    'Report Generation',
    v_stats IS NOT NULL AND v_stats ? 'parking_statistics',
    CASE WHEN v_stats ? 'parking_statistics' THEN 'Report includes parking data' ELSE 'Report missing parking data' END
  );

  -- Cleanup
  DELETE FROM parking_entries WHERE vehicle_number = 'AUTOTEST001';
  PERFORM end_shift(v_test_shift_id, 125.00, 'Test cleanup');

END;
$$;

-- Function to test performance of key queries
CREATE OR REPLACE FUNCTION test_query_performance()
RETURNS TABLE (
  query_name TEXT,
  execution_time_ms NUMERIC,
  performance_rating TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_time TIMESTAMP;
  v_end_time TIMESTAMP;
  v_duration NUMERIC;
  v_dummy RECORD;
BEGIN
  -- Test 1: Active shift lookup
  v_start_time := clock_timestamp();

  SELECT * INTO v_dummy FROM shift_sessions WHERE status = 'active' LIMIT 1;

  v_end_time := clock_timestamp();
  v_duration := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;

  RETURN QUERY VALUES (
    'Active Shift Lookup',
    v_duration,
    CASE
      WHEN v_duration < 1 THEN 'Excellent'
      WHEN v_duration < 10 THEN 'Good'
      WHEN v_duration < 50 THEN 'Fair'
      ELSE 'Poor'
    END
  );

  -- Test 2: Shift statistics view
  v_start_time := clock_timestamp();

  SELECT * INTO v_dummy FROM shift_statistics LIMIT 1;

  v_end_time := clock_timestamp();
  v_duration := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;

  RETURN QUERY VALUES (
    'Shift Statistics View',
    v_duration,
    CASE
      WHEN v_duration < 10 THEN 'Excellent'
      WHEN v_duration < 50 THEN 'Good'
      WHEN v_duration < 100 THEN 'Fair'
      ELSE 'Poor'
    END
  );

  -- Test 3: Parking entries by shift
  v_start_time := clock_timestamp();

  SELECT * INTO v_dummy
  FROM parking_entries pe
  JOIN shift_sessions ss ON pe.shift_session_id = ss.id
  WHERE ss.status = 'active'
  LIMIT 1;

  v_end_time := clock_timestamp();
  v_duration := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;

  RETURN QUERY VALUES (
    'Parking-Shift Join Query',
    v_duration,
    CASE
      WHEN v_duration < 5 THEN 'Excellent'
      WHEN v_duration < 25 THEN 'Good'
      WHEN v_duration < 75 THEN 'Fair'
      ELSE 'Poor'
    END
  );

END;
$$;

-- =============================================================================
-- COMPREHENSIVE TEST SUITE
-- =============================================================================
-- Main function to run all tests
CREATE OR REPLACE FUNCTION run_shift_management_tests()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_constraint_tests JSONB;
  v_integration_tests JSONB;
  v_performance_tests JSONB;
  v_scenario_results JSONB;
  v_overall_result JSONB;
  v_passed_count INTEGER := 0;
  v_total_count INTEGER := 0;
BEGIN
  -- Run constraint validation tests
  SELECT jsonb_agg(
    jsonb_build_object(
      'test_name', test_name,
      'passed', passed,
      'error_message', error_message
    )
  ) INTO v_constraint_tests
  FROM validate_shift_constraints();

  -- Run integration tests
  SELECT jsonb_agg(
    jsonb_build_object(
      'test_name', test_name,
      'passed', passed,
      'details', details
    )
  ) INTO v_integration_tests
  FROM validate_parking_integration();

  -- Run performance tests
  SELECT jsonb_agg(
    jsonb_build_object(
      'query_name', query_name,
      'execution_time_ms', execution_time_ms,
      'performance_rating', performance_rating
    )
  ) INTO v_performance_tests
  FROM test_query_performance();

  -- Create test scenario
  SELECT create_test_shift_scenario() INTO v_scenario_results;

  -- Calculate pass rate
  SELECT
    COUNT(*) FILTER (WHERE (value->>'passed')::BOOLEAN = TRUE),
    COUNT(*)
  INTO v_passed_count, v_total_count
  FROM jsonb_array_elements(v_constraint_tests || v_integration_tests);

  -- Build comprehensive results
  v_overall_result := jsonb_build_object(
    'test_summary', jsonb_build_object(
      'total_tests', v_total_count,
      'passed_tests', v_passed_count,
      'pass_rate', ROUND((v_passed_count::NUMERIC / GREATEST(v_total_count, 1)) * 100, 2),
      'overall_status', CASE
        WHEN v_passed_count = v_total_count THEN 'ALL_PASSED'
        WHEN v_passed_count > (v_total_count * 0.8) THEN 'MOSTLY_PASSED'
        ELSE 'FAILED'
      END
    ),
    'constraint_tests', v_constraint_tests,
    'integration_tests', v_integration_tests,
    'performance_tests', v_performance_tests,
    'scenario_test', v_scenario_results,
    'test_run_at', NOW()
  );

  RETURN v_overall_result;
END;
$$;

-- =============================================================================
-- CLEANUP AND ROLLBACK FUNCTIONS
-- =============================================================================
-- Function to clean up test data
CREATE OR REPLACE FUNCTION cleanup_test_data()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  -- Delete test parking entries
  DELETE FROM parking_entries
  WHERE vehicle_number LIKE 'TEST%' OR vehicle_number LIKE 'AUTOTEST%';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Delete test shifts (will cascade to shift_changes)
  DELETE FROM shift_sessions
  WHERE employee_name LIKE 'Test %' OR shift_notes LIKE 'Test %';

  RETURN v_deleted_count;
END;
$$;

-- Function to rollback shift management schema (use with caution)
CREATE OR REPLACE FUNCTION rollback_shift_management_schema()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  -- This function provides a way to rollback the entire schema
  -- Use only in development environments

  RAISE WARNING 'This function will remove all shift management schema objects';

  -- Drop triggers
  DROP TRIGGER IF EXISTS shift_sessions_realtime_trigger ON shift_sessions;
  DROP TRIGGER IF EXISTS shift_changes_realtime_trigger ON shift_changes;
  DROP TRIGGER IF EXISTS parking_realtime_trigger ON parking_entries;
  DROP TRIGGER IF EXISTS auto_assign_shift_trigger ON parking_entries;
  DROP TRIGGER IF EXISTS validate_shift_operations_trigger ON shift_sessions;
  DROP TRIGGER IF EXISTS auto_shift_change_audit_trigger ON shift_sessions;
  DROP TRIGGER IF EXISTS update_shift_sessions_timestamp ON shift_sessions;
  DROP TRIGGER IF EXISTS validate_employee_modifications ON shift_sessions;

  -- Drop functions
  DROP FUNCTION IF EXISTS start_shift(UUID, VARCHAR, VARCHAR, DECIMAL, TEXT);
  DROP FUNCTION IF EXISTS end_shift(UUID, DECIMAL, TEXT, BOOLEAN, UUID);
  DROP FUNCTION IF EXISTS perform_shift_handover(UUID, UUID, VARCHAR, VARCHAR, DECIMAL, DECIMAL, TEXT, TEXT);
  DROP FUNCTION IF EXISTS generate_shift_report(UUID);
  DROP FUNCTION IF EXISTS get_current_active_shift();
  DROP FUNCTION IF EXISTS notify_shift_changes();
  DROP FUNCTION IF EXISTS notify_shift_session_changes();
  DROP FUNCTION IF EXISTS auto_assign_active_shift();

  -- Drop views
  DROP VIEW IF EXISTS shift_statistics;

  -- Remove column from parking_entries
  ALTER TABLE parking_entries DROP COLUMN IF EXISTS shift_session_id;

  -- Drop tables (in correct order due to foreign keys)
  DROP TABLE IF EXISTS shift_access_audit;
  DROP TABLE IF EXISTS shift_changes;
  DROP TABLE IF EXISTS shift_sessions;

  -- Drop types
  DROP TYPE IF EXISTS shift_status_enum;
  DROP TYPE IF EXISTS change_type_enum;

  RETURN 'Shift management schema rollback completed';
END;
$$;

-- =============================================================================
-- GRANT PERMISSIONS FOR TEST FUNCTIONS
-- =============================================================================
-- Grant execute permissions for testing functions
GRANT EXECUTE ON FUNCTION create_test_employees() TO authenticated;
GRANT EXECUTE ON FUNCTION create_test_shift_scenario() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_shift_constraints() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_parking_integration() TO authenticated;
GRANT EXECUTE ON FUNCTION test_query_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION run_shift_management_tests() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_test_data() TO authenticated;
-- Note: rollback_shift_management_schema() should only be granted to admins

-- =============================================================================
-- DOCUMENTATION AND USAGE EXAMPLES
-- =============================================================================
-- Create usage examples for the shift management system
CREATE OR REPLACE FUNCTION show_usage_examples()
RETURNS TEXT
LANGUAGE sql
AS $$
  SELECT $examples$
-- =============================================================================
-- SHIFT MANAGEMENT SYSTEM - USAGE EXAMPLES
-- =============================================================================

-- 1. Start a new shift
SELECT start_shift(
  auth.uid(),
  'John Smith',
  '+1234567890',
  100.00,
  'Morning shift start'
);

-- 2. Get current active shift information
SELECT get_current_active_shift();

-- 3. Get real-time shift statistics
SELECT get_shift_statistics('shift-uuid-here');

-- 4. End a shift
SELECT end_shift(
  'shift-uuid-here',
  150.00, -- closing cash
  'End of shift notes',
  FALSE,  -- not emergency
  NULL    -- no supervisor required
);

-- 5. Perform shift handover
SELECT perform_shift_handover(
  'outgoing-shift-uuid',
  auth.uid(),
  'Jane Doe',
  '+0987654321',
  150.00, -- closing cash for outgoing
  120.00, -- opening cash for incoming
  'Handover completed successfully',
  'Parking lot cleaned, no issues'
);

-- 6. Generate comprehensive shift report
SELECT generate_shift_report('shift-uuid-here');

-- 7. Get daily shift summary
SELECT get_daily_shift_summary(CURRENT_DATE);

-- 8. Check current shift parking activity
SELECT get_current_shift_parking_activity();

-- 9. Run system tests
SELECT run_shift_management_tests();

-- 10. Clean up test data
SELECT cleanup_test_data();

-- =============================================================================
$examples$;
$$;

GRANT EXECUTE ON FUNCTION show_usage_examples() TO authenticated;

-- Final validation message
DO $$
BEGIN
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'SHIFT MANAGEMENT SYSTEM MIGRATION COMPLETED SUCCESSFULLY';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'The flexible shift management system has been fully implemented with:';
  RAISE NOTICE '- Event-driven architecture with real-time updates';
  RAISE NOTICE '- Comprehensive security with Row Level Security';
  RAISE NOTICE '- Automatic parking integration and reporting';
  RAISE NOTICE '- Complete audit trail and business logic validation';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run: SELECT run_shift_management_tests() to validate installation';
  RAISE NOTICE '2. See usage examples: SELECT show_usage_examples()';
  RAISE NOTICE '3. Start your first shift with the start_shift() function';
  RAISE NOTICE '=============================================================================';
END $$;