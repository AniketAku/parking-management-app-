-- Debug script to investigate login issues
-- Run this in Supabase SQL Editor to see what's in your users table

-- Check all users and their stored passwords
SELECT 
    id,
    username,
    email,
    password_hash,
    role,
    is_active,
    is_approved,
    created_at
FROM users 
ORDER BY created_at DESC;

-- Check if the specific user exists and is properly configured
SELECT 
    'User Check' as test,
    username,
    CASE 
        WHEN is_active = true AND is_approved = true THEN 'ACTIVE & APPROVED ✅'
        WHEN is_active = false THEN 'INACTIVE ❌'
        WHEN is_approved = false THEN 'NOT APPROVED ❌'
        ELSE 'OTHER ISSUE ❌'
    END as status,
    password_hash,
    role
FROM users 
WHERE username IN ('admin', 'operator') 
   OR email IN ('admin@parking.local', 'operator@parking.local');

-- Show the exact query that the auth system will run
SELECT 
    'Auth Query Simulation' as test,
    id,
    username,
    email,
    password_hash,
    role,
    is_active,
    is_approved
FROM users 
WHERE (username = 'admin' OR email = 'admin') 
  AND is_active = true 
  AND is_approved = true;