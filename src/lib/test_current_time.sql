-- Test current time handling to verify timestamp accuracy
-- Run this to see what the database thinks the current time is

-- Check current database time in various formats
SELECT 
    'Database current time (UTC)' as label,
    NOW() as value
UNION ALL
SELECT 
    'Database current time (IST)' as label,
    NOW() AT TIME ZONE 'Asia/Kolkata' as value
UNION ALL
SELECT 
    'Expected IST time should be around 21:32' as label,
    '2025-08-21 21:32:00'::timestamp as value;

-- Check the actual entry that's showing the time difference
SELECT 
    vehicle_number,
    entry_time,
    entry_time AT TIME ZONE 'Asia/Kolkata' as entry_time_ist,
    created_at,
    created_at AT TIME ZONE 'Asia/Kolkata' as created_at_ist,
    updated_at,
    updated_at AT TIME ZONE 'Asia/Kolkata' as updated_at_ist,
    EXTRACT(EPOCH FROM (created_at - entry_time))/3600 as hours_between_entry_and_creation
FROM parking_entries 
WHERE vehicle_number = 'MH12SA6521'
ORDER BY created_at DESC 
LIMIT 1;

-- Show if there are multiple entries for this vehicle
SELECT 
    COUNT(*) as total_entries,
    MIN(entry_time) as first_entry,
    MAX(entry_time) as latest_entry,
    string_agg(status, ', ') as all_statuses
FROM parking_entries 
WHERE vehicle_number = 'MH12SA6521';