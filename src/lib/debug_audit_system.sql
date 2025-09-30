-- Investigate audit system causing RLS violation
-- Run this in Supabase SQL Editor to understand the issue

-- 1. Check if audit_log table exists and its structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'audit_log' 
ORDER BY ordinal_position;

-- 2. Check what triggers exist on parking_entries that might use audit_log
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'parking_entries';

-- 3. Check RLS status on both tables
SELECT 
  schemaname, 
  tablename, 
  rowsecurity,
  hasrls
FROM pg_tables 
WHERE tablename IN ('parking_entries', 'audit_log');

-- 4. List all policies on audit_log
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual
FROM pg_policies 
WHERE tablename = 'audit_log';