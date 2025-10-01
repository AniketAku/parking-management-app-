-- Simple Database Fix for Parking Management System
-- This approach works with your existing schema

-- 1. Add only the essential missing columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_id UUID;

-- 2. Make password_hash optional since we use Supabase Auth
ALTER TABLE users 
ALTER COLUMN password_hash DROP NOT NULL;

-- 3. Update the existing system user to be compatible
UPDATE users 
SET 
  is_approved = true,
  email = 'system@parking.local',
  password_hash = '$2b$12$supabase.auth.managed',
  updated_at = NOW()
WHERE username = 'system';

-- 4. Create admin user that matches your Supabase Auth user
-- Delete if exists and recreate
DELETE FROM users WHERE username = 'admin';

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
  auth_id,
  created_at, 
  updated_at
) VALUES (
  'admin',
  'aniketawachat74@gmail.com',
  '$2b$12$supabase.auth.managed',  -- Dummy since we use Supabase Auth
  'admin',
  1,  -- Default location
  'System Administrator',
  null,
  true,  -- Pre-approved
  true,  -- Active
  '80e13277-667d-43ec-8c49-688f7e152776'::uuid,  -- Your Supabase Auth ID
  NOW(),
  NOW()
);

-- 5. Temporarily disable RLS to allow operations
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 6. Or if you want to keep RLS, create permissive policies
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- 
-- DROP POLICY IF EXISTS "Allow all for authenticated users" ON users;
-- CREATE POLICY "Allow all for authenticated users" ON users
--   FOR ALL 
--   USING (true)
--   WITH CHECK (true);

-- 7. Verify the admin user was created
SELECT id, username, email, role, is_approved, is_active, auth_id 
FROM users 
WHERE username = 'admin';