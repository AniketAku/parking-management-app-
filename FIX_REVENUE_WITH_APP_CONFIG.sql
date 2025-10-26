-- =====================================================================
-- FIX MISSING FEES USING YOUR EXISTING APP_CONFIG TABLE
-- Uses rates from app_config table (your actual database schema)
-- =====================================================================

DO $$
DECLARE
  v_active_shift_id UUID;
  v_updated_count INTEGER;
  v_trailer_rate NUMERIC;
  v_6wheeler_rate NUMERIC;
  v_4wheeler_rate NUMERIC;
  v_2wheeler_rate NUMERIC;
  v_rates JSONB;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📊 STEP 1: LOADING RATES FROM YOUR APP_CONFIG TABLE...';
  RAISE NOTICE '';

  -- Load vehicle rates from app_config (your existing table)
  SELECT value INTO v_rates
  FROM app_config
  WHERE key = 'vehicle_rates'
    AND category = 'business'
  LIMIT 1;

  IF v_rates IS NOT NULL THEN
    -- Extract rates from JSONB
    v_trailer_rate := (v_rates->>'Trailer')::NUMERIC;
    v_6wheeler_rate := (v_rates->>'6 Wheeler')::NUMERIC;
    v_4wheeler_rate := (v_rates->>'4 Wheeler')::NUMERIC;
    v_2wheeler_rate := (v_rates->>'2 Wheeler')::NUMERIC;

    RAISE NOTICE '✅ Loaded rates from app_config:';
    RAISE NOTICE '   Trailer: ₹%', v_trailer_rate;
    RAISE NOTICE '   6 Wheeler: ₹%', v_6wheeler_rate;
    RAISE NOTICE '   4 Wheeler: ₹%', v_4wheeler_rate;
    RAISE NOTICE '   2 Wheeler: ₹%', v_2wheeler_rate;
  ELSE
    -- Fallback if settings not found (matches UnifiedFeeCalculationService)
    v_trailer_rate := 225;
    v_6wheeler_rate := 150;
    v_4wheeler_rate := 100;
    v_2wheeler_rate := 50;

    RAISE NOTICE '⚠️  Settings not found in app_config, using fallback rates:';
    RAISE NOTICE '   Trailer: ₹%', v_trailer_rate;
    RAISE NOTICE '   6 Wheeler: ₹%', v_6wheeler_rate;
    RAISE NOTICE '   4 Wheeler: ₹%', v_4wheeler_rate;
    RAISE NOTICE '   2 Wheeler: ₹%', v_2wheeler_rate;

    -- Insert default rates into app_config if missing
    INSERT INTO app_config (category, key, value, description, is_system, sort_order)
    VALUES (
      'business',
      'vehicle_rates',
      '{"Trailer": 225, "6 Wheeler": 150, "4 Wheeler": 100, "2 Wheeler": 50}'::jsonb,
      'Daily parking rates by vehicle type (in INR)',
      true,
      1
    )
    ON CONFLICT (category, key) DO NOTHING;

    RAISE NOTICE '✅ Default rates inserted into app_config';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '📊 STEP 2: CHECKING CURRENT DATA...';
  RAISE NOTICE '';

  -- Count entries with NULL fees
  SELECT COUNT(*) INTO v_updated_count
  FROM parking_entries
  WHERE entry_time >= CURRENT_DATE
    AND COALESCE(actual_fee, calculated_fee, parking_fee) = 0;

  RAISE NOTICE 'Found % entries with missing fee data', v_updated_count;

  -- Get active shift ID
  SELECT id INTO v_active_shift_id
  FROM shift_sessions
  WHERE status = 'active'
  ORDER BY shift_start_time DESC
  LIMIT 1;

  IF v_active_shift_id IS NULL THEN
    RAISE EXCEPTION '❌ No active shift found. Please start a shift first.';
  END IF;

  RAISE NOTICE 'Active shift ID: %', v_active_shift_id;
  RAISE NOTICE '';

  RAISE NOTICE '🔧 STEP 3: FIXING MISSING FEE DATA...';
  RAISE NOTICE '';

  -- Update entries with NULL fees using rates from YOUR system
  UPDATE parking_entries
  SET
    parking_fee = CASE
      -- Use your system's rates
      WHEN vehicle_type ILIKE '%trailer%' THEN v_trailer_rate
      WHEN vehicle_type ILIKE '%6%wheel%' THEN v_6wheeler_rate
      WHEN vehicle_type ILIKE '%4%wheel%' THEN v_4wheeler_rate
      WHEN vehicle_type ILIKE '%2%wheel%' THEN v_2wheeler_rate
      ELSE v_4wheeler_rate -- Default to 4 wheeler rate
    END,
    shift_session_id = v_active_shift_id,
    updated_at = NOW()
  WHERE entry_time >= CURRENT_DATE
    AND COALESCE(actual_fee, calculated_fee, parking_fee) = 0;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % entries with fee data from your rate system', v_updated_count;
  RAISE NOTICE '';

  RAISE NOTICE '📊 STEP 4: SYNCING STATISTICS...';
  RAISE NOTICE '';

  -- Sync statistics
  PERFORM sync_shift_statistics(v_active_shift_id);
  RAISE NOTICE '✅ Statistics synced successfully';
  RAISE NOTICE '';

  RAISE NOTICE '✅ VERIFICATION RESULTS:';
  RAISE NOTICE '';
  RAISE NOTICE '✅ DONE! Refresh your UI to see updated revenue.';
  RAISE NOTICE 'All fees calculated using YOUR existing rate system from app_config.';
  RAISE NOTICE '';
END $$;

-- STEP 5: Verify the fix
-- Show updated entries
SELECT
  '📊 Updated Entries' as section,
  vehicle_number as "Vehicle Number",
  vehicle_type as "Vehicle Type",
  status as "Status",
  parking_fee as "Fee (₹)",
  CASE WHEN shift_session_id IS NOT NULL THEN '✅ Linked' ELSE '❌ Not Linked' END as "Shift Status"
FROM parking_entries
WHERE entry_time >= CURRENT_DATE
ORDER BY entry_time DESC;

-- Show shift statistics
SELECT
  '💰 Shift Revenue' as section,
  employee_name as "Employee",
  total_revenue as "Total Revenue (₹)",
  vehicles_entered as "Vehicles In",
  vehicles_exited as "Vehicles Out",
  currently_parked as "Currently Parked"
FROM shift_sessions
WHERE status = 'active';
