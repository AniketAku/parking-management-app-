-- Fix serial column constraint issue
-- Run this in Supabase SQL Editor if Fix 1 doesn't work

-- Option A: Make serial column nullable
ALTER TABLE parking_entries 
ALTER COLUMN serial DROP NOT NULL;

-- Option B: Set default value for serial column
ALTER TABLE parking_entries 
ALTER COLUMN serial SET DEFAULT 1;

-- Option C: If serial should auto-increment, create sequence
CREATE SEQUENCE IF NOT EXISTS parking_entries_serial_seq;
ALTER TABLE parking_entries 
ALTER COLUMN serial SET DEFAULT nextval('parking_entries_serial_seq');

-- Verify the fix
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'parking_entries' 
  AND column_name = 'serial';