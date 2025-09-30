-- Fix for calculated_fee column issue in parking_entries table
-- Run this in Supabase SQL Editor to add missing columns

-- Add calculated_fee column if it doesn't exist
ALTER TABLE parking_entries 
ADD COLUMN IF NOT EXISTS calculated_fee DECIMAL(10,2);

-- Add actual_fee column if it doesn't exist  
ALTER TABLE parking_entries 
ADD COLUMN IF NOT EXISTS actual_fee DECIMAL(10,2);

-- Verify columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'parking_entries' 
AND column_name IN ('calculated_fee', 'actual_fee')
ORDER BY column_name;