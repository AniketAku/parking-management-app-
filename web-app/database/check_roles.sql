-- Check existing user roles in your system
-- Run this to verify role compatibility before applying settings schema

-- Check what roles currently exist
SELECT DISTINCT role, COUNT(*) as user_count
FROM users 
GROUP BY role
ORDER BY role;

-- Check if auth_id column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'auth_id';

-- Check sample user data
SELECT id, username, email, role, auth_id IS NOT NULL as has_auth_id
FROM users 
LIMIT 5;

-- Verify locations table exists (needed for location_settings)
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'locations' AND table_schema = 'public';

SELECT 'Role verification complete. Proceed if roles are admin/operator/viewer' as message;