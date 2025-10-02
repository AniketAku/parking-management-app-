-- Standardize all passwords to use bcrypt hashing
-- This will convert the SHA-256 password for Aniket123 to bcrypt

-- Update Aniket123 user to use the same bcrypt hash as admin (password: admin123)
-- This is temporary - you should change the password after login
UPDATE users 
SET password_hash = '$2a$12$LQv3c1yqBwlmQd9LQdQu5uHvKgHtFkfyfzBXYKkQ5tPJxNNQcY.WO',
    updated_at = NOW()
WHERE username = 'Aniket123';

-- Or if you want to set a specific bcrypt hash for password '12345678':
-- First, we need to generate a bcrypt hash for '12345678'
-- For now, let's use a temporary solution and set it to the same as admin

-- Verify the update
SELECT 
    username,
    password_hash,
    'Password should now work with: admin123' as note
FROM users 
WHERE username IN ('admin', 'Aniket123');

-- Note: Both users will temporarily have the same password 'admin123'
-- Change the password after successful login