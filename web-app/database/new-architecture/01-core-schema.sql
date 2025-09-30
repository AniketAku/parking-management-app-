-- ================================================
-- NEW SIMPLIFIED DATABASE ARCHITECTURE
-- Parking Management System - Robust & Maintainable
-- ================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- CORE TABLES
-- ================================================

-- Users table with clear roles and proper structure
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- bcrypt hash
    role VARCHAR(20) NOT NULL DEFAULT 'operator' 
        CHECK (role IN ('admin', 'operator', 'viewer')),
    full_name VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_approved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- Simple, effective settings table (replaces complex settings hierarchy)
CREATE TABLE app_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false, -- Prevents accidental deletion
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    UNIQUE(category, key)
);

-- Core parking business data
CREATE TABLE parking_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Vehicle Information
    transport_name VARCHAR(100) NOT NULL,
    vehicle_type VARCHAR(20) NOT NULL 
        CHECK (vehicle_type IN ('Trailer', '6 Wheeler', '4 Wheeler', '2 Wheeler')),
    vehicle_number VARCHAR(20) NOT NULL,
    driver_name VARCHAR(100) NOT NULL,
    notes TEXT,
    
    -- Timing
    entry_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    exit_time TIMESTAMPTZ,
    
    -- Status Tracking
    status VARCHAR(20) NOT NULL DEFAULT 'Active' 
        CHECK (status IN ('Active', 'Exited', 'Overstay')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'Pending' 
        CHECK (payment_status IN ('Paid', 'Pending', 'Partial', 'Failed')),
    
    -- Financial
    calculated_fee DECIMAL(10,2),
    actual_fee DECIMAL(10,2),
    payment_method VARCHAR(20),
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Optional: Simple audit log for important changes
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(10) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- ================================================
-- INDEXES FOR PERFORMANCE
-- ================================================

-- User indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active, is_approved);

-- Config indexes
CREATE INDEX idx_app_config_category ON app_config(category);
CREATE INDEX idx_app_config_key ON app_config(key);
CREATE INDEX idx_app_config_category_key ON app_config(category, key);
CREATE INDEX idx_app_config_updated_at ON app_config(updated_at);

-- Parking entries indexes
CREATE INDEX idx_parking_entries_vehicle_number ON parking_entries(vehicle_number);
CREATE INDEX idx_parking_entries_status ON parking_entries(status);
CREATE INDEX idx_parking_entries_payment_status ON parking_entries(payment_status);
CREATE INDEX idx_parking_entries_entry_time ON parking_entries(entry_time);
CREATE INDEX idx_parking_entries_vehicle_type ON parking_entries(vehicle_type);
CREATE INDEX idx_parking_entries_transport_name ON parking_entries(transport_name);

-- Audit log indexes
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- ================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_config_updated_at 
    BEFORE UPDATE ON app_config 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parking_entries_updated_at 
    BEFORE UPDATE ON parking_entries 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- ENABLE ROW LEVEL SECURITY
-- ================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;