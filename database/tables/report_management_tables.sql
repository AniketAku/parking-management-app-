-- =============================================================================
-- REPORT MANAGEMENT TABLES
-- Supporting tables for file management, download tracking, and user access control
-- =============================================================================

-- Report files table for tracking exported files
CREATE TABLE IF NOT EXISTS report_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_name TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'excel', 'csv', 'json')),
  file_size BIGINT NOT NULL,
  content_type TEXT NOT NULL,

  -- Report metadata
  report_type TEXT NOT NULL CHECK (report_type IN ('shift_report', 'analytics', 'summary', 'custom')),
  shift_session_id UUID REFERENCES shift_sessions(id) ON DELETE CASCADE,
  time_range JSONB, -- For analytics reports: {start, end, granularity}

  -- Access control
  created_by UUID NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  access_level TEXT NOT NULL DEFAULT 'private' CHECK (access_level IN ('private', 'internal', 'public')),

  -- File lifecycle
  expires_at TIMESTAMPTZ,
  download_count INTEGER NOT NULL DEFAULT 0,
  last_downloaded_at TIMESTAMPTZ,

  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Export options used
  export_options JSONB DEFAULT '{}',

  -- Additional metadata
  metadata JSONB DEFAULT '{}'
);

-- Report requests table for tracking generation requests
CREATE TABLE IF NOT EXISTS report_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL,
  user_id UUID NOT NULL,

  -- Request details
  export_options JSONB NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),

  -- Timestamps
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  -- Results
  file_id UUID REFERENCES report_files(id) ON DELETE SET NULL,
  error_message TEXT,

  -- Additional context
  user_agent TEXT,
  ip_address INET,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Report templates table for customizable report formats
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Template configuration
  template_type TEXT NOT NULL CHECK (template_type IN ('shift_report', 'analytics', 'summary', 'custom')),
  template_config JSONB NOT NULL DEFAULT '{}',

  -- Default export options
  default_export_options JSONB NOT NULL DEFAULT '{}',

  -- Template content
  header_template TEXT,
  footer_template TEXT,
  style_config JSONB DEFAULT '{}',

  -- Access control
  is_system_template BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Usage tracking
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ
);

-- Report sharing table for managing shared reports
CREATE TABLE IF NOT EXISTS report_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_file_id UUID NOT NULL REFERENCES report_files(id) ON DELETE CASCADE,

  -- Sharing details
  shared_by UUID NOT NULL,
  shared_with UUID, -- NULL for public shares
  share_token UUID NOT NULL DEFAULT gen_random_uuid(),

  -- Access control
  access_type TEXT NOT NULL DEFAULT 'view' CHECK (access_type IN ('view', 'download')),
  max_downloads INTEGER DEFAULT 10,
  download_count INTEGER NOT NULL DEFAULT 0,

  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ,

  -- Additional metadata
  metadata JSONB DEFAULT '{}',

  CONSTRAINT unique_share_token UNIQUE (share_token)
);

-- Report analytics table for tracking report usage and performance
CREATE TABLE IF NOT EXISTS report_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Report identification
  report_file_id UUID REFERENCES report_files(id) ON DELETE CASCADE,
  shift_session_id UUID REFERENCES shift_sessions(id) ON DELETE CASCADE,

  -- Analytics data
  generation_time_seconds NUMERIC(10,3),
  file_size_bytes BIGINT,
  download_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  share_count INTEGER NOT NULL DEFAULT 0,

  -- User engagement
  avg_time_to_download NUMERIC(10,3),
  popular_export_formats TEXT[],

  -- Performance metrics
  success_rate NUMERIC(5,2) DEFAULT 100.00,
  error_count INTEGER NOT NULL DEFAULT 0,

  -- Time tracking
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_report_analytics_daily UNIQUE (report_file_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_report_files_created_by ON report_files(created_by);
CREATE INDEX IF NOT EXISTS idx_report_files_report_type ON report_files(report_type);
CREATE INDEX IF NOT EXISTS idx_report_files_shift_session_id ON report_files(shift_session_id);
CREATE INDEX IF NOT EXISTS idx_report_files_created_at ON report_files(created_at);
CREATE INDEX IF NOT EXISTS idx_report_files_expires_at ON report_files(expires_at);

CREATE INDEX IF NOT EXISTS idx_report_requests_user_id ON report_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_report_requests_shift_id ON report_requests(shift_id);
CREATE INDEX IF NOT EXISTS idx_report_requests_status ON report_requests(status);
CREATE INDEX IF NOT EXISTS idx_report_requests_requested_at ON report_requests(requested_at);
CREATE INDEX IF NOT EXISTS idx_report_requests_priority_status ON report_requests(priority, status);

CREATE INDEX IF NOT EXISTS idx_report_templates_template_type ON report_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_report_templates_is_active ON report_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_report_templates_created_by ON report_templates(created_by);

CREATE INDEX IF NOT EXISTS idx_report_shares_report_file_id ON report_shares(report_file_id);
CREATE INDEX IF NOT EXISTS idx_report_shares_share_token ON report_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_report_shares_shared_by ON report_shares(shared_by);
CREATE INDEX IF NOT EXISTS idx_report_shares_expires_at ON report_shares(expires_at);
CREATE INDEX IF NOT EXISTS idx_report_shares_is_active ON report_shares(is_active);

CREATE INDEX IF NOT EXISTS idx_report_analytics_report_file_id ON report_analytics(report_file_id);
CREATE INDEX IF NOT EXISTS idx_report_analytics_date ON report_analytics(date);
CREATE INDEX IF NOT EXISTS idx_report_analytics_shift_session_id ON report_analytics(shift_session_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_report_files_updated_at
  BEFORE UPDATE ON report_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_requests_updated_at
  BEFORE UPDATE ON report_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_templates_updated_at
  BEFORE UPDATE ON report_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_analytics_updated_at
  BEFORE UPDATE ON report_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired files
CREATE OR REPLACE FUNCTION cleanup_expired_report_files()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete expired files from storage and database
  WITH expired_files AS (
    SELECT id, storage_path
    FROM report_files
    WHERE expires_at < NOW()
      AND expires_at IS NOT NULL
  )
  DELETE FROM report_files
  WHERE id IN (SELECT id FROM expired_files);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Clean up expired shares
  DELETE FROM report_shares
  WHERE expires_at < NOW()
    OR is_active = false;

  RAISE LOG 'Cleaned up % expired report files', deleted_count;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get file download statistics
CREATE OR REPLACE FUNCTION get_report_download_stats(
  p_user_id UUID DEFAULT NULL,
  p_date_from DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_date_to DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  total_reports INTEGER,
  total_downloads INTEGER,
  avg_file_size BIGINT,
  popular_formats TEXT[],
  daily_stats JSON
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      rf.file_type,
      rf.file_size,
      rf.download_count,
      rf.created_at::DATE as report_date
    FROM report_files rf
    WHERE (p_user_id IS NULL OR rf.created_by = p_user_id)
      AND rf.created_at::DATE BETWEEN p_date_from AND p_date_to
  )
  SELECT
    COUNT(*)::INTEGER as total_reports,
    SUM(download_count)::INTEGER as total_downloads,
    AVG(file_size)::BIGINT as avg_file_size,
    ARRAY_AGG(DISTINCT file_type ORDER BY file_type) as popular_formats,
    json_agg(
      json_build_object(
        'date', report_date,
        'count', COUNT(*),
        'downloads', SUM(download_count)
      )
      ORDER BY report_date
    ) as daily_stats
  FROM stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON report_files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON report_requests TO authenticated;
GRANT SELECT ON report_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON report_shares TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON report_analytics TO authenticated;

GRANT EXECUTE ON FUNCTION cleanup_expired_report_files() TO authenticated;
GRANT EXECUTE ON FUNCTION get_report_download_stats(UUID, DATE, DATE) TO authenticated;

-- Insert default report templates
INSERT INTO report_templates (name, description, template_type, template_config, default_export_options, is_system_template) VALUES
('Standard Shift Report', 'Standard shift report with all sections', 'shift_report',
 '{"sections": ["shift_info", "financial_summary", "vehicle_activity", "performance_metrics", "cash_reconciliation"]}',
 '{"format": "pdf", "includeCharts": true, "includeVehicleDetails": true, "includeFinancialBreakdown": true, "includeCashReconciliation": true, "includePerformanceMetrics": true}',
 true),

('Quick Summary Report', 'Quick summary for shift handovers', 'shift_report',
 '{"sections": ["shift_info", "financial_summary", "vehicle_activity"]}',
 '{"format": "pdf", "includeCharts": false, "includeVehicleDetails": false, "includeFinancialBreakdown": true, "includeCashReconciliation": true, "includePerformanceMetrics": false}',
 true),

('Detailed Analytics Report', 'Comprehensive analytics with all metrics', 'analytics',
 '{"sections": ["revenue_analytics", "traffic_analytics", "operational_efficiency", "predictive_insights"]}',
 '{"format": "excel", "includeCharts": true}',
 true),

('Financial Summary Only', 'Financial data only for accounting', 'shift_report',
 '{"sections": ["financial_summary", "cash_reconciliation"]}',
 '{"format": "excel", "includeCharts": false, "includeVehicleDetails": false, "includeFinancialBreakdown": true, "includeCashReconciliation": true, "includePerformanceMetrics": false}',
 true)

ON CONFLICT (name) DO NOTHING;

-- Add helpful comments
COMMENT ON TABLE report_files IS 'Tracks all generated report files with metadata and access control';
COMMENT ON TABLE report_requests IS 'Logs all report generation requests for audit and performance tracking';
COMMENT ON TABLE report_templates IS 'Configurable report templates for different report types and formats';
COMMENT ON TABLE report_shares IS 'Manages shared reports with access tokens and expiration';
COMMENT ON TABLE report_analytics IS 'Tracks report usage analytics and performance metrics';

COMMENT ON FUNCTION cleanup_expired_report_files() IS 'Cleans up expired report files from storage and database';
COMMENT ON FUNCTION get_report_download_stats(UUID, DATE, DATE) IS 'Returns download statistics for reports within a date range';