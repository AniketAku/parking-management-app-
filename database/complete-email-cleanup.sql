-- Complete Email Cleanup: Remove All Email Dependencies
-- This script converts the system to phone-only registration
-- Run this script to clean up all email references and enforce phone-based user system

-- ============================================================================
-- STEP 1: Add phone column to users table (if not exists)
-- ============================================================================

-- Check if phone column exists, if not add it
DO $$ 
BEGIN 
    -- Add phone column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'phone') THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(20);
        
        -- Set default phone for existing users without one
        UPDATE users 
        SET phone = '+1' || LPAD(CAST(EXTRACT(EPOCH FROM created_at)::bigint % 10000000000 AS TEXT), 10, '0')
        WHERE phone IS NULL OR phone = '';
        
        -- Make phone required after setting defaults
        ALTER TABLE users ALTER COLUMN phone SET NOT NULL;
        
        RAISE NOTICE 'Added phone column to users table with generated defaults';
    ELSE
        RAISE NOTICE 'Phone column already exists in users table';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Remove email column constraints and dependencies
-- ============================================================================

-- Remove unique constraint on email if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name = 'users' AND constraint_name LIKE '%email%' 
               AND constraint_type = 'UNIQUE') THEN
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
        ALTER TABLE users DROP CONSTRAINT IF EXISTS unique_users_email;
        RAISE NOTICE 'Removed unique email constraints';
    END IF;
END $$;

-- Remove email column check constraints
DO $$ 
BEGIN
    -- Drop any check constraints on email column
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_check;
    ALTER TABLE users DROP CONSTRAINT IF EXISTS check_users_email_format;
    RAISE NOTICE 'Removed email check constraints';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'No email check constraints to remove';
END $$;

-- ============================================================================
-- STEP 3: Create phone-based constraints and indexes
-- ============================================================================

-- Add unique constraint on phone (optional - depends on business requirements)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'users' AND constraint_name = 'users_phone_key') THEN
        ALTER TABLE users ADD CONSTRAINT users_phone_key UNIQUE (phone);
        RAISE NOTICE 'Added unique constraint on phone';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Phone uniqueness constraint may already exist or conflict with data';
END $$;

-- Add phone format validation
DO $$ 
BEGIN
    -- Add check constraint for phone format (international format)
    ALTER TABLE users ADD CONSTRAINT check_phone_format 
    CHECK (phone ~ '^\+?[1-9][0-9\s\-\(\)]{7,18}$');
    RAISE NOTICE 'Added phone format validation';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Phone format constraint may already exist or data may not comply';
END $$;

-- Create index on phone for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Create composite index for username + phone (for lookups)
CREATE INDEX IF NOT EXISTS idx_users_username_phone ON users(username, phone);

-- ============================================================================
-- STEP 4: Update existing data to remove email placeholders
-- ============================================================================

-- Clean up placeholder emails and update user data
UPDATE users 
SET 
    full_name = COALESCE(full_name, 'User'),
    updated_at = NOW()
WHERE 
    phone IS NOT NULL 
    AND (full_name IS NULL OR full_name = '');

-- Log the cleanup
DO $$ 
BEGIN
    RAISE NOTICE 'Updated % user records with missing full names', 
        (SELECT COUNT(*) FROM users WHERE full_name = 'User');
END $$;

-- ============================================================================
-- STEP 5: Remove email column (FINAL STEP - IRREVERSIBLE)
-- ============================================================================

-- WARNING: This step is irreversible. Email data will be permanently lost.
-- Uncomment the following lines only when you're absolutely sure:

/*
DO $$ 
BEGIN
    -- Drop email column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'users' AND column_name = 'email') THEN
        ALTER TABLE users DROP COLUMN email;
        RAISE NOTICE 'REMOVED email column from users table - THIS IS IRREVERSIBLE';
    ELSE
        RAISE NOTICE 'Email column does not exist in users table';
    END IF;
END $$;
*/

-- ============================================================================
-- STEP 6: Update RLS policies to use phone instead of email
-- ============================================================================

-- Drop existing RLS policies that reference email
DROP POLICY IF EXISTS "Users can read own profile via email" ON users;
DROP POLICY IF EXISTS "Users can update own profile via email" ON users;

-- Create new RLS policies using phone
DO $$ 
BEGIN
    -- Allow users to read their own profile using phone
    CREATE POLICY "Users can read own profile via phone" ON users
        FOR SELECT
        USING (phone = current_setting('request.jwt.claim.phone', true));
    
    -- Allow users to update their own profile using phone  
    CREATE POLICY "Users can update own profile via phone" ON users
        FOR UPDATE
        USING (phone = current_setting('request.jwt.claim.phone', true));
    
    RAISE NOTICE 'Created phone-based RLS policies';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'RLS policies may already exist or RLS not enabled';
END $$;

-- ============================================================================
-- STEP 7: Create phone-based user lookup functions
-- ============================================================================

-- Function to get user by phone
CREATE OR REPLACE FUNCTION get_user_by_phone(user_phone TEXT)
RETURNS TABLE (
    id UUID,
    username VARCHAR,
    phone VARCHAR,
    full_name VARCHAR,
    role VARCHAR,
    is_approved BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    last_login TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.username,
        u.phone,
        u.full_name,
        u.role,
        u.is_approved,
        u.created_at,
        u.updated_at,
        u.last_login
    FROM users u
    WHERE u.phone = user_phone
    AND u.is_approved = true;
END;
$$;

-- Function to validate phone format
CREATE OR REPLACE FUNCTION validate_phone_format(phone_number TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if phone matches international format
    RETURN phone_number ~ '^\+?[1-9][0-9\s\-\(\)]{7,18}$';
END;
$$;

-- ============================================================================
-- STEP 8: Create triggers for phone validation
-- ============================================================================

-- Trigger function to validate phone on insert/update
CREATE OR REPLACE FUNCTION validate_user_phone()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Validate phone format
    IF NOT validate_phone_format(NEW.phone) THEN
        RAISE EXCEPTION 'Invalid phone format: %', NEW.phone;
    END IF;
    
    -- Normalize phone format (remove spaces, parentheses, dashes)
    NEW.phone = regexp_replace(NEW.phone, '[^+0-9]', '', 'g');
    
    RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_validate_user_phone ON users;
CREATE TRIGGER trigger_validate_user_phone
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION validate_user_phone();

-- ============================================================================
-- STEP 9: Update application configuration
-- ============================================================================

-- Create settings for phone-only registration
INSERT INTO app_settings (category, key, value, data_type, description, is_public, created_at, updated_at)
VALUES 
    ('authentication', 'registration_method', 'phone_only', 'string', 'User registration method (phone_only)', true, NOW(), NOW()),
    ('authentication', 'require_phone_verification', 'false', 'boolean', 'Require phone verification on registration', true, NOW(), NOW()),
    ('validation', 'phone_format', 'international', 'string', 'Phone number format requirement', false, NOW(), NOW())
ON CONFLICT (category, key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify the cleanup was successful
DO $$ 
DECLARE
    user_count INTEGER;
    phone_count INTEGER;
    null_phone_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(DISTINCT phone) INTO phone_count FROM users WHERE phone IS NOT NULL;
    SELECT COUNT(*) INTO null_phone_count FROM users WHERE phone IS NULL;
    
    RAISE NOTICE '=== EMAIL CLEANUP VERIFICATION ===';
    RAISE NOTICE 'Total users: %', user_count;
    RAISE NOTICE 'Users with phone numbers: %', phone_count;
    RAISE NOTICE 'Users without phone numbers: %', null_phone_count;
    
    IF null_phone_count > 0 THEN
        RAISE WARNING 'WARNING: % users still have NULL phone numbers', null_phone_count;
    ELSE
        RAISE NOTICE 'SUCCESS: All users have phone numbers';
    END IF;
END $$;

-- Show sample of updated user data
SELECT 
    username,
    phone,
    full_name,
    role,
    is_approved,
    created_at
FROM users 
ORDER BY created_at DESC 
LIMIT 5;

RAISE NOTICE '=== EMAIL CLEANUP COMPLETE ===';
RAISE NOTICE 'The system now uses phone-only registration.';
RAISE NOTICE 'To complete the cleanup, uncomment STEP 5 to remove the email column.';
RAISE NOTICE 'Remember to update your application code to use phone instead of email.';