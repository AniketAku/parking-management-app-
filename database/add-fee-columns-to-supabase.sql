-- Add calculated_fee and actual_fee columns to Supabase parking_entries table
-- This allows the app to use these fields as intended

-- Add calculated_fee column (automatically calculated parking fee)
ALTER TABLE parking_entries
ADD COLUMN IF NOT EXISTS calculated_fee NUMERIC(10,2);

-- Add actual_fee column (final fee after adjustments/discounts)
ALTER TABLE parking_entries
ADD COLUMN IF NOT EXISTS actual_fee NUMERIC(10,2);

-- Add amount_paid column (track partial/full payments)
ALTER TABLE parking_entries
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2);

-- Add comments for clarity
COMMENT ON COLUMN parking_entries.parking_fee IS 'Base parking fee from rate table';
COMMENT ON COLUMN parking_entries.calculated_fee IS 'Auto-calculated fee based on duration and rates';
COMMENT ON COLUMN parking_entries.actual_fee IS 'Final fee after adjustments/discounts';
COMMENT ON COLUMN parking_entries.amount_paid IS 'Amount actually paid by customer';

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'parking_entries'
  AND column_name IN ('parking_fee', 'calculated_fee', 'actual_fee', 'amount_paid')
ORDER BY column_name;
