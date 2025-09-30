-- ================================================
-- Default Settings Seed Data
-- Migration of all hard-coded values to database
-- ================================================

-- Set context for audit trail
SELECT set_config('app.current_user_id', 'system', false);
SELECT set_config('app.current_batch_id', uuid_generate_v4()::text, false);

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
}', 'json', 'Daily parking rates by vehicle type', 'Vehicle Parking Rates', '{
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
}', 'json', 'Business operating hours with timezone', 'Operating Hours', '{
  "start": "06:00",
  "end": "22:00",
  "timezone": "UTC"
}', 'location', false, 2),

-- Vehicle Types
('business', 'vehicle_types', '["Trailer", "6 Wheeler", "4 Wheeler", "2 Wheeler"]', 'array', 'Available vehicle types for parking', 'Vehicle Types', '["2 Wheeler", "4 Wheeler", "6 Wheeler", "Trailer"]', 'location', false, 3),

-- Payment Methods
('business', 'payment_methods', '["Cash", "Card", "UPI", "Net Banking"]', 'array', 'Accepted payment methods', 'Payment Methods', '["Cash", "Card"]', 'location', false, 4),

-- Entry Status Options
('business', 'entry_status_options', '["Active", "Exited", "Overstay"]', 'array', 'Available entry status values', 'Entry Status Options', '["Active", "Exited"]', 'system', true, 5),

-- Payment Status Options
('business', 'payment_status_options', '["Paid", "Pending", "Partial", "Failed"]', 'array', 'Available payment status values', 'Payment Status Options', '["Paid", "Pending"]', 'system', true, 6),

-- Minimum Charge Days
('business', 'minimum_charge_days', '1', 'number', 'Minimum days to charge for parking', 'Minimum Charge Days', '1', 'location', false, 7),

-- Grace Period
('business', 'grace_period_minutes', '15', 'number', 'Grace period before overstay charges apply', 'Grace Period (Minutes)', '15', 'location', false, 8),

-- Late Fee Configuration
('business', 'late_fee_config', '{
  "enabled": true,
  "type": "percentage",
  "value": 10,
  "max_amount": 100,
  "apply_after_hours": 24
}', 'json', 'Configuration for late payment fees', 'Late Fee Configuration', '{
  "enabled": false,
  "type": "fixed",
  "value": 50
}', 'location', false, 9);

-- ================================================
-- UI Theme Settings (extracted from ThemeManager)
-- ================================================

INSERT INTO app_settings (category, key, value, data_type, description, display_name, default_value, scope, sort_order) VALUES

-- Primary Theme Colors
('ui_theme', 'primary_colors', '{
  "primary_color": "#2563eb",
  "primary_50": "#eff6ff",
  "primary_100": "#dbeafe",
  "primary_500": "#3b82f6",
  "primary_600": "#2563eb",
  "primary_700": "#1d4ed8"
}', 'json', 'Primary color palette', 'Primary Colors', '{
  "primary_color": "#3b82f6"
}', 'user', false, 1),

-- Secondary Colors
('ui_theme', 'secondary_colors', '{
  "secondary_color": "#64748b",
  "secondary_50": "#f8fafc",
  "secondary_100": "#f1f5f9",
  "secondary_500": "#64748b",
  "secondary_600": "#475569"
}', 'json', 'Secondary color palette', 'Secondary Colors', '{
  "secondary_color": "#64748b"
}', 'user', false, 2),

-- Status Colors
('ui_theme', 'status_colors', '{
  "success_color": "#10b981",
  "warning_color": "#f59e0b", 
  "danger_color": "#ef4444",
  "info_color": "#06b6d4"
}', 'json', 'Status and feedback colors', 'Status Colors', '{
  "success_color": "#22c55e",
  "warning_color": "#eab308",
  "danger_color": "#ef4444"
}', 'user', false, 3),

-- Vehicle Type Colors
('ui_theme', 'vehicle_type_colors', '{
  "Trailer": "#ef4444",
  "6 Wheeler": "#f59e0b",
  "4 Wheeler": "#10b981",
  "2 Wheeler": "#3b82f6"
}', 'json', 'Color coding for vehicle types', 'Vehicle Type Colors', '{
  "Trailer": "#dc2626",
  "6 Wheeler": "#ea580c",
  "4 Wheeler": "#16a34a",
  "2 Wheeler": "#2563eb"
}', 'location', false, 4),

-- Dark Mode Settings
('ui_theme', 'dark_mode', 'false', 'boolean', 'Enable dark mode interface', 'Dark Mode', 'false', 'user', false, 5),

-- Theme Mode
('ui_theme', 'theme_mode', '"auto"', 'enum', 'Theme mode selection', 'Theme Mode', '"auto"', 'user', false, 6),

-- Font Settings
('ui_theme', 'font_scale', '1', 'number', 'Font size scaling factor', 'Font Scale', '1', 'user', false, 7),

-- Font Family
('ui_theme', 'font_family', '["Inter", "system-ui", "sans-serif"]', 'array', 'Font family preference order', 'Font Family', '["system-ui", "sans-serif"]', 'user', false, 8);

-- ================================================
-- System Configuration (Performance & Security)
-- ================================================

INSERT INTO app_settings (category, key, value, data_type, description, display_name, default_value, scope, is_system_setting, sort_order) VALUES

-- API Configuration
('system', 'api_timeout_ms', '30000', 'number', 'Default API request timeout in milliseconds', 'API Timeout (ms)', '30000', 'system', true, 1),

-- Database Connection
('system', 'db_pool_size', '10', 'number', 'Database connection pool size', 'Database Pool Size', '10', 'system', true, 2),

-- Cache Settings
('system', 'cache_ttl_seconds', '3600', 'number', 'Default cache TTL in seconds', 'Cache TTL (seconds)', '3600', 'system', true, 3),

-- Session Management
('system', 'session_timeout_minutes', '60', 'number', 'User session timeout in minutes', 'Session Timeout (minutes)', '60', 'system', true, 4),

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
}', 'json', 'Rate limiting configuration for security', 'Rate Limit Config', '{}', 'system', true, 5),

-- File Upload Limits
('system', 'max_file_upload_mb', '10', 'number', 'Maximum file upload size in MB', 'Max File Upload (MB)', '5', 'system', true, 6),

-- Backup Settings
('system', 'auto_backup_enabled', 'true', 'boolean', 'Enable automatic backups', 'Auto Backup Enabled', 'false', 'system', true, 7),

('system', 'backup_retention_days', '30', 'number', 'Days to retain backup files', 'Backup Retention (days)', '7', 'system', true, 8);

-- ================================================
-- User Management & Security Settings
-- ================================================

INSERT INTO app_settings (category, key, value, data_type, description, display_name, default_value, scope, is_system_setting, sort_order) VALUES

-- User Roles
('user_mgmt', 'user_roles', '["admin", "manager", "operator", "viewer"]', 'array', 'Available user roles in the system', 'User Roles', '["admin", "user"]', 'system', true, 1),

-- Password Policy
('user_mgmt', 'password_policy', '{
  "min_length": 8,
  "require_uppercase": true,
  "require_lowercase": true,
  "require_numbers": true,
  "require_special": false,
  "max_age_days": 90
}', 'json', 'Password strength and rotation policy', 'Password Policy', '{
  "min_length": 6,
  "require_uppercase": false,
  "require_lowercase": false
}', 'system', true, 2),

-- Session Settings
('user_mgmt', 'session_config', '{
  "auto_refresh_token": true,
  "persist_session": true,
  "max_concurrent_sessions": 3,
  "idle_timeout_minutes": 30
}', 'json', 'User session management configuration', 'Session Configuration', '{
  "auto_refresh_token": false,
  "persist_session": false
}', 'system', true, 3),

-- Multi-factor Authentication
('user_mgmt', 'mfa_config', '{
  "enabled": false,
  "required_for_admin": true,
  "methods": ["sms", "email", "totp"],
  "backup_codes_count": 10
}', 'json', 'Multi-factor authentication settings', 'MFA Configuration', '{
  "enabled": false
}', 'system', true, 4);

-- ================================================
-- Notification & Communication Settings
-- ================================================

INSERT INTO app_settings (category, key, value, data_type, description, display_name, default_value, scope, sort_order) VALUES

-- Email Notifications
('notifications', 'email_notifications', '{
  "enabled": true,
  "smtp_host": "",
  "smtp_port": 587,
  "use_tls": true,
  "from_address": "noreply@parkingapp.com",
  "from_name": "Parking System"
}', 'json', 'Email notification configuration', 'Email Settings', '{
  "enabled": false
}', 'system', false, 1),

-- Push Notifications
('notifications', 'push_notifications', '{
  "enabled": true,
  "show_entry_alerts": true,
  "show_payment_alerts": true,
  "show_overstay_alerts": true,
  "quiet_hours_start": "22:00",
  "quiet_hours_end": "07:00"
}', 'json', 'Push notification preferences', 'Push Notifications', '{
  "enabled": true,
  "show_entry_alerts": true
}', 'user', false, 2),

-- Alert Thresholds
('notifications', 'alert_thresholds', '{
  "low_balance_amount": 100,
  "high_occupancy_percentage": 90,
  "overstay_hours": 24,
  "payment_overdue_hours": 2
}', 'json', 'Threshold values for automated alerts', 'Alert Thresholds', '{}', 'location', false, 3);

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
  "recipients": []
}', 'json', 'Default settings for report generation', 'Default Report Config', '{}', 'user', false, 1),

-- Data Retention
('reporting', 'data_retention_config', '{
  "entry_records_months": 24,
  "payment_records_months": 36,
  "audit_logs_months": 12,
  "analytics_data_months": 6
}', 'json', 'Data retention periods for different record types', 'Data Retention Config', '{
  "entry_records_months": 12
}', 'system', true, 2),

-- Analytics Features
('reporting', 'analytics_features', '{
  "enable_predictions": true,
  "enable_trends": true,
  "enable_benchmarking": false,
  "enable_real_time_dashboard": true
}', 'json', 'Enable/disable analytics features', 'Analytics Features', '{
  "enable_predictions": false,
  "enable_trends": true
}', 'system', false, 3);

-- ================================================
-- Localization Settings
-- ================================================

INSERT INTO app_settings (category, key, value, data_type, description, display_name, default_value, scope, sort_order) VALUES

-- Language Settings
('localization', 'language', '"en"', 'enum', 'Default interface language', 'Language', '"en"', 'user', false, 1),

-- Currency Configuration
('localization', 'currency_config', '{
  "code": "USD",
  "symbol": "$",
  "position": "before",
  "decimal_places": 2
}', 'json', 'Currency display configuration', 'Currency Config', '{
  "code": "USD",
  "symbol": "$"
}', 'location', false, 2),

-- Date/Time Format
('localization', 'datetime_format', '{
  "date_format": "MM/DD/YYYY",
  "time_format": "12h",
  "timezone": "America/New_York",
  "week_start": "sunday"
}', 'json', 'Date and time display preferences', 'Date/Time Format', '{
  "date_format": "MM/DD/YYYY",
  "time_format": "12h"
}', 'user', false, 3);

-- ================================================
-- Performance & Optimization Settings
-- ================================================

INSERT INTO app_settings (category, key, value, data_type, description, display_name, default_value, scope, is_system_setting, sort_order) VALUES

-- Performance Monitoring
('performance', 'monitoring_config', '{
  "enable_performance_tracking": true,
  "enable_error_tracking": true,
  "sample_rate": 0.1,
  "max_breadcrumbs": 100
}', 'json', 'Performance monitoring configuration', 'Monitoring Config', '{}', 'system', true, 1),

-- Cache Strategy
('performance', 'cache_strategy', '{
  "enable_redis": false,
  "enable_browser_cache": true,
  "api_cache_ttl": 300,
  "static_cache_ttl": 86400
}', 'json', 'Caching strategy configuration', 'Cache Strategy', '{
  "enable_browser_cache": true
}', 'system', true, 2),

-- Database Optimization
('performance', 'db_optimization', '{
  "enable_query_logging": false,
  "slow_query_threshold_ms": 1000,
  "connection_pool_size": 10,
  "statement_timeout_ms": 30000
}', 'json', 'Database performance optimization', 'DB Optimization', '{}', 'system', true, 3);

-- ================================================
-- Feature Flags
-- ================================================

INSERT INTO app_settings (category, key, value, data_type, description, display_name, default_value, scope, sort_order) VALUES

-- Beta Features
('system', 'feature_flags', '{
  "advanced_analytics": false,
  "mobile_app": false,
  "api_v2": false,
  "automated_billing": false,
  "ml_predictions": false
}', 'json', 'Feature flags for beta functionality', 'Feature Flags', '{}', 'system', true, 10);

-- ================================================
-- Add enum values for constrained settings
-- ================================================

UPDATE app_settings SET enum_values = ARRAY['auto', 'light', 'dark'] WHERE category = 'ui_theme' AND key = 'theme_mode';
UPDATE app_settings SET enum_values = ARRAY['en', 'es', 'fr', 'de', 'zh', 'ja'] WHERE category = 'localization' AND key = 'language';

-- ================================================
-- Add validation rules for numeric settings
-- ================================================

UPDATE app_settings SET 
    min_value = 0,
    max_value = 1000 
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

-- ================================================
-- Create default settings template
-- ================================================

INSERT INTO settings_templates (name, description, template_data, is_default, is_system_template) VALUES 
('Default Configuration', 'Standard settings for new installations', '{
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
    "minimum_charge_days": 1
  },
  "ui_theme": {
    "theme_mode": "auto",
    "dark_mode": false,
    "font_scale": 1
  },
  "notifications": {
    "push_notifications": {
      "enabled": true,
      "show_entry_alerts": true
    }
  }
}', true, true);

-- ================================================
-- Final cleanup and validation
-- ================================================

-- Update settings count in templates
UPDATE settings_templates SET usage_count = 1 WHERE is_default = true;

-- Ensure all required settings have descriptions
UPDATE app_settings SET description = COALESCE(description, 'System setting for ' || display_name) WHERE description IS NULL;

COMMENT ON SCHEMA public IS 'Parking Management System - Settings Migration Complete';