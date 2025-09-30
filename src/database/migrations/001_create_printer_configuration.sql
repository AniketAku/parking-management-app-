/**
 * Migration: Create Printer Configuration Tables
 * Version: 001
 * Description: Initial setup for comprehensive printer management system
 */

-- Migration metadata
INSERT INTO schema_migrations (version, description, applied_at) 
VALUES ('001', 'Create printer configuration tables', NOW())
ON CONFLICT (version) DO NOTHING;

-- Execute the printer configuration schema
\i '../schemas/printer_configuration.sql'

-- Verify tables were created
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
        'printer_profiles', 
        'print_settings', 
        'location_printer_assignments',
        'print_jobs',
        'print_queues',
        'printer_discovery_log',
        'printer_status_log',
        'printer_calibration_history'
    );
    
    IF table_count < 8 THEN
        RAISE EXCEPTION 'Migration failed: Expected 8 tables, found %', table_count;
    END IF;
    
    RAISE NOTICE 'Migration 001 completed successfully. Created % printer configuration tables.', table_count;
END $$;