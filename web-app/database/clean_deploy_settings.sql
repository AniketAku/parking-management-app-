-- ===================================================================
-- CLEAN DEPLOYMENT - HANDLES EXISTING ENUMS AND TABLES
-- Run this to safely deploy settings system
-- ===================================================================

-- Drop existing objects if they exist (clean slate)
DROP TABLE IF EXISTS setting_templates CASCADE;
DROP TABLE IF EXISTS settings_history CASCADE;
DROP TABLE IF EXISTS location_settings CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;

-- Drop enums if they exist
DROP TYPE IF EXISTS setting_category CASCADE;
DROP TYPE IF EXISTS setting_data_type CASCADE;
DROP TYPE IF EXISTS setting_scope CASCADE;

-- Create enums
CREATE TYPE setting_category AS ENUM (
  'business',      -- Parking rates, fees, penalties
  'user_mgmt',     -- Roles, permissions, auth settings
  'ui_theme',      -- Colors, fonts, layout preferences
  'system',        -- API timeouts, performance limits
  'validation',    -- Input rules, patterns, constraints
  'localization',  -- Language, currency, date formats
  'notifications', -- Alert settings, email preferences
  'reporting',     -- Report defaults, export settings
  'security',      -- Password policies, session settings
  'performance'    -- Monitoring, caching, optimization
);

CREATE TYPE setting_data_type AS ENUM (
  'string',
  'number', 
  'boolean',
  'json',
  'array',
  'enum'
);

CREATE TYPE setting_scope AS ENUM (
  'system',    -- Global system settings (admin only)
  'location',  -- Location-specific overrides (manager level)
  'user'       -- Individual user preferences
);

-- Create locations table if it doesn't exist
CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default location if none exists
INSERT INTO locations (id, name, address) 
SELECT 1, 'Default Location', 'Main Parking Facility'
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE id = 1);

-- Ensure users have location_id column
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'location_id') THEN
    ALTER TABLE users ADD COLUMN location_id INTEGER DEFAULT 1 REFERENCES locations(id);
  END IF;
END $$;

-- Main settings configuration table
CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category setting_category NOT NULL,
  key VARCHAR(100) NOT NULL,
  value JSONB NOT NULL,
  data_type setting_data_type NOT NULL DEFAULT 'string',
  description TEXT,
  default_value JSONB,
  
  -- Validation constraints
  validation_rules JSONB,
  enum_values TEXT[],
  min_value NUMERIC,
  max_value NUMERIC,
  min_length INTEGER,
  max_length INTEGER,
  
  -- Metadata
  scope setting_scope NOT NULL DEFAULT 'system',
  is_system_setting BOOLEAN DEFAULT false,
  requires_restart BOOLEAN DEFAULT false,
  is_sensitive BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  
  -- Constraints
  UNIQUE(category, key),
  CONSTRAINT valid_json_value CHECK (value IS NOT NULL)
);

-- User-specific setting overrides
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  setting_key VARCHAR(100) NOT NULL,
  value JSONB NOT NULL,
  
  -- Reference to main setting
  app_setting_id UUID REFERENCES app_settings(id) ON DELETE CASCADE,
  
  -- Audit fields  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, setting_key)
);

-- Location-specific setting overrides
CREATE TABLE location_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  setting_key VARCHAR(100) NOT NULL, 
  value JSONB NOT NULL,
  
  -- Reference to main setting
  app_setting_id UUID REFERENCES app_settings(id) ON DELETE CASCADE,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by INTEGER REFERENCES users(id),
  
  -- Constraints
  UNIQUE(location_id, setting_key)
);

-- Simplified settings history
CREATE TABLE settings_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_id UUID NOT NULL,
  setting_key VARCHAR(100) NOT NULL,
  old_value JSONB,
  new_value JSONB NOT NULL,
  change_type VARCHAR(20) NOT NULL,
  
  -- Change context
  changed_by INTEGER REFERENCES users(id),
  change_reason TEXT,
  
  -- Timestamps
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Source tracking
  source_table VARCHAR(50) NOT NULL
);

-- Setting templates
CREATE TABLE setting_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  category setting_category,
  template_data JSONB NOT NULL,
  
  -- Metadata
  is_default BOOLEAN DEFAULT false,
  is_system_template BOOLEAN DEFAULT false,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_app_settings_category ON app_settings(category);
CREATE INDEX idx_app_settings_key ON app_settings(key);
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX idx_user_settings_key ON user_settings(setting_key);
CREATE INDEX idx_location_settings_location_id ON location_settings(location_id);
CREATE INDEX idx_settings_history_setting_id ON settings_history(setting_id);

-- Row Level Security
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE setting_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- App settings: Admins can manage all, users can read non-sensitive
CREATE POLICY "Admin full access to app_settings" ON app_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Users read non-sensitive app_settings" ON app_settings
  FOR SELECT TO authenticated
  USING (
    NOT is_sensitive OR 
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() AND u.role = 'admin'
    )
  );

-- User settings: Users can manage their own settings
CREATE POLICY "Users manage own settings" ON user_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() AND u.id = user_settings.user_id
    )
  );

-- Location settings: Admins and operators can manage location settings
CREATE POLICY "Location managers manage location settings" ON location_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('operator', 'admin')
    )
  );

-- Settings history: Read-only audit trail
CREATE POLICY "Read settings history" ON settings_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND (u.role = 'admin' OR u.id = settings_history.changed_by)
    )
  );

-- Setting templates: Read access for all, admin manage
CREATE POLICY "All users read setting_templates" ON setting_templates
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin manage setting_templates" ON setting_templates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() AND u.role = 'admin'
    )
  );

-- Function to get setting value with hierarchy resolution
CREATE OR REPLACE FUNCTION get_setting_value(
  p_key VARCHAR(100),
  p_user_id INTEGER DEFAULT NULL,
  p_location_id INTEGER DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_value JSONB;
BEGIN
  -- Check user-specific setting first (highest priority)
  IF p_user_id IS NOT NULL THEN
    SELECT value INTO v_value
    FROM user_settings
    WHERE setting_key = p_key AND user_id = p_user_id;
    
    IF v_value IS NOT NULL THEN
      RETURN v_value;
    END IF;
  END IF;
  
  -- Check location-specific setting (medium priority)
  IF p_location_id IS NOT NULL THEN
    SELECT value INTO v_value
    FROM location_settings
    WHERE setting_key = p_key AND location_id = p_location_id;
    
    IF v_value IS NOT NULL THEN
      RETURN v_value;
    END IF;
  END IF;
  
  -- Fallback to system default (lowest priority)
  SELECT COALESCE(value, default_value) INTO v_value
  FROM app_settings
  WHERE key = p_key;
  
  RETURN v_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simple update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_app_settings_updated_at 
  BEFORE UPDATE ON app_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at 
  BEFORE UPDATE ON user_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_location_settings_updated_at 
  BEFORE UPDATE ON location_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify deployment
SELECT 'Settings schema deployed successfully!' as status;
SELECT 'Ready to apply seed data' as next_step;