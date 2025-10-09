-- Diagnostic script to check user passwords and authentication setup

-- 1. Check all users and their password hash format
SELECT
  username,
  role,
  is_active,
  is_approved,
  LENGTH(password_hash) as hash_length,
  SUBSTRING(password_hash, 1, 7) as hash_prefix,
  created_at
FROM users
ORDER BY created_at;

-- 2. Test the verify_user_password function with admin credentials
-- Replace 'admin123' with your actual admin password
SELECT * FROM verify_user_password('admin', 'Admin@123');

-- 3. Check if pgcrypto extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';

-- 4. Test bcrypt hash generation
SELECT crypt('Admin@123', gen_salt('bf')) as sample_bcrypt_hash;
