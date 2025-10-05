-- ✅ COMPLETE RPC FUNCTION - With all fee columns (parking_fee, calculated_fee, actual_fee, amount_paid)
-- Run this AFTER adding the columns with add-fee-columns-to-supabase.sql

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
    -- ✅ All columns including new fee fields
    UPDATE parking_entries
    SET
        transport_name = COALESCE((entry_updates->>'transport_name')::TEXT, transport_name),
        vehicle_number = COALESCE((entry_updates->>'vehicle_number')::TEXT, vehicle_number),
        vehicle_type = COALESCE((entry_updates->>'vehicle_type')::TEXT, vehicle_type),
        driver_name = COALESCE((entry_updates->>'driver_name')::TEXT, driver_name),
        driver_phone = COALESCE((entry_updates->>'driver_phone')::TEXT, driver_phone),
        notes = COALESCE((entry_updates->>'notes')::TEXT, notes),
        entry_time = COALESCE((entry_updates->>'entry_time')::TIMESTAMPTZ, entry_time),
        exit_time = COALESCE((entry_updates->>'exit_time')::TIMESTAMPTZ, exit_time),
        status = COALESCE((entry_updates->>'status')::TEXT, status),
        payment_status = COALESCE((entry_updates->>'payment_status')::TEXT, payment_status),
        payment_type = COALESCE((entry_updates->>'payment_type')::TEXT, payment_type),
        -- All fee columns
        parking_fee = COALESCE((entry_updates->>'parking_fee')::NUMERIC, parking_fee),
        calculated_fee = COALESCE((entry_updates->>'calculated_fee')::NUMERIC, calculated_fee),
        actual_fee = COALESCE((entry_updates->>'actual_fee')::NUMERIC, actual_fee),
        amount_paid = COALESCE((entry_updates->>'amount_paid')::NUMERIC, amount_paid),
        shift_session_id = COALESCE((entry_updates->>'shift_session_id')::UUID, shift_session_id),
        updated_at = NOW(),
        last_modified = NOW()
    WHERE id = target_entry_id
    RETURNING * INTO updated_entry;

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
