-- Diagnostic Script: Check User Table Status
-- Run this in Supabase SQL Editor to diagnose user issues

-- 1. Check if register_public_user function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'register_public_user';

-- 2. Count total users in database
SELECT COUNT(*) as total_users FROM users;

-- 3. Show all users (if any exist)
SELECT
  id,
  username,
  full_name,
  phone,
  role,
  is_approved,
  is_active,
  created_at
FROM users
ORDER BY created_at DESC;

-- 4. Check RLS policies on users table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users';

-- 5. Check current user context
SELECT current_user, current_setting('request.jwt.claims', true) as jwt_claims;
