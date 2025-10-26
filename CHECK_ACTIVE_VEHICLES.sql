-- Check for active vehicles in parking_entries
SELECT
  id,
  vehicle_number,
  vehicle_type,
  entry_time,
  exit_time,
  status,
  parking_fee,
  EXTRACT(DAY FROM NOW() - entry_time) as days_parked
FROM parking_entries
WHERE status = 'Active'
ORDER BY entry_time DESC;

-- Also check what statuses exist
SELECT DISTINCT status, COUNT(*)
FROM parking_entries
GROUP BY status;
