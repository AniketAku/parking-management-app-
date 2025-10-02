-- Check current password hashes for both users
SELECT 
    id,
    username,
    email,
    password_hash,
    LENGTH(password_hash) as hash_length,
    CASE 
        WHEN password_hash LIKE '$2a$%' OR password_hash LIKE '$2b$%' OR password_hash LIKE '$2y$%' THEN 'bcrypt'
        WHEN LENGTH(password_hash) = 64 AND password_hash ~ '^[a-f0-9]+$' THEN 'SHA-256'
        WHEN LENGTH(password_hash) = 32 AND password_hash ~ '^[a-f0-9]+$' THEN 'MD5'
        ELSE 'unknown/plain'
    END as hash_type,
    role,
    is_active,
    is_approved,
    updated_at
FROM users 
WHERE username IN ('admin', 'Aniket123')
ORDER BY username;