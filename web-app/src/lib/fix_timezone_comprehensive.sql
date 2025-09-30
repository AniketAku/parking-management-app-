-- Comprehensive timezone and timestamp fix for parking system
-- Run this in Supabase SQL Editor

-- 1. Check current timezone settings
SELECT name, setting FROM pg_settings WHERE name LIKE '%timezone%';

-- 2. Set database timezone to IST if needed (optional)
-- ALTER DATABASE postgres SET timezone = 'Asia/Kolkata';

-- 3. Check current table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'parking_entries' 
  AND (column_name LIKE '%time%' OR column_name LIKE '%created%' OR column_name LIKE '%updated%')
ORDER BY ordinal_position;

-- 4. Ensure all timestamp columns are TIMESTAMPTZ (with timezone)
ALTER TABLE parking_entries 
ALTER COLUMN entry_time TYPE TIMESTAMPTZ USING entry_time AT TIME ZONE 'UTC';

ALTER TABLE parking_entries 
ALTER COLUMN exit_time TYPE TIMESTAMPTZ USING exit_time AT TIME ZONE 'UTC';

-- 5. Add created_at and updated_at if they don't exist
ALTER TABLE parking_entries 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE parking_entries 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 6. Update existing entries to have proper timestamps
UPDATE parking_entries 
SET 
  created_at = COALESCE(created_at, entry_time),
  updated_at = COALESCE(updated_at, entry_time, NOW())
WHERE created_at IS NULL OR updated_at IS NULL;

-- 7. Create or replace the updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_parking_entries_updated_at ON parking_entries;
CREATE TRIGGER update_parking_entries_updated_at
    BEFORE UPDATE ON parking_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Test query to see if timestamps are working correctly
SELECT 
  id,
  vehicle_number,
  entry_time,
  entry_time AT TIME ZONE 'Asia/Kolkata' as entry_time_ist,
  exit_time,
  exit_time AT TIME ZONE 'Asia/Kolkata' as exit_time_ist,
  created_at,
  created_at AT TIME ZONE 'Asia/Kolkata' as created_at_ist,
  updated_at,
  updated_at AT TIME ZONE 'Asia/Kolkata' as updated_at_ist,
  NOW() as current_utc,
  NOW() AT TIME ZONE 'Asia/Kolkata' as current_ist
FROM parking_entries 
ORDER BY entry_time DESC 
LIMIT 3;

-- 9. Show timezone info for verification
SELECT 
  'Current database timezone' as info, 
  current_setting('timezone') as value
UNION ALL
SELECT 
  'Current UTC time' as info, 
  NOW() AT TIME ZONE 'UTC' as value
UNION ALL
SELECT 
  'Current IST time' as info, 
  NOW() AT TIME ZONE 'Asia/Kolkata' as value;