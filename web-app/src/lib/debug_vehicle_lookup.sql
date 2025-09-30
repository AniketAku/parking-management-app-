-- Debug vehicle lookup issue
-- Run this in Supabase SQL Editor to check if vehicle exists

-- 1. Check if the vehicle entry exists in database
SELECT 
  id,
  transport_name,
  vehicle_type,
  vehicle_number,
  driver_name,
  status,
  entry_time,
  exit_time
FROM parking_entries 
WHERE vehicle_number ILIKE '%MH40CX8822%'
ORDER BY entry_time DESC;

-- 2. Check all recent entries
SELECT 
  vehicle_number,
  status,
  entry_time,
  exit_time
FROM parking_entries 
ORDER BY entry_time DESC 
LIMIT 10;

-- 3. Check for case sensitivity issues
SELECT 
  vehicle_number,
  status,
  LENGTH(vehicle_number) as length
FROM parking_entries 
WHERE UPPER(vehicle_number) = 'MH40CX8822';