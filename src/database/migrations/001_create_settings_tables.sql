-- ================================================
-- Settings Database Architecture Migration
-- Complete multi-level settings system with audit trail
-- ================================================

-- Enable UUID extension for better primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- Core Settings Tables
-- ================================================

-- Main settings registry with comprehensive metadata
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
    validation_rules JSONB, -- JSON schema for validation
    enum_values TEXT[], -- For enum type settings
    
    -- Constraints
    min_value NUMERIC,
    max_value NUMERIC,
    min_length INTEGER,
    max_length INTEGER,
    pattern VARCHAR(500), -- Regex pattern for string validation
    
    -- Metadata
    scope VARCHAR(20) NOT NULL DEFAULT 'system' CHECK (scope IN ('system', 'location', 'user')),
    is_system_setting BOOLEAN DEFAULT false,
    requires_restart BOOLEAN DEFAULT false,
    is_sensitive BOOLEAN DEFAULT false, -- For passwords, API keys
    is_readonly BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    category_group VARCHAR(50),
    
    -- Feature flags
    feature_flag VARCHAR(100), -- Associated feature flag if any
    environment_specific BOOLEAN DEFAULT false, -- Different values per environment
    
    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    version INTEGER DEFAULT 1,
    
    -- Constraints
    UNIQUE(category, key),
    
    -- Index for performance
    CHECK (category != '' AND key != '')
);

-- User-specific setting overrides with inheritance
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    setting_key VARCHAR(150) NOT NULL, -- category.key format
    value JSONB NOT NULL,
    
    -- Metadata
    app_setting_id UUID REFERENCES app_settings(id) ON DELETE CASCADE,
    inherit_from_location BOOLEAN DEFAULT true,
    is_temporary BOOLEAN DEFAULT false, -- Session-only settings
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(user_id, setting_key)
);

-- Location-specific setting overrides
CREATE TABLE location_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL,
    setting_key VARCHAR(150) NOT NULL,
    value JSONB NOT NULL,
    
    -- Metadata
    app_setting_id UUID REFERENCES app_settings(id) ON DELETE CASCADE,
    inherit_from_system BOOLEAN DEFAULT true,
    applies_to_users BOOLEAN DEFAULT true, -- If users inherit this
    
    -- Scheduling
    effective_from TIMESTAMP WITH TIME ZONE,
    effective_until TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    
    UNIQUE(location_id, setting_key)
);

-- ================================================
-- Audit and History Tables
-- ================================================

-- Comprehensive change audit trail
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
    changed_by UUID NOT NULL,
    change_reason TEXT,
    change_context JSONB, -- Additional context like IP, user agent, etc.
    batch_id UUID, -- For grouping related changes
    
    -- Source tracking
    source_ip INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    
    -- Timestamp
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Settings templates for quick setup
CREATE TABLE settings_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- Can be NULL for multi-category templates
    
    -- Template data
    template_data JSONB NOT NULL, -- Full settings object
    preview_data JSONB, -- Subset for preview
    
    -- Classification
    is_default BOOLEAN DEFAULT false,
    is_system_template BOOLEAN DEFAULT false,
    business_types TEXT[], -- Applicable business types
    user_roles TEXT[], -- Who can use this template
    
    -- Versioning
    version INTEGER DEFAULT 1,
    parent_template_id UUID REFERENCES settings_templates(id),
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    usage_count INTEGER DEFAULT 0,
    
    UNIQUE(name, version)
);

-- ================================================
-- Settings Cache and Performance Tables
-- ================================================

-- Materialized cache for frequently accessed settings
CREATE TABLE settings_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_key VARCHAR(200) NOT NULL UNIQUE,
    cache_value JSONB NOT NULL,
    
    -- Scope and context
    user_id UUID,
    location_id UUID,
    scope VARCHAR(20) NOT NULL,
    
    -- Cache metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    hit_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Index for cleanup
    INDEX idx_settings_cache_expires ON settings_cache(expires_at)
);

-- Settings validation results cache
CREATE TABLE settings_validation_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(150) NOT NULL,
    setting_value_hash VARCHAR(64) NOT NULL, -- SHA256 of value
    validation_result JSONB NOT NULL,
    is_valid BOOLEAN NOT NULL,
    validation_errors JSONB,
    
    -- Performance
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    UNIQUE(setting_key, setting_value_hash)
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

-- ================================================
-- Triggers for Audit Trail
-- ================================================

-- Function to handle settings audit trail
CREATE OR REPLACE FUNCTION handle_settings_audit()
RETURNS TRIGGER AS $$
DECLARE
    setting_key_val VARCHAR(150);
    batch_uuid UUID;
BEGIN
    -- Generate batch ID for related changes
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        batch_uuid := COALESCE(
            current_setting('app.current_batch_id')::UUID,
            uuid_generate_v4()
        );
    END IF;
    
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
        changed_by,
        batch_id,
        source_ip,
        user_agent
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        setting_key_val,
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(OLD) END,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
        TG_OP,
        COALESCE(
            current_setting('app.current_user_id')::UUID,
            COALESCE(NEW.updated_by, OLD.updated_by),
            COALESCE(NEW.created_by, OLD.created_by)
        ),
        batch_uuid,
        inet(current_setting('app.client_ip')),
        current_setting('app.user_agent')
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to all settings tables
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
-- Updated timestamp triggers
-- ================================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all settings tables
CREATE TRIGGER app_settings_update_timestamp
    BEFORE UPDATE ON app_settings
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER user_settings_update_timestamp
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER location_settings_update_timestamp
    BEFORE UPDATE ON location_settings
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER settings_templates_update_timestamp
    BEFORE UPDATE ON settings_templates
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ================================================
-- Views for Common Queries
-- ================================================

-- Hierarchical settings resolution view
CREATE VIEW settings_resolved AS
WITH RECURSIVE setting_hierarchy AS (
    -- System settings (base level)
    SELECT 
        s.id,
        s.category,
        s.key,
        s.category || '.' || s.key as full_key,
        s.value,
        s.data_type,
        s.scope,
        'system' as resolution_level,
        s.updated_at,
        NULL::UUID as user_id,
        NULL::UUID as location_id,
        1 as priority
    FROM app_settings s
    WHERE s.scope IN ('system', 'location', 'user')
    
    UNION ALL
    
    -- Location overrides
    SELECT 
        s.id,
        s.category,
        s.key,
        s.full_key,
        COALESCE(ls.value, s.value) as value,
        s.data_type,
        s.scope,
        CASE WHEN ls.value IS NOT NULL THEN 'location' ELSE s.resolution_level END,
        GREATEST(s.updated_at, COALESCE(ls.updated_at, s.updated_at)),
        NULL::UUID as user_id,
        ls.location_id,
        CASE WHEN ls.value IS NOT NULL THEN 2 ELSE s.priority END
    FROM setting_hierarchy s
    LEFT JOIN location_settings ls ON ls.setting_key = s.full_key
    WHERE s.resolution_level = 'system'
    
    UNION ALL
    
    -- User overrides
    SELECT 
        s.id,
        s.category,
        s.key,
        s.full_key,
        COALESCE(us.value, s.value) as value,
        s.data_type,
        s.scope,
        CASE WHEN us.value IS NOT NULL THEN 'user' ELSE s.resolution_level END,
        GREATEST(s.updated_at, COALESCE(us.updated_at, s.updated_at)),
        us.user_id,
        s.location_id,
        CASE WHEN us.value IS NOT NULL THEN 3 ELSE s.priority END
    FROM setting_hierarchy s
    LEFT JOIN user_settings us ON us.setting_key = s.full_key
    WHERE s.resolution_level IN ('system', 'location')
)
SELECT DISTINCT ON (full_key, user_id, location_id)
    id,
    category,
    key,
    full_key,
    value,
    data_type,
    scope,
    resolution_level,
    updated_at,
    user_id,
    location_id,
    priority
FROM setting_hierarchy
ORDER BY full_key, user_id, location_id, priority DESC;

-- Settings with validation status
CREATE VIEW settings_with_validation AS
SELECT 
    s.*,
    vc.is_valid,
    vc.validation_errors,
    vc.created_at as last_validated
FROM app_settings s
LEFT JOIN settings_validation_cache vc ON vc.setting_key = s.category || '.' || s.key
    AND vc.setting_value_hash = encode(sha256(s.value::text::bytea), 'hex')
    AND vc.expires_at > CURRENT_TIMESTAMP;

-- COMMENT ON SCHEMA
COMMENT ON TABLE app_settings IS 'Core settings registry with comprehensive validation and metadata';
COMMENT ON TABLE user_settings IS 'User-specific setting overrides with inheritance control';
COMMENT ON TABLE location_settings IS 'Location-specific overrides with scheduling support';
COMMENT ON TABLE settings_history IS 'Complete audit trail for all settings changes';
COMMENT ON TABLE settings_templates IS 'Reusable settings templates for quick setup';
COMMENT ON TABLE settings_cache IS 'Materialized cache for performance optimization';
COMMENT ON VIEW settings_resolved IS 'Hierarchical settings resolution with proper inheritance';