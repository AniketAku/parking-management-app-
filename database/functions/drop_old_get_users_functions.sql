-- =====================================================
-- Drop Old User Management Functions
-- =====================================================
-- Remove the old versions that don't accept parameters

-- Drop old get_pending_users (no parameters)
DROP FUNCTION IF EXISTS get_pending_users();

-- Drop old get_approved_users (no parameters)
DROP FUNCTION IF EXISTS get_approved_users();

-- Verify functions are dropped
SELECT
  routine_name,
  string_agg(parameter_name || ' ' || data_type, ', ') as parameters
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p
  ON r.specific_name = p.specific_name
WHERE routine_schema = 'public'
AND routine_name IN ('get_pending_users', 'get_approved_users')
GROUP BY routine_name;
