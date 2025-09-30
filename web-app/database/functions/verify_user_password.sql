-- Create function to verify user password (server-side bcrypt verification)
-- This function runs on the PostgreSQL server where the crypt extension is available

CREATE OR REPLACE FUNCTION verify_user_password(
  p_username TEXT,
  p_password TEXT
)
RETURNS TABLE(
  user_id UUID,
  username TEXT,
  role TEXT,
  full_name TEXT,
  phone TEXT,
  is_valid BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Get user record with password hash
  SELECT
    id,
    users.username,
    password_hash,
    users.role,
    users.full_name,
    users.phone,
    is_active,
    is_approved
  INTO user_record
  FROM users
  WHERE users.username = p_username
  LIMIT 1;

  -- Check if user exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      NULL::UUID,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      FALSE,
      'Invalid credentials'::TEXT;
    RETURN;
  END IF;

  -- Check if user is active
  IF NOT user_record.is_active THEN
    RETURN QUERY SELECT
      NULL::UUID,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      FALSE,
      'Account is inactive'::TEXT;
    RETURN;
  END IF;

  -- Check if user is approved
  IF NOT user_record.is_approved THEN
    RETURN QUERY SELECT
      NULL::UUID,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      FALSE,
      'Account is not approved'::TEXT;
    RETURN;
  END IF;

  -- Verify password using crypt function (server-side bcrypt verification)
  IF crypt(p_password, user_record.password_hash) = user_record.password_hash THEN
    -- Password is correct
    RETURN QUERY SELECT
      user_record.id,
      user_record.username,
      user_record.role,
      user_record.full_name,
      user_record.phone,
      TRUE,
      NULL::TEXT;
  ELSE
    -- Password is incorrect
    RETURN QUERY SELECT
      NULL::UUID,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      FALSE,
      'Invalid credentials'::TEXT;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION verify_user_password(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_user_password(TEXT, TEXT) TO anon;