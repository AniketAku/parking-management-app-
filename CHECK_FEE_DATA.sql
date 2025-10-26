-- Check parking entries fee data
SELECT
  id,
  vehicle_number,
  vehicle_type,
  entry_time,
  exit_time,
  status,
  actual_fee,
  calculated_fee,
  parking_fee,
  shift_session_id,
  COALESCE(actual_fee, calculated_fee, parking_fee, 0) as effective_fee
FROM parking_entries
WHERE entry_time >= CURRENT_DATE
ORDER BY entry_time DESC;
