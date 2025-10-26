-- =============================================================================
-- LINK EXISTING PARKING ENTRIES TO ACTIVE SHIFT
-- Run this in Supabase SQL Editor
-- =============================================================================

-- Step 1: Check if parking entries exist
SELECT
  COUNT(*) as total_entries,
  COUNT(shift_session_id) as already_linked,
  COUNT(*) - COUNT(shift_session_id) as need_linking
FROM parking_entries;

-- Step 2: Show unlinked entries from today
SELECT
  id,
  vehicle_number,
  entry_time,
  exit_time,
  status,
  COALESCE(actual_fee, calculated_fee, parking_fee) as fee
FROM parking_entries
WHERE shift_session_id IS NULL
  AND entry_time >= CURRENT_DATE
ORDER BY entry_time DESC
LIMIT 10;

-- Step 3: Link them to the active shift
DO $$
DECLARE
  v_active_shift_id UUID := '70432be3-de81-473b-b350-612ce76fc203'; -- Your active shift ID
  v_linked_count INTEGER;
BEGIN
  -- Link all unlinked entries from today
  UPDATE parking_entries
  SET shift_session_id = v_active_shift_id
  WHERE shift_session_id IS NULL
    AND entry_time >= CURRENT_DATE;

  GET DIAGNOSTICS v_linked_count = ROW_COUNT;

  -- Sync the shift statistics
  PERFORM sync_shift_statistics(v_active_shift_id);

  RAISE NOTICE '✓ Linked % parking entries to shift', v_linked_count;
END $$;

-- Step 4: Verify the shift now has revenue
SELECT
  id,
  employee_name,
  total_revenue,
  vehicles_entered,
  vehicles_exited,
  currently_parked
FROM shift_sessions
WHERE id = '70432be3-de81-473b-b350-612ce76fc203';

-- Step 5: Show linked parking entries
SELECT
  vehicle_number,
  entry_time,
  exit_time,
  status,
  COALESCE(actual_fee, calculated_fee, parking_fee) as fee,
  shift_session_id
FROM parking_entries
WHERE shift_session_id = '70432be3-de81-473b-b350-612ce76fc203'
ORDER BY entry_time DESC;
