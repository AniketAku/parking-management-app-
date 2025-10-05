-- ✅ CORRECT RPC Function for Supabase Database
-- Based on ACTUAL parking_entries schema with only these columns:
-- id, transport_name, vehicle_type, vehicle_number, driver_name, notes,
-- entry_time, exit_time, status, payment_status, calculated_fee, actual_fee,
-- created_at, updated_at, created_by, updated_by

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
    -- ✅ ONLY columns that exist in Supabase parking_entries table
    UPDATE parking_entries
    SET
        transport_name = COALESCE((entry_updates->>'transport_name')::TEXT, transport_name),
        vehicle_number = COALESCE((entry_updates->>'vehicle_number')::TEXT, vehicle_number),
        vehicle_type = COALESCE((entry_updates->>'vehicle_type')::TEXT, vehicle_type),
        driver_name = COALESCE((entry_updates->>'driver_name')::TEXT, driver_name),
        notes = COALESCE((entry_updates->>'notes')::TEXT, notes),
        entry_time = COALESCE((entry_updates->>'entry_time')::TIMESTAMPTZ, entry_time),
        exit_time = COALESCE((entry_updates->>'exit_time')::TIMESTAMPTZ, exit_time),
        status = COALESCE((entry_updates->>'status')::TEXT, status),
        payment_status = COALESCE((entry_updates->>'payment_status')::TEXT, payment_status),
        calculated_fee = COALESCE((entry_updates->>'calculated_fee')::NUMERIC, calculated_fee),
        actual_fee = COALESCE((entry_updates->>'actual_fee')::NUMERIC, actual_fee),
        updated_at = NOW()
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
