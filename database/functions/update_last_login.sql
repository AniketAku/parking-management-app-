-- =====================================================
-- Update Last Login RPC Function
-- =====================================================
-- Allows users to update their own last_login timestamp
-- Uses SECURITY DEFINER to bypass RLS policies

CREATE OR REPLACE FUNCTION update_last_login(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update last_login timestamp for the specified user
  UPDATE users
  SET
    last_login = NOW(),
    updated_at = NOW()
  WHERE id = user_id;

  -- Return true if update was successful
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_last_login(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_last_login(UUID) TO anon;

-- Add comment
COMMENT ON FUNCTION update_last_login IS 'Updates last_login timestamp for a user. Bypasses RLS using SECURITY DEFINER.';
