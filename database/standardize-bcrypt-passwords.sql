-- Standardize all user passwords to bcrypt format
-- This ensures consistent password hashing across all users

-- Update admin user - already has correct bcrypt hash for 'admin123'
-- Hash: $2a$12$LQv3c1yqBwlmQd9LQdQu5uHvKgHtFkfyfzBXYKkQ5tPJxNNQcY.WO (admin123)

-- Update Aniket123 user to use bcrypt hash
-- For now, setting to same hash as admin (password: admin123)
-- User should change password after login
UPDATE users 
SET 
    password_hash = '$2a$12$LQv3c1yqBwlmQd9LQdQu5uHvKgHtFkfyfzBXYKkQ5tPJxNNQcY.WO',
    updated_at = NOW()
WHERE username = 'Aniket123';

-- Verify all users now have bcrypt format
SELECT 
    id,
    username,
    email,
    password_hash,
    CASE 
        WHEN password_hash LIKE '$2a$%' OR password_hash LIKE '$2b$%' OR password_hash LIKE '$2y$%' THEN '✅ bcrypt'
        ELSE '❌ not bcrypt'
    END as hash_format,
    role,
    is_active,
    is_approved,
    updated_at
FROM users 
ORDER BY username;

-- Note: Both admin and Aniket123 will temporarily have password 'admin123'
-- They should change their passwords after login through the app