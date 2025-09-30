-- Apply Settings Management Schema - CORRECTED VERSION
-- Run this file in your Supabase SQL editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Apply the corrected settings schema (compatible with integer user IDs)
\i settings-schema-fixed.sql

-- Apply the seed data (migrates existing hard-coded values)
\i settings-seed-data.sql

-- Verify installation
SELECT 'Settings schema applied successfully' as status;
SELECT COUNT(*) as total_settings FROM app_settings;
SELECT category, COUNT(*) as setting_count FROM app_settings GROUP BY category;