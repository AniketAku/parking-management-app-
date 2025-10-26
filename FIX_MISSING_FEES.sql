-- =====================================================================
-- FIX MISSING FEE DATA AND LINK TO SHIFT
-- This fixes TWO problems:
-- 1. Missing fee data (actual_fee, calculated_fee, parking_fee are NULL)
-- 2. Missing shift linking (shift_session_id is NULL)
-- =====================================================================

-- STEP 1: Check current state
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  RAISE NOTICE '📊 CHECKING CURRENT STATE...';
  RAISE NOTICE '';

  -- Count entries with NULL fees
  SELECT COUNT(*) INTO v_count
  FROM parking_entries
  WHERE entry_time >= CURRENT_DATE
    AND COALESCE(actual_fee, calculated_fee, parking_fee) = 0;

  RAISE NOTICE '⚠️  Entries with NULL/zero fees: %', v_count;

  -- Count entries with NULL shift_session_id
  SELECT COUNT(*) INTO v_count
  FROM parking_entries
  WHERE entry_time >= CURRENT_DATE
    AND shift_session_id IS NULL;

  RAISE NOTICE '⚠️  Entries with NULL shift_session_id: %', v_count;
  RAISE NOTICE '';
END $$;

-- STEP 2: Fix missing fees based on vehicle type
DO $$
DECLARE
  v_active_shift_id UUID;
  v_updated_count INTEGER;
  v_default_fee NUMERIC := 150; -- Default fee if no rate configured
BEGIN
  RAISE NOTICE '🔧 FIXING MISSING FEE DATA...';
  RAISE NOTICE '';

  -- Get active shift ID
  SELECT id INTO v_active_shift_id
  FROM shift_sessions
  WHERE status = 'active'
  ORDER BY shift_start_time DESC
  LIMIT 1;

  IF v_active_shift_id IS NULL THEN
    RAISE EXCEPTION '❌ No active shift found. Please start a shift first.';
  END IF;

  RAISE NOTICE '✅ Found active shift: %', v_active_shift_id;
  RAISE NOTICE '';

  -- Update entries with NULL fees
  -- We'll set parking_fee based on vehicle type default rates
  UPDATE parking_entries
  SET
    parking_fee = CASE
      WHEN vehicle_type ILIKE '%trailer%' THEN 300
      WHEN vehicle_type ILIKE '%6 wheel%' THEN 200
      WHEN vehicle_type ILIKE '%4 wheel%' THEN 150
      WHEN vehicle_type ILIKE '%2 wheel%' THEN 100
      ELSE v_default_fee
    END,
    shift_session_id = v_active_shift_id,
    updated_at = NOW()
  WHERE entry_time >= CURRENT_DATE
    AND COALESCE(actual_fee, calculated_fee, parking_fee) = 0;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % entries with fee data', v_updated_count;
  RAISE NOTICE '';

  -- Sync statistics
  RAISE NOTICE '📊 SYNCING STATISTICS...';
  PERFORM sync_shift_statistics(v_active_shift_id);
  RAISE NOTICE '✅ Statistics synced successfully';
  RAISE NOTICE '';
END $$;

-- STEP 3: Verify the fix
RAISE NOTICE '✅ VERIFICATION RESULTS:';
RAISE NOTICE '';

-- Show updated entries
SELECT
  '📊 Updated Entries' as section,
  vehicle_number as "Vehicle",
  vehicle_type as "Type",
  status as "Status",
  parking_fee as "Parking Fee (₹)",
  COALESCE(actual_fee, calculated_fee, parking_fee) as "Effective Fee (₹)",
  CASE WHEN shift_session_id IS NOT NULL THEN '✅ Linked' ELSE '❌ Not Linked' END as "Shift Link"
FROM parking_entries
WHERE entry_time >= CURRENT_DATE
ORDER BY entry_time DESC;

-- Show shift statistics
SELECT
  '📊 Shift Statistics' as section,
  employee_name as "Employee",
  total_revenue as "Total Revenue (₹)",
  vehicles_entered as "Vehicles Entered",
  vehicles_exited as "Vehicles Exited",
  currently_parked as "Currently Parked"
FROM shift_sessions
WHERE status = 'active';

RAISE NOTICE '';
RAISE NOTICE '✅ DONE! Refresh your UI to see updated revenue.';
RAISE NOTICE '';
