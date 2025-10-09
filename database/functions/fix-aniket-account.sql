-- Fix Aniket user account
-- This script will check the current state and fix any issues

-- Step 1: Check current state of Aniket user
SELECT
  username,
  role,
  is_active,
  is_approved,
  LENGTH(password_hash) as hash_length,
  SUBSTRING(password_hash, 1, 7) as hash_prefix,
  created_at
FROM users
WHERE username = 'Aniket';

-- Step 2: Fix the account
DO $$
DECLARE
  user_exists BOOLEAN;
  new_password_hash TEXT;
BEGIN
  -- Check if user exists
  SELECT EXISTS (
    SELECT 1 FROM users WHERE username = 'Aniket'
  ) INTO user_exists;

  IF NOT user_exists THEN
    RAISE NOTICE 'User Aniket does not exist.';
    RETURN;
  END IF;

  -- Generate proper bcrypt hash for password '12345678'
  new_password_hash := crypt('12345678', gen_salt('bf'));

  -- Update user: set proper password hash, approve, and activate
  UPDATE users
  SET
    password_hash = new_password_hash,
    is_approved = true,
    is_active = true,
    updated_at = NOW()
  WHERE username = 'Aniket';

  RAISE NOTICE 'Aniket account has been fixed successfully.';
  RAISE NOTICE 'Username: Aniket';
  RAISE NOTICE 'Password: 12345678';
  RAISE NOTICE 'Status: Approved and Active';

END $$;

-- Step 3: Verify the fix
SELECT
  username,
  role,
  is_active,
  is_approved,
  LENGTH(password_hash) as hash_length,
  SUBSTRING(password_hash, 1, 7) as hash_prefix
FROM users
WHERE username = 'Aniket';

-- Step 4: Test password verification
SELECT * FROM verify_user_password('Aniket', '12345678');
