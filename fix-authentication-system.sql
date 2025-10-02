-- ============================================================================
-- EMERGENCY FIX: Restore Working Authentication System
-- This script fixes the user table structure and creates a working admin user
-- ============================================================================

-- ============================================================================
-- STEP 1: Ensure users table has correct structure
-- ============================================================================

-- Create or recreate users table with correct structure
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'operator',
    full_name VARCHAR(100),
    location_id INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_username CHECK (LENGTH(TRIM(username)) >= 3),
    CONSTRAINT valid_role CHECK (role IN ('admin', 'operator', 'viewer')),
    CONSTRAINT valid_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~ '^\+?[0-9\-\s]{7,20}$')
);

-- Create indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_active ON users(is_active);

-- ============================================================================
-- STEP 2: Create admin user with known credentials
-- ============================================================================

-- Insert admin user (password: admin123 - change this immediately after login)
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
    '$2a$12$LQv3c1yqBwlmQd9LQdQu5uHvKgHtFkfyfzBXYKkQ5tPJxNNQcY.WO', -- bcrypt hash for 'admin123'
    'admin',
    'System Administrator',
    true,
    true
);

-- Create backup operator user
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
    '$2a$12$LQv3c1yqBwlmQd9LQdQu5uHvKgHtFkfyfzBXYKkQ5tPJxNNQcY.WO', -- bcrypt hash for 'admin123'
    'operator',
    'System Operator',
    true,
    true
);

-- ============================================================================
-- STEP 3: Verify the fix
-- ============================================================================

-- Show created users
SELECT 
    id,
    username,
    email,
    role,
    full_name,
    is_active,
    is_approved,
    created_at
FROM users
ORDER BY id;

-- Success message block (wrapped in DO block for proper syntax)
DO $$
BEGIN
    RAISE NOTICE '=== AUTHENTICATION SYSTEM FIXED ===';
    RAISE NOTICE 'Admin User Created:';
    RAISE NOTICE '  Username: admin';
    RAISE NOTICE '  Password: admin123';
    RAISE NOTICE '  Email: admin@parking.local';
    RAISE NOTICE '';
    RAISE NOTICE 'Operator User Created:';
    RAISE NOTICE '  Username: operator'; 
    RAISE NOTICE '  Password: admin123';
    RAISE NOTICE '  Email: operator@parking.local';
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANT: Change passwords immediately after first login!';
    RAISE NOTICE 'Users table structure restored with proper constraints.';
END $$;