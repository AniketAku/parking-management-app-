 -- =============================================================================
-- MIGRATION 008: COMPLETE SHIFT MANAGEMENT FIX
-- Adds missing columns and creates proper relationships
-- =============================================================================

-- Step 1: Add shift_session_id column to parking_entries if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parking_entries' AND column_name = 'shift_session_id'
  ) THEN
    ALTER TABLE parking_entries ADD COLUMN shift_session_id UUID;

    -- Add foreign key constraint
    ALTER TABLE parking_entries
      ADD CONSTRAINT fk_parking_entries_shift_session
      FOREIGN KEY (shift_session_id) REFERENCES shift_sessions(id) ON DELETE SET NULL;

    -- Create index for performance
    CREATE INDEX idx_parking_entries_shift_session ON parking_entries(shift_session_id);

    RAISE NOTICE 'Added shift_session_id column to parking_entries';
  ELSE
    RAISE NOTICE 'shift_session_id column already exists';
  END IF;
END $$;

-- Step 2: Create payment_mode column if it doesn't exist (for cash/digital tracking)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parking_entries' AND column_name = 'payment_mode'
  ) THEN
    ALTER TABLE parking_entries ADD COLUMN payment_mode VARCHAR(20);
    RAISE NOTICE 'Added payment_mode column to parking_entries';
  ELSE
    RAISE NOTICE 'payment_mode column already exists';
  END IF;
END $$;

-- Step 3: Drop existing view if it exists (from previous migration)
DROP VIEW IF EXISTS shift_statistics CASCADE;

-- Step 4: Create shift_statistics view
CREATE VIEW shift_statistics AS
SELECT
  ss.id as shift_id,
  ss.employee_id,
  ss.employee_name,
  ss.shift_start_time,
  ss.shift_end_time,
  ss.status,
  ss.total_revenue,
  ss.cash_collected,
  ss.digital_collected,
  ss.vehicles_entered,
  ss.vehicles_exited,
  ss.currently_parked,
  ss.opening_cash,
  ss.created_at,
  ss.updated_at,
  -- Calculate real-time metrics from parking_entries
  COALESCE(pe_stats.actual_revenue, 0) as calculated_revenue,
  COALESCE(pe_stats.actual_vehicles_entered, 0) as actual_vehicles_entered,
  COALESCE(pe_stats.actual_vehicles_exited, 0) as actual_vehicles_exited,
  COALESCE(pe_stats.actual_currently_parked, 0) as actual_currently_parked,
  COALESCE(pe_stats.cash_revenue, 0) as actual_cash_revenue,
  COALESCE(pe_stats.digital_revenue, 0) as actual_digital_revenue
FROM shift_sessions ss
LEFT JOIN (
  SELECT
    shift_session_id,
    COUNT(*) as actual_vehicles_entered,
    COUNT(*) FILTER (WHERE exit_time IS NOT NULL) as actual_vehicles_exited,
    COUNT(*) FILTER (WHERE exit_time IS NULL) as actual_currently_parked,
    COALESCE(SUM(COALESCE(actual_fee, calculated_fee, parking_fee))
      FILTER (WHERE status = 'Exited' OR exit_time IS NOT NULL), 0) as actual_revenue,
    COALESCE(SUM(COALESCE(actual_fee, calculated_fee, parking_fee))
      FILTER (WHERE (status = 'Exited' OR exit_time IS NOT NULL) AND payment_mode = 'cash'), 0) as cash_revenue,
    COALESCE(SUM(COALESCE(actual_fee, calculated_fee, parking_fee))
      FILTER (WHERE (status = 'Exited' OR exit_time IS NOT NULL)
        AND payment_mode IN ('card', 'upi', 'digital', 'wallet')), 0) as digital_revenue
  FROM parking_entries
  WHERE shift_session_id IS NOT NULL
  GROUP BY shift_session_id
) pe_stats ON ss.id = pe_stats.shift_session_id;

-- Step 5: Update sync_shift_statistics function to handle actual parking_entries
CREATE OR REPLACE FUNCTION sync_shift_statistics(p_shift_id UUID)
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
    COALESCE(SUM(COALESCE(actual_fee, calculated_fee, parking_fee))
      FILTER (WHERE status = 'Exited' OR exit_time IS NOT NULL), 0) as total_revenue,
    COALESCE(SUM(COALESCE(actual_fee, calculated_fee, parking_fee))
      FILTER (WHERE (status = 'Exited' OR exit_time IS NOT NULL) AND payment_mode = 'cash'), 0) as cash_collected,
    COALESCE(SUM(COALESCE(actual_fee, calculated_fee, parking_fee))
      FILTER (WHERE (status = 'Exited' OR exit_time IS NOT NULL)
        AND payment_mode IN ('card', 'upi', 'digital', 'wallet')), 0) as digital_collected
  INTO v_stats
  FROM parking_entries
  WHERE shift_session_id = p_shift_id;

  -- Update shift_sessions with calculated statistics
  UPDATE shift_sessions
  SET
    vehicles_entered = COALESCE(v_stats.vehicles_entered, 0),
    vehicles_exited = COALESCE(v_stats.vehicles_exited, 0),
    currently_parked = COALESCE(v_stats.currently_parked, 0),
    total_revenue = COALESCE(v_stats.total_revenue, 0),
    cash_collected = COALESCE(v_stats.cash_collected, 0),
    digital_collected = COALESCE(v_stats.digital_collected, 0),
    updated_at = NOW()
  WHERE id = p_shift_id;

  -- Return the updated statistics
  SELECT json_build_object(
    'shift_id', p_shift_id,
    'vehicles_entered', COALESCE(v_stats.vehicles_entered, 0),
    'vehicles_exited', COALESCE(v_stats.vehicles_exited, 0),
    'currently_parked', COALESCE(v_stats.currently_parked, 0),
    'total_revenue', COALESCE(v_stats.total_revenue, 0),
    'cash_collected', COALESCE(v_stats.cash_collected, 0),
    'digital_collected', COALESCE(v_stats.digital_collected, 0),
    'synced_at', NOW()
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error syncing shift statistics for %: %', p_shift_id, SQLERRM;
    RETURN json_build_object(
      'error', true,
      'message', 'Failed to sync statistics',
      'shift_id', p_shift_id,
      'details', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- Step 6: Link existing parking entries to active shift
DO $$
DECLARE
  v_active_shift_id UUID;
  v_linked_count INTEGER := 0;
BEGIN
  -- Get the most recent active shift
  SELECT id INTO v_active_shift_id
  FROM shift_sessions
  WHERE status = 'active'
  ORDER BY shift_start_time DESC NULLS LAST, start_time DESC NULLS LAST, started_at DESC NULLS LAST
  LIMIT 1;

  IF v_active_shift_id IS NOT NULL THEN
    -- Link entries from today that don't have a shift assigned
    UPDATE parking_entries
    SET shift_session_id = v_active_shift_id
    WHERE shift_session_id IS NULL
      AND entry_time >= CURRENT_DATE;

    GET DIAGNOSTICS v_linked_count = ROW_COUNT;

    -- Sync statistics for the active shift
    PERFORM sync_shift_statistics(v_active_shift_id);

    RAISE NOTICE 'Linked % parking entries to active shift %', v_linked_count, v_active_shift_id;
  ELSE
    RAISE NOTICE 'No active shift found to link parking entries';
  END IF;
END $$;

-- Step 7: Verify migration
DO $$
DECLARE
  v_shift_count INTEGER;
  v_linked_entries INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_shift_count FROM shift_sessions;
  SELECT COUNT(*) INTO v_linked_entries FROM parking_entries WHERE shift_session_id IS NOT NULL;

  RAISE NOTICE 'Migration verification:';
  RAISE NOTICE '  - Total shifts: %', v_shift_count;
  RAISE NOTICE '  - Linked parking entries: %', v_linked_entries;
  RAISE NOTICE '  - shift_statistics view: %',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'shift_statistics')
      THEN 'Created ✓' ELSE 'Missing ✗' END;
END $$;

-- Migration complete
SELECT 'Migration 008 completed successfully' as status;
