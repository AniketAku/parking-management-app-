-- Remove email dependency and use phone-based authentication
-- Run this SQL in Supabase SQL Editor

-- 1. First, ensure basic table structure
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_id UUID;

-- 2. Make email completely optional and phone required for contact
ALTER TABLE users 
ALTER COLUMN email DROP NOT NULL;

ALTER TABLE users 
ALTER COLUMN password_hash DROP NOT NULL;

-- Make phone the primary contact method
UPDATE users SET phone = COALESCE(phone, '0000000000') WHERE phone IS NULL OR phone = '';

-- 3. Disable RLS for easier operations
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 4. Clean up any existing problematic users
DELETE FROM users WHERE username IN ('admin', 'Aniket@123') OR email = 'aniketawachat74@gmail.com';

-- 5. Create a simple admin user without email dependency
INSERT INTO users (
  username, 
  phone,
  password_hash,
  role, 
  location_id,
  full_name, 
  email,
  is_approved, 
  is_active,
  created_at, 
  updated_at
) VALUES (
  'admin',
  '1234567890',
  NULL,  -- We'll handle auth differently
  'admin',
  1,
  'Admin User',
  NULL,  -- No email required
  true,
  true,
  NOW(),
  NOW()
);

-- 6. Create a second test user
INSERT INTO users (
  username, 
  phone,
  password_hash,
  role, 
  location_id,
  full_name, 
  email,
  is_approved, 
  is_active,
  created_at, 
  updated_at
) VALUES (
  'testuser',
  '9876543210',
  NULL,
  'operator',
  1,
  'Test User',
  NULL,
  true,
  true,
  NOW(),
  NOW()
);

-- 7. Verify users were created
SELECT id, username, phone, role, is_approved, is_active, full_name, email
FROM users 
WHERE username IN ('admin', 'testuser');

-- 8. Create locations table if it doesn't exist
CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY DEFAULT 1,
  name VARCHAR(255) DEFAULT 'Default Location'
);

INSERT INTO locations (id, name) VALUES (1, 'Main Parking Lot') 
ON CONFLICT (id) DO UPDATE SET name = 'Main Parking Lot';