-- Reset admin password with proper bcrypt hashing
-- This ensures the admin account has a properly hashed password

DO $$
DECLARE
  admin_exists BOOLEAN;
  new_password_hash TEXT;
BEGIN
  -- Check if admin user exists
  SELECT EXISTS (
    SELECT 1 FROM users WHERE username = 'admin'
  ) INTO admin_exists;

  IF NOT admin_exists THEN
    RAISE NOTICE 'Admin user does not exist. Please create admin user first.';
    RETURN;
  END IF;

  -- Generate bcrypt hash for password 'Admin@123'
  -- Change this password to your desired admin password
  new_password_hash := crypt('Admin@123', gen_salt('bf'));

  -- Update admin user with new password hash
  UPDATE users
  SET
    password_hash = new_password_hash,
    updated_at = NOW()
  WHERE username = 'admin';

  RAISE NOTICE 'Admin password has been reset successfully.';
  RAISE NOTICE 'Username: admin';
  RAISE NOTICE 'Password: Admin@123';
  RAISE NOTICE 'Please change this password after logging in.';

END $$;

-- Verify the update worked
SELECT
  username,
  role,
  is_active,
  is_approved,
  LENGTH(password_hash) as hash_length,
  SUBSTRING(password_hash, 1, 7) as hash_prefix
FROM users
WHERE username = 'admin';
