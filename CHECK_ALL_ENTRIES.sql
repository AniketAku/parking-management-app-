-- =====================================================================
-- CHECK ALL PARKING ENTRIES (NOT JUST TODAY)
-- =====================================================================

-- 1. Check ALL parking entries in database
SELECT
  '📋 ALL Parking Entries' as section,
  id,
  vehicle_number,
  vehicle_type,
  status,
  parking_fee,
  calculated_fee,
  actual_fee,
  shift_session_id,
  entry_time,
  exit_time
FROM parking_entries
ORDER BY entry_time DESC
LIMIT 20;

-- 2. Count entries by date
SELECT
  '📅 Entries by Date' as section,
  DATE(entry_time) as entry_date,
  COUNT(*) as total_entries,
  COUNT(shift_session_id) as linked_to_shift,
  COUNT(*) - COUNT(shift_session_id) as unlinked,
  SUM(COALESCE(parking_fee, 0)) as total_fees
FROM parking_entries
GROUP BY DATE(entry_time)
ORDER BY entry_date DESC;

-- 3. Check if there are entries with NULL fees
SELECT
  '❌ Entries with NULL Fees' as section,
  vehicle_number,
  vehicle_type,
  status,
  entry_time,
  parking_fee,
  calculated_fee,
  actual_fee,
  shift_session_id
FROM parking_entries
WHERE COALESCE(parking_fee, calculated_fee, actual_fee) IS NULL
   OR COALESCE(parking_fee, calculated_fee, actual_fee) = 0
ORDER BY entry_time DESC;
