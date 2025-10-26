-- =============================================================================
-- ADD DELETE USER RPC FUNCTION
-- Create RPC function to delete users (bypass RLS for admin operations)
-- =============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS delete_user(uuid);

-- Create function to delete a user (ADMIN ONLY)
CREATE OR REPLACE FUNCTION delete_user(user_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  calling_user_role text;
  calling_user_id uuid;
BEGIN
  -- Get the current user's ID and role
  calling_user_id := auth.uid();

  -- Check if user is authenticated
  IF calling_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Authentication required'
    );
  END IF;

  -- Get the role of the calling user
  SELECT role INTO calling_user_role
  FROM users
  WHERE id = calling_user_id;

  -- Only allow admins to delete users
  IF calling_user_role != 'admin' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Permission denied: Admin role required'
    );
  END IF;

  -- Prevent admin from deleting themselves
  IF calling_user_id = user_id_param THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Cannot delete your own account'
    );
  END IF;

  -- Delete the user
  DELETE FROM users
  WHERE id = user_id_param;

  -- Check if deletion was successful
  IF FOUND THEN
    result := json_build_object(
      'success', true,
      'message', 'User deleted successfully'
    );
  ELSE
    result := json_build_object(
      'success', false,
      'message', 'User not found'
    );
  END IF;

  RETURN result;
END;
$$;

-- Grant execute permission ONLY to authenticated users (admin check is inside function)
GRANT EXECUTE ON FUNCTION delete_user(uuid) TO authenticated;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '=== DELETE USER RPC FUNCTION CREATED ===';
  RAISE NOTICE 'Function created:';
  RAISE NOTICE '  ✅ delete_user(user_id uuid)';
  RAISE NOTICE '';
  RAISE NOTICE 'This function bypasses RLS to allow admins to delete users!';
END $$;
