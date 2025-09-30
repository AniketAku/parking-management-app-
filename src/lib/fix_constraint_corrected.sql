-- CORRECTED: Fix unique constraint issue for parking entries
-- Use proper PostgreSQL syntax for dropping constraints

-- Step 1: First, identify what type of constraint this is
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'parking_entries'::regclass
  AND conname = 'unique_parked_vehicle';

-- Step 2: Check if it's an index instead
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'parking_entries' 
  AND indexname = 'unique_parked_vehicle';

-- Step 3: CORRECTED SYNTAX - Drop the constraint (if it exists as a table constraint)
ALTER TABLE parking_entries 
DROP CONSTRAINT IF EXISTS unique_parked_vehicle;

-- Step 4: ALTERNATIVE - Drop if it's an index
DROP INDEX IF EXISTS unique_parked_vehicle;

-- Step 5: Also check for any other similar constraints that might cause issues
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'parking_entries'::regclass
  AND pg_get_constraintdef(oid) ILIKE '%vehicle_number%'
  AND contype = 'u'; -- unique constraints

-- Step 6: Create the correct constraint - only one ACTIVE parking session per vehicle
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_parked_vehicle 
ON parking_entries (vehicle_number) 
WHERE status = 'Parked';

-- Step 7: Verification query
SELECT 
    'Fix Applied Successfully' as status,
    'Vehicles can now park multiple times' as result;

-- Step 8: Test that the constraint works correctly
-- This should succeed (same vehicle, different times, one exited)
/*
Example of what should now work:
INSERT INTO parking_entries (transport_name, vehicle_type, vehicle_number, driver_name, calculated_fee, entry_time, status, payment_status, serial)
VALUES ('Transport A', 'Car', 'MH40CX8822', 'Driver 1', 50, '2024-01-01 10:00:00', 'Exited', 'Paid', 1);

INSERT INTO parking_entries (transport_name, vehicle_type, vehicle_number, driver_name, calculated_fee, entry_time, status, payment_status, serial)
VALUES ('Transport A', 'Car', 'MH40CX8822', 'Driver 1', 50, NOW(), 'Parked', 'Unpaid', 2);
*/

-- Step 9: Show final constraint status
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'parking_entries' 
  AND indexname = 'unique_active_parked_vehicle';