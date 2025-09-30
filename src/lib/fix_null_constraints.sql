-- Fix NOT NULL constraint issues in parking_entries table
-- Run this in Supabase SQL Editor

-- Option 1: Make created_by and updated_by nullable (recommended for now)
ALTER TABLE parking_entries 
ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE parking_entries 
ALTER COLUMN updated_by DROP NOT NULL;

-- Option 2: If there's an unexpected serial column, check structure
-- (Run the diagnostic first to identify the actual problematic column)

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'parking_entries' 
  AND column_name IN ('created_by', 'updated_by')
ORDER BY column_name;