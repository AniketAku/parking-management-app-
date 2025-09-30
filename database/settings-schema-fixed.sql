-- ===================================================================
-- COMPREHENSIVE SETTINGS MANAGEMENT SYSTEM - CORRECTED VERSION
-- Compatible with existing integer-based user IDs
-- ===================================================================

-- Settings categories enum
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

-- Setting data types enum
CREATE TYPE setting_data_type AS ENUM (
  'string',
  'number', 
  'boolean',
  'json',
  'array',
  'enum'
);

-- Setting scope levels enum
CREATE TYPE setting_scope AS ENUM (
  'system',    -- Global system settings (admin only)
  'location',  -- Location-specific overrides (manager level)
  'user'       -- Individual user preferences
);

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
  validation_rules JSONB, -- JSON schema for validation
  enum_values TEXT[], -- For enum type settings
  min_value NUMERIC, -- For number validation
  max_value NUMERIC, -- For number validation
  min_length INTEGER, -- For string validation
  max_length INTEGER, -- For string validation
  
  -- Metadata
  scope setting_scope NOT NULL DEFAULT 'system',
  is_system_setting BOOLEAN DEFAULT false,
  requires_restart BOOLEAN DEFAULT false,
  is_sensitive BOOLEAN DEFAULT false, -- Hide values in UI
  sort_order INTEGER DEFAULT 0,
  
  -- Audit fields (FIXED: Use INTEGER for user IDs)
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

-- Location-specific setting overrides (for multi-location support)
CREATE TABLE location_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  setting_key VARCHAR(100) NOT NULL, 
  value JSONB NOT NULL,
  
  -- Reference to main setting
  app_setting_id UUID REFERENCES app_settings(id) ON DELETE CASCADE,
  
  -- Audit fields (FIXED: Use INTEGER for user IDs)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by INTEGER REFERENCES users(id),
  
  -- Constraints
  UNIQUE(location_id, setting_key)
);

-- Settings change audit trail
CREATE TABLE settings_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_id UUID NOT NULL,
  setting_key VARCHAR(100) NOT NULL,
  old_value JSONB,
  new_value JSONB NOT NULL,
  change_type VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  
  -- Change context (FIXED: Use INTEGER for user IDs)
  changed_by INTEGER NOT NULL REFERENCES users(id),
  change_reason TEXT,
  change_context JSONB, -- Additional metadata about the change
  
  -- Timestamps
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Source tracking
  source_table VARCHAR(50) NOT NULL, -- 'app_settings', 'user_settings', 'location_settings'
  source_ip INET,
  user_agent TEXT
);

-- Setting templates for common configurations
CREATE TABLE setting_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  category setting_category,
  template_data JSONB NOT NULL, -- Complete settings configuration
  
  -- Metadata
  is_default BOOLEAN DEFAULT false,
  is_system_template BOOLEAN DEFAULT false,
  applicable_business_types TEXT[], -- ['parking_garage', 'surface_lot', 'valet_service']
  
  -- Audit fields (FIXED: Use INTEGER for user IDs)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  
  -- Version tracking
  version INTEGER DEFAULT 1,
  parent_template_id UUID REFERENCES setting_templates(id)
);

-- Indexes for performance
CREATE INDEX idx_app_settings_category ON app_settings(category);
CREATE INDEX idx_app_settings_key ON app_settings(key);
CREATE INDEX idx_app_settings_scope ON app_settings(scope);
CREATE INDEX idx_app_settings_system ON app_settings(is_system_setting);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX idx_user_settings_key ON user_settings(setting_key);

CREATE INDEX idx_location_settings_location_id ON location_settings(location_id);
CREATE INDEX idx_location_settings_key ON location_settings(setting_key);

CREATE INDEX idx_settings_history_setting_id ON settings_history(setting_id);
CREATE INDEX idx_settings_history_changed_by ON settings_history(changed_by);
CREATE INDEX idx_settings_history_changed_at ON settings_history(changed_at);

-- Row Level Security
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE setting_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies (UPDATED for integer user IDs)

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

-- Location settings: Admins and operators can manage their location settings
CREATE POLICY "Location managers manage location settings" ON location_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.location_id = location_settings.location_id
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

-- Trigger functions for audit trail (UPDATED)
CREATE OR REPLACE FUNCTION log_setting_change()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id INTEGER;
BEGIN
  -- Get current user's integer ID from auth_id
  SELECT id INTO current_user_id 
  FROM users 
  WHERE auth_id = auth.uid();

  -- Log changes to settings_history
  IF TG_OP = 'DELETE' THEN
    INSERT INTO settings_history (
      setting_id, setting_key, old_value, new_value, change_type,
      changed_by, source_table, changed_at
    ) VALUES (
      OLD.id, 
      CASE 
        WHEN TG_TABLE_NAME = 'app_settings' THEN OLD.key
        WHEN TG_TABLE_NAME = 'user_settings' THEN OLD.setting_key
        WHEN TG_TABLE_NAME = 'location_settings' THEN OLD.setting_key
      END,
      OLD.value, NULL, 'DELETE',
      current_user_id, TG_TABLE_NAME, NOW()
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO settings_history (
      setting_id, setting_key, old_value, new_value, change_type,
      changed_by, source_table, changed_at
    ) VALUES (
      NEW.id,
      CASE 
        WHEN TG_TABLE_NAME = 'app_settings' THEN NEW.key
        WHEN TG_TABLE_NAME = 'user_settings' THEN NEW.setting_key
        WHEN TG_TABLE_NAME = 'location_settings' THEN NEW.setting_key
      END,
      OLD.value, NEW.value, 'UPDATE',
      current_user_id, TG_TABLE_NAME, NOW()
    );
    NEW.updated_at = NOW();
    IF TG_TABLE_NAME = 'app_settings' THEN
      NEW.updated_by = current_user_id;
    ELSIF TG_TABLE_NAME = 'location_settings' THEN
      NEW.updated_by = current_user_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO settings_history (
      setting_id, setting_key, old_value, new_value, change_type,
      changed_by, source_table, changed_at
    ) VALUES (
      NEW.id,
      CASE 
        WHEN TG_TABLE_NAME = 'app_settings' THEN NEW.key
        WHEN TG_TABLE_NAME = 'user_settings' THEN NEW.setting_key
        WHEN TG_TABLE_NAME = 'location_settings' THEN NEW.setting_key
      END,
      NULL, NEW.value, 'INSERT',
      current_user_id, TG_TABLE_NAME, NOW()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for audit trail
CREATE TRIGGER app_settings_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION log_setting_change();

CREATE TRIGGER user_settings_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION log_setting_change();

CREATE TRIGGER location_settings_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON location_settings
  FOR EACH ROW EXECUTE FUNCTION log_setting_change();

-- Function to get setting value with hierarchy resolution (UPDATED)
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

-- Function to bulk update settings (UPDATED)
CREATE OR REPLACE FUNCTION bulk_update_settings(
  p_settings JSONB,
  p_user_id INTEGER DEFAULT NULL,
  p_location_id INTEGER DEFAULT NULL
)
RETURNS TABLE(key VARCHAR(100), success BOOLEAN, error_message TEXT) AS $$
DECLARE
  setting_record RECORD;
  v_error TEXT;
  current_user_id INTEGER;
BEGIN
  -- Get current user's integer ID from auth_id
  SELECT id INTO current_user_id 
  FROM users 
  WHERE auth_id = auth.uid();

  -- Iterate through each setting in the JSON input
  FOR setting_record IN 
    SELECT * FROM jsonb_each(p_settings)
  LOOP
    BEGIN
      -- Determine which table to update based on parameters
      IF p_user_id IS NOT NULL THEN
        -- Update user settings
        INSERT INTO user_settings (user_id, setting_key, value, app_setting_id)
        VALUES (
          p_user_id, 
          setting_record.key, 
          setting_record.value,
          (SELECT id FROM app_settings WHERE key = setting_record.key)
        )
        ON CONFLICT (user_id, setting_key) 
        DO UPDATE SET value = setting_record.value, updated_at = NOW();
        
      ELSIF p_location_id IS NOT NULL THEN
        -- Update location settings
        INSERT INTO location_settings (location_id, setting_key, value, app_setting_id, updated_by)
        VALUES (
          p_location_id, 
          setting_record.key, 
          setting_record.value,
          (SELECT id FROM app_settings WHERE key = setting_record.key),
          current_user_id
        )
        ON CONFLICT (location_id, setting_key) 
        DO UPDATE SET value = setting_record.value, updated_at = NOW(), updated_by = current_user_id;
        
      ELSE
        -- Update system settings
        UPDATE app_settings 
        SET value = setting_record.value, updated_at = NOW(), updated_by = current_user_id
        WHERE key = setting_record.key;
      END IF;
      
      -- Return success
      RETURN QUERY SELECT setting_record.key, true, NULL::TEXT;
      
    EXCEPTION WHEN OTHERS THEN
      -- Return error
      GET STACKED DIAGNOSTICS v_error = MESSAGE_TEXT;
      RETURN QUERY SELECT setting_record.key, false, v_error;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE app_settings IS 'System-wide configuration settings with validation and hierarchy support';
COMMENT ON TABLE user_settings IS 'User-specific setting overrides';
COMMENT ON TABLE location_settings IS 'Location-specific setting overrides for multi-location support';
COMMENT ON TABLE settings_history IS 'Complete audit trail of all setting changes';
COMMENT ON TABLE setting_templates IS 'Predefined setting configurations for different business types';

COMMENT ON FUNCTION get_setting_value(VARCHAR, INTEGER, INTEGER) IS 'Resolves setting value with user > location > system hierarchy';
COMMENT ON FUNCTION bulk_update_settings(JSONB, INTEGER, INTEGER) IS 'Safely updates multiple settings in a single transaction';