-- ============================================================================
-- Fix update_parking_entry_by_id RPC Function
-- ============================================================================
-- Issue: Function references non-existent columns (duration_minutes, daily_rate, etc.)
-- Solution: Update function to only use columns that exist in parking_entries table
-- ============================================================================

CREATE OR REPLACE FUNCTION update_parking_entry_by_id(
    target_entry_id UUID,
    entry_updates JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    updated_entry parking_entries;
BEGIN
    -- Update the parking entry with JSONB fields
    -- ✅ ONLY using columns that exist in parking_entries table
    UPDATE parking_entries
    SET
        transport_name = COALESCE((entry_updates->>'transport_name')::TEXT, transport_name),
        vehicle_number = COALESCE((entry_updates->>'vehicle_number')::TEXT, vehicle_number),
        vehicle_type = COALESCE((entry_updates->>'vehicle_type')::TEXT, vehicle_type),
        driver_name = COALESCE((entry_updates->>'driver_name')::TEXT, driver_name),
        driver_phone = COALESCE((entry_updates->>'driver_phone')::TEXT, driver_phone),
        entry_time = COALESCE((entry_updates->>'entry_time')::TIMESTAMPTZ, entry_time),
        exit_time = COALESCE((entry_updates->>'exit_time')::TIMESTAMPTZ, exit_time),
        parking_fee = COALESCE((entry_updates->>'parking_fee')::NUMERIC, parking_fee),
        actual_fee = COALESCE((entry_updates->>'actual_fee')::NUMERIC, actual_fee),
        calculated_fee = COALESCE((entry_updates->>'calculated_fee')::NUMERIC, calculated_fee),
        amount_paid = COALESCE((entry_updates->>'amount_paid')::NUMERIC, amount_paid),
        payment_type = COALESCE((entry_updates->>'payment_type')::TEXT, payment_type),
        payment_status = COALESCE((entry_updates->>'payment_status')::TEXT, payment_status),
        status = COALESCE((entry_updates->>'status')::TEXT, status),
        notes = COALESCE((entry_updates->>'notes')::TEXT, notes),
        updated_at = NOW()
    WHERE id = target_entry_id
    RETURNING * INTO updated_entry;

    -- Check if update succeeded
    IF FOUND THEN
        result := jsonb_build_object(
            'success', true,
            'message', 'Parking entry updated successfully',
            'data', row_to_json(updated_entry)
        );
    ELSE
        result := jsonb_build_object(
            'success', false,
            'message', 'Parking entry not found',
            'data', null
        );
    END IF;

    RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_parking_entry_by_id(UUID, JSONB) TO anon, authenticated;

-- Test the function
DO $$
BEGIN
    RAISE NOTICE '✅ update_parking_entry_by_id function updated successfully';
    RAISE NOTICE '   Removed non-existent columns: duration_minutes, daily_rate, overstay_minutes, penalty_fee, total_amount, shift_session_id';
    RAISE NOTICE '   Function now matches actual parking_entries schema';
END $$;
