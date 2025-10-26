-- =====================================================================
-- DEBUG: Check what's actually in the database
-- =====================================================================

-- 1. Check if vehicle_rates exist in app_config
SELECT
  '1️⃣ Vehicle Rates in app_config' as check_name,
  key,
  value,
  category
FROM app_config
WHERE key = 'vehicle_rates';

-- 2. Check parking_entries data
SELECT
  '2️⃣ Parking Entries Today' as check_name,
  vehicle_number,
  vehicle_type,
  status,
  parking_fee,
  calculated_fee,
  actual_fee,
  amount_paid,
  shift_session_id,
  entry_time
FROM parking_entries
WHERE entry_time >= CURRENT_DATE
ORDER BY entry_time DESC;

-- 3. Check active shift
SELECT
  '3️⃣ Active Shift Details' as check_name,
  id,
  employee_name,
  total_revenue,
  cash_collected,
  digital_collected,
  vehicles_entered,
  vehicles_exited,
  currently_parked,
  shift_start_time,
  status
FROM shift_sessions
WHERE status = 'active'
ORDER BY shift_start_time DESC;

-- 4. Check if sync_shift_statistics function exists
SELECT
  '4️⃣ Functions Available' as check_name,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name LIKE '%shift%'
  AND routine_schema = 'public';
