-- Debug payment_type check constraint violation
-- Run this in Supabase SQL Editor

-- 1. Check what payment_type constraint exists
SELECT 
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%payment%';

-- 2. Check parking_entries table constraints
SELECT 
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'parking_entries'
  AND tc.constraint_type = 'CHECK';

-- 3. Check if payment_type column exists
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'parking_entries' 
  AND column_name LIKE '%payment%'
ORDER BY column_name;