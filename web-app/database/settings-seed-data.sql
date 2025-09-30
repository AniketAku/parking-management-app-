-- ===================================================================
-- SETTINGS SEED DATA
-- Migrates all hard-coded configurations from codebase
-- ===================================================================

-- Business Configuration Settings
INSERT INTO app_settings (category, key, value, data_type, description, default_value, scope, validation_rules, sort_order) VALUES

-- Vehicle Rates (from helpers.ts, supabase.js)
('business', 'vehicle_rates', '{"Trailer": 225, "6 Wheeler": 150, "4 Wheeler": 100, "2 Wheeler": 50}', 'json', 'Daily parking rates by vehicle type (in INR)', '{"Trailer": 225, "6 Wheeler": 150, "4 Wheeler": 100, "2 Wheeler": 50}', 'system', '{"type": "object", "properties": {"Trailer": {"type": "number", "minimum": 0}, "6 Wheeler": {"type": "number", "minimum": 0}, "4 Wheeler": {"type": "number", "minimum": 0}, "2 Wheeler": {"type": "number", "minimum": 0}}}', 1),

-- Penalty Configuration (from helpers.ts line 202)
('business', 'overstay_penalty_rate', '50', 'number', 'Penalty rate per hour for overstaying (in INR)', '50', 'system', '{"type": "number", "minimum": 0, "maximum": 1000}', 2),
('business', 'overstay_threshold_hours', '24', 'number', 'Hours after which overstay penalty applies', '24', 'system', '{"type": "number", "minimum": 1, "maximum": 168}', 3),
('business', 'minimum_charge_days', '1', 'number', 'Minimum number of days to charge for parking', '1', 'system', '{"type": "number", "minimum": 1, "maximum": 7}', 4),

-- Operating Hours
('business', 'operating_hours', '{"start": "06:00", "end": "22:00", "timezone": "Asia/Kolkata"}', 'json', 'Daily operating hours', '{"start": "06:00", "end": "22:00", "timezone": "Asia/Kolkata"}', 'location', '{"type": "object", "properties": {"start": {"type": "string", "pattern": "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"}, "end": {"type": "string", "pattern": "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"}}}', 5),

-- Payment Methods
('business', 'payment_methods', '["Cash", "Credit Card", "Debit Card", "UPI", "Online", "N/A"]', 'array', 'Available payment methods', '["Cash", "Credit Card", "Debit Card", "UPI", "Online", "N/A"]', 'system', '{"type": "array", "items": {"type": "string"}}', 6),

-- Vehicle Types (from supabase.js ENUMS)
('business', 'vehicle_types', '["Trailer", "6 Wheeler", "4 Wheeler", "2 Wheeler"]', 'array', 'Supported vehicle types', '["Trailer", "6 Wheeler", "4 Wheeler", "2 Wheeler"]', 'system', '{"type": "array", "items": {"type": "string"}}', 7),

-- Entry/Exit Status Options
('business', 'entry_status_options', '["Parked", "Exited"]', 'array', 'Available entry status values', '["Parked", "Exited"]', 'system', '{"type": "array", "items": {"type": "string"}}', 8),
('business', 'payment_status_options', '["Paid", "Unpaid", "Pending", "Refunded"]', 'array', 'Available payment status values', '["Paid", "Unpaid", "Pending", "Refunded"]', 'system', '{"type": "array", "items": {"type": "string"}}', 9);

-- User Management Settings
INSERT INTO app_settings (category, key, value, data_type, description, default_value, scope, validation_rules, sort_order) VALUES

-- User Roles (from supabase.js line 115)
('user_mgmt', 'user_roles', '["admin", "operator", "viewer"]', 'array', 'Available user roles in the system', '["admin", "operator", "viewer"]', 'system', '{"type": "array", "items": {"type": "string", "enum": ["admin", "operator", "viewer"]}}', 10),

-- Session Management
('user_mgmt', 'session_timeout_minutes', '480', 'number', 'User session timeout in minutes (8 hours default)', '480', 'system', '{"type": "number", "minimum": 30, "maximum": 1440}', 11),
('user_mgmt', 'auto_refresh_token', 'true', 'boolean', 'Automatically refresh authentication tokens', 'true', 'system', '{"type": "boolean"}', 12),
('user_mgmt', 'persist_session', 'true', 'boolean', 'Persist user session across browser restarts', 'true', 'user', '{"type": "boolean"}', 13),

-- Password Policy
('user_mgmt', 'password_min_length', '8', 'number', 'Minimum password length', '8', 'system', '{"type": "number", "minimum": 6, "maximum": 50}', 14),
('user_mgmt', 'password_require_special', 'false', 'boolean', 'Require special characters in passwords', 'false', 'system', '{"type": "boolean"}', 15);

-- UI Theme Settings (from tailwind.config.js)
INSERT INTO app_settings (category, key, value, data_type, description, default_value, scope, validation_rules, sort_order) VALUES

-- Color Scheme
('ui_theme', 'primary_colors', '{"50": "#f0f5ff", "100": "#e0eaff", "200": "#c7d9ff", "300": "#a5c0ff", "400": "#8ba2ff", "500": "#2A5C8F", "600": "#1e4a7a", "700": "#1a3d63", "800": "#163050", "900": "#132740"}', 'json', 'Primary color palette', '{"500": "#2A5C8F"}', 'user', '{"type": "object"}', 20),
('ui_theme', 'secondary_colors', '{"50": "#f2f7ff", "100": "#e6efff", "200": "#d0e1ff", "300": "#aec8ff", "400": "#8ba9ff", "500": "#3D7BB6", "600": "#2d6599", "700": "#26517a", "800": "#20425c", "900": "#1b3443"}', 'json', 'Secondary color palette', '{"500": "#3D7BB6"}', 'user', '{"type": "object"}', 21),
('ui_theme', 'accent_colors', '{"50": "#fffbf0", "100": "#fff6e0", "200": "#ffecbd", "300": "#ffdf8a", "400": "#ffcd4d", "500": "#FFA630", "600": "#e6932b", "700": "#cc8026", "800": "#b36d21", "900": "#995a1c"}', 'json', 'Accent color palette', '{"500": "#FFA630"}', 'user', '{"type": "object"}', 22),

-- Vehicle Type Colors (from helpers.ts lines 211-219)
('ui_theme', 'vehicle_type_colors', '{"Trailer": "bg-purple-100 text-purple-800", "6 Wheeler": "bg-blue-100 text-blue-800", "4 Wheeler": "bg-green-100 text-green-800", "2 Wheeler": "bg-orange-100 text-orange-800"}', 'json', 'Color classes for vehicle type badges', '{"Trailer": "bg-purple-100 text-purple-800", "6 Wheeler": "bg-blue-100 text-blue-800", "4 Wheeler": "bg-green-100 text-green-800", "2 Wheeler": "bg-orange-100 text-orange-800"}', 'user', '{"type": "object"}', 23),

-- Typography
('ui_theme', 'font_family', '["Inter", "system-ui", "sans-serif"]', 'array', 'Font family stack', '["Inter", "system-ui", "sans-serif"]', 'user', '{"type": "array", "items": {"type": "string"}}', 24),
('ui_theme', 'font_scale', '1.0', 'number', 'Font scaling factor for accessibility', '1.0', 'user', '{"type": "number", "minimum": 0.8, "maximum": 1.5}', 25),

-- Theme Mode
('ui_theme', 'dark_mode', 'false', 'boolean', 'Enable dark mode theme', 'false', 'user', '{"type": "boolean"}', 26),
('ui_theme', 'theme_mode', '"auto"', 'enum', 'Theme mode selection', '"auto"', 'user', null, 27);

-- Update enum values for theme_mode
UPDATE app_settings SET enum_values = ARRAY['light', 'dark', 'auto'] WHERE key = 'theme_mode';

-- System Configuration Settings
INSERT INTO app_settings (category, key, value, data_type, description, default_value, scope, validation_rules, sort_order) VALUES

-- Database Configuration (from supabase.js)
('system', 'auto_refresh_token', 'true', 'boolean', 'Automatically refresh Supabase auth tokens', 'true', 'system', '{"type": "boolean"}', 30),
('system', 'realtime_events_per_second', '10', 'number', 'Rate limit for real-time events', '10', 'system', '{"type": "number", "minimum": 1, "maximum": 100}', 31),
('system', 'detect_session_in_url', 'true', 'boolean', 'Detect authentication session from URL parameters', 'true', 'system', '{"type": "boolean"}', 32),

-- API Configuration
('system', 'api_timeout_ms', '30000', 'number', 'API request timeout in milliseconds', '30000', 'system', '{"type": "number", "minimum": 5000, "maximum": 120000}', 33),
('system', 'retry_attempts', '3', 'number', 'Number of retry attempts for failed requests', '3', 'system', '{"type": "number", "minimum": 1, "maximum": 10}', 34),
('system', 'retry_delay_ms', '1000', 'number', 'Delay between retry attempts in milliseconds', '1000', 'system', '{"type": "number", "minimum": 100, "maximum": 10000}', 35);

-- Validation Settings
INSERT INTO app_settings (category, key, value, data_type, description, default_value, scope, validation_rules, sort_order) VALUES

-- Vehicle Number Validation (from helpers.ts lines 156-159)
('validation', 'vehicle_number_patterns', '["/^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/", "/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$/"]', 'array', 'Regex patterns for Indian vehicle number validation', '["/^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/", "/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$/"]', 'system', '{"type": "array", "items": {"type": "string"}}', 40),

-- Form Validation Rules
('validation', 'driver_name_min_length', '2', 'number', 'Minimum length for driver name', '2', 'system', '{"type": "number", "minimum": 1, "maximum": 10}', 41),
('validation', 'driver_name_max_length', '100', 'number', 'Maximum length for driver name', '100', 'system', '{"type": "number", "minimum": 10, "maximum": 500}', 42),
('validation', 'phone_number_pattern', '"^[0-9]{10}$"', 'string', 'Regex pattern for phone number validation', '"^[0-9]{10}$"', 'system', '{"type": "string"}', 43),
('validation', 'transport_name_max_length', '200', 'number', 'Maximum length for transport company name', '200', 'system', '{"type": "number", "minimum": 10, "maximum": 500}', 44);

-- Localization Settings
INSERT INTO app_settings (category, key, value, data_type, description, default_value, scope, validation_rules, sort_order) VALUES

-- Locale Configuration (from multiple files with 'en-IN')
('localization', 'default_locale', '"en-IN"', 'string', 'Default locale for date/currency formatting', '"en-IN"', 'user', '{"type": "string", "pattern": "^[a-z]{2}-[A-Z]{2}$"}', 50),
('localization', 'currency_symbol', '"₹"', 'string', 'Currency symbol to display', '"₹"', 'location', '{"type": "string", "maxLength": 5}', 51),
('localization', 'currency_code', '"INR"', 'string', 'ISO currency code', '"INR"', 'location', '{"type": "string", "pattern": "^[A-Z]{3}$"}', 52),
('localization', 'date_format', '"dd-MM-yyyy"', 'string', 'Date display format', '"dd-MM-yyyy"', 'user', '{"type": "string"}', 53),
('localization', 'time_format', '"12"', 'enum', 'Time format (12 or 24 hour)', '"12"', 'user', null, 54),
('localization', 'timezone', '"Asia/Kolkata"', 'string', 'Default timezone', '"Asia/Kolkata"', 'location', '{"type": "string"}', 55);

-- Update enum values for time_format
UPDATE app_settings SET enum_values = ARRAY['12', '24'] WHERE key = 'time_format';

-- Performance Settings (from performance.ts)
INSERT INTO app_settings (category, key, value, data_type, description, default_value, scope, validation_rules, sort_order) VALUES

-- Performance Budgets
('performance', 'lcp_budget_ms', '2500', 'number', 'Largest Contentful Paint budget in milliseconds', '2500', 'system', '{"type": "number", "minimum": 1000, "maximum": 10000}', 60),
('performance', 'fid_budget_ms', '100', 'number', 'First Input Delay budget in milliseconds', '100', 'system', '{"type": "number", "minimum": 50, "maximum": 1000}', 61),
('performance', 'cls_budget', '0.1', 'number', 'Cumulative Layout Shift budget', '0.1', 'system', '{"type": "number", "minimum": 0, "maximum": 1}', 62),
('performance', 'fcp_budget_ms', '1800', 'number', 'First Contentful Paint budget in milliseconds', '1800', 'system', '{"type": "number", "minimum": 500, "maximum": 5000}', 63),
('performance', 'ttfb_budget_ms', '600', 'number', 'Time to First Byte budget in milliseconds', '600', 'system', '{"type": "number", "minimum": 100, "maximum": 3000}', 64),

-- Resource Budgets
('performance', 'bundle_size_budget_kb', '500', 'number', 'Bundle size budget in kilobytes', '500', 'system', '{"type": "number", "minimum": 100, "maximum": 5000}', 65),
('performance', 'memory_usage_budget_mb', '100', 'number', 'Memory usage budget in megabytes', '100', 'system', '{"type": "number", "minimum": 50, "maximum": 1000}', 66),
('performance', 'accessibility_score_min', '95', 'number', 'Minimum accessibility score requirement', '95', 'system', '{"type": "number", "minimum": 80, "maximum": 100}', 67);

-- Notification Settings
INSERT INTO app_settings (category, key, value, data_type, description, default_value, scope, validation_rules, sort_order) VALUES

-- Notification Preferences
('notifications', 'enable_browser_notifications', 'true', 'boolean', 'Enable browser push notifications', 'true', 'user', '{"type": "boolean"}', 70),
('notifications', 'enable_email_notifications', 'false', 'boolean', 'Enable email notifications', 'false', 'user', '{"type": "boolean"}', 71),
('notifications', 'overstay_alert_enabled', 'true', 'boolean', 'Alert when vehicles overstay', 'true', 'location', '{"type": "boolean"}', 72),
('notifications', 'overstay_alert_hours', '23', 'number', 'Hours before overstay to send alert', '23', 'location', '{"type": "number", "minimum": 1, "maximum": 48}', 73),
('notifications', 'daily_report_time', '"08:00"', 'string', 'Time to send daily reports', '"08:00"', 'user', '{"type": "string", "pattern": "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"}', 74);

-- Reporting Settings  
INSERT INTO app_settings (category, key, value, data_type, description, default_value, scope, validation_rules, sort_order) VALUES

-- Report Configuration
('reporting', 'default_report_period', '"last_7_days"', 'enum', 'Default time period for reports', '"last_7_days"', 'user', null, 80),
('reporting', 'export_formats', '["CSV", "PDF", "Excel"]', 'array', 'Available export formats', '["CSV", "PDF", "Excel"]', 'system', '{"type": "array", "items": {"type": "string"}}', 81),
('reporting', 'max_export_records', '10000', 'number', 'Maximum records per export', '10000', 'system', '{"type": "number", "minimum": 100, "maximum": 100000}', 82),
('reporting', 'chart_colors', '["#2A5C8F", "#3D7BB6", "#FFA630", "#4CAF50", "#FFC107", "#F44336"]', 'array', 'Default colors for charts', '["#2A5C8F", "#3D7BB6", "#FFA630", "#4CAF50", "#FFC107", "#F44336"]', 'user', '{"type": "array", "items": {"type": "string", "pattern": "^#[0-9A-Fa-f]{6}$"}}', 83);

-- Update enum values for default_report_period
UPDATE app_settings SET enum_values = ARRAY['today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', 'last_month', 'this_year', 'custom'] WHERE key = 'default_report_period';

-- Security Settings
INSERT INTO app_settings (category, key, value, data_type, description, default_value, scope, is_sensitive, validation_rules, sort_order) VALUES

-- Security Configuration
('security', 'enable_audit_logging', 'true', 'boolean', 'Enable comprehensive audit logging', 'true', 'system', false, '{"type": "boolean"}', 90),
('security', 'session_inactivity_timeout', '30', 'number', 'Automatic logout after inactivity (minutes)', '30', 'system', false, '{"type": "number", "minimum": 5, "maximum": 480}', 91),
('security', 'max_login_attempts', '5', 'number', 'Maximum failed login attempts before lockout', '5', 'system', false, '{"type": "number", "minimum": 3, "maximum": 20}', 92),
('security', 'login_lockout_duration', '300', 'number', 'Account lockout duration in seconds', '300', 'system', false, '{"type": "number", "minimum": 60, "maximum": 3600}', 93);

-- Create default setting template
INSERT INTO setting_templates (name, description, category, template_data, is_default, is_system_template, applicable_business_types) VALUES
(
  'Default Parking System',
  'Standard configuration for parking management systems',
  'business',
  '{
    "vehicle_rates": {"Trailer": 225, "6 Wheeler": 150, "4 Wheeler": 100, "2 Wheeler": 50},
    "overstay_penalty_rate": 50,
    "overstay_threshold_hours": 24,
    "operating_hours": {"start": "06:00", "end": "22:00", "timezone": "Asia/Kolkata"},
    "payment_methods": ["Cash", "Credit Card", "Debit Card", "UPI", "Online"]
  }',
  true,
  true,
  ARRAY['parking_garage', 'surface_lot', 'street_parking']
),
(
  'Premium Valet Service', 
  'Configuration optimized for valet parking services',
  'business',
  '{
    "vehicle_rates": {"Trailer": 300, "6 Wheeler": 200, "4 Wheeler": 150, "2 Wheeler": 75},
    "overstay_penalty_rate": 100,
    "overstay_threshold_hours": 12,
    "operating_hours": {"start": "24/7", "end": "24/7", "timezone": "Asia/Kolkata"},
    "payment_methods": ["Credit Card", "Debit Card", "UPI", "Online"]
  }',
  false,
  true,
  ARRAY['valet_service', 'hotel_parking', 'premium_garage']
);

-- Add helpful comments
COMMENT ON COLUMN app_settings.validation_rules IS 'JSON Schema for validating setting values';
COMMENT ON COLUMN app_settings.enum_values IS 'Array of valid values for enum type settings';
COMMENT ON COLUMN app_settings.is_sensitive IS 'Hide value in UI for security (passwords, keys, etc.)';
COMMENT ON COLUMN app_settings.sort_order IS 'Display order in settings UI (lower numbers first)';

-- Update metadata for better organization
UPDATE app_settings SET is_system_setting = true WHERE category IN ('system', 'security', 'performance');
UPDATE app_settings SET requires_restart = true WHERE key IN ('realtime_events_per_second', 'api_timeout_ms');