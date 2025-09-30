-- Create Admin User for Parking Management System
-- Run this SQL in the Supabase SQL Editor

-- First, let's check if the user already exists
DO $$
BEGIN
    -- Create the admin user with bcrypt password hash
    INSERT INTO users (
        id,
        username,
        password_hash,
        role,
        full_name,
        phone,
        is_active,
        is_approved,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        'admin',
        crypt('admin123', gen_salt('bf')),  -- This creates a bcrypt hash
        'admin',
        'System Administrator',
        '+1-555-0000',
        true,
        true,
        now(),
        now()
    )
    ON CONFLICT (username)
    DO UPDATE SET
        password_hash = crypt('admin123', gen_salt('bf')),
        updated_at = now(),
        is_active = true,
        is_approved = true
    ;

    RAISE NOTICE 'Admin user created/updated successfully';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating admin user: %', SQLERRM;
END $$;

-- Verify the user was created
SELECT
    id,
    username,
    role,
    full_name,
    is_active,
    is_approved,
    created_at,
    CASE
        WHEN password_hash IS NOT NULL THEN 'Password hash exists'
        ELSE 'No password hash'
    END as password_status
FROM users
WHERE username = 'admin';

-- Test the password verification function
SELECT * FROM verify_user_password('admin', 'admin123');