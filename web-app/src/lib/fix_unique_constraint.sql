-- Fix unique constraint issue for parking entries
-- The constraint 'unique_parked_vehicle' is preventing vehicles from parking multiple times
-- This is incorrect business logic - vehicles should be able to park multiple times

-- Step 1: First, let's identify the exact constraint
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'parking_entries'::regclass
  AND conname = 'unique_parked_vehicle';

-- Step 2: Check what columns this constraint affects
SELECT 
    tc.constraint_name,
    kcu.column_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'parking_entries' 
  AND tc.constraint_name = 'unique_parked_vehicle'
ORDER BY kcu.ordinal_position;

-- Step 3: Show current entries that might be causing conflicts
SELECT 
    vehicle_number,
    COUNT(*) as total_entries,
    COUNT(CASE WHEN status = 'Parked' THEN 1 END) as currently_parked,
    COUNT(CASE WHEN status = 'Exited' THEN 1 END) as exited_entries,
    STRING_AGG(DISTINCT status, ', ') as all_statuses,
    MIN(entry_time) as first_entry,
    MAX(entry_time) as latest_entry
FROM parking_entries 
GROUP BY vehicle_number
HAVING COUNT(*) > 1 OR COUNT(CASE WHEN status = 'Parked' THEN 1 END) > 1
ORDER BY vehicle_number;

-- Step 4: SOLUTION - Drop the problematic constraint
-- This constraint should not exist in a parking system
DROP CONSTRAINT IF EXISTS unique_parked_vehicle ON parking_entries;

-- Alternative: If the constraint exists as an index, drop it
DROP INDEX IF EXISTS unique_parked_vehicle;

-- Step 5: Create a correct constraint instead
-- A vehicle should only have ONE active "Parked" status at a time
-- But it can have multiple historical entries

-- First, let's create a partial unique index that only applies to 'Parked' status
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS unique_active_parked_vehicle 
ON parking_entries (vehicle_number) 
WHERE status = 'Parked';

-- Step 6: Verify the fix
-- This should show no constraints that prevent multiple entries per vehicle
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'parking_entries'::regclass
  AND conname LIKE '%vehicle%'
ORDER BY conname;

-- Step 7: Test query - this should work after the fix
-- INSERT INTO parking_entries (transport_name, vehicle_type, vehicle_number, driver_name, calculated_fee, entry_time, status, payment_status, serial)
-- VALUES ('Test Transport', 'Car', 'TEST123', 'Test Driver', 50, NOW(), 'Parked', 'Unpaid', 1);

-- Step 8: Show the new index we created
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'parking_entries' 
  AND indexname = 'unique_active_parked_vehicle';

-- Step 9: Verification - Show that multiple entries are now allowed
SELECT 
    'After Fix - Multiple entries per vehicle should be allowed' as status,
    COUNT(DISTINCT vehicle_number) as unique_vehicles,
    COUNT(*) as total_entries,
    ROUND(COUNT(*)::numeric / COUNT(DISTINCT vehicle_number), 2) as avg_entries_per_vehicle
FROM parking_entries;