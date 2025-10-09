-- =====================================================
-- Admin User Management RPC Functions (Phone Auth Compatible)
-- =====================================================
-- Modified to work with phone-based authentication without Supabase Auth
-- Accepts user_id parameter and verifies admin privileges

-- Function to get pending users (awaiting approval)
CREATE OR REPLACE FUNCTION get_pending_users(requesting_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  username TEXT,
  full_name TEXT,
  phone TEXT,
  role TEXT,
  is_approved BOOLEAN,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ
) AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- If no user_id provided, try to get from auth.uid() (Supabase Auth)
  IF requesting_user_id IS NULL THEN
    requesting_user_id := auth.uid();
  END IF;

  -- Still no user_id? Reject the request
  IF requesting_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if requesting user is an admin
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = requesting_user_id
    AND role = 'admin'
    AND is_active = true
    AND is_approved = true
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Return pending users (SECURITY DEFINER bypasses RLS)
  RETURN QUERY
  SELECT
    u.id,
    u.username,
    u.full_name,
    u.phone,
    u.role,
    u.is_approved,
    u.is_active,
    u.created_at,
    u.updated_at,
    u.last_login
  FROM users u
  WHERE u.is_approved = false
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get approved/active users
CREATE OR REPLACE FUNCTION get_approved_users(requesting_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  username TEXT,
  full_name TEXT,
  phone TEXT,
  role TEXT,
  is_approved BOOLEAN,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ
) AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- If no user_id provided, try to get from auth.uid() (Supabase Auth)
  IF requesting_user_id IS NULL THEN
    requesting_user_id := auth.uid();
  END IF;

  -- Still no user_id? Reject the request
  IF requesting_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if requesting user is an admin
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = requesting_user_id
    AND role = 'admin'
    AND is_active = true
    AND is_approved = true
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Return approved users (SECURITY DEFINER bypasses RLS)
  RETURN QUERY
  SELECT
    u.id,
    u.username,
    u.full_name,
    u.phone,
    u.role,
    u.is_approved,
    u.is_active,
    u.created_at,
    u.updated_at,
    u.last_login
  FROM users u
  WHERE u.is_approved = true
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_pending_users(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_users(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_approved_users(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_approved_users(UUID) TO anon;

-- Add helpful comments
COMMENT ON FUNCTION get_pending_users IS 'Returns all users awaiting approval. Admin only. Pass user_id for phone auth.';
COMMENT ON FUNCTION get_approved_users IS 'Returns all approved/active users. Admin only. Pass user_id for phone auth.';
