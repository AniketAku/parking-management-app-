-- =============================================================================
-- AUTOMATIC SHIFT REPORT TRIGGERS
-- Automatic report generation on shift completion with real-time notifications
-- =============================================================================

-- Drop existing triggers and functions if they exist
DROP TRIGGER IF EXISTS shift_end_report_trigger ON shift_sessions;
DROP FUNCTION IF EXISTS trigger_shift_report();
DROP FUNCTION IF EXISTS process_shift_report_queue();

-- Function to trigger automatic report generation
CREATE OR REPLACE FUNCTION trigger_shift_report()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger report generation when shift status changes to completed or emergency_ended
  IF NEW.status IN ('completed', 'emergency_ended') AND
     OLD.status = 'active' AND
     NEW.shift_end_time IS NOT NULL THEN

    -- Log the trigger event
    RAISE LOG 'Triggering automatic report generation for shift: % (Employee: %, Status: %)',
      NEW.id, NEW.employee_id, NEW.status;

    -- Send notification for async report processing
    PERFORM pg_notify(
      'shift_report_needed',
      json_build_object(
        'shift_id', NEW.id,
        'employee_id', NEW.employee_id,
        'shift_end_time', NEW.shift_end_time,
        'shift_status', NEW.status,
        'trigger_time', NOW(),
        'priority', CASE
          WHEN NEW.status = 'emergency_ended' THEN 'high'
          ELSE 'normal'
        END
      )::text
    );

    -- Also send real-time notification to connected clients
    PERFORM pg_notify(
      'shift_ended',
      json_build_object(
        'type', 'shift_ended',
        'shift_id', NEW.id,
        'employee_id', NEW.employee_id,
        'employee_name', (
          SELECT full_name FROM employees WHERE id = NEW.employee_id
        ),
        'shift_status', NEW.status,
        'shift_duration_hours', EXTRACT(EPOCH FROM (NEW.shift_end_time - NEW.shift_start_time))/3600,
        'ended_at', NEW.shift_end_time,
        'requires_report', true
      )::text
    );

    -- Insert into report generation queue for immediate processing
    INSERT INTO shift_report_queue (
      shift_session_id,
      priority,
      status,
      requested_at,
      metadata
    ) VALUES (
      NEW.id,
      CASE WHEN NEW.status = 'emergency_ended' THEN 'high' ELSE 'normal' END,
      'pending',
      NOW(),
      json_build_object(
        'shift_status', NEW.status,
        'auto_triggered', true,
        'trigger_reason', 'shift_completion',
        'employee_id', NEW.employee_id
      )
    )
    ON CONFLICT (shift_session_id) DO UPDATE SET
      priority = EXCLUDED.priority,
      status = 'pending',
      requested_at = NOW(),
      updated_at = NOW(),
      metadata = EXCLUDED.metadata;

    RAISE LOG 'Report generation queued for shift: %', NEW.id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER shift_end_report_trigger
  AFTER UPDATE ON shift_sessions
  FOR EACH ROW EXECUTE FUNCTION trigger_shift_report();

-- Create shift report queue table for managing report generation
CREATE TABLE IF NOT EXISTS shift_report_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_session_id UUID NOT NULL REFERENCES shift_sessions(id) ON DELETE CASCADE,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_shift_report_queue UNIQUE (shift_session_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shift_report_queue_status_priority ON shift_report_queue(status, priority, requested_at);
CREATE INDEX IF NOT EXISTS idx_shift_report_queue_shift_id ON shift_report_queue(shift_session_id);
CREATE INDEX IF NOT EXISTS idx_shift_report_queue_requested_at ON shift_report_queue(requested_at);

-- Function to process report generation queue
CREATE OR REPLACE FUNCTION process_shift_report_queue()
RETURNS TABLE(
  processed_count INTEGER,
  failed_count INTEGER,
  queue_size INTEGER
) AS $$
DECLARE
  queue_item RECORD;
  report_result JSON;
  processed_count INTEGER := 0;
  failed_count INTEGER := 0;
  total_queue_size INTEGER;
BEGIN
  -- Get current queue size
  SELECT COUNT(*) INTO total_queue_size
  FROM shift_report_queue
  WHERE status = 'pending';

  -- Process pending report requests (limit to 10 at a time for performance)
  FOR queue_item IN
    SELECT srq.*, ss.employee_id, ss.status as shift_status
    FROM shift_report_queue srq
    JOIN shift_sessions ss ON srq.shift_session_id = ss.id
    WHERE srq.status = 'pending'
      AND srq.retry_count < srq.max_retries
    ORDER BY
      CASE srq.priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'normal' THEN 3
        WHEN 'low' THEN 4
      END,
      srq.requested_at ASC
    LIMIT 10
  LOOP
    BEGIN
      -- Mark as processing
      UPDATE shift_report_queue
      SET status = 'processing',
          started_at = NOW(),
          updated_at = NOW()
      WHERE id = queue_item.id;

      -- Generate the report
      SELECT generate_shift_report(queue_item.shift_session_id) INTO report_result;

      -- Check if report generation was successful
      IF report_result->>'error' IS NULL THEN
        -- Mark as completed
        UPDATE shift_report_queue
        SET status = 'completed',
            completed_at = NOW(),
            updated_at = NOW(),
            error_message = NULL
        WHERE id = queue_item.id;

        -- Send success notification
        PERFORM pg_notify(
          'shift_report_generated',
          json_build_object(
            'type', 'report_generated',
            'shift_id', queue_item.shift_session_id,
            'employee_id', queue_item.employee_id,
            'success', true,
            'generated_at', NOW(),
            'report_data', report_result
          )::text
        );

        processed_count := processed_count + 1;

        RAISE LOG 'Successfully generated report for shift: %', queue_item.shift_session_id;

      ELSE
        -- Report generation failed
        UPDATE shift_report_queue
        SET status = CASE
          WHEN retry_count + 1 >= max_retries THEN 'failed'
          ELSE 'pending'
        END,
        retry_count = retry_count + 1,
        failed_at = CASE
          WHEN retry_count + 1 >= max_retries THEN NOW()
          ELSE failed_at
        END,
        updated_at = NOW(),
        error_message = report_result->>'message'
        WHERE id = queue_item.id;

        -- Send failure notification if max retries exceeded
        IF queue_item.retry_count + 1 >= queue_item.max_retries THEN
          PERFORM pg_notify(
            'shift_report_failed',
            json_build_object(
              'type', 'report_failed',
              'shift_id', queue_item.shift_session_id,
              'employee_id', queue_item.employee_id,
              'error', report_result->>'message',
              'failed_at', NOW(),
              'retry_count', queue_item.retry_count + 1
            )::text
          );
        END IF;

        failed_count := failed_count + 1;

        RAISE LOG 'Failed to generate report for shift: % (Attempt %/%): %',
          queue_item.shift_session_id,
          queue_item.retry_count + 1,
          queue_item.max_retries,
          report_result->>'message';

      END IF;

    EXCEPTION
      WHEN OTHERS THEN
        -- Handle unexpected errors
        UPDATE shift_report_queue
        SET status = CASE
          WHEN retry_count + 1 >= max_retries THEN 'failed'
          ELSE 'pending'
        END,
        retry_count = retry_count + 1,
        failed_at = CASE
          WHEN retry_count + 1 >= max_retries THEN NOW()
          ELSE failed_at
        END,
        updated_at = NOW(),
        error_message = SQLERRM
        WHERE id = queue_item.id;

        failed_count := failed_count + 1;

        RAISE LOG 'Unexpected error generating report for shift: % - %',
          queue_item.shift_session_id, SQLERRM;
    END;
  END LOOP;

  RETURN QUERY SELECT processed_count, failed_count, total_queue_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION process_shift_report_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_shift_report() TO authenticated;

-- Function to manually queue a report generation
CREATE OR REPLACE FUNCTION queue_shift_report(
  p_shift_id UUID,
  p_priority TEXT DEFAULT 'normal'
)
RETURNS JSON AS $$
BEGIN
  -- Validate shift exists
  IF NOT EXISTS (SELECT 1 FROM shift_sessions WHERE id = p_shift_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Shift not found',
      'shift_id', p_shift_id
    );
  END IF;

  -- Validate priority
  IF p_priority NOT IN ('low', 'normal', 'high', 'urgent') THEN
    p_priority := 'normal';
  END IF;

  -- Queue the report
  INSERT INTO shift_report_queue (
    shift_session_id,
    priority,
    status,
    requested_at,
    metadata
  ) VALUES (
    p_shift_id,
    p_priority,
    'pending',
    NOW(),
    json_build_object(
      'auto_triggered', false,
      'trigger_reason', 'manual_request',
      'requested_by', current_setting('request.jwt.claims', true)::json->>'sub'
    )
  )
  ON CONFLICT (shift_session_id) DO UPDATE SET
    priority = GREATEST(
      CASE EXCLUDED.priority
        WHEN 'urgent' THEN 4
        WHEN 'high' THEN 3
        WHEN 'normal' THEN 2
        WHEN 'low' THEN 1
      END,
      CASE shift_report_queue.priority
        WHEN 'urgent' THEN 4
        WHEN 'high' THEN 3
        WHEN 'normal' THEN 2
        WHEN 'low' THEN 1
      END
    )::text,
    status = CASE
      WHEN shift_report_queue.status = 'failed' THEN 'pending'
      ELSE shift_report_queue.status
    END,
    retry_count = CASE
      WHEN shift_report_queue.status = 'failed' THEN 0
      ELSE shift_report_queue.retry_count
    END,
    updated_at = NOW();

  RETURN json_build_object(
    'success', true,
    'message', 'Report queued successfully',
    'shift_id', p_shift_id,
    'priority', p_priority,
    'queued_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION queue_shift_report(UUID, TEXT) TO authenticated;

-- Function to get report queue status
CREATE OR REPLACE FUNCTION get_report_queue_status()
RETURNS TABLE(
  total_pending INTEGER,
  total_processing INTEGER,
  total_completed INTEGER,
  total_failed INTEGER,
  oldest_pending_age INTERVAL,
  queue_details JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE status = 'pending')::INTEGER as total_pending,
    COUNT(*) FILTER (WHERE status = 'processing')::INTEGER as total_processing,
    COUNT(*) FILTER (WHERE status = 'completed')::INTEGER as total_completed,
    COUNT(*) FILTER (WHERE status = 'failed')::INTEGER as total_failed,
    MAX(NOW() - requested_at) FILTER (WHERE status = 'pending') as oldest_pending_age,
    json_agg(
      json_build_object(
        'shift_id', shift_session_id,
        'priority', priority,
        'status', status,
        'requested_at', requested_at,
        'retry_count', retry_count,
        'error_message', error_message
      )
      ORDER BY
        CASE priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          WHEN 'low' THEN 4
        END,
        requested_at ASC
    ) FILTER (WHERE status IN ('pending', 'processing')) as queue_details
  FROM shift_report_queue
  WHERE created_at >= NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_report_queue_status() TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION trigger_shift_report() IS
'Automatically triggers report generation when a shift ends (status changes to completed or emergency_ended)';

COMMENT ON FUNCTION process_shift_report_queue() IS
'Processes pending report generation requests from the queue. Should be called periodically by a background job.';

COMMENT ON FUNCTION queue_shift_report(UUID, TEXT) IS
'Manually queues a shift report for generation with specified priority (low, normal, high, urgent)';

COMMENT ON FUNCTION get_report_queue_status() IS
'Returns current status of the report generation queue including pending, processing, completed, and failed counts';

COMMENT ON TABLE shift_report_queue IS
'Queue for managing automatic shift report generation with priority handling and retry logic';

-- Create a cleanup function for old completed/failed queue entries
CREATE OR REPLACE FUNCTION cleanup_report_queue()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete completed entries older than 7 days
  DELETE FROM shift_report_queue
  WHERE status IN ('completed', 'failed')
    AND completed_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE LOG 'Cleaned up % old report queue entries', deleted_count;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_report_queue() TO authenticated;