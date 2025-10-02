-- ============================================================================
-- VALIDATION SCRIPT: Test Authentication System Recovery
-- Run this after applying the fix to verify everything works
-- ============================================================================

-- Check if users table exists and has correct structure
SELECT 'Users table exists' AS test_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
            THEN 'PASS ✅'
            ELSE 'FAIL ❌'
       END AS result;

-- Check if admin user was created
SELECT 'Admin user created' AS test_name,
       CASE WHEN EXISTS (SELECT 1 FROM users WHERE username = 'admin' AND role = 'admin')
            THEN 'PASS ✅'
            ELSE 'FAIL ❌'
       END AS result;

-- Check if operator user was created  
SELECT 'Operator user created' AS test_name,
       CASE WHEN EXISTS (SELECT 1 FROM users WHERE username = 'operator' AND role = 'operator')
            THEN 'PASS ✅'
            ELSE 'FAIL ❌'
       END AS result;

-- Check if users are active and approved
SELECT 'Users are active' AS test_name,
       CASE WHEN (SELECT COUNT(*) FROM users WHERE is_active = true AND is_approved = true) >= 2
            THEN 'PASS ✅'
            ELSE 'FAIL ❌'
       END AS result;

-- Check if users have password hashes
SELECT 'Users have passwords' AS test_name,
       CASE WHEN (SELECT COUNT(*) FROM users WHERE password_hash IS NOT NULL AND password_hash != '') >= 2
            THEN 'PASS ✅'
            ELSE 'FAIL ❌'
       END AS result;

-- Check table constraints
SELECT 'Username constraint exists' AS test_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.table_constraints 
                        WHERE table_name = 'users' AND constraint_name LIKE '%username%')
            THEN 'PASS ✅'
            ELSE 'FAIL ❌'
       END AS result;

-- Show user details for verification
SELECT 
    '=== CREATED USERS ===' AS section,
    '' AS username,
    '' AS email,
    '' AS role,
    '' AS is_active,
    '' AS is_approved,
    '' AS created_at
UNION ALL
SELECT 
    '',
    username,
    email,
    role,
    is_active::text,
    is_approved::text,
    created_at::text
FROM users
ORDER BY section DESC, username;

-- Test login simulation (verify user lookup works)
DO $$
DECLARE
    user_record RECORD;
BEGIN
    RAISE NOTICE '=== LOGIN SIMULATION TEST ===';
    
    -- Test admin user lookup
    SELECT * INTO user_record 
    FROM users 
    WHERE (username = 'admin' OR email = 'admin') 
      AND is_active = true 
      AND is_approved = true;
      
    IF FOUND THEN
        RAISE NOTICE 'PASS ✅ Admin user lookup successful';
        RAISE NOTICE 'User ID: %, Username: %, Role: %', user_record.id, user_record.username, user_record.role;
    ELSE
        RAISE NOTICE 'FAIL ❌ Admin user lookup failed';
    END IF;
    
    -- Test operator user lookup
    SELECT * INTO user_record 
    FROM users 
    WHERE (username = 'operator' OR email = 'operator') 
      AND is_active = true 
      AND is_approved = true;
      
    IF FOUND THEN
        RAISE NOTICE 'PASS ✅ Operator user lookup successful';
        RAISE NOTICE 'User ID: %, Username: %, Role: %', user_record.id, user_record.username, user_record.role;
    ELSE
        RAISE NOTICE 'FAIL ❌ Operator user lookup failed';
    END IF;
    
END $$;

-- Final summary
DO $$
DECLARE
    total_tests INTEGER := 6;
    passed_tests INTEGER;
BEGIN
    SELECT COUNT(*) INTO passed_tests
    FROM (
        SELECT CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN 1 ELSE 0 END
        UNION ALL
        SELECT CASE WHEN EXISTS (SELECT 1 FROM users WHERE username = 'admin' AND role = 'admin') THEN 1 ELSE 0 END
        UNION ALL  
        SELECT CASE WHEN EXISTS (SELECT 1 FROM users WHERE username = 'operator' AND role = 'operator') THEN 1 ELSE 0 END
        UNION ALL
        SELECT CASE WHEN (SELECT COUNT(*) FROM users WHERE is_active = true AND is_approved = true) >= 2 THEN 1 ELSE 0 END
        UNION ALL
        SELECT CASE WHEN (SELECT COUNT(*) FROM users WHERE password_hash IS NOT NULL AND password_hash != '') >= 2 THEN 1 ELSE 0 END
        UNION ALL
        SELECT CASE WHEN EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'users' AND constraint_name LIKE '%username%') THEN 1 ELSE 0 END
    ) tests(result) 
    WHERE result = 1;
    
    RAISE NOTICE '=== VALIDATION SUMMARY ===';
    RAISE NOTICE 'Tests Passed: % / %', passed_tests, total_tests;
    
    IF passed_tests = total_tests THEN
        RAISE NOTICE 'STATUS: ALL TESTS PASSED ✅';
        RAISE NOTICE 'Authentication system should be working!';
        RAISE NOTICE 'Try logging in with:';
        RAISE NOTICE '  Username: admin, Password: admin123';
        RAISE NOTICE '  Username: operator, Password: admin123';
    ELSE
        RAISE NOTICE 'STATUS: SOME TESTS FAILED ❌';
        RAISE NOTICE 'Review the output above and fix any failed tests.';
    END IF;
    
END $$;