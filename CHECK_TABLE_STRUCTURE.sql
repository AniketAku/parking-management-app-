-- =============================================================================
-- CHECK YOUR SUPABASE TABLE STRUCTURE
-- Run this in Supabase SQL Editor to see what columns actually exist
-- =============================================================================

-- Check shift_sessions columns
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'shift_sessions'
ORDER BY ordinal_position;

-- Separator
SELECT '-------------------' as separator;

-- Check parking_entries columns
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'parking_entries'
ORDER BY ordinal_position;

-- Separator
SELECT '-------------------' as separator;

-- Show sample shift data
SELECT * FROM shift_sessions WHERE status = 'active' LIMIT 1;
