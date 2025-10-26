-- =====================================================================
-- LINK YESTERDAY'S ENTRIES TO TODAY'S SHIFT
-- WARNING: This moves entries from one shift to another
-- Only use if you want yesterday's data in today's shift
-- =====================================================================

DO $$
DECLARE
  v_active_shift_id UUID;
  v_updated_count INTEGER;
BEGIN
  -- Get today's active shift
  SELECT id INTO v_active_shift_id
  FROM shift_sessions
  WHERE status = 'active'
  ORDER BY shift_start_time DESC
  LIMIT 1;

  IF v_active_shift_id IS NULL THEN
    RAISE EXCEPTION '❌ No active shift found';
  END IF;

  RAISE NOTICE '📊 Active Shift ID: %', v_active_shift_id;
  RAISE NOTICE '';

  -- Link yesterday's entries to today's shift
  UPDATE parking_entries
  SET
    shift_session_id = v_active_shift_id,
    updated_at = NOW()
  WHERE DATE(entry_time) = DATE(CURRENT_DATE - INTERVAL '1 day')
    AND status = 'Exited';  -- Only exited entries with completed payments

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Linked % entries from yesterday to today''s shift', v_updated_count;

  -- Sync statistics
  PERFORM sync_shift_statistics(v_active_shift_id);
  RAISE NOTICE '✅ Statistics synced';
  RAISE NOTICE '';
END $$;

-- Verify
SELECT
  '💰 Updated Shift Revenue' as section,
  employee_name,
  total_revenue,
  vehicles_entered,
  vehicles_exited,
  currently_parked
FROM shift_sessions
WHERE status = 'active';
