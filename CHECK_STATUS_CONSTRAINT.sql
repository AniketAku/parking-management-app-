-- Run this in Supabase SQL Editor to check the actual constraint

-- Get the constraint definition
SELECT
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
INNER JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'parking_entries'
  AND con.conname LIKE '%status%';
