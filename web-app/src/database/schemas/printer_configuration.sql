/**
 * Printer Configuration Database Schema
 * Comprehensive printer hardware profile and configuration management
 */

-- =====================================================
-- PRINTER PROFILES TABLE
-- Core printer hardware profile storage
-- =====================================================
CREATE TABLE IF NOT EXISTS printer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('thermal', 'laser', 'inkjet', 'receipt', 'label', 'dot-matrix')),
    manufacturer VARCHAR(255) NOT NULL,
    model VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Connection Configuration
    connection_type VARCHAR(50) NOT NULL CHECK (connection_type IN ('usb', 'network', 'bluetooth', 'serial')),
    connection_settings JSONB NOT NULL, -- Stores connection-specific configuration
    
    -- Hardware Capabilities (JSONB for flexibility)
    capabilities JSONB NOT NULL DEFAULT '{}',
    
    -- Default Print Settings
    default_settings JSONB NOT NULL DEFAULT '{}',
    
    -- Status and Metadata
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    
    -- Test Results (nullable - populated after testing)
    last_test_success BOOLEAN,
    last_test_message TEXT,
    last_test_response_time INTEGER, -- milliseconds
    last_test_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- Calibration Data (nullable - populated after calibration)
    calibration_data JSONB,
    calibration_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- Usage Statistics
    total_jobs INTEGER DEFAULT 0,
    successful_jobs INTEGER DEFAULT 0,
    failed_jobs INTEGER DEFAULT 0,
    last_used TIMESTAMP WITH TIME ZONE,
    average_job_time INTEGER, -- milliseconds
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_printer_name UNIQUE (name),
    CONSTRAINT valid_connection_settings CHECK (jsonb_typeof(connection_settings) = 'object'),
    CONSTRAINT valid_capabilities CHECK (jsonb_typeof(capabilities) = 'object'),
    CONSTRAINT valid_default_settings CHECK (jsonb_typeof(default_settings) = 'object'),
    CONSTRAINT valid_usage_stats CHECK (
        total_jobs >= 0 AND 
        successful_jobs >= 0 AND 
        failed_jobs >= 0 AND
        successful_jobs + failed_jobs <= total_jobs
    )
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_printer_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER printer_profiles_updated_at
    BEFORE UPDATE ON printer_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_printer_profiles_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_printer_profiles_type ON printer_profiles(type);
CREATE INDEX IF NOT EXISTS idx_printer_profiles_connection_type ON printer_profiles(connection_type);
CREATE INDEX IF NOT EXISTS idx_printer_profiles_active ON printer_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_printer_profiles_default ON printer_profiles(is_default);
CREATE INDEX IF NOT EXISTS idx_printer_profiles_last_used ON printer_profiles(last_used);

-- =====================================================
-- PRINT SETTINGS TABLE
-- Application-wide printing configuration
-- =====================================================
CREATE TABLE IF NOT EXISTS print_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL DEFAULT 'system',
    
    -- Auto-print Configuration
    auto_print_entry BOOLEAN DEFAULT true,
    auto_print_exit BOOLEAN DEFAULT true,
    auto_print_reports BOOLEAN DEFAULT false,
    
    -- Default Print Preferences
    default_copies INTEGER DEFAULT 1 CHECK (default_copies >= 1 AND default_copies <= 10),
    show_print_preview BOOLEAN DEFAULT true,
    confirm_before_print BOOLEAN DEFAULT false,
    
    -- Printer Management
    default_printer_id UUID REFERENCES printer_profiles(id) ON DELETE SET NULL,
    fallback_printer_id UUID REFERENCES printer_profiles(id) ON DELETE SET NULL,
    
    -- Queue Management
    print_queue_enabled BOOLEAN DEFAULT true,
    max_queue_size INTEGER DEFAULT 100 CHECK (max_queue_size >= 1 AND max_queue_size <= 1000),
    queue_timeout_minutes INTEGER DEFAULT 60 CHECK (queue_timeout_minutes >= 1 AND queue_timeout_minutes <= 1440),
    
    -- Error Handling
    retry_failed_prints BOOLEAN DEFAULT true,
    max_retry_attempts INTEGER DEFAULT 3 CHECK (max_retry_attempts >= 1 AND max_retry_attempts <= 10),
    retry_delay_seconds INTEGER DEFAULT 5 CHECK (retry_delay_seconds >= 1 AND retry_delay_seconds <= 300),
    notify_on_failure BOOLEAN DEFAULT true,
    
    -- Performance Configuration
    background_printing BOOLEAN DEFAULT true,
    batch_printing_enabled BOOLEAN DEFAULT false,
    max_concurrent_jobs INTEGER DEFAULT 3 CHECK (max_concurrent_jobs >= 1 AND max_concurrent_jobs <= 20),
    
    -- Quality Settings
    default_print_quality VARCHAR(50) DEFAULT 'normal' CHECK (default_print_quality IN ('draft', 'normal', 'high', 'best')),
    enable_calibration BOOLEAN DEFAULT true,
    auto_calibration BOOLEAN DEFAULT false,
    
    -- Security Configuration
    require_auth_to_print BOOLEAN DEFAULT false,
    audit_print_jobs BOOLEAN DEFAULT true,
    restrict_printer_access BOOLEAN DEFAULT false,
    
    -- Thermal Printer Specific Settings
    enable_thermal_printing BOOLEAN DEFAULT true,
    default_paper_width VARCHAR(50) DEFAULT 'thermal-2.75' CHECK (default_paper_width IN ('thermal-2.75', 'thermal-3', 'thermal-4')),
    auto_cut_enabled BOOLEAN DEFAULT true,
    print_test_page_on_connect BOOLEAN DEFAULT true,
    
    -- Connection & Discovery Settings
    auto_discover_printers BOOLEAN DEFAULT true,
    connection_timeout_ms INTEGER DEFAULT 5000 CHECK (connection_timeout_ms >= 1000 AND connection_timeout_ms <= 60000),
    enable_printer_status_monitoring BOOLEAN DEFAULT true,
    status_check_interval_ms INTEGER DEFAULT 10000 CHECK (status_check_interval_ms >= 1000 AND status_check_interval_ms <= 300000),
    
    -- Ticket Formatting
    print_duplicate_tickets BOOLEAN DEFAULT false,
    include_qr_codes BOOLEAN DEFAULT true,
    business_logo_enabled BOOLEAN DEFAULT true,
    ticket_footer_text TEXT DEFAULT 'Thank you for parking with us!',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure only one print_settings record exists
    CONSTRAINT single_print_settings CHECK (category = 'system')
);

-- Create updated_at trigger for print_settings
CREATE TRIGGER print_settings_updated_at
    BEFORE UPDATE ON print_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_printer_profiles_updated_at();

-- Ensure only one print_settings record
CREATE UNIQUE INDEX IF NOT EXISTS idx_print_settings_unique ON print_settings(category);

-- =====================================================
-- LOCATION PRINTER ASSIGNMENTS TABLE
-- Maps printers to specific parking locations
-- =====================================================
CREATE TABLE IF NOT EXISTS location_printer_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id INTEGER NOT NULL, -- References parking locations
    printer_profile_id UUID NOT NULL REFERENCES printer_profiles(id) ON DELETE CASCADE,
    assignment_type VARCHAR(50) NOT NULL CHECK (assignment_type IN ('entry', 'exit', 'receipt', 'label', 'report')),
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Assignment metadata
    priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 10),
    backup_printer_id UUID REFERENCES printer_profiles(id) ON DELETE SET NULL,
    
    -- Usage tracking
    jobs_printed INTEGER DEFAULT 0,
    last_job_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_location_assignment UNIQUE (location_id, assignment_type, is_primary),
    CONSTRAINT no_self_backup CHECK (printer_profile_id != backup_printer_id)
);

-- Create updated_at trigger for location_printer_assignments
CREATE TRIGGER location_printer_assignments_updated_at
    BEFORE UPDATE ON location_printer_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_printer_profiles_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_location_assignments_location ON location_printer_assignments(location_id);
CREATE INDEX IF NOT EXISTS idx_location_assignments_printer ON location_printer_assignments(printer_profile_id);
CREATE INDEX IF NOT EXISTS idx_location_assignments_type ON location_printer_assignments(assignment_type);
CREATE INDEX IF NOT EXISTS idx_location_assignments_active ON location_printer_assignments(is_active);

-- =====================================================
-- PRINT JOBS TABLE
-- Track all print jobs and their status
-- =====================================================
CREATE TABLE IF NOT EXISTS print_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    printer_profile_id UUID NOT NULL REFERENCES printer_profiles(id) ON DELETE CASCADE,
    location_assignment_id UUID REFERENCES location_printer_assignments(id) ON DELETE SET NULL,
    
    -- Job Details
    document_type VARCHAR(100) NOT NULL CHECK (document_type IN ('entry_ticket', 'exit_receipt', 'daily_report', 'custom')),
    job_data JSONB NOT NULL, -- Flexible storage for print job data
    print_settings JSONB NOT NULL DEFAULT '{}', -- Override settings for this job
    
    -- Status and Processing
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'printing', 'completed', 'failed', 'cancelled')),
    priority VARCHAR(50) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Retry Logic
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    
    -- Performance Metrics
    queue_time INTEGER, -- milliseconds from creation to start
    print_time INTEGER, -- milliseconds to complete printing
    total_time INTEGER, -- milliseconds from creation to completion
    
    -- User Context
    user_id UUID, -- References users table if authentication enabled
    session_id VARCHAR(255),
    ip_address INET,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_job_data CHECK (jsonb_typeof(job_data) = 'object'),
    CONSTRAINT valid_print_settings CHECK (jsonb_typeof(print_settings) = 'object'),
    CONSTRAINT valid_attempts CHECK (attempts >= 0 AND attempts <= max_attempts),
    CONSTRAINT valid_timestamps CHECK (
        (started_at IS NULL OR started_at >= created_at) AND
        (completed_at IS NULL OR (started_at IS NOT NULL AND completed_at >= started_at))
    )
);

-- Indexes for print jobs
CREATE INDEX IF NOT EXISTS idx_print_jobs_printer ON print_jobs(printer_profile_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);
CREATE INDEX IF NOT EXISTS idx_print_jobs_priority ON print_jobs(priority);
CREATE INDEX IF NOT EXISTS idx_print_jobs_created_at ON print_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_print_jobs_document_type ON print_jobs(document_type);
CREATE INDEX IF NOT EXISTS idx_print_jobs_user ON print_jobs(user_id);

-- =====================================================
-- PRINT QUEUES TABLE
-- Manage print queues per printer
-- =====================================================
CREATE TABLE IF NOT EXISTS print_queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    printer_profile_id UUID NOT NULL REFERENCES printer_profiles(id) ON DELETE CASCADE,
    
    -- Queue Status
    is_processing BOOLEAN DEFAULT false,
    is_paused BOOLEAN DEFAULT false,
    
    -- Performance Metrics
    jobs_processed INTEGER DEFAULT 0,
    processing_speed DECIMAL(5,2), -- jobs per minute
    average_job_time INTEGER, -- milliseconds
    
    -- Queue Management
    max_size INTEGER DEFAULT 100,
    current_size INTEGER DEFAULT 0,
    
    -- Timestamps
    last_processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_printer_queue UNIQUE (printer_profile_id),
    CONSTRAINT valid_queue_sizes CHECK (current_size >= 0 AND current_size <= max_size),
    CONSTRAINT valid_processing_metrics CHECK (
        jobs_processed >= 0 AND
        (processing_speed IS NULL OR processing_speed >= 0) AND
        (average_job_time IS NULL OR average_job_time >= 0)
    )
);

-- Create updated_at trigger for print_queues
CREATE TRIGGER print_queues_updated_at
    BEFORE UPDATE ON print_queues
    FOR EACH ROW
    EXECUTE FUNCTION update_printer_profiles_updated_at();

-- =====================================================
-- PRINTER DISCOVERY LOG TABLE
-- Track printer discovery events and results
-- =====================================================
CREATE TABLE IF NOT EXISTS printer_discovery_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discovery_type VARCHAR(50) NOT NULL CHECK (discovery_type IN ('usb', 'network', 'bluetooth', 'serial', 'system')),
    
    -- Discovery Results
    printers_found INTEGER DEFAULT 0,
    discovery_data JSONB, -- Store discovered printer details
    
    -- Performance Metrics
    discovery_time INTEGER NOT NULL, -- milliseconds
    success BOOLEAN NOT NULL,
    error_message TEXT,
    
    -- Network Discovery Specific
    ip_range VARCHAR(50), -- For network discovery
    scan_ports INTEGER[], -- For network discovery
    
    -- System Context
    user_id UUID,
    session_id VARCHAR(255),
    
    -- Timestamp
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_discovery_data CHECK (discovery_data IS NULL OR jsonb_typeof(discovery_data) = 'object'),
    CONSTRAINT valid_discovery_time CHECK (discovery_time >= 0)
);

-- Indexes for discovery log
CREATE INDEX IF NOT EXISTS idx_discovery_log_type ON printer_discovery_log(discovery_type);
CREATE INDEX IF NOT EXISTS idx_discovery_log_timestamp ON printer_discovery_log(discovered_at);
CREATE INDEX IF NOT EXISTS idx_discovery_log_success ON printer_discovery_log(success);

-- =====================================================
-- PRINTER STATUS LOG TABLE
-- Monitor printer health and connectivity
-- =====================================================
CREATE TABLE IF NOT EXISTS printer_status_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    printer_profile_id UUID NOT NULL REFERENCES printer_profiles(id) ON DELETE CASCADE,
    
    -- Status Information
    status VARCHAR(50) NOT NULL CHECK (status IN ('online', 'offline', 'error', 'busy', 'idle', 'unknown')),
    is_online BOOLEAN NOT NULL,
    response_time INTEGER, -- milliseconds
    
    -- Error Details
    error_code VARCHAR(50),
    error_message TEXT,
    
    -- Hardware Status
    paper_level VARCHAR(20) CHECK (paper_level IN ('full', 'medium', 'low', 'empty', 'unknown')),
    ink_level VARCHAR(20) CHECK (ink_level IN ('full', 'medium', 'low', 'empty', 'unknown')),
    temperature INTEGER, -- For thermal printers
    
    -- Performance Metrics
    jobs_in_queue INTEGER DEFAULT 0,
    current_job_id UUID REFERENCES print_jobs(id) ON DELETE SET NULL,
    
    -- Timestamp
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_response_time CHECK (response_time IS NULL OR response_time >= 0),
    CONSTRAINT valid_jobs_in_queue CHECK (jobs_in_queue >= 0)
);

-- Indexes for status log
CREATE INDEX IF NOT EXISTS idx_status_log_printer ON printer_status_log(printer_profile_id);
CREATE INDEX IF NOT EXISTS idx_status_log_timestamp ON printer_status_log(checked_at);
CREATE INDEX IF NOT EXISTS idx_status_log_status ON printer_status_log(status);
CREATE INDEX IF NOT EXISTS idx_status_log_online ON printer_status_log(is_online);

-- =====================================================
-- PRINTER CALIBRATION HISTORY TABLE
-- Track calibration events and results
-- =====================================================
CREATE TABLE IF NOT EXISTS printer_calibration_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    printer_profile_id UUID NOT NULL REFERENCES printer_profiles(id) ON DELETE CASCADE,
    
    -- Calibration Results
    success BOOLEAN NOT NULL,
    adjustments JSONB NOT NULL DEFAULT '{}',
    test_print_quality VARCHAR(20) CHECK (test_print_quality IN ('excellent', 'good', 'fair', 'poor')),
    recommendations TEXT[],
    
    -- Performance Metrics
    calibration_time INTEGER NOT NULL, -- milliseconds
    test_prints_used INTEGER DEFAULT 1,
    
    -- Before/After Comparison
    before_settings JSONB,
    after_settings JSONB,
    
    -- User Context
    user_id UUID,
    calibration_type VARCHAR(50) DEFAULT 'manual' CHECK (calibration_type IN ('manual', 'automatic', 'scheduled')),
    
    -- Timestamp
    calibrated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_adjustments CHECK (jsonb_typeof(adjustments) = 'object'),
    CONSTRAINT valid_calibration_time CHECK (calibration_time >= 0),
    CONSTRAINT valid_test_prints CHECK (test_prints_used >= 0)
);

-- Indexes for calibration history
CREATE INDEX IF NOT EXISTS idx_calibration_history_printer ON printer_calibration_history(printer_profile_id);
CREATE INDEX IF NOT EXISTS idx_calibration_history_timestamp ON printer_calibration_history(calibrated_at);
CREATE INDEX IF NOT EXISTS idx_calibration_history_success ON printer_calibration_history(success);

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- Active Printers with Latest Status
CREATE OR REPLACE VIEW active_printers_with_status AS
SELECT 
    pp.*,
    psl.status as current_status,
    psl.is_online,
    psl.response_time as last_response_time,
    psl.paper_level,
    psl.ink_level,
    psl.checked_at as status_last_checked,
    pq.current_size as queue_size,
    pq.is_processing as queue_processing
FROM printer_profiles pp
LEFT JOIN LATERAL (
    SELECT * FROM printer_status_log 
    WHERE printer_profile_id = pp.id 
    ORDER BY checked_at DESC 
    LIMIT 1
) psl ON true
LEFT JOIN print_queues pq ON pq.printer_profile_id = pp.id
WHERE pp.is_active = true;

-- Location Printer Assignments with Details
CREATE OR REPLACE VIEW location_printer_details AS
SELECT 
    lpa.*,
    pp.name as printer_name,
    pp.type as printer_type,
    pp.manufacturer,
    pp.model,
    pp.is_active as printer_active,
    pp.last_test_success,
    bp.name as backup_printer_name
FROM location_printer_assignments lpa
JOIN printer_profiles pp ON pp.id = lpa.printer_profile_id
LEFT JOIN printer_profiles bp ON bp.id = lpa.backup_printer_id
WHERE lpa.is_active = true;

-- Print Job Statistics
CREATE OR REPLACE VIEW print_job_statistics AS
SELECT 
    printer_profile_id,
    COUNT(*) as total_jobs,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_jobs,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_jobs,
    AVG(print_time) as avg_print_time,
    AVG(total_time) as avg_total_time,
    MAX(created_at) as last_job_time
FROM print_jobs
GROUP BY printer_profile_id;

-- =====================================================
-- TRIGGERS FOR DATA INTEGRITY
-- =====================================================

-- Update printer statistics when print jobs change
CREATE OR REPLACE FUNCTION update_printer_job_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update printer profile usage statistics
    UPDATE printer_profiles 
    SET 
        total_jobs = COALESCE((SELECT total_jobs FROM print_job_statistics WHERE printer_profile_id = NEW.printer_profile_id), 0),
        successful_jobs = COALESCE((SELECT successful_jobs FROM print_job_statistics WHERE printer_profile_id = NEW.printer_profile_id), 0),
        failed_jobs = COALESCE((SELECT failed_jobs FROM print_job_statistics WHERE printer_profile_id = NEW.printer_profile_id), 0),
        last_used = CASE 
            WHEN NEW.status = 'completed' THEN NEW.completed_at 
            ELSE last_used 
        END,
        average_job_time = COALESCE((SELECT avg_print_time FROM print_job_statistics WHERE printer_profile_id = NEW.printer_profile_id), 0)
    WHERE id = NEW.printer_profile_id;
    
    -- Update queue current size
    UPDATE print_queues 
    SET current_size = (
        SELECT COUNT(*) 
        FROM print_jobs 
        WHERE printer_profile_id = NEW.printer_profile_id 
        AND status IN ('pending', 'printing')
    )
    WHERE printer_profile_id = NEW.printer_profile_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_printer_statistics
    AFTER INSERT OR UPDATE ON print_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_printer_job_statistics();

-- Ensure only one default printer
CREATE OR REPLACE FUNCTION enforce_single_default_printer()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE printer_profiles 
        SET is_default = false 
        WHERE id != NEW.id AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_single_default
    AFTER INSERT OR UPDATE ON printer_profiles
    FOR EACH ROW
    WHEN (NEW.is_default = true)
    EXECUTE FUNCTION enforce_single_default_printer();

-- =====================================================
-- SAMPLE DATA AND CONFIGURATION
-- =====================================================

-- Insert default print settings if none exist
INSERT INTO print_settings (category) 
SELECT 'system'
WHERE NOT EXISTS (SELECT 1 FROM print_settings WHERE category = 'system');

-- Example printer profiles (commented out - uncomment to create sample data)
/*
-- Sample Thermal Printer
INSERT INTO printer_profiles (
    name, type, manufacturer, model, description,
    connection_type, connection_settings,
    capabilities, default_settings,
    is_default
) VALUES (
    'Main Thermal Printer', 'thermal', 'Epson', 'TM-T20III', 'Main entry gate thermal printer',
    'usb',
    '{"vendorId": 1208, "productId": 514, "timeout": 5000}',
    '{"maxWidth": 70, "maxHeight": 2000, "resolution": 203, "colorSupport": false, "paperSizes": ["thermal-2.75"], "commandSet": "ESC/POS", "cutterSupport": true}',
    '{"paperSize": "thermal-2.75", "copies": 1, "density": 5, "speed": "normal"}',
    true
);

-- Sample Network Printer
INSERT INTO printer_profiles (
    name, type, manufacturer, model, description,
    connection_type, connection_settings,
    capabilities, default_settings
) VALUES (
    'Office Receipt Printer', 'receipt', 'Star Micronics', 'TSP143IIIU', 'Office receipt printer',
    'network',
    '{"ipAddress": "192.168.1.100", "port": 9100, "protocol": "socket", "timeout": 3000}',
    '{"maxWidth": 80, "maxHeight": 2000, "resolution": 203, "colorSupport": false, "paperSizes": ["thermal-3"], "commandSet": "ESC/POS"}',
    '{"paperSize": "thermal-3", "copies": 1, "density": 4, "speed": "fast"}'
);
*/

-- =====================================================
-- DATABASE FUNCTIONS FOR PRINTER MANAGEMENT
-- =====================================================

-- Function to get printer by location and assignment type
CREATE OR REPLACE FUNCTION get_location_printer(
    p_location_id INTEGER,
    p_assignment_type VARCHAR(50)
) RETURNS TABLE (
    printer_id UUID,
    printer_name VARCHAR(255),
    connection_type VARCHAR(50),
    connection_settings JSONB,
    is_online BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pp.id,
        pp.name,
        pp.connection_type,
        pp.connection_settings,
        COALESCE(psl.is_online, false)
    FROM location_printer_assignments lpa
    JOIN printer_profiles pp ON pp.id = lpa.printer_profile_id
    LEFT JOIN LATERAL (
        SELECT is_online
        FROM printer_status_log 
        WHERE printer_profile_id = pp.id 
        ORDER BY checked_at DESC 
        LIMIT 1
    ) psl ON true
    WHERE lpa.location_id = p_location_id 
    AND lpa.assignment_type = p_assignment_type
    AND lpa.is_active = true
    AND pp.is_active = true
    ORDER BY lpa.is_primary DESC, lpa.priority ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to update printer status
CREATE OR REPLACE FUNCTION update_printer_status(
    p_printer_id UUID,
    p_status VARCHAR(50),
    p_is_online BOOLEAN,
    p_response_time INTEGER DEFAULT NULL,
    p_error_code VARCHAR(50) DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO printer_status_log (
        printer_profile_id, status, is_online, response_time, 
        error_code, error_message
    ) VALUES (
        p_printer_id, p_status, p_is_online, p_response_time,
        p_error_code, p_error_message
    );
    
    -- Cleanup old status entries (keep last 100 per printer)
    DELETE FROM printer_status_log 
    WHERE printer_profile_id = p_printer_id 
    AND id NOT IN (
        SELECT id FROM printer_status_log 
        WHERE printer_profile_id = p_printer_id 
        ORDER BY checked_at DESC 
        LIMIT 100
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PERFORMANCE OPTIMIZATION
-- =====================================================

-- Partition print_jobs by month for better performance
-- (Uncomment if dealing with high volume of print jobs)
/*
CREATE TABLE print_jobs_template (LIKE print_jobs INCLUDING ALL);
ALTER TABLE print_jobs_template DROP CONSTRAINT print_jobs_template_pkey;
*/

-- Cleanup functions for maintenance
CREATE OR REPLACE FUNCTION cleanup_old_print_jobs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete completed print jobs older than 90 days
    DELETE FROM print_jobs 
    WHERE status = 'completed' 
    AND completed_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete failed print jobs older than 30 days
    DELETE FROM print_jobs 
    WHERE status = 'failed' 
    AND created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SECURITY POLICIES
-- =====================================================

-- Row Level Security (RLS) policies can be added here
-- Example for multi-tenant scenarios:
/*
ALTER TABLE printer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_printer_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY printer_profiles_policy ON printer_profiles
    FOR ALL USING (organization_id = current_setting('app.current_organization_id')::UUID);
*/