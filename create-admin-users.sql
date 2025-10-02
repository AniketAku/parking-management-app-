-- Simple script to create admin users for login
-- Run this in Supabase SQL Editor

-- First, ensure the users table has the right columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;

-- Insert admin user
INSERT INTO users (
    username, 
    email, 
    password_hash, 
    role, 
    full_name,
    is_active,
    is_approved
) VALUES (
    'admin',
    'admin@parking.local',
    'admin123', -- Simple password for now
    'admin',
    'System Administrator',
    true,
    true
) ON CONFLICT (username) DO UPDATE SET
    password_hash = 'admin123',
    is_active = true,
    is_approved = true;

-- Insert operator user as backup
INSERT INTO users (
    username, 
    email, 
    password_hash, 
    role, 
    full_name,
    is_active,
    is_approved
) VALUES (
    'operator',
    'operator@parking.local',
    'admin123', -- Simple password for now
    'operator',
    'System Operator',
    true,
    true
) ON CONFLICT (username) DO UPDATE SET
    password_hash = 'admin123',
    is_active = true,
    is_approved = true;

-- Show created users
SELECT username, email, role, is_active, is_approved, created_at
FROM users 
ORDER BY created_at DESC;