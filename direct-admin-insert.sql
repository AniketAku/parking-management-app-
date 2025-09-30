-- Direct Admin User Insert for Supabase
-- Run this SQL directly in Supabase SQL Editor

-- 1. First, ensure the table structure is correct
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_id UUID;

ALTER TABLE users 
ALTER COLUMN password_hash DROP NOT NULL;

-- 2. Disable RLS temporarily for this operation
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 3. Delete existing admin user if exists
DELETE FROM users WHERE username = 'Aniket@123' OR email = 'aniketawachat74@gmail.com';

-- 4. Insert the admin user directly
INSERT INTO users (
  username, 
  email, 
  password_hash,
  role, 
  location_id,
  full_name, 
  phone,
  is_approved, 
  is_active,
  created_at, 
  updated_at
) VALUES (
  'Aniket@123',
  'aniketawachat74@gmail.com',
  NULL,  -- We'll use Supabase Auth, not local password hash
  'admin',
  1,  -- Default location ID
  'System Administrator',
  NULL,
  true,  -- Pre-approved
  true,  -- Active
  NOW(),
  NOW()
);

-- 5. Now create the corresponding Supabase Auth user
-- You need to run this in a separate operation after the above completes:
-- INSERT INTO auth.users (
--   id,
--   instance_id,
--   email,
--   encrypted_password,
--   email_confirmed_at,
--   created_at,
--   updated_at,
--   confirmed_at
-- ) VALUES (
--   gen_random_uuid(),
--   '00000000-0000-0000-0000-000000000000',
--   'aniketawachat74@gmail.com',
--   crypt('12345678', gen_salt('bf')),
--   NOW(),
--   NOW(),
--   NOW(),
--   NOW()
-- );

-- 6. Verify the user was created
SELECT id, username, email, role, is_approved, is_active, created_at 
FROM users 
WHERE username = 'Aniket@123';

-- 7. Check if we need to update location_id column
-- If location_id doesn't exist, create a simple one:
-- CREATE TABLE IF NOT EXISTS locations (
--   id INTEGER PRIMARY KEY DEFAULT 1,
--   name VARCHAR(255) DEFAULT 'Default Location'
-- );
-- INSERT INTO locations (id, name) VALUES (1, 'Main Parking Lot') ON CONFLICT (id) DO NOTHING;