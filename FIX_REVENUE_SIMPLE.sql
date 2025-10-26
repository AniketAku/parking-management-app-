-- =============================================================================
-- SIMPLIFIED FIX FOR REVENUE SHOWING ZERO
-- Works with ANY shift_sessions table structure
-- =============================================================================

-- STEP 1: Add missing columns to shift_sessions (safe - checks if exists)
DO $$
BEGIN
  -- Add opening_cash
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shift_sessions' AND column_name = 'opening_cash') THEN
    ALTER TABLE shift_sessions ADD COLUMN opening_cash NUMERIC(10,2) DEFAULT 0;
    RAISE NOTICE '✓ Added opening_cash';
  END IF;

  -- Add total_revenue
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shift_sessions' AND column_name = 'total_revenue') THEN
    ALTER TABLE shift_sessions ADD COLUMN total_revenue NUMERIC(10,2) DEFAULT 0;
    RAISE NOTICE '✓ Added total_revenue';
  END IF;

  -- Add cash_collected
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shift_sessions' AND column_name = 'cash_collected') THEN
    ALTER TABLE shift_sessions ADD COLUMN cash_collected NUMERIC(10,2) DEFAULT 0;
    RAISE NOTICE '✓ Added cash_collected';
  END IF;

  -- Add digital_collected
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shift_sessions' AND column_name = 'digital_collected') THEN
    ALTER TABLE shift_sessions ADD COLUMN digital_collected NUMERIC(10,2) DEFAULT 0;
    RAISE NOTICE '✓ Added digital_collected';
  END IF;

  -- Add vehicles_entered
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shift_sessions' AND column_name = 'vehicles_entered') THEN
    ALTER TABLE shift_sessions ADD COLUMN vehicles_entered INTEGER DEFAULT 0;
    RAISE NOTICE '✓ Added vehicles_entered';
  END IF;

  -- Add vehicles_exited
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shift_sessions' AND column_name = 'vehicles_exited') THEN
    ALTER TABLE shift_sessions ADD COLUMN vehicles_exited INTEGER DEFAULT 0;
    RAISE NOTICE '✓ Added vehicles_exited';
  END IF;

  -- Add currently_parked
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shift_sessions' AND column_name = 'currently_parked') THEN
    ALTER TABLE shift_sessions ADD COLUMN currently_parked INTEGER DEFAULT 0;
    RAISE NOTICE '✓ Added currently_parked';
  END IF;
END $$;

-- STEP 2: Add shift_session_id to parking_entries
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parking_entries' AND column_name = 'shift_session_id') THEN
    ALTER TABLE parking_entries ADD COLUMN shift_session_id UUID;
    ALTER TABLE parking_entries ADD CONSTRAINT fk_parking_entries_shift_session FOREIGN KEY (shift_session_id) REFERENCES shift_sessions(id) ON DELETE SET NULL;
    CREATE INDEX idx_parking_entries_shift_session ON parking_entries(shift_session_id);
    RAISE NOTICE '✓ Added shift_session_id to parking_entries';
  END IF;
END $$;

-- STEP 3: Add payment_mode
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parking_entries' AND column_name = 'payment_mode') THEN
    ALTER TABLE parking_entries ADD COLUMN payment_mode VARCHAR(20);
    RAISE NOTICE '✓ Added payment_mode';
  END IF;
END $$;

-- STEP 4: Create shift_statistics view
DROP VIEW IF EXISTS shift_statistics CASCADE;

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
    COALESCE(SUM(COALESCE(actual_fee, calculated_fee, parking_fee)) FILTER (WHERE status = 'Exited' OR exit_time IS NOT NULL), 0) as actual_revenue,
    COALESCE(SUM(COALESCE(actual_fee, calculated_fee, parking_fee)) FILTER (WHERE (status = 'Exited' OR exit_time IS NOT NULL) AND payment_mode = 'cash'), 0) as cash_revenue,
    COALESCE(SUM(COALESCE(actual_fee, calculated_fee, parking_fee)) FILTER (WHERE (status = 'Exited' OR exit_time IS NOT NULL) AND payment_mode IN ('card', 'upi', 'digital', 'wallet')), 0) as digital_revenue
  FROM parking_entries
  WHERE shift_session_id IS NOT NULL
  GROUP BY shift_session_id
) pe_stats ON ss.id = pe_stats.shift_session_id;

RAISE NOTICE '✓ Created shift_statistics view';

-- STEP 5: Create sync function
CREATE OR REPLACE FUNCTION sync_shift_statistics(p_shift_id UUID)
RETURNS JSON AS $$
DECLARE
  v_stats RECORD;
  v_result JSON;
BEGIN
  SELECT
    COUNT(*) as vehicles_entered,
    COUNT(*) FILTER (WHERE exit_time IS NOT NULL) as vehicles_exited,
    COUNT(*) FILTER (WHERE exit_time IS NULL) as currently_parked,
    COALESCE(SUM(COALESCE(actual_fee, calculated_fee, parking_fee)) FILTER (WHERE status = 'Exited' OR exit_time IS NOT NULL), 0) as total_revenue,
    COALESCE(SUM(COALESCE(actual_fee, calculated_fee, parking_fee)) FILTER (WHERE (status = 'Exited' OR exit_time IS NOT NULL) AND payment_mode = 'cash'), 0) as cash_collected,
    COALESCE(SUM(COALESCE(actual_fee, calculated_fee, parking_fee)) FILTER (WHERE (status = 'Exited' OR exit_time IS NOT NULL) AND payment_mode IN ('card', 'upi', 'digital', 'wallet')), 0) as digital_collected
  INTO v_stats
  FROM parking_entries
  WHERE shift_session_id = p_shift_id;

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

  SELECT json_build_object(
    'shift_id', p_shift_id,
    'vehicles_entered', COALESCE(v_stats.vehicles_entered, 0),
    'vehicles_exited', COALESCE(v_stats.vehicles_exited, 0),
    'currently_parked', COALESCE(v_stats.currently_parked, 0),
    'total_revenue', COALESCE(v_stats.total_revenue, 0),
    'synced_at', NOW()
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

RAISE NOTICE '✓ Created sync_shift_statistics function';

-- STEP 6: Create trigger function
CREATE OR REPLACE FUNCTION auto_sync_shift_statistics()
RETURNS TRIGGER AS $$
DECLARE
  v_shift_id UUID;
BEGIN
  v_shift_id := COALESCE(NEW.shift_session_id, OLD.shift_session_id);
  IF v_shift_id IS NOT NULL THEN
    PERFORM sync_shift_statistics(v_shift_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 7: Create trigger
DROP TRIGGER IF EXISTS trigger_auto_sync_shift_statistics ON parking_entries;
CREATE TRIGGER trigger_auto_sync_shift_statistics
  AFTER INSERT OR UPDATE OR DELETE ON parking_entries
  FOR EACH ROW
  EXECUTE FUNCTION auto_sync_shift_statistics();

RAISE NOTICE '✓ Created auto-sync trigger';

-- STEP 8: Link existing entries to active shift (SIMPLIFIED - no column assumptions)
DO $$
DECLARE
  v_active_shift_id UUID;
  v_linked_count INTEGER := 0;
BEGIN
  -- Get ANY active shift (simplest query possible)
  SELECT id INTO v_active_shift_id
  FROM shift_sessions
  WHERE status = 'active'
  LIMIT 1;

  IF v_active_shift_id IS NOT NULL THEN
    -- Link entries from today
    UPDATE parking_entries
    SET shift_session_id = v_active_shift_id
    WHERE shift_session_id IS NULL
      AND entry_time >= CURRENT_DATE;

    GET DIAGNOSTICS v_linked_count = ROW_COUNT;

    -- Sync statistics
    PERFORM sync_shift_statistics(v_active_shift_id);

    RAISE NOTICE '✓ Linked % entries to shift %', v_linked_count, v_active_shift_id;
  ELSE
    RAISE NOTICE '⚠ No active shift found';
  END IF;
END $$;

-- STEP 9: Show results
DO $$
DECLARE
  v_shift RECORD;
BEGIN
  SELECT id, employee_name, total_revenue, vehicles_entered
  INTO v_shift
  FROM shift_sessions
  WHERE status = 'active'
  LIMIT 1;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION COMPLETE ✓';
  RAISE NOTICE '========================================';

  IF v_shift.id IS NOT NULL THEN
    RAISE NOTICE 'Active Shift: %', v_shift.employee_name;
    RAISE NOTICE 'Revenue: ₹%', v_shift.total_revenue;
    RAISE NOTICE 'Vehicles: %', v_shift.vehicles_entered;
  ELSE
    RAISE NOTICE 'No active shift found';
  END IF;

  RAISE NOTICE '========================================';
END $$;

SELECT 'Revenue fix completed! Check messages above.' as status;
