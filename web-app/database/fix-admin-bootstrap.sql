-- ================================================
-- FIX ADMIN BOOTSTRAP MECHANISM
-- Secure function to create initial admin user bypassing RLS
-- ================================================

-- Create a secure function to handle initial admin creation
CREATE OR REPLACE FUNCTION create_initial_admin(
    p_username TEXT,
    p_password_hash TEXT,
    p_full_name TEXT DEFAULT 'System Administrator',
    p_phone TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    admin_count INTEGER;
    new_user_id UUID;
    result JSON;
BEGIN
    -- Check if any admin users already exist
    SELECT COUNT(*) INTO admin_count
    FROM users
    WHERE role = 'admin' AND is_active = true AND is_approved = true;

    -- If admin users already exist, prevent creation
    IF admin_count > 0 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Admin user already exists. Cannot create additional admin users through bootstrap.',
            'admin_count', admin_count
        );
    END IF;

    -- Create the initial admin user (bypasses RLS since it's a SECURITY DEFINER function)
    INSERT INTO users (
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
        p_username,
        p_password_hash,
        'admin',
        p_full_name,
        p_phone,
        true,
        true,
        NOW(),
        NOW()
    ) RETURNING id INTO new_user_id;

    -- Return success result
    RETURN json_build_object(
        'success', true,
        'message', 'Initial admin user created successfully!',
        'user_id', new_user_id,
        'username', p_username
    );

EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Username already exists. Please choose a different username.',
            'error_code', 'DUPLICATE_USERNAME'
        );
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Failed to create admin user: ' || SQLERRM,
            'error_code', 'CREATION_FAILED'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (needed for API access)
GRANT EXECUTE ON FUNCTION create_initial_admin TO authenticated;
GRANT EXECUTE ON FUNCTION create_initial_admin TO anon;

-- Create a helper function to check if bootstrap is needed
CREATE OR REPLACE FUNCTION needs_admin_bootstrap()
RETURNS JSON AS $$
DECLARE
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count
    FROM users
    WHERE role = 'admin' AND is_active = true AND is_approved = true;

    RETURN json_build_object(
        'needs_bootstrap', admin_count = 0,
        'admin_count', admin_count,
        'message', CASE
            WHEN admin_count = 0 THEN 'No admin users found. Bootstrap required.'
            ELSE 'Admin users exist. Bootstrap not needed.'
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION needs_admin_bootstrap TO authenticated;
GRANT EXECUTE ON FUNCTION needs_admin_bootstrap TO anon;

-- Test the functions work correctly
DO $$
DECLARE
    bootstrap_check JSON;
BEGIN
    SELECT needs_admin_bootstrap() INTO bootstrap_check;
    RAISE NOTICE 'Bootstrap check result: %', bootstrap_check::text;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Admin bootstrap functions created successfully!';
    RAISE NOTICE '🔧 Use create_initial_admin() function for secure admin creation';
    RAISE NOTICE '🔍 Use needs_admin_bootstrap() to check if bootstrap is needed';
END $$;