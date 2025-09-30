-- Optional: Add audit trail columns to parking_entries
-- Run this later in Supabase SQL Editor if you want user tracking

-- Add audit columns
ALTER TABLE parking_entries 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

ALTER TABLE parking_entries 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Verify columns added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'parking_entries' 
AND column_name IN ('created_by', 'updated_by')
ORDER BY column_name;