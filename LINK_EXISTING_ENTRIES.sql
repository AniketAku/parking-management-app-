-- =====================================================================
-- LINK EXISTING ENTRIES TO ACTIVE SHIFT
-- Run this in Supabase SQL Editor to link existing parking entries
-- =====================================================================

-- STEP 1: Check current state
RAISE NOTICE '📊 CHECKING CURRENT STATE...';

SELECT
  'Parking Entries' as type,
  COUNT(*) as total_today,
  COUNT(shift_session_id) as linked,
  COUNT(*) FILTER (WHERE shift_session_id IS NULL) as unlinked,
  SUM(COALESCE(actual_fee, calculated_fee, parking_fee)) as total_fees
FROM parking_entries
WHERE entry_time >= CURRENT_DATE;

SELECT
  'Active Shift' as type,
  employee_name,
  total_revenue,
  vehicles_entered,
  vehicles_exited,
  currently_parked
FROM shift_sessions
WHERE status = 'active';

-- STEP 2: Link existing entries to active shift
DO $$
DECLARE
  v_active_shift_id UUID;
  v_linked_count INTEGER;
  v_shift_start TIMESTAMPTZ;
  v_employee_name TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔗 LINKING ENTRIES TO ACTIVE SHIFT...';
  RAISE NOTICE '';

  -- Get active shift ID
  SELECT id, shift_start_time, employee_name
  INTO v_active_shift_id, v_shift_start, v_employee_name
  FROM shift_sessions
  WHERE status = 'active'
  ORDER BY shift_start_time DESC
  LIMIT 1;

  IF v_active_shift_id IS NULL THEN
    RAISE EXCEPTION '❌ No active shift found. Please start a shift first.';
  END IF;

  RAISE NOTICE '✅ Found active shift:';
  RAISE NOTICE '   Shift ID: %', v_active_shift_id;
  RAISE NOTICE '   Employee: %', v_employee_name;
  RAISE NOTICE '   Started: %', v_shift_start;
  RAISE NOTICE '';

  -- Link all unlinked entries from today
  RAISE NOTICE '🔄 Linking unlinked entries from today...';

  UPDATE parking_entries
  SET shift_session_id = v_active_shift_id,
      updated_at = NOW()
  WHERE shift_session_id IS NULL
    AND entry_time >= CURRENT_DATE;

  GET DIAGNOSTICS v_linked_count = ROW_COUNT;

  IF v_linked_count > 0 THEN
    RAISE NOTICE '✅ Linked % entries to active shift', v_linked_count;
  ELSE
    RAISE NOTICE 'ℹ️  No unlinked entries found (all entries already linked)';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '📊 SYNCING STATISTICS...';

  -- Sync statistics
  PERFORM sync_shift_statistics(v_active_shift_id);
  RAISE NOTICE '✅ Statistics synced successfully';
  RAISE NOTICE '';
END $$;

-- STEP 3: Verify the fix
RAISE NOTICE '✅ VERIFICATION RESULTS:';
RAISE NOTICE '';

-- Show shift statistics
SELECT
  '📊 Shift Statistics' as section,
  ss.employee_name as "Employee",
  ss.total_revenue as "Total Revenue (₹)",
  ss.vehicles_entered as "Vehicles Entered",
  ss.vehicles_exited as "Vehicles Exited",
  ss.currently_parked as "Currently Parked",
  ss.cash_collected as "Cash Collected (₹)",
  ss.digital_collected as "Digital Collected (₹)"
FROM shift_sessions ss
WHERE ss.status = 'active';

-- Show linked entries
SELECT
  '🚗 Linked Entries' as section,
  COUNT(*) as "Total Linked",
  COUNT(*) FILTER (WHERE status = 'Active') as "Active",
  COUNT(*) FILTER (WHERE status = 'Exited') as "Exited",
  SUM(COALESCE(actual_fee, calculated_fee, parking_fee)) as "Total Fees (₹)",
  SUM(COALESCE(actual_fee, calculated_fee, parking_fee))
    FILTER (WHERE status = 'Exited') as "Revenue (₹)"
FROM parking_entries
WHERE shift_session_id = (SELECT id FROM shift_sessions WHERE status = 'active')
  AND entry_time >= CURRENT_DATE;

-- Show any remaining unlinked entries
SELECT
  '⚠️  Unlinked Entries' as section,
  COUNT(*) as "Count"
FROM parking_entries
WHERE shift_session_id IS NULL
  AND entry_time >= CURRENT_DATE;

RAISE NOTICE '';
RAISE NOTICE '✅ DONE! Refresh your UI to see updated statistics.';
RAISE NOTICE '';
