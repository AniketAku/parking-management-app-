-- FIX RLS for parking_entries table
-- Run this in Supabase SQL Editor to allow vehicle entry creation

-- Disable Row Level Security for parking_entries table
ALTER TABLE parking_entries DISABLE ROW LEVEL SECURITY;

-- Verify the fix
SELECT
    schemaname,
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE tablename IN ('parking_entries', 'app_config')
ORDER BY tablename;

-- Show table structure to confirm it exists
\d parking_entries;