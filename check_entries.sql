-- Check parking entries from today
SELECT 
  id,
  vehicle_number,
  entry_time,
  exit_time,
  status,
  actual_fee,
  calculated_fee,
  parking_fee,
  shift_session_id,
  created_at
FROM parking_entries
WHERE entry_time >= CURRENT_DATE
ORDER BY entry_time DESC
LIMIT 10;

-- Check active shift
SELECT 
  id,
  employee_name,
  shift_start_time,
  status,
  total_revenue,
  vehicles_entered,
  vehicles_exited,
  currently_parked
FROM shift_sessions
WHERE status = 'active'
ORDER BY shift_start_time DESC
LIMIT 1;
