-- QUICK FIX: Just add the missing columns
-- Run this in Supabase SQL Editor for immediate fix

-- Add missing fee columns to parking_entries table
ALTER TABLE parking_entries 
ADD COLUMN IF NOT EXISTS calculated_fee DECIMAL(10,2);

ALTER TABLE parking_entries 
ADD COLUMN IF NOT EXISTS actual_fee DECIMAL(10,2);

-- Verify columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'parking_entries' 
AND column_name IN ('calculated_fee', 'actual_fee')
ORDER BY column_name;