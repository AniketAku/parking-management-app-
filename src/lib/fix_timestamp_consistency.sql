-- Fix timestamp consistency issues
-- Ensure all timestamps are stored consistently and display correctly

-- Step 1: Check current timezone configuration
SELECT 
    'Database timezone' as setting,
    current_setting('timezone') as value
UNION ALL
SELECT 
    'Current UTC time' as setting,
    NOW() AT TIME ZONE 'UTC' as value
UNION ALL
SELECT 
    'Current IST time' as setting,
    NOW() AT TIME ZONE 'Asia/Kolkata' as value;

-- Step 2: Check current data to see the timestamp differences
SELECT 
    id,
    vehicle_number,
    entry_time,
    entry_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as entry_time_ist,
    created_at,
    created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as created_at_ist,
    updated_at,
    updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as updated_at_ist
FROM parking_entries 
ORDER BY entry_time DESC 
LIMIT 3;

-- Step 3: Ensure all timestamp columns are TIMESTAMPTZ (with timezone awareness)
ALTER TABLE parking_entries 
ALTER COLUMN entry_time TYPE TIMESTAMPTZ USING entry_time AT TIME ZONE 'UTC';

ALTER TABLE parking_entries 
ALTER COLUMN exit_time TYPE TIMESTAMPTZ USING exit_time AT TIME ZONE 'UTC';

ALTER TABLE parking_entries 
ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE parking_entries 
ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- Step 4: Update the updated_at trigger to use proper timezone
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Always store in UTC but with timezone awareness
    NEW.updated_at = NOW() AT TIME ZONE 'UTC';
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 5: Recreate the trigger
DROP TRIGGER IF EXISTS update_parking_entries_updated_at ON parking_entries;
CREATE TRIGGER update_parking_entries_updated_at
    BEFORE UPDATE ON parking_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Test the consistency after fix
SELECT 
    'After Fix - All times should be consistent when converted to IST' as note,
    id,
    vehicle_number,
    entry_time AT TIME ZONE 'Asia/Kolkata' as entry_time_ist,
    created_at AT TIME ZONE 'Asia/Kolkata' as created_at_ist,
    updated_at AT TIME ZONE 'Asia/Kolkata' as updated_at_ist,
    EXTRACT(EPOCH FROM (created_at - entry_time))/3600 as hours_difference
FROM parking_entries 
ORDER BY entry_time DESC 
LIMIT 3;

-- Step 7: Show column types to verify they are TIMESTAMPTZ
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'parking_entries' 
  AND column_name LIKE '%time%' OR column_name LIKE '%created%' OR column_name LIKE '%updated%'
ORDER BY ordinal_position;