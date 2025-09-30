-- Analyze database constraints causing duplicate key violation
-- Run this in Supabase SQL Editor to diagnose the issue

-- 1. Check all constraints on parking_entries table
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'parking_entries'::regclass
ORDER BY conname;

-- 2. Check unique constraints specifically
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'parking_entries' 
  AND indexdef LIKE '%UNIQUE%'
ORDER BY indexname;

-- 3. Check table structure
\d parking_entries;

-- 4. Show specific constraint that's causing the issue
SELECT 
    conname,
    contype,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'parking_entries'::regclass 
  AND conname = 'unique_parked_vehicle';

-- 5. Check current data to understand the conflict
SELECT 
    vehicle_number,
    COUNT(*) as entry_count,
    status,
    STRING_AGG(DISTINCT status, ', ') as all_statuses,
    MIN(entry_time) as first_entry,
    MAX(entry_time) as latest_entry
FROM parking_entries 
GROUP BY vehicle_number, status
HAVING COUNT(*) > 1
ORDER BY vehicle_number;

-- 6. Show all entries for vehicles with multiple entries
SELECT 
    id,
    vehicle_number,
    entry_time,
    exit_time,
    status,
    transport_name
FROM parking_entries 
WHERE vehicle_number IN (
    SELECT vehicle_number 
    FROM parking_entries 
    GROUP BY vehicle_number 
    HAVING COUNT(*) > 1
)
ORDER BY vehicle_number, entry_time;