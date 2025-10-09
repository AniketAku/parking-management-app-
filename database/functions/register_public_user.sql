-- =====================================================
-- Public User Registration RPC Function
-- =====================================================
-- This function allows public user registration by bypassing RLS
-- using SECURITY DEFINER. It safely validates and creates new users
-- without requiring authentication.

CREATE OR REPLACE FUNCTION register_public_user(
  p_username TEXT,
  p_password_hash TEXT,
  p_full_name TEXT,
  p_phone TEXT
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Validate required fields
  IF p_username IS NULL OR p_username = '' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Username is required'
    );
  END IF;

  IF p_password_hash IS NULL OR p_password_hash = '' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Password is required'
    );
  END IF;

  IF p_phone IS NULL OR p_phone = '' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Phone number is required'
    );
  END IF;

  -- Check if username already exists
  IF EXISTS (SELECT 1 FROM users WHERE username = p_username) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Username already exists'
    );
  END IF;

  -- Check if phone number already exists
  IF EXISTS (SELECT 1 FROM users WHERE phone = p_phone) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Phone number already registered'
    );
  END IF;

  -- Insert new user (SECURITY DEFINER bypasses RLS)
  INSERT INTO users (
    username,
    password_hash,
    full_name,
    phone,
    role,
    is_approved,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    p_username,
    p_password_hash,
    p_full_name,
    p_phone,
    'operator', -- Default role for public registration
    false,      -- Requires admin approval
    true,       -- Account is active but not approved
    NOW(),
    NOW()
  )
  RETURNING id INTO v_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Account created successfully! Please wait for admin approval before logging in.',
    'user_id', v_user_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Registration failed: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon users (for public registration)
GRANT EXECUTE ON FUNCTION register_public_user(TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION register_public_user(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION register_public_user IS 'Allows public user registration by bypassing RLS. Creates users with operator role requiring admin approval.';
