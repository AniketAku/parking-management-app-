-- Set plain text passwords for simple authentication
-- This removes all password hashing complexity for easier development

-- Update admin user with plain text password
UPDATE users 
SET 
    password_hash = 'admin123',
    is_active = true,
    is_approved = true,
    updated_at = NOW()
WHERE username = 'admin';

-- Update Aniket123 user with plain text password
UPDATE users 
SET 
    password_hash = '12345678',
    is_active = true,
    is_approved = true,
    updated_at = NOW()
WHERE username = 'Aniket123';

-- Verify the changes
SELECT 
    username,
    password_hash as plain_text_password,
    is_active,
    is_approved,
    'Login ready' as status
FROM users 
WHERE username IN ('admin', 'Aniket123')
ORDER BY username;

-- Expected login credentials:
-- admin / admin123
-- Aniket123 / 12345678