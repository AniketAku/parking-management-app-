-- Fix audit_log RLS policy violation
-- Run this in Supabase SQL Editor

-- Option 1: Temporarily disable RLS on audit_log table
ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY;

-- Option 2: Create permissive RLS policy for audit_log
CREATE POLICY IF NOT EXISTS "Allow all operations on audit_log" 
ON audit_log FOR ALL 
TO authenticated 
USING (true);

-- Option 3: Check if audit_log table exists and what triggers it
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('parking_entries', 'audit_log');

-- Check RLS policies on audit_log
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'audit_log';