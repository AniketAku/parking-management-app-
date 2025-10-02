-- Fix for health check function return type
-- Run this in Supabase SQL Editor

DROP FUNCTION IF EXISTS api_health_check();

CREATE OR REPLACE FUNCTION api_health_check() 
RETURNS TABLE (
    component TEXT,
    status TEXT,
    details TEXT,
    checked_at TIMESTAMPTZ
) 
LANGUAGE plpgsql AS $$
DECLARE
    db_version TEXT;
    total_entries INTEGER;
    active_locations INTEGER;
    migrations_count INTEGER;
BEGIN
    -- Database version
    SELECT version() INTO db_version;
    
    -- Basic counts
    SELECT COUNT(*) INTO total_entries FROM parking_entries;
    SELECT COUNT(*) INTO active_locations FROM locations WHERE is_active = true;
    SELECT COUNT(*) INTO migrations_count FROM schema_migrations;
    
    -- Return health status
    RETURN QUERY VALUES 
        ('database', 'healthy', 'PostgreSQL connection active', NOW()),
        ('migrations', 'healthy', migrations_count || ' migrations applied', NOW()),
        ('data', 'healthy', total_entries || ' parking entries', NOW()),
        ('locations', 'healthy', active_locations || ' active locations', NOW()),
        ('version', 'info', db_version, NOW());
        
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY VALUES 
        ('database', 'error', SQLERRM, NOW());
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION api_health_check() TO authenticated;

-- Test the function
SELECT * FROM api_health_check();