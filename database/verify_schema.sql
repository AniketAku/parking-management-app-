-- Verification script for settings schema
-- Run this after applying settings-schema-fixed.sql

-- Check if all tables were created
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('app_settings', 'user_settings', 'location_settings', 'settings_history', 'setting_templates') 
    THEN '✅ Created'
    ELSE '❌ Missing'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('app_settings', 'user_settings', 'location_settings', 'settings_history', 'setting_templates')
ORDER BY table_name;

-- Check if enums were created
SELECT 
  typname as enum_name,
  '✅ Created' as status
FROM pg_type 
WHERE typname IN ('setting_category', 'setting_data_type', 'setting_scope')
ORDER BY typname;

-- Check if functions were created
SELECT 
  routine_name as function_name,
  '✅ Created' as status
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN ('log_setting_change', 'get_setting_value', 'bulk_update_settings')
ORDER BY routine_name;

-- Test the get_setting_value function
SELECT 'Testing get_setting_value function...' as test_message;

-- This should return NULL since no settings exist yet
SELECT get_setting_value('test_key') as test_result;

SELECT '🎉 Schema verification complete!' as final_message;