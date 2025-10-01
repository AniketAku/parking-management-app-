-- Fix timezone and date display issues
-- Run this in Supabase SQL Editor

-- 1. Check current timezone setting
SHOW timezone;

-- 2. Check actual data structure for a sample entry
SELECT 
  id,
  vehicle_number,
  entry_time,
  exit_time,
  created_at,
  updated_at,
  EXTRACT(TIMEZONE FROM entry_time) as entry_tz,
  NOW() as current_server_time,
  NOW() AT TIME ZONE 'UTC' as utc_time,
  NOW() AT TIME ZONE 'Asia/Kolkata' as ist_time
FROM parking_entries 
ORDER BY entry_time DESC 
LIMIT 3;

-- 3. If created_at and updated_at columns don't exist, add them
ALTER TABLE parking_entries 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE parking_entries 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. Update existing entries to have proper created_at/updated_at
UPDATE parking_entries 
SET 
  created_at = COALESCE(created_at, entry_time),
  updated_at = COALESCE(updated_at, entry_time, NOW())
WHERE created_at IS NULL OR updated_at IS NULL;

-- 5. Create trigger to auto-update updated_at
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