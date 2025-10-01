-- ================================================
-- Seed Default Settings Data - Supabase Compatible
-- Migration of all hard-coded values to database with service role
-- ================================================

-- This migration uses Supabase service role for seeding
-- All data will be inserted with proper audit trail

-- ================================================
-- Business Settings (Core Operations)
-- ================================================

INSERT INTO app_settings (category, key, value, data_type, description, display_name, default_value, scope, is_system_setting, sort_order) VALUES

-- Vehicle Rates (extracted from helpers.ts)
('business', 'vehicle_rates', '{
  "Trailer": 225,
  "6 Wheeler": 150,
  "4 Wheeler": 100,
  "2 Wheeler": 50
}', 'json', 'Daily parking rates by vehicle type in local currency', 'Vehicle Parking Rates', '{
  "Trailer": 225,
  "6 Wheeler": 150,
  "4 Wheeler": 100,
  "2 Wheeler": 50
}', 'location', false, 1),

-- Operating Hours
('business', 'operating_hours', '{
  "start": "06:00",
  "end": "22:00",
  "timezone": "America/New_York"
}', 'json', 'Business operating hours with timezone specification', 'Operating Hours', '{
  "start": "06:00",
  "end": "22:00",
  "timezone": "UTC"
}', 'location', false, 2),

-- Vehicle Types
('business', 'vehicle_types', '["Trailer", "6 Wheeler", "4 Wheeler", "2 Wheeler"]', 'array', 'Available vehicle types for parking entries', 'Vehicle Types', '["2 Wheeler", "4 Wheeler", "6 Wheeler", "Trailer"]', 'location', false, 3),

-- Payment Methods
('business', 'payment_methods', '["Cash", "Card", "UPI", "Net Banking"]', 'array', 'Accepted payment methods for parking fees', 'Payment Methods', '["Cash", "Card"]', 'location', false, 4),

-- Entry Status Options
('business', 'entry_status_options', '["Active", "Exited", "Overstay"]', 'array', 'Available entry status values for parking records', 'Entry Status Options', '["Active", "Exited"]', 'system', true, 5),

-- Payment Status Options
('business', 'payment_status_options', '["Paid", "Pending", "Partial", "Failed"]', 'array', 'Available payment status values for transactions', 'Payment Status Options', '["Paid", "Pending"]', 'system', true, 6),

-- Minimum Charge Days
('business', 'minimum_charge_days', '1', 'number', 'Minimum days to charge for parking regardless of duration', 'Minimum Charge Days', '1', 'location', false, 7),

-- Grace Period
('business', 'grace_period_minutes', '15', 'number', 'Grace period in minutes before overstay charges apply', 'Grace Period (Minutes)', '15', 'location', false, 8),

-- Late Fee Configuration
('business', 'late_fee_config', '{
  "enabled": true,
  "type": "percentage",
  "value": 10,
  "max_amount": 100,
  "apply_after_hours": 24
}', 'json', 'Configuration for late payment penalties and overstay charges', 'Late Fee Configuration', '{
  "enabled": false,
  "type": "fixed",
  "value": 50
}', 'location', false, 9),

-- Auto Exit Configuration
('business', 'auto_exit_config', '{
  "enabled": false,
  "after_hours": 48,
  "auto_calculate_fees": true,
  "send_notification": true
}', 'json', 'Automatic exit processing for long-stay vehicles', 'Auto Exit Configuration', '{
  "enabled": false
}', 'location', false, 10);

-- ================================================
-- UI Theme Settings (extracted from ThemeManager)
-- ================================================

INSERT INTO app_settings (category, key, value, data_type, description, display_name, default_value, scope, sort_order, validation_rules) VALUES

-- Primary Theme Colors
('ui_theme', 'primary_colors', '{
  "primary_color": "#2563eb",
  "primary_50": "#eff6ff",
  "primary_100": "#dbeafe",
  "primary_500": "#3b82f6",
  "primary_600": "#2563eb",
  "primary_700": "#1d4ed8"
}', 'json', 'Primary color palette for the application interface', 'Primary Colors', '{
  "primary_color": "#3b82f6"
}', 'user', 1, '{"type": "object", "properties": {"primary_color": {"type": "string", "pattern": "^#([A-Fa-f0-9]{6})$"}}}'),

-- Secondary Colors
('ui_theme', 'secondary_colors', '{
  "secondary_color": "#64748b",
  "secondary_50": "#f8fafc",
  "secondary_100": "#f1f5f9",
  "secondary_500": "#64748b",
  "secondary_600": "#475569"
}', 'json', 'Secondary color palette for supporting elements', 'Secondary Colors', '{
  "secondary_color": "#64748b"
}', 'user', 2, '{"type": "object"}'),

-- Status Colors
('ui_theme', 'status_colors', '{
  "success_color": "#10b981",
  "warning_color": "#f59e0b", 
  "danger_color": "#ef4444",
  "info_color": "#06b6d4"
}', 'json', 'Status and feedback colors for alerts and notifications', 'Status Colors', '{
  "success_color": "#22c55e",
  "warning_color": "#eab308",
  "danger_color": "#ef4444"
}', 'user', 3, '{"type": "object"}'),

-- Vehicle Type Colors
('ui_theme', 'vehicle_type_colors', '{
  "Trailer": "#ef4444",
  "6 Wheeler": "#f59e0b",
  "4 Wheeler": "#10b981",
  "2 Wheeler": "#3b82f6"
}', 'json', 'Color coding for different vehicle types in UI', 'Vehicle Type Colors', '{
  "Trailer": "#dc2626",
  "6 Wheeler": "#ea580c",
  "4 Wheeler": "#16a34a",
  "2 Wheeler": "#2563eb"
}', 'location', 4, '{"type": "object"}'),

-- Dark Mode Settings
('ui_theme', 'dark_mode', 'false', 'boolean', 'Enable dark mode interface theme', 'Dark Mode', 'false', 'user', 5, NULL),

-- Theme Mode
('ui_theme', 'theme_mode', '"auto"', 'enum', 'Theme mode selection: auto, light, or dark', 'Theme Mode', '"auto"', 'user', 6, NULL),

-- Font Settings
('ui_theme', 'font_scale', '1', 'number', 'Font size scaling factor for accessibility', 'Font Scale', '1', 'user', 7, '{"type": "number", "minimum": 0.8, "maximum": 2.0}'),

-- Font Family
('ui_theme', 'font_family', '["Inter", "system-ui", "sans-serif"]', 'array', 'Font family preference order for text rendering', 'Font Family', '["system-ui", "sans-serif"]', 'user', 8, '{"type": "array", "items": {"type": "string"}}'),

-- Compact Mode
('ui_theme', 'compact_mode', 'false', 'boolean', 'Enable compact interface layout to show more content', 'Compact Mode', 'false', 'user', 9, NULL),

-- Animation Preferences
('ui_theme', 'animation_config', '{
  "enabled": true,
  "duration": "normal",
  "reduce_motion": false
}', 'json', 'Animation and transition preferences for accessibility', 'Animation Configuration', '{
  "enabled": true,
  "duration": "normal"
}', 'user', 10, '{"type": "object"}');

-- ================================================
-- System Configuration (Performance & Security)
-- ================================================

INSERT INTO app_settings (category, key, value, data_type, description, display_name, default_value, scope, is_system_setting, sort_order, validation_rules) VALUES

-- API Configuration
('system', 'api_timeout_ms', '30000', 'number', 'Default API request timeout in milliseconds', 'API Timeout (ms)', '30000', 'system', true, 1, '{"type": "number", "minimum": 5000, "maximum": 300000}'),

-- Database Connection
('system', 'db_pool_size', '10', 'number', 'Database connection pool size for performance', 'Database Pool Size', '10', 'system', true, 2, '{"type": "number", "minimum": 1, "maximum": 50}'),

-- Cache Settings
('system', 'cache_ttl_seconds', '3600', 'number', 'Default cache TTL in seconds for application data', 'Cache TTL (seconds)', '3600', 'system', true, 3, '{"type": "number", "minimum": 60, "maximum": 86400}'),

-- Session Management
('system', 'session_timeout_minutes', '60', 'number', 'User session timeout in minutes for security', 'Session Timeout (minutes)', '60', 'system', true, 4, '{"type": "number", "minimum": 5, "maximum": 1440}'),

-- Rate Limiting (from rateLimitService.ts)
('system', 'rate_limit_config', '{
  "login": {
    "maxAttempts": 5,
    "windowMs": 900000,
    "blockDurationMs": 900000
  },
  "passwordReset": {
    "maxAttempts": 3,
    "windowMs": 3600000,
    "blockDurationMs": 3600000
  },
  "apiCall": {
    "maxAttempts": 100,
    "windowMs": 60000,
    "blockDurationMs": 60000
  }
}', 'json', 'Rate limiting configuration for security and abuse prevention', 'Rate Limit Configuration', '{}', 'system', true, 5, '{"type": "object"}'),

-- File Upload Limits
('system', 'max_file_upload_mb', '10', 'number', 'Maximum file upload size in megabytes', 'Max File Upload (MB)', '5', 'system', true, 6, '{"type": "number", "minimum": 1, "maximum": 100}'),

-- Backup Settings
('system', 'auto_backup_enabled', 'true', 'boolean', 'Enable automatic database backups', 'Auto Backup Enabled', 'false', 'system', true, 7, NULL),

('system', 'backup_retention_days', '30', 'number', 'Number of days to retain backup files', 'Backup Retention (days)', '7', 'system', true, 8, '{"type": "number", "minimum": 1, "maximum": 365}'),

-- Real-time Configuration
('system', 'realtime_config', '{
  "enabled": true,
  "heartbeat_interval": 30,
  "reconnect_attempts": 5,
  "channels": ["entries", "statistics", "settings"]
}', 'json', 'Real-time synchronization and WebSocket configuration', 'Realtime Configuration', '{
  "enabled": true
}', 'system', true, 9, '{"type": "object"}'),

-- Logging Configuration
('system', 'logging_config', '{
  "level": "info",
  "enable_debug": false,
  "log_retention_days": 30,
  "enable_performance_logs": true
}', 'json', 'Application logging level and retention settings', 'Logging Configuration', '{
  "level": "warn"
}', 'system', true, 10, '{"type": "object"}');

-- ================================================
-- User Management & Security Settings
-- ================================================

INSERT INTO app_settings (category, key, value, data_type, description, display_name, default_value, scope, is_system_setting, sort_order, validation_rules) VALUES

-- User Roles
('user_mgmt', 'user_roles', '["admin", "manager", "operator", "viewer"]', 'array', 'Available user roles in the system with different permissions', 'User Roles', '["admin", "user"]', 'system', true, 1, '{"type": "array", "items": {"type": "string"}}'),

-- Password Policy
('user_mgmt', 'password_policy', '{
  "min_length": 8,
  "require_uppercase": true,
  "require_lowercase": true,
  "require_numbers": true,
  "require_special": false,
  "max_age_days": 90,
  "prevent_reuse_count": 5
}', 'json', 'Password strength requirements and rotation policy', 'Password Policy', '{
  "min_length": 6,
  "require_uppercase": false,
  "require_lowercase": false
}', 'system', true, 2, '{"type": "object"}'),

-- Session Settings
('user_mgmt', 'session_config', '{
  "auto_refresh_token": true,
  "persist_session": true,
  "max_concurrent_sessions": 3,
  "idle_timeout_minutes": 30,
  "remember_me_duration_days": 30
}', 'json', 'User session management and token refresh configuration', 'Session Configuration', '{
  "auto_refresh_token": false,
  "persist_session": false
}', 'system', true, 3, '{"type": "object"}'),

-- Multi-factor Authentication
('user_mgmt', 'mfa_config', '{
  "enabled": false,
  "required_for_admin": true,
  "methods": ["sms", "email", "totp"],
  "backup_codes_count": 10,
  "grace_period_hours": 24
}', 'json', 'Multi-factor authentication settings and requirements', 'MFA Configuration', '{
  "enabled": false
}', 'system', true, 4, '{"type": "object"}'),

-- Account Lockout
('user_mgmt', 'account_lockout_config', '{
  "enabled": true,
  "max_failed_attempts": 5,
  "lockout_duration_minutes": 15,
  "reset_attempts_after_minutes": 60
}', 'json', 'Account lockout policy for failed login attempts', 'Account Lockout Configuration', '{
  "enabled": false
}', 'system', true, 5, '{"type": "object"}');

-- ================================================
-- Notification & Communication Settings
-- ================================================

INSERT INTO app_settings (category, key, value, data_type, description, display_name, default_value, scope, sort_order, is_sensitive) VALUES

-- Email Notifications
('notifications', 'email_notifications', '{
  "enabled": true,
  "smtp_host": "",
  "smtp_port": 587,
  "use_tls": true,
  "from_address": "noreply@parkingapp.com",
  "from_name": "Parking System",
  "template_style": "modern"
}', 'json', 'Email notification configuration and SMTP settings', 'Email Settings', '{
  "enabled": false
}', 'system', 1, true),

-- Push Notifications
('notifications', 'push_notifications', '{
  "enabled": true,
  "show_entry_alerts": true,
  "show_payment_alerts": true,
  "show_overstay_alerts": true,
  "show_system_alerts": false,
  "quiet_hours_start": "22:00",
  "quiet_hours_end": "07:00"
}', 'json', 'Push notification preferences and scheduling', 'Push Notifications', '{
  "enabled": true,
  "show_entry_alerts": true
}', 'user', 2, false),

-- Alert Thresholds
('notifications', 'alert_thresholds', '{
  "low_balance_amount": 100,
  "high_occupancy_percentage": 90,
  "overstay_hours": 24,
  "payment_overdue_hours": 2,
  "system_error_threshold": 5
}', 'json', 'Threshold values for automated alerts and notifications', 'Alert Thresholds', '{}', 'location', 3, false),

-- SMS Configuration
('notifications', 'sms_config', '{
  "enabled": false,
  "provider": "twilio",
  "from_number": "",
  "enable_international": false
}', 'json', 'SMS notification configuration and provider settings', 'SMS Configuration', '{
  "enabled": false
}', 'system', 4, true),

-- Webhook Configuration
('notifications', 'webhook_config', '{
  "enabled": false,
  "endpoints": [],
  "retry_attempts": 3,
  "timeout_seconds": 30
}', 'json', 'Webhook endpoints for external integrations', 'Webhook Configuration', '{
  "enabled": false
}', 'system', 5, true);

-- ================================================
-- Reporting & Analytics Settings
-- ================================================

INSERT INTO app_settings (category, key, value, data_type, description, display_name, default_value, scope, sort_order) VALUES

-- Report Configuration
('reporting', 'default_report_config', '{
  "date_range": "last_30_days",
  "include_charts": true,
  "export_format": "pdf",
  "auto_schedule": false,
  "recipients": [],
  "chart_types": ["bar", "line", "pie"],
  "include_raw_data": false
}', 'json', 'Default settings for report generation and export', 'Default Report Configuration', '{}', 'user', 1),

-- Data Retention
('reporting', 'data_retention_config', '{
  "entry_records_months": 24,
  "payment_records_months": 36,
  "audit_logs_months": 12,
  "analytics_data_months": 6,
  "backup_data_months": 3
}', 'json', 'Data retention periods for different record types', 'Data Retention Configuration', '{
  "entry_records_months": 12
}', 'system', 2),

-- Analytics Features
('reporting', 'analytics_features', '{
  "enable_predictions": true,
  "enable_trends": true,
  "enable_benchmarking": false,
  "enable_real_time_dashboard": true,
  "enable_custom_metrics": false,
  "ml_insights_enabled": false
}', 'json', 'Enable or disable analytics and business intelligence features', 'Analytics Features', '{
  "enable_predictions": false,
  "enable_trends": true
}', 'system', 3),

-- Export Settings
('reporting', 'export_settings', '{
  "max_records_per_export": 10000,
  "available_formats": ["csv", "xlsx", "pdf", "json"],
  "include_metadata": true,
  "compress_large_exports": true
}', 'json', 'Data export limitations and format settings', 'Export Settings', '{
  "max_records_per_export": 1000
}', 'system', 4);

-- ================================================
-- Localization Settings
-- ================================================

INSERT INTO app_settings (category, key, value, data_type, description, display_name, default_value, scope, sort_order, enum_values, validation_rules) VALUES

-- Language Settings
('localization', 'language', '"en"', 'enum', 'Default interface language for the application', 'Language', '"en"', 'user', 1, ARRAY['en', 'es', 'fr', 'de', 'zh', 'ja', 'ar', 'hi', 'pt'], '{"type": "string"}'),

-- Currency Configuration
('localization', 'currency_config', '{
  "code": "USD",
  "symbol": "$",
  "position": "before",
  "decimal_places": 2,
  "thousands_separator": ",",
  "decimal_separator": "."
}', 'json', 'Currency display configuration and formatting rules', 'Currency Configuration', '{
  "code": "USD",
  "symbol": "$"
}', 'location', 2, NULL, '{"type": "object"}'),

-- Date/Time Format
('localization', 'datetime_format', '{
  "date_format": "MM/DD/YYYY",
  "time_format": "12h",
  "timezone": "America/New_York",
  "week_start": "sunday",
  "show_timezone": false
}', 'json', 'Date and time display preferences and timezone settings', 'Date/Time Format', '{
  "date_format": "MM/DD/YYYY",
  "time_format": "12h"
}', 'user', 3, NULL, '{"type": "object"}'),

-- Number Format
('localization', 'number_format', '{
  "decimal_separator": ".",
  "thousands_separator": ",",
  "negative_format": "(-n)",
  "percent_decimal_places": 1
}', 'json', 'Number formatting preferences for different locales', 'Number Format', '{
  "decimal_separator": ".",
  "thousands_separator": ","
}', 'user', 4, NULL, '{"type": "object"}');

-- ================================================
-- Performance & Optimization Settings
-- ================================================

INSERT INTO app_settings (category, key, value, data_type, description, display_name, default_value, scope, is_system_setting, sort_order) VALUES

-- Performance Monitoring
('performance', 'monitoring_config', '{
  "enable_performance_tracking": true,
  "enable_error_tracking": true,
  "sample_rate": 0.1,
  "max_breadcrumbs": 100,
  "track_user_interactions": true,
  "track_api_calls": true
}', 'json', 'Performance monitoring and error tracking configuration', 'Monitoring Configuration', '{}', 'system', true, 1),

-- Cache Strategy
('performance', 'cache_strategy', '{
  "enable_redis": false,
  "enable_browser_cache": true,
  "api_cache_ttl": 300,
  "static_cache_ttl": 86400,
  "user_cache_ttl": 1800,
  "settings_cache_ttl": 3600
}', 'json', 'Caching strategy configuration for optimal performance', 'Cache Strategy', '{
  "enable_browser_cache": true
}', 'system', true, 2),

-- Database Optimization
('performance', 'db_optimization', '{
  "enable_query_logging": false,
  "slow_query_threshold_ms": 1000,
  "connection_pool_size": 10,
  "statement_timeout_ms": 30000,
  "enable_connection_pooling": true
}', 'json', 'Database performance optimization and connection management', 'Database Optimization', '{}', 'system', true, 3),

-- Frontend Performance
('performance', 'frontend_performance', '{
  "enable_code_splitting": true,
  "enable_lazy_loading": true,
  "bundle_size_limit_kb": 500,
  "enable_service_worker": false,
  "preload_critical_resources": true
}', 'json', 'Frontend performance optimization settings', 'Frontend Performance', '{
  "enable_lazy_loading": true
}', 'system', true, 4);

-- ================================================
-- Feature Flags and Beta Features
-- ================================================

INSERT INTO app_settings (category, key, value, data_type, description, display_name, default_value, scope, sort_order) VALUES

-- Beta Features
('system', 'feature_flags', '{
  "advanced_analytics": false,
  "mobile_app": false,
  "api_v2": false,
  "automated_billing": false,
  "ml_predictions": false,
  "real_time_sync": true,
  "multi_location": false,
  "advanced_reporting": false
}', 'json', 'Feature flags for beta functionality and experimental features', 'Feature Flags', '{}', 'system', true, 10),

-- Experimental Features
('system', 'experimental_features', '{
  "ai_assistance": false,
  "voice_commands": false,
  "biometric_auth": false,
  "blockchain_integration": false,
  "ar_visualization": false
}', 'json', 'Experimental features in development or testing phase', 'Experimental Features', '{}', 'system', true, 11);

-- ================================================
-- Security & Compliance Settings
-- ================================================

INSERT INTO app_settings (category, key, value, data_type, description, display_name, default_value, scope, is_system_setting, sort_order) VALUES

-- Security Headers
('security', 'security_headers', '{
  "enable_csp": true,
  "enable_hsts": true,
  "enable_xss_protection": true,
  "enable_content_type_nosniff": true,
  "enable_referrer_policy": true
}', 'json', 'HTTP security headers configuration for web security', 'Security Headers', '{
  "enable_csp": false
}', 'system', true, 1),

-- Data Privacy
('security', 'privacy_config', '{
  "enable_gdpr_mode": false,
  "data_retention_notice": true,
  "cookie_consent_required": true,
  "anonymize_logs": false,
  "enable_right_to_be_forgotten": false
}', 'json', 'Data privacy and compliance configuration', 'Privacy Configuration', '{}', 'system', true, 2),

-- Audit Requirements
('security', 'audit_config', '{
  "log_all_changes": true,
  "require_change_reason": false,
  "enable_change_approval": false,
  "retain_audit_logs_years": 2
}', 'json', 'Audit trail and compliance logging requirements', 'Audit Configuration', '{
  "log_all_changes": true
}', 'system', true, 3);

-- ================================================
-- Add validation rules for specific settings
-- ================================================

-- Update settings with proper constraints
UPDATE app_settings SET 
    min_value = 0,
    max_value = 10000,
    validation_rules = '{"type": "object", "properties": {"Trailer": {"type": "number", "minimum": 0}, "6 Wheeler": {"type": "number", "minimum": 0}, "4 Wheeler": {"type": "number", "minimum": 0}, "2 Wheeler": {"type": "number", "minimum": 0}}}'
WHERE category = 'business' AND key = 'vehicle_rates';

UPDATE app_settings SET 
    min_value = 1000,
    max_value = 300000 
WHERE category = 'system' AND key = 'api_timeout_ms';

UPDATE app_settings SET 
    min_value = 0.5,
    max_value = 3.0 
WHERE category = 'ui_theme' AND key = 'font_scale';

UPDATE app_settings SET 
    min_value = 1,
    max_value = 365 
WHERE category = 'business' AND key = 'minimum_charge_days';

UPDATE app_settings SET enum_values = ARRAY['auto', 'light', 'dark'] 
WHERE category = 'ui_theme' AND key = 'theme_mode';

-- ================================================
-- Create default settings template
-- ================================================

INSERT INTO settings_templates (name, description, template_data, is_default, is_system_template, business_types, created_by) VALUES 
('Default Configuration', 'Standard settings for new parking system installations', '{
  "business": {
    "vehicle_rates": {
      "2 Wheeler": 50,
      "4 Wheeler": 100,
      "6 Wheeler": 150,
      "Trailer": 225
    },
    "operating_hours": {
      "start": "06:00",
      "end": "22:00",
      "timezone": "UTC"
    },
    "minimum_charge_days": 1,
    "grace_period_minutes": 15
  },
  "ui_theme": {
    "theme_mode": "auto",
    "dark_mode": false,
    "font_scale": 1,
    "compact_mode": false
  },
  "notifications": {
    "push_notifications": {
      "enabled": true,
      "show_entry_alerts": true,
      "show_payment_alerts": true
    }
  },
  "localization": {
    "language": "en",
    "currency_config": {
      "code": "USD",
      "symbol": "$",
      "position": "before",
      "decimal_places": 2
    }
  }
}', true, true, ARRAY['parking', 'general'], (SELECT auth.uid() LIMIT 1));

INSERT INTO settings_templates (name, description, template_data, is_system_template, business_types) VALUES 
('Small Business Setup', 'Optimized settings for small parking operations', '{
  "business": {
    "vehicle_rates": {
      "2 Wheeler": 25,
      "4 Wheeler": 50
    },
    "operating_hours": {
      "start": "08:00",
      "end": "18:00"
    },
    "minimum_charge_days": 1,
    "payment_methods": ["Cash", "Card"]
  },
  "notifications": {
    "push_notifications": {
      "enabled": true,
      "show_entry_alerts": true
    }
  }
}', true, ARRAY['small-business', 'startup']),

('Enterprise Setup', 'Comprehensive settings for large parking facilities', '{
  "business": {
    "vehicle_rates": {
      "2 Wheeler": 75,
      "4 Wheeler": 150,
      "6 Wheeler": 200,
      "Trailer": 300
    },
    "operating_hours": {
      "start": "00:00",
      "end": "23:59"
    },
    "payment_methods": ["Cash", "Card", "UPI", "Net Banking", "Corporate Account"]
  },
  "system": {
    "feature_flags": {
      "advanced_analytics": true,
      "automated_billing": true,
      "multi_location": true
    }
  }
}', true, ARRAY['enterprise', 'corporate']);

-- ================================================
-- Update template usage counts
-- ================================================

UPDATE settings_templates SET usage_count = 1 WHERE is_default = true;

-- ================================================
-- Final data integrity checks
-- ================================================

-- Ensure all settings have proper descriptions
UPDATE app_settings SET 
    description = COALESCE(description, 'Configuration setting for ' || display_name),
    display_name = COALESCE(display_name, initcap(replace(key, '_', ' ')))
WHERE description IS NULL OR display_name IS NULL;

-- Verify all required categories are present
DO $$
DECLARE
    expected_categories TEXT[] := ARRAY['business', 'ui_theme', 'system', 'user_mgmt', 'notifications', 'reporting', 'localization', 'performance', 'security'];
    actual_categories TEXT[];
    missing_categories TEXT[];
BEGIN
    SELECT array_agg(DISTINCT category) INTO actual_categories FROM app_settings;
    
    SELECT array_agg(cat) INTO missing_categories
    FROM unnest(expected_categories) cat
    WHERE cat != ALL(actual_categories);
    
    IF array_length(missing_categories, 1) > 0 THEN
        RAISE NOTICE 'Missing setting categories: %', missing_categories;
    END IF;
END $$;

-- Log the completion
INSERT INTO settings_history (
    setting_table, 
    setting_id, 
    setting_key, 
    new_value, 
    change_type, 
    changed_by,
    change_reason
) VALUES (
    'app_settings',
    uuid_generate_v4(),
    'system.migration_complete',
    '{"migration": "002_seed_default_settings", "timestamp": "' || NOW()::text || '", "settings_count": ' || (SELECT count(*) FROM app_settings)::text || '}',
    'INSERT',
    (SELECT auth.uid() LIMIT 1),
    'Default settings migration completed successfully'
);

COMMENT ON SCHEMA public IS 'Parking Management System - Settings Migration Completed Successfully';