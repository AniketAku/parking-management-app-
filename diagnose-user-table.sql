-- Database Diagnosis Script for User Authentication Issues
-- This script will help identify problems with the user table structure

-- ============================================================================
-- STEP 1: Check if users table exists and view its structure
-- ============================================================================

-- Check if users table exists
SELECT 
    schemaname, 
    tablename, 
    tableowner 
FROM pg_tables 
WHERE tablename = 'users';

-- View the complete structure of users table
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 2: Check table constraints
-- ============================================================================

-- View all constraints on users table
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'users'
ORDER BY tc.constraint_type, tc.constraint_name;

-- ============================================================================
-- STEP 3: Check existing user data
-- ============================================================================

-- Count total users
SELECT 'Total Users' AS metric, COUNT(*) AS value FROM users
UNION ALL
-- Count users with usernames
SELECT 'Users with Username', COUNT(*) FROM users WHERE username IS NOT NULL
UNION ALL
-- Count users with emails (if column exists)
SELECT 'Users with Email', 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email')
        THEN (SELECT COUNT(*)::text FROM users WHERE email IS NOT NULL)
        ELSE 'Email column does not exist'
    END
UNION ALL
-- Count users with phone numbers
SELECT 'Users with Phone', 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone')
        THEN (SELECT COUNT(*)::text FROM users WHERE phone IS NOT NULL)
        ELSE 'Phone column does not exist'
    END
UNION ALL
-- Count active users
SELECT 'Active Users', COUNT(*) FROM users WHERE is_active = true;

-- ============================================================================
-- STEP 4: Sample user records (anonymized)
-- ============================================================================

-- Show sample user data (first 5 users with sensitive data masked)
SELECT 
    id,
    username,
    LEFT(COALESCE(email, 'N/A'), 3) || '***' AS email_masked,
    LEFT(COALESCE(phone, 'N/A'), 3) || '***' AS phone_masked,
    role,
    full_name,
    is_active,
    created_at,
    last_login
FROM users
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- STEP 5: Check for data inconsistencies
-- ============================================================================

-- Check for duplicate usernames
SELECT 'Duplicate Usernames' AS issue, COUNT(*) AS count
FROM (
    SELECT username, COUNT(*) as cnt
    FROM users 
    WHERE username IS NOT NULL
    GROUP BY username
    HAVING COUNT(*) > 1
) duplicates
UNION ALL
-- Check for users without required fields
SELECT 'Users without Username', COUNT(*)
FROM users WHERE username IS NULL OR username = ''
UNION ALL
-- Check for users without password (if column exists)
SELECT 'Users without Password', 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash')
        THEN (SELECT COUNT(*)::text FROM users WHERE password_hash IS NULL OR password_hash = '')
        ELSE 'Password column check skipped'
    END;

-- ============================================================================
-- STEP 6: Check indexes for performance
-- ============================================================================

-- Show all indexes on users table
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'users'
ORDER BY indexname;

-- ============================================================================
-- STEP 7: Check RLS policies (if enabled)
-- ============================================================================

-- Check if Row Level Security is enabled
SELECT schemaname, tablename, rowsecurity, forcerowsecurity
FROM pg_tables 
WHERE tablename = 'users';

-- Show RLS policies
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

RAISE NOTICE '=== USER TABLE DIAGNOSIS COMPLETE ===';
RAISE NOTICE 'Review the output above to identify authentication issues.';