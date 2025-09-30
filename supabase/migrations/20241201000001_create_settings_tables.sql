-- ================================================
-- Settings Database Architecture Migration - Supabase Compatible
-- Complete multi-level settings system with RLS and audit trail
-- ================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- Core Settings Tables
-- ================================================

-- Main settings registry
CREATE TABLE app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    data_type VARCHAR(20) NOT NULL CHECK (data_type IN ('string', 'number', 'boolean', 'json', 'array', 'enum')),
    
    -- Documentation and validation
    description TEXT,
    display_name VARCHAR(200),
    default_value JSONB,
    validation_rules JSONB,
    enum_values TEXT[],
    
    -- Constraints
    min_value NUMERIC,
    max_value NUMERIC,
    min_length INTEGER,
    max_length INTEGER,
    pattern VARCHAR(500),
    
    -- Metadata
    scope VARCHAR(20) NOT NULL DEFAULT 'system' CHECK (scope IN ('system', 'location', 'user')),
    is_system_setting BOOLEAN DEFAULT false,
    requires_restart BOOLEAN DEFAULT false,
    is_sensitive BOOLEAN DEFAULT false,
    is_readonly BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    category_group VARCHAR(50),
    
    -- Feature flags
    feature_flag VARCHAR(100),
    environment_specific BOOLEAN DEFAULT false,
    
    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    version INTEGER DEFAULT 1,
    
    UNIQUE(category, key),
    CHECK (category != '' AND key != '')
);

-- User-specific setting overrides
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    setting_key VARCHAR(150) NOT NULL,
    value JSONB NOT NULL,
    
    -- Metadata
    app_setting_id UUID REFERENCES app_settings(id) ON DELETE CASCADE,
    inherit_from_location BOOLEAN DEFAULT true,
    is_temporary BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, setting_key)
);

-- Location-specific setting overrides (assumes locations table exists)
CREATE TABLE location_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL, -- References locations table if exists
    setting_key VARCHAR(150) NOT NULL,
    value JSONB NOT NULL,
    
    -- Metadata
    app_setting_id UUID REFERENCES app_settings(id) ON DELETE CASCADE,
    inherit_from_system BOOLEAN DEFAULT true,
    applies_to_users BOOLEAN DEFAULT true,
    
    -- Scheduling
    effective_from TIMESTAMP WITH TIME ZONE,
    effective_until TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    
    UNIQUE(location_id, setting_key)
);

-- Settings change audit trail
CREATE TABLE settings_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_table VARCHAR(50) NOT NULL CHECK (setting_table IN ('app_settings', 'user_settings', 'location_settings')),
    setting_id UUID NOT NULL,
    setting_key VARCHAR(150) NOT NULL,
    
    -- Change details
    old_value JSONB,
    new_value JSONB,
    change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('INSERT', 'UPDATE', 'DELETE', 'BULK_UPDATE')),
    
    -- Context
    changed_by UUID NOT NULL REFERENCES auth.users(id),
    change_reason TEXT,
    change_context JSONB,
    batch_id UUID,
    
    -- Source tracking
    source_ip INET,
    user_agent TEXT,
    
    -- Timestamp
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings templates for quick setup
CREATE TABLE settings_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    
    -- Template data
    template_data JSONB NOT NULL,
    preview_data JSONB,
    
    -- Classification
    is_default BOOLEAN DEFAULT false,
    is_system_template BOOLEAN DEFAULT false,
    business_types TEXT[],
    user_roles TEXT[],
    
    -- Versioning
    version INTEGER DEFAULT 1,
    parent_template_id UUID REFERENCES settings_templates(id),
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    usage_count INTEGER DEFAULT 0,
    
    UNIQUE(name, version)
);

-- Settings cache for performance
CREATE TABLE settings_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_key VARCHAR(200) NOT NULL UNIQUE,
    cache_value JSONB NOT NULL,
    
    -- Scope and context
    user_id UUID REFERENCES auth.users(id),
    location_id UUID,
    scope VARCHAR(20) NOT NULL,
    
    -- Cache metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    hit_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- Indexes for Performance
-- ================================================

-- Core indexes
CREATE INDEX idx_app_settings_category ON app_settings(category);
CREATE INDEX idx_app_settings_key ON app_settings(key);
CREATE INDEX idx_app_settings_scope ON app_settings(scope);
CREATE INDEX idx_app_settings_system ON app_settings(is_system_setting);
CREATE INDEX idx_app_settings_updated_at ON app_settings(updated_at);

-- User settings indexes
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX idx_user_settings_key ON user_settings(setting_key);
CREATE INDEX idx_user_settings_app_setting ON user_settings(app_setting_id);

-- Location settings indexes
CREATE INDEX idx_location_settings_location_id ON location_settings(location_id);
CREATE INDEX idx_location_settings_key ON location_settings(setting_key);
CREATE INDEX idx_location_settings_effective ON location_settings(effective_from, effective_until);

-- History indexes
CREATE INDEX idx_settings_history_setting_id ON settings_history(setting_id);
CREATE INDEX idx_settings_history_changed_by ON settings_history(changed_by);
CREATE INDEX idx_settings_history_changed_at ON settings_history(changed_at);
CREATE INDEX idx_settings_history_batch_id ON settings_history(batch_id);

-- Template indexes
CREATE INDEX idx_settings_templates_category ON settings_templates(category);
CREATE INDEX idx_settings_templates_business_types ON settings_templates USING GIN(business_types);
CREATE INDEX idx_settings_templates_active ON settings_templates(is_active);

-- Cache indexes
CREATE INDEX idx_settings_cache_expires ON settings_cache(expires_at);
CREATE INDEX idx_settings_cache_user_id ON settings_cache(user_id);
CREATE INDEX idx_settings_cache_scope ON settings_cache(scope);

-- ================================================
-- RLS (Row Level Security) Policies
-- ================================================

-- Enable RLS on all tables
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_cache ENABLE ROW LEVEL SECURITY;

-- App Settings RLS Policies
CREATE POLICY "App settings are viewable by all authenticated users"
    ON app_settings FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "System settings can only be modified by admins"
    ON app_settings FOR ALL
    TO authenticated
    USING (
        is_system_setting = false OR 
        auth.jwt() ->> 'role' = 'admin' OR
        auth.jwt() ->> 'user_role' = 'admin'
    );

-- User Settings RLS Policies
CREATE POLICY "Users can view and modify their own settings"
    ON user_settings FOR ALL
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all user settings"
    ON user_settings FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR 
        auth.jwt() ->> 'role' = 'admin'
    );

-- Location Settings RLS Policies
CREATE POLICY "Location settings viewable by location members"
    ON location_settings FOR SELECT
    TO authenticated
    USING (true); -- TODO: Add location membership check

CREATE POLICY "Location settings modifiable by managers and admins"
    ON location_settings FOR ALL
    TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('admin', 'manager')
    );

-- Settings History RLS Policies
CREATE POLICY "Settings history viewable by admins and managers"
    ON settings_history FOR SELECT
    TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('admin', 'manager') OR
        changed_by = auth.uid()
    );

-- Templates RLS Policies
CREATE POLICY "Templates viewable by all authenticated users"
    ON settings_templates FOR SELECT
    TO authenticated
    USING (is_active = true);

CREATE POLICY "Templates modifiable by admins"
    ON settings_templates FOR ALL
    TO authenticated
    USING (
        auth.jwt() ->> 'role' = 'admin' OR
        created_by = auth.uid()
    );

-- Cache RLS Policies
CREATE POLICY "Users can access their own cache entries"
    ON settings_cache FOR ALL
    TO authenticated
    USING (
        user_id = auth.uid() OR 
        user_id IS NULL OR
        auth.jwt() ->> 'role' = 'admin'
    );

-- ================================================
-- Functions for Settings Management
-- ================================================

-- Function to resolve hierarchical settings
CREATE OR REPLACE FUNCTION get_resolved_setting(
    setting_key_param VARCHAR(150),
    user_id_param UUID DEFAULT NULL,
    location_id_param UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    system_value JSONB;
    location_value JSONB;
    user_value JSONB;
BEGIN
    -- Get system default
    SELECT value INTO system_value
    FROM app_settings
    WHERE category || '.' || key = setting_key_param;
    
    -- Get location override if provided
    IF location_id_param IS NOT NULL THEN
        SELECT value INTO location_value
        FROM location_settings
        WHERE setting_key = setting_key_param
        AND location_id = location_id_param
        AND (effective_from IS NULL OR effective_from <= NOW())
        AND (effective_until IS NULL OR effective_until > NOW());
    END IF;
    
    -- Get user override if provided
    IF user_id_param IS NOT NULL THEN
        SELECT value INTO user_value
        FROM user_settings
        WHERE setting_key = setting_key_param
        AND user_id = user_id_param
        AND (expires_at IS NULL OR expires_at > NOW());
    END IF;
    
    -- Return highest priority value (user > location > system)
    result := COALESCE(user_value, location_value, system_value);
    
    RETURN result;
END;
$$;

-- Function to get all resolved settings for a user/location
CREATE OR REPLACE FUNCTION get_all_resolved_settings(
    user_id_param UUID DEFAULT NULL,
    location_id_param UUID DEFAULT NULL,
    category_filter VARCHAR(50) DEFAULT NULL
)
RETURNS TABLE(
    setting_key VARCHAR(150),
    value JSONB,
    resolution_level VARCHAR(20),
    last_updated TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH resolved_settings AS (
        -- System settings
        SELECT 
            s.category || '.' || s.key as setting_key,
            s.value,
            'system'::VARCHAR(20) as resolution_level,
            s.updated_at as last_updated
        FROM app_settings s
        WHERE (category_filter IS NULL OR s.category = category_filter)
        
        UNION ALL
        
        -- Location overrides
        SELECT 
            ls.setting_key,
            ls.value,
            'location'::VARCHAR(20) as resolution_level,
            ls.updated_at as last_updated
        FROM location_settings ls
        WHERE (location_id_param IS NULL OR ls.location_id = location_id_param)
        AND (ls.effective_from IS NULL OR ls.effective_from <= NOW())
        AND (ls.effective_until IS NULL OR ls.effective_until > NOW())
        AND (category_filter IS NULL OR split_part(ls.setting_key, '.', 1) = category_filter)
        
        UNION ALL
        
        -- User overrides
        SELECT 
            us.setting_key,
            us.value,
            'user'::VARCHAR(20) as resolution_level,
            us.updated_at as last_updated
        FROM user_settings us
        WHERE (user_id_param IS NULL OR us.user_id = user_id_param)
        AND (us.expires_at IS NULL OR us.expires_at > NOW())
        AND (category_filter IS NULL OR split_part(us.setting_key, '.', 1) = category_filter)
    )
    SELECT DISTINCT ON (rs.setting_key)
        rs.setting_key,
        rs.value,
        rs.resolution_level,
        rs.last_updated
    FROM resolved_settings rs
    ORDER BY rs.setting_key, 
             CASE rs.resolution_level
                 WHEN 'user' THEN 3
                 WHEN 'location' THEN 2
                 WHEN 'system' THEN 1
             END DESC;
END;
$$;

-- Function to validate setting value
CREATE OR REPLACE FUNCTION validate_setting_value(
    setting_key_param VARCHAR(150),
    value_param JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    setting_record RECORD;
    validation_result JSONB := '{"valid": true, "errors": []}'::JSONB;
    errors JSONB := '[]'::JSONB;
BEGIN
    -- Get setting configuration
    SELECT * INTO setting_record
    FROM app_settings
    WHERE category || '.' || key = setting_key_param;
    
    IF NOT FOUND THEN
        RETURN '{"valid": false, "errors": ["Setting not found"]}'::JSONB;
    END IF;
    
    -- Data type validation
    CASE setting_record.data_type
        WHEN 'string' THEN
            IF NOT (jsonb_typeof(value_param) = 'string') THEN
                errors := errors || '["Value must be a string"]'::JSONB;
            END IF;
        WHEN 'number' THEN
            IF NOT (jsonb_typeof(value_param) = 'number') THEN
                errors := errors || '["Value must be a number"]'::JSONB;
            END IF;
        WHEN 'boolean' THEN
            IF NOT (jsonb_typeof(value_param) = 'boolean') THEN
                errors := errors || '["Value must be a boolean"]'::JSONB;
            END IF;
        WHEN 'array' THEN
            IF NOT (jsonb_typeof(value_param) = 'array') THEN
                errors := errors || '["Value must be an array"]'::JSONB;
            END IF;
    END CASE;
    
    -- Range validation for numbers
    IF setting_record.data_type = 'number' AND jsonb_typeof(value_param) = 'number' THEN
        IF setting_record.min_value IS NOT NULL AND (value_param)::NUMERIC < setting_record.min_value THEN
            errors := errors || format('["Value must be at least %s"]', setting_record.min_value)::JSONB;
        END IF;
        IF setting_record.max_value IS NOT NULL AND (value_param)::NUMERIC > setting_record.max_value THEN
            errors := errors || format('["Value must be at most %s"]', setting_record.max_value)::JSONB;
        END IF;
    END IF;
    
    -- Enum validation
    IF setting_record.enum_values IS NOT NULL AND array_length(setting_record.enum_values, 1) > 0 THEN
        IF NOT (value_param #>> '{}' = ANY(setting_record.enum_values)) THEN
            errors := errors || format('["Value must be one of: %s"]', array_to_string(setting_record.enum_values, ', '))::JSONB;
        END IF;
    END IF;
    
    -- Build result
    IF jsonb_array_length(errors) > 0 THEN
        validation_result := jsonb_build_object('valid', false, 'errors', errors);
    END IF;
    
    RETURN validation_result;
END;
$$;

-- ================================================
-- Triggers for Audit Trail
-- ================================================

-- Function to handle settings audit trail
CREATE OR REPLACE FUNCTION handle_settings_audit()
RETURNS TRIGGER AS $$
DECLARE
    setting_key_val VARCHAR(150);
BEGIN
    -- Determine setting key based on table
    CASE TG_TABLE_NAME
        WHEN 'app_settings' THEN
            setting_key_val := COALESCE(NEW.category || '.' || NEW.key, OLD.category || '.' || OLD.key);
        WHEN 'user_settings' THEN
            setting_key_val := COALESCE(NEW.setting_key, OLD.setting_key);
        WHEN 'location_settings' THEN
            setting_key_val := COALESCE(NEW.setting_key, OLD.setting_key);
    END CASE;
    
    -- Insert audit record
    INSERT INTO settings_history (
        setting_table,
        setting_id,
        setting_key,
        old_value,
        new_value,
        change_type,
        changed_by
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        setting_key_val,
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(OLD) END,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
        TG_OP,
        COALESCE(
            CASE WHEN TG_OP = 'DELETE' THEN OLD.updated_by ELSE NEW.updated_by END,
            CASE WHEN TG_OP = 'DELETE' THEN OLD.created_by ELSE NEW.created_by END,
            auth.uid()
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers
CREATE TRIGGER app_settings_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON app_settings
    FOR EACH ROW EXECUTE FUNCTION handle_settings_audit();

CREATE TRIGGER user_settings_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION handle_settings_audit();

CREATE TRIGGER location_settings_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON location_settings
    FOR EACH ROW EXECUTE FUNCTION handle_settings_audit();

-- ================================================
-- Updated timestamp trigger
-- ================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all settings tables
CREATE TRIGGER app_settings_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER location_settings_updated_at
    BEFORE UPDATE ON location_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER settings_templates_updated_at
    BEFORE UPDATE ON settings_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ================================================
-- Grant necessary permissions
-- ================================================

-- Grant usage on functions to authenticated users
GRANT EXECUTE ON FUNCTION get_resolved_setting(VARCHAR(150), UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_resolved_settings(UUID, UUID, VARCHAR(50)) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_setting_value(VARCHAR(150), JSONB) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE app_settings IS 'Core settings registry with comprehensive validation and metadata';
COMMENT ON TABLE user_settings IS 'User-specific setting overrides with inheritance control';
COMMENT ON TABLE location_settings IS 'Location-specific overrides with scheduling support';
COMMENT ON TABLE settings_history IS 'Complete audit trail for all settings changes';
COMMENT ON TABLE settings_templates IS 'Reusable settings templates for quick setup';
COMMENT ON FUNCTION get_resolved_setting IS 'Resolves setting value with proper hierarchy (user > location > system)';
COMMENT ON FUNCTION get_all_resolved_settings IS 'Gets all resolved settings for a user/location with proper inheritance';
COMMENT ON FUNCTION validate_setting_value IS 'Validates setting value against defined constraints and rules';