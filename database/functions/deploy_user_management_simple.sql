-- =====================================================
-- Complete User Management Deployment (Simple)
-- =====================================================
-- Drops old functions and creates new ones with UUID parameter

-- Step 1: Drop old functions (no parameters)
DROP FUNCTION IF EXISTS get_pending_users();
DROP FUNCTION IF EXISTS get_approved_users();

-- Step 2: Create new functions with UUID parameter
CREATE OR REPLACE FUNCTION get_pending_users(requesting_user_id UUID)
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
  -- Check if requesting user is an admin
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = requesting_user_id
    AND users.role = 'admin'
    AND users.is_active = true
    AND users.is_approved = true
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Return pending users (SECURITY DEFINER bypasses RLS)
  RETURN QUERY
  SELECT
    u.id,
    u.username::TEXT,
    u.full_name::TEXT,
    u.phone::TEXT,
    u.role::TEXT,
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

CREATE OR REPLACE FUNCTION get_approved_users(requesting_user_id UUID)
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
  -- Check if requesting user is an admin
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = requesting_user_id
    AND users.role = 'admin'
    AND users.is_active = true
    AND users.is_approved = true
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Return approved users (SECURITY DEFINER bypasses RLS)
  RETURN QUERY
  SELECT
    u.id,
    u.username::TEXT,
    u.full_name::TEXT,
    u.phone::TEXT,
    u.role::TEXT,
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

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION get_pending_users(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_users(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_approved_users(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_approved_users(UUID) TO anon;

-- Step 4: Add comments
COMMENT ON FUNCTION get_pending_users IS 'Returns all users awaiting approval. Admin only. Pass requesting user_id.';
COMMENT ON FUNCTION get_approved_users IS 'Returns all approved/active users. Admin only. Pass requesting user_id.';
