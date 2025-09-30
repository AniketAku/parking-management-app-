-- Diagnose NOT NULL constraint violations in parking_entries
-- Run this in Supabase SQL Editor to identify the issue

-- 1. Check all NOT NULL columns
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'parking_entries' 
  AND is_nullable = 'NO'
ORDER BY ordinal_position;

-- 2. Check for any SERIAL or auto-increment columns
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_name = 'parking_entries' 
  AND (column_default LIKE '%serial%' OR column_default LIKE '%nextval%')
ORDER BY ordinal_position;

-- 3. Get complete table structure
\d parking_entries