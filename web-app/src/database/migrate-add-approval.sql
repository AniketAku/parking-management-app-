-- Add is_approved column to users table for admin approval system
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

-- Update existing users to be approved (for backward compatibility)
UPDATE users SET is_approved = true WHERE is_approved IS NULL;

-- Create admin user Aniket@123 if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'Aniket@123') THEN
        -- Note: This creates the database record but not the Supabase Auth user
        -- The Auth user will be created through the application
        INSERT INTO users (username, phone, role, full_name, is_approved, created_at, updated_at)
        VALUES (
            'Aniket@123',
            '+1234567890',
            'admin',
            'System Administrator',
            true,
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Admin user record created in database. Auth user will be created through the application.';
    ELSE
        RAISE NOTICE 'Admin user already exists in database.';
    END IF;
END $$;

-- Ensure all existing users are approved for backward compatibility
UPDATE users SET is_approved = true WHERE is_approved = false AND created_at < NOW() - INTERVAL '1 hour';

COMMIT;