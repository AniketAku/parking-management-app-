-- ================================================
-- MINIMAL SHIFT MANAGEMENT TABLES
-- Creates only the basic tables without foreign keys
-- ================================================

BEGIN;

-- Drop existing tables if they exist (clean slate)
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS parking_sessions CASCADE;
DROP TABLE IF EXISTS shift_sessions CASCADE;

-- ================================================
-- CREATE BASIC TABLES (NO FOREIGN KEYS)
-- ================================================

-- Create shift_sessions table (no foreign keys)
CREATE TABLE shift_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Just a UUID, no foreign key constraint
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    total_sessions INTEGER DEFAULT 0,
    total_payments INTEGER DEFAULT 0,
    linked_sessions INTEGER DEFAULT 0,
    linked_payments INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    cash_collected DECIMAL(10,2) DEFAULT 0,
    digital_collected DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create parking_sessions table (no foreign keys)
CREATE TABLE parking_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_number TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    driver_name TEXT,
    transport_name TEXT,
    entry_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    exit_time TIMESTAMP WITH TIME ZONE,
    fees DECIMAL(10,2) DEFAULT 0,
    payment_mode TEXT,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Exited', 'Overstay', 'Lost Ticket')),
    shift_session_id UUID, -- Just a UUID, no foreign key constraint
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID -- Just a UUID, no foreign key constraint
);

-- Create payments table (no foreign keys)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount DECIMAL(10,2) NOT NULL,
    payment_mode TEXT NOT NULL CHECK (payment_mode IN ('cash', 'digital', 'card', 'upi')),
    payment_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    session_id UUID, -- Just a UUID, no foreign key constraint
    shift_session_id UUID, -- Just a UUID, no foreign key constraint
    transaction_id TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID -- Just a UUID, no foreign key constraint
);

-- ================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ================================================

-- Shift sessions indexes
CREATE INDEX idx_shift_sessions_user ON shift_sessions(user_id);
CREATE INDEX idx_shift_sessions_status ON shift_sessions(status);
CREATE INDEX idx_shift_sessions_start_time ON shift_sessions(start_time);

-- Parking sessions indexes
CREATE INDEX idx_parking_sessions_vehicle ON parking_sessions(vehicle_number);
CREATE INDEX idx_parking_sessions_entry_time ON parking_sessions(entry_time);
CREATE INDEX idx_parking_sessions_status ON parking_sessions(status);
CREATE INDEX idx_parking_sessions_shift ON parking_sessions(shift_session_id);

-- Payments indexes
CREATE INDEX idx_payments_payment_time ON payments(payment_time);
CREATE INDEX idx_payments_session ON payments(session_id);
CREATE INDEX idx_payments_shift ON payments(shift_session_id);
CREATE INDEX idx_payments_mode ON payments(payment_mode);

-- ================================================
-- ENABLE ROW LEVEL SECURITY (PERMISSIVE)
-- ================================================

-- Enable RLS
ALTER TABLE shift_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for testing
CREATE POLICY "allow_all_shift_sessions" ON shift_sessions FOR ALL USING (true);
CREATE POLICY "allow_all_parking_sessions" ON parking_sessions FOR ALL USING (true);
CREATE POLICY "allow_all_payments" ON payments FOR ALL USING (true);

-- ================================================
-- INSERT SAMPLE DATA FOR TESTING
-- ================================================

-- Insert sample shift session (using a generic UUID for user_id)
INSERT INTO shift_sessions (id, user_id, start_time, status)
VALUES (
    gen_random_uuid(),
    gen_random_uuid(), -- Generic UUID for user_id
    NOW() - INTERVAL '2 hours',
    'active'
);

-- Get the shift ID for sample data
DO $$
DECLARE
    sample_shift_id UUID;
BEGIN
    SELECT id INTO sample_shift_id FROM shift_sessions ORDER BY created_at DESC LIMIT 1;

    -- Insert sample parking session
    INSERT INTO parking_sessions (
        vehicle_number, vehicle_type, driver_name, transport_name,
        entry_time, fees, payment_mode, status, shift_session_id
    ) VALUES (
        'MH12AB1234', 'Trailer', 'John Doe', 'XYZ Transport',
        NOW() - INTERVAL '1 hour', 225.00, 'cash', 'Active', sample_shift_id
    );

    -- Insert sample payment
    INSERT INTO payments (
        amount, payment_mode, payment_time, shift_session_id
    ) VALUES (
        225.00, 'cash', NOW() - INTERVAL '30 minutes', sample_shift_id
    );

    RAISE NOTICE 'Sample data created with shift ID: %', sample_shift_id;
END $$;

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    parking_count INTEGER;
    payments_count INTEGER;
    shifts_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO parking_count FROM parking_sessions;
    SELECT COUNT(*) INTO payments_count FROM payments;
    SELECT COUNT(*) INTO shifts_count FROM shift_sessions;

    RAISE NOTICE '';
    RAISE NOTICE '🎉 MINIMAL SHIFT TABLES CREATED SUCCESSFULLY!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Table Status:';
    RAISE NOTICE '   ✅ shift_sessions: % records', shifts_count;
    RAISE NOTICE '   ✅ parking_sessions: % records', parking_count;
    RAISE NOTICE '   ✅ payments: % records', payments_count;
    RAISE NOTICE '';
    RAISE NOTICE '🔐 Row Level Security: ENABLED (permissive policies)';
    RAISE NOTICE '📦 Foreign Keys: NONE (UUIDs only for compatibility)';
    RAISE NOTICE '⚡ Indexes: CREATED';
    RAISE NOTICE '';
    RAISE NOTICE '✅ The 404 and 406 API errors should now be resolved!';
    RAISE NOTICE '🎯 Dashboard shift panel should now load successfully';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Test Steps:';
    RAISE NOTICE '   1. Refresh browser at http://localhost:3002/';
    RAISE NOTICE '   2. Check browser console - should see no 404/406 errors';
    RAISE NOTICE '   3. Verify shift panel shows at bottom of dashboard';
    RAISE NOTICE '   4. Sample shift should appear as active';
END $$;

COMMIT;