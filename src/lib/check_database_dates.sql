-- Check database date/time issues
-- Run this in Supabase SQL Editor to debug date problems

-- 1. Check what date columns actually exist
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'parking_entries' 
  AND column_name LIKE '%time%' OR column_name LIKE '%created%' OR column_name LIKE '%updated%'
ORDER BY column_name;

-- 2. Check actual data for vehicle MH40CX8822
SELECT 
  vehicle_number,
  entry_time,
  exit_time,
  created_at,
  updated_at,
  EXTRACT(TIMEZONE FROM entry_time) as entry_tz,
  NOW() as current_time
FROM parking_entries 
WHERE vehicle_number ILIKE '%MH40CX8822%'
ORDER BY entry_time DESC;

-- 3. Check timezone settings
SHOW timezone;