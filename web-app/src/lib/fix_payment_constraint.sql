-- Fix payment_type constraint issues
-- Run this in Supabase SQL Editor if still having constraint errors

-- Option 1: Remove the constraint temporarily
ALTER TABLE parking_entries 
DROP CONSTRAINT IF EXISTS payment_type_consistency;

-- Option 2: Check what the constraint expects
SELECT 
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%payment%';

-- Option 3: Create a more flexible constraint
ALTER TABLE parking_entries 
ADD CONSTRAINT payment_type_check 
CHECK (payment_type IN ('Cash', 'Credit Card', 'Debit Card', 'UPI', 'Digital Payment') OR payment_type IS NULL);