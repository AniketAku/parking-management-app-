-- =============================================================================
-- CREATE SYNC FUNCTION AND LINK PARKING ENTRIES
-- Run this after columns are added
-- =============================================================================

-- Step 1: Create the sync function
CREATE OR REPLACE FUNCTION sync_shift_statistics(p_shift_id UUID)
RETURNS JSON AS $$
DECLARE
  v_stats RECORD;
  v_result JSON;
BEGIN
  -- Calculate statistics from parking_entries
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

  -- Update shift_sessions
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

  -- Return result
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

-- Step 2: Create trigger function
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

-- Step 3: Create trigger
DROP TRIGGER IF EXISTS trigger_auto_sync_shift_statistics ON parking_entries;
CREATE TRIGGER trigger_auto_sync_shift_statistics
  AFTER INSERT OR UPDATE OR DELETE ON parking_entries
  FOR EACH ROW
  EXECUTE FUNCTION auto_sync_shift_statistics();

-- Step 4: Link existing entries and sync
DO $$
DECLARE
  v_active_shift_id UUID := '70432be3-de81-473b-b350-612ce76fc203';
  v_linked_count INTEGER;
BEGIN
  -- Link unlinked entries from today
  UPDATE parking_entries
  SET shift_session_id = v_active_shift_id
  WHERE shift_session_id IS NULL
    AND entry_time >= CURRENT_DATE;

  GET DIAGNOSTICS v_linked_count = ROW_COUNT;

  -- Sync statistics
  PERFORM sync_shift_statistics(v_active_shift_id);

  RAISE NOTICE '✓ Linked % entries and synced statistics', v_linked_count;
END $$;

-- Step 5: Show result
SELECT
  id,
  employee_name,
  total_revenue,
  vehicles_entered,
  vehicles_exited,
  currently_parked
FROM shift_sessions
WHERE id = '70432be3-de81-473b-b350-612ce76fc203';

SELECT 'Function created and entries linked! Check the results above.' as status;
