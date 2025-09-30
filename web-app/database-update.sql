-- Database Schema Update for Parking Management System
-- Run these commands in your Supabase SQL Editor

-- 1. Add missing columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS auth_id UUID,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- 2. Make email and password_hash optional (remove NOT NULL constraints if they exist)
ALTER TABLE users 
ALTER COLUMN email DROP NOT NULL;

-- Make password_hash optional since we're using Supabase Auth
ALTER TABLE users 
ALTER COLUMN password_hash DROP NOT NULL;

-- 3. Update existing system user to work with new schema
UPDATE users 
SET 
  is_approved = true,
  email = COALESCE(email, username || '@parking.local'),
  updated_at = NOW()
WHERE id = 1 AND username = 'system';

-- 4. Create or update admin user that matches Supabase Auth
INSERT INTO users (
  username, 
  email, 
  password_hash,  -- Add dummy password hash
  role, 
  location_id,    -- Add location_id if needed
  full_name, 
  is_approved, 
  is_active,
  auth_id,
  created_at, 
  updated_at
) VALUES (
  'admin',
  'aniketawachat74@gmail.com',
  '8112bdc54e60d9368b2f630d3288c7a20e9387f27ddd64934b1417286c41dcd8',  -- password123 hashed with parking_system_salt
  'admin',
  1,  -- Default location ID
  'System Administrator',
  true,
  true,
  '80e13277-667d-43ec-8c49-688f7e152776'::uuid,
  NOW(),
  NOW()
) ON CONFLICT (username) 
DO UPDATE SET 
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  is_approved = EXCLUDED.is_approved,
  is_active = EXCLUDED.is_active,
  auth_id = EXCLUDED.auth_id,
  updated_at = NOW();

-- 5. Update Row Level Security policies to allow proper access

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

-- Create more permissive policies for development
CREATE POLICY "Enable read access for authenticated users" ON users
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON users
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON users
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

-- 6. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_approved ON users(is_approved);

-- 7. Update the updated_at trigger to work with new schema
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Recreate trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 8. Verify the schema update
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;