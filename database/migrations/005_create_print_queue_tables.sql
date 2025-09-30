-- Print Queue System Database Schema
-- Create tables for print job management and printer configuration

-- =============================================
-- PRINT JOBS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS print_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id TEXT NOT NULL,
    ticket_type VARCHAR(20) NOT NULL CHECK (ticket_type IN ('entry', 'exit', 'receipt', 'thermal')),
    ticket_data JSONB NOT NULL,
    printer_profile_id UUID REFERENCES printer_profiles(id),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
    copies INTEGER DEFAULT 1 CHECK (copies > 0 AND copies <= 10),
    status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'printing', 'completed', 'failed', 'retrying', 'cancelled')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    retry_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    printed_at TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- PRINTER PROFILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS printer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('standard', 'thermal', 'receipt')),
    paper_size VARCHAR(20) NOT NULL,
    connection_type VARCHAR(20) NOT NULL CHECK (connection_type IN ('usb', 'network', 'bluetooth')),
    device_path TEXT,
    ip_address INET,
    port INTEGER,
    is_default BOOLEAN DEFAULT FALSE,
    is_online BOOLEAN DEFAULT TRUE,
    capabilities JSONB NOT NULL DEFAULT '{}'::JSONB,
    settings JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_default_printer_per_type UNIQUE NULLS NOT DISTINCT (type, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- =============================================
-- PRINT STATISTICS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS print_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    printer_profile_id UUID REFERENCES printer_profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_jobs INTEGER DEFAULT 0,
    successful_jobs INTEGER DEFAULT 0,
    failed_jobs INTEGER DEFAULT 0,
    cancelled_jobs INTEGER DEFAULT 0,
    total_print_time_seconds INTEGER DEFAULT 0,
    average_queue_wait_seconds DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(printer_profile_id, date)
);

-- =============================================
-- PRINT JOB HISTORY TABLE (for archiving)
-- =============================================
CREATE TABLE IF NOT EXISTS print_job_history (
    id UUID PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    ticket_type VARCHAR(20) NOT NULL,
    printer_profile_id UUID,
    printer_name VARCHAR(255),
    priority VARCHAR(20),
    copies INTEGER,
    status VARCHAR(20) NOT NULL,
    attempts INTEGER,
    error_message TEXT,
    processing_time_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Print jobs queue processing
CREATE INDEX IF NOT EXISTS idx_print_jobs_queue 
ON print_jobs(status, priority DESC, created_at ASC) 
WHERE status IN ('queued', 'retrying');

-- Print jobs by ticket
CREATE INDEX IF NOT EXISTS idx_print_jobs_ticket 
ON print_jobs(ticket_id, created_at DESC);

-- Print jobs by status and date
CREATE INDEX IF NOT EXISTS idx_print_jobs_status_date 
ON print_jobs(status, created_at DESC);

-- Print jobs retry scheduling
CREATE INDEX IF NOT EXISTS idx_print_jobs_retry 
ON print_jobs(retry_at) 
WHERE status = 'retrying' AND retry_at IS NOT NULL;

-- Printer profiles lookup
CREATE INDEX IF NOT EXISTS idx_printer_profiles_type_default 
ON printer_profiles(type, is_default, is_online);

-- Statistics lookup
CREATE INDEX IF NOT EXISTS idx_print_statistics_date 
ON print_statistics(date DESC, printer_profile_id);

-- History search
CREATE INDEX IF NOT EXISTS idx_print_job_history_date 
ON print_job_history(created_at DESC, printer_profile_id);

CREATE INDEX IF NOT EXISTS idx_print_job_history_ticket 
ON print_job_history(ticket_id);

-- =============================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- =============================================

-- Update timestamps on print_jobs
CREATE OR REPLACE FUNCTION update_print_job_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- Set printed_at when status changes to completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.printed_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_print_job_timestamp
    BEFORE UPDATE ON print_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_print_job_timestamp();

-- Update timestamps on printer_profiles
CREATE OR REPLACE FUNCTION update_printer_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_printer_profile_timestamp
    BEFORE UPDATE ON printer_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_printer_profile_timestamp();

-- Update timestamps on print_statistics
CREATE OR REPLACE FUNCTION update_print_statistics_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_print_statistics_timestamp
    BEFORE UPDATE ON print_statistics
    FOR EACH ROW
    EXECUTE FUNCTION update_print_statistics_timestamp();

-- =============================================
-- FUNCTIONS FOR PRINT QUEUE MANAGEMENT
-- =============================================

-- Get next print job from queue
CREATE OR REPLACE FUNCTION get_next_print_job()
RETURNS SETOF print_jobs AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM print_jobs 
    WHERE status IN ('queued', 'retrying') 
      AND (retry_at IS NULL OR retry_at <= NOW())
    ORDER BY 
        CASE priority 
            WHEN 'urgent' THEN 3
            WHEN 'high' THEN 2
            ELSE 1 
        END DESC,
        created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
END;
$$ LANGUAGE plpgsql;

-- Update print statistics
CREATE OR REPLACE FUNCTION update_print_statistics(
    p_printer_id UUID,
    p_job_status VARCHAR(20),
    p_processing_time INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO print_statistics (
        printer_profile_id,
        date,
        total_jobs,
        successful_jobs,
        failed_jobs,
        cancelled_jobs,
        total_print_time_seconds
    ) VALUES (
        p_printer_id,
        CURRENT_DATE,
        1,
        CASE WHEN p_job_status = 'completed' THEN 1 ELSE 0 END,
        CASE WHEN p_job_status = 'failed' THEN 1 ELSE 0 END,
        CASE WHEN p_job_status = 'cancelled' THEN 1 ELSE 0 END,
        COALESCE(p_processing_time, 0)
    )
    ON CONFLICT (printer_profile_id, date) 
    DO UPDATE SET
        total_jobs = print_statistics.total_jobs + 1,
        successful_jobs = print_statistics.successful_jobs + 
            CASE WHEN p_job_status = 'completed' THEN 1 ELSE 0 END,
        failed_jobs = print_statistics.failed_jobs + 
            CASE WHEN p_job_status = 'failed' THEN 1 ELSE 0 END,
        cancelled_jobs = print_statistics.cancelled_jobs + 
            CASE WHEN p_job_status = 'cancelled' THEN 1 ELSE 0 END,
        total_print_time_seconds = print_statistics.total_print_time_seconds + 
            COALESCE(p_processing_time, 0),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Archive completed print jobs
CREATE OR REPLACE FUNCTION archive_completed_print_jobs(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    jobs_archived INTEGER;
BEGIN
    WITH archived_jobs AS (
        INSERT INTO print_job_history (
            id, ticket_id, ticket_type, printer_profile_id, printer_name,
            priority, copies, status, attempts, error_message,
            processing_time_seconds, created_at, completed_at
        )
        SELECT 
            pj.id, pj.ticket_id, pj.ticket_type, pj.printer_profile_id, pp.name,
            pj.priority, pj.copies, pj.status, pj.attempts, pj.error_message,
            EXTRACT(EPOCH FROM (pj.printed_at - pj.created_at))::INTEGER,
            pj.created_at, pj.printed_at
        FROM print_jobs pj
        LEFT JOIN printer_profiles pp ON pj.printer_profile_id = pp.id
        WHERE pj.status IN ('completed', 'failed', 'cancelled')
          AND pj.created_at < NOW() - INTERVAL '1 day' * days_old
        RETURNING id
    ),
    deleted_jobs AS (
        DELETE FROM print_jobs 
        WHERE id IN (SELECT id FROM archived_jobs)
        RETURNING id
    )
    SELECT COUNT(*) INTO jobs_archived FROM deleted_jobs;
    
    RETURN jobs_archived;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- DEFAULT PRINTER PROFILES
-- =============================================
INSERT INTO printer_profiles (
    name, type, paper_size, connection_type, is_default, capabilities, settings
) VALUES 
(
    'Default Office Printer',
    'standard',
    'A4',
    'network',
    TRUE,
    '{
        "supportsCut": false,
        "supportsColor": true,
        "supportsGraphics": true,
        "maxPaperWidth": 210,
        "dpi": 300,
        "supportedFonts": ["Arial", "Times New Roman", "Courier New"]
    }'::JSONB,
    '{
        "margins": {"top": 10, "right": 10, "bottom": 10, "left": 10},
        "defaultCopies": 1,
        "autoCut": false,
        "density": 100,
        "speed": "medium"
    }'::JSONB
),
(
    'Thermal Receipt Printer',
    'thermal',
    'thermal-2.75',
    'usb',
    TRUE,
    '{
        "supportsCut": true,
        "supportsColor": false,
        "supportsGraphics": false,
        "maxPaperWidth": 72,
        "dpi": 203,
        "supportedFonts": ["Courier New"]
    }'::JSONB,
    '{
        "margins": {"top": 2, "right": 2, "bottom": 2, "left": 2},
        "defaultCopies": 1,
        "autoCut": true,
        "density": 80,
        "speed": "fast"
    }'::JSONB
)
ON CONFLICT DO NOTHING;

-- =============================================
-- ROW LEVEL SECURITY (Optional)
-- =============================================

-- Enable RLS on sensitive tables if needed
-- ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE printer_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for different user roles
-- CREATE POLICY print_jobs_policy ON print_jobs FOR ALL TO authenticated USING (true);

-- =============================================
-- VIEWS FOR REPORTING
-- =============================================

-- Queue status view
CREATE OR REPLACE VIEW print_queue_status AS
SELECT 
    COUNT(*) FILTER (WHERE status = 'queued') as queued_jobs,
    COUNT(*) FILTER (WHERE status = 'printing') as processing_jobs,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
    COUNT(*) FILTER (WHERE status = 'retrying') as retrying_jobs,
    COUNT(*) as total_jobs,
    AVG(CASE WHEN printed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (printed_at - created_at)) END) as avg_processing_time
FROM print_jobs
WHERE created_at >= CURRENT_DATE;

-- Daily print statistics view  
CREATE OR REPLACE VIEW daily_print_stats AS
SELECT 
    ps.date,
    pp.name as printer_name,
    ps.total_jobs,
    ps.successful_jobs,
    ps.failed_jobs,
    ps.cancelled_jobs,
    CASE 
        WHEN ps.total_jobs > 0 
        THEN ROUND((ps.successful_jobs::DECIMAL / ps.total_jobs * 100), 2)
        ELSE 0 
    END as success_rate,
    ps.average_queue_wait_seconds
FROM print_statistics ps
JOIN printer_profiles pp ON ps.printer_profile_id = pp.id
ORDER BY ps.date DESC, pp.name;