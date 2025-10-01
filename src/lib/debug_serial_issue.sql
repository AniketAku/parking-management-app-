-- Debug the 'serial' column issue
-- Run this in Supabase SQL Editor to identify the problem

-- 1. Check ALL columns in parking_entries table
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'parking_entries' 
ORDER BY ordinal_position;

-- 2. Check specifically for serial/sequence columns
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_name = 'parking_entries' 
  AND (data_type LIKE '%serial%' OR column_default LIKE '%nextval%');

-- 3. Check table constraints
SELECT 
  constraint_name,
  constraint_type,
  column_name
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'parking_entries'
  AND constraint_type = 'NOT NULL';