-- Debug parking_entries table structure
-- Run this in Supabase SQL Editor to see actual table structure

-- Check all columns in parking_entries table
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'parking_entries' 
ORDER BY ordinal_position;

-- Check constraints on parking_entries table
SELECT 
  constraint_name,
  constraint_type,
  column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'parking_entries';

-- Check if table exists and get basic info
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name = 'parking_entries';