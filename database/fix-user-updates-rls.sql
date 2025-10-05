-- ================================================
-- FIX: User Update Functions with RLS Bypass
-- Enables admin operations without Supabase Auth
-- ================================================

-- Function to approve a user (bypasses RLS)
CREATE OR REPLACE FUNCTION approve_user_by_id(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Update the user
    UPDATE users
    SET
        is_approved = true,
        updated_at = NOW()
    WHERE id = target_user_id;

    -- Check if update succeeded
    IF FOUND THEN
        result := jsonb_build_object(
            'success', true,
            'message', 'User approved successfully'
        );
    ELSE
        result := jsonb_build_object(
            'success', false,
            'message', 'User not found'
        );
    END IF;

    RETURN result;
END;
$$;

-- Function to update user role (bypasses RLS)
CREATE OR REPLACE FUNCTION update_user_role_by_id(
    target_user_id UUID,
    new_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Validate role
    IF new_role NOT IN ('admin', 'operator', 'viewer') THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Invalid role. Must be admin, operator, or viewer'
        );
    END IF;

    -- Update the user role
    UPDATE users
    SET
        role = new_role,
        updated_at = NOW()
    WHERE id = target_user_id;

    -- Check if update succeeded
    IF FOUND THEN
        result := jsonb_build_object(
            'success', true,
            'message', 'User role updated to ' || new_role || ' successfully'
        );
    ELSE
        result := jsonb_build_object(
            'success', false,
            'message', 'User not found'
        );
    END IF;

    RETURN result;
END;
$$;

-- Function to update user approval status (bypasses RLS)
CREATE OR REPLACE FUNCTION update_user_approval_status(
    target_user_id UUID,
    approval_status BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Update the user approval status
    UPDATE users
    SET
        is_approved = approval_status,
        updated_at = NOW()
    WHERE id = target_user_id;

    -- Check if update succeeded
    IF FOUND THEN
        result := jsonb_build_object(
            'success', true,
            'message', 'User ' || CASE WHEN approval_status THEN 'activated' ELSE 'deactivated' END || ' successfully'
        );
    ELSE
        result := jsonb_build_object(
            'success', false,
            'message', 'User not found'
        );
    END IF;

    RETURN result;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION approve_user_by_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_role_by_id(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_approval_status(UUID, BOOLEAN) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION approve_user_by_id(UUID) IS 'Approves a user by ID, bypassing RLS for admin operations';
COMMENT ON FUNCTION update_user_role_by_id(UUID, TEXT) IS 'Updates user role by ID, bypassing RLS for admin operations';
COMMENT ON FUNCTION update_user_approval_status(UUID, BOOLEAN) IS 'Updates user approval status by ID, bypassing RLS for admin operations';
