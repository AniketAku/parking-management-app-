# Test Data Sample Preview

## What the Test Data Generator Creates

The test data generator creates **1,500 realistic parking entries** with the following characteristics:

### 📊 **Data Distribution (Simulated Output)**

```
=== TEST DATA VALIDATION SUMMARY ===
Total test records: 1500
Currently parked: 225 (15%)
Exited vehicles: 1275 (85%)
Average parking fee: ₹156.75
Overstayed vehicles: 18

=== LOCATION DISTRIBUTION ===
Location Main Location: 1200 entries (80%)
Location North Terminal: 195 entries (13%)
Location South Terminal: 105 entries (7%)

=== VEHICLE TYPE DISTRIBUTION ===
Vehicle type Trailer: 525 entries (35.0%)
Vehicle type 6 Wheeler: 375 entries (25.0%)
Vehicle type 4 Wheeler: 375 entries (25.0%)
Vehicle type 2 Wheeler: 225 entries (15.0%)
```

### 🚛 **Sample Generated Records**

Here are examples of what the generated test data looks like:

#### **Record 1: Recently Exited Trailer**
```json
{
  "serial": 15,
  "transport_name": "Express Logistics",
  "vehicle_type": "Trailer",
  "vehicle_number": "KA-23-AB-4567",
  "driver_name": "Rajesh Kumar",
  "driver_phone": "+91-9876543210",
  "notes": "Regular customer",
  "entry_time": "2025-08-14T08:30:15",
  "status": "Exited",
  "parking_fee": 450.00,
  "payment_status": "Paid",
  "payment_type": "UPI",
  "exit_time": "2025-08-15T10:15:30",
  "location_id": 1,
  "duration_hours": 25.75
}
```

#### **Record 2: Currently Parked 6 Wheeler**
```json
{
  "serial": 7,
  "transport_name": "Prime Transport",
  "vehicle_type": "6 Wheeler",
  "vehicle_number": "MH-12-CD-8901",
  "driver_name": "N/A",
  "driver_phone": "N/A",
  "notes": "N/A",
  "entry_time": "2025-08-16T14:20:45",
  "status": "Parked",
  "parking_fee": 0.00,
  "payment_status": "Unpaid",
  "payment_type": "N/A",
  "exit_time": null,
  "location_id": 2,
  "duration_hours": 15.67
}
```

#### **Record 3: Quick 4 Wheeler Visit**
```json
{
  "serial": 23,
  "transport_name": "Speed Services",
  "vehicle_type": "4 Wheeler",
  "vehicle_number": "TN-45-EF-2345",
  "driver_name": "Suresh Patel",
  "driver_phone": "+91-8765432109",
  "notes": "Urgent delivery",
  "entry_time": "2025-08-15T16:45:22",
  "status": "Exited",
  "parking_fee": 100.00,
  "payment_status": "Paid",
  "payment_type": "Cash",
  "exit_time": "2025-08-15T18:30:15",
  "location_id": 1,
  "duration_hours": 1.75
}
```

#### **Record 4: Overstayed 2 Wheeler**
```json
{
  "serial": 5,
  "transport_name": "Metro Carriers",
  "vehicle_type": "2 Wheeler",
  "vehicle_number": "DL-07-GH-6789",
  "driver_name": "Dinesh Sharma",
  "driver_phone": "+91-7654321098",
  "notes": "VIP transport",
  "entry_time": "2025-08-10T09:15:30",
  "status": "Parked",
  "parking_fee": 0.00,
  "payment_status": "Unpaid",
  "payment_type": "N/A",
  "exit_time": null,
  "location_id": 3,
  "duration_hours": 147.25
}
```

### 🎯 **Realistic Data Patterns**

#### **Vehicle Numbers**: Indian format
- States: KA, MH, TN, AP, GJ, RJ, UP, DL, PB
- Format: `STATE-DISTRICT-SERIES-NUMBER`
- Examples: `KA-23-AB-4567`, `MH-12-CD-8901`

#### **Transport Companies**: Realistic Indian names
- Prefixes: Shree, Sri, Bharat, Express, Speed, Fast, Royal, Prime, Elite, Metro
- Suffixes: Transport, Logistics, Cargo, Express, Lines, Services, Movers, Carriers
- Examples: "Express Logistics", "Prime Transport", "Bharat Cargo"

#### **Driver Names**: Common Indian names
- First: Rajesh, Suresh, Mahesh, Ramesh, Dinesh, Mukesh, Naresh, Rakesh, Umesh, Hitesh
- Last: Kumar, Singh, Sharma, Patel, Gupta, Verma, Yadav, Mishra, Joshi, Shah
- 10% chance of "N/A" (no driver info)

#### **Phone Numbers**: Indian mobile format
- Format: `+91-XXXXXXXXXX` (starting with 7, 8, or 9)
- 15% chance of "N/A"

#### **Business Logic Preserved**
- **Fee Calculation**: Matches existing `days * rate` algorithm
- **Status Consistency**: Parked vehicles have no exit_time, Exited vehicles have exit_time
- **Payment Logic**: Unpaid vehicles have payment_type = "N/A"
- **Daily Serials**: Sequential numbering per location per day

#### **Time Patterns**: Realistic business hours
- Entry times: 6 AM to 10 PM (business hours)
- Duration: 1 hour to 5 days (realistic parking durations)
- Date range: Last 90 days (weighted toward recent dates)

#### **Location Distribution**: Multi-tenant realistic
- Main Location: 80% (primary site)
- North Terminal: 13% (secondary site)  
- South Terminal: 7% (smaller site)

#### **Vehicle Type Distribution**: Realistic traffic
- Trailer: 35% (heavy commercial)
- 6 Wheeler: 25% (medium commercial)
- 4 Wheeler: 25% (light commercial)
- 2 Wheeler: 15% (personal/delivery)

#### **Status Distribution**: Operating reality
- Exited: 85% (completed visits)
- Parked: 15% (current occupancy)

#### **Payment Distribution**: Business patterns
- Paid: 90% of exited vehicles
- Payment types: Cash (60%), UPI (20%), Credit Card (15%), Online (5%)

### 🔍 **Data Quality Features**

- **No Duplicates**: Unique vehicle numbers per location for parked vehicles
- **Constraint Compliance**: All data respects database constraints
- **Audit Trail**: All test records marked with `created_by = 'Test Generator'`
- **Easy Cleanup**: `SELECT cleanup_test_data()` removes all test data
- **Performance Ready**: Optimized for index testing and query validation

### 🧪 **Usage for Testing**

```sql
-- Generate the test data
\i test_data_generator.sql

-- Query examples with realistic results
SELECT COUNT(*) FROM parking_entries WHERE status = 'Parked';
-- Returns: ~225 currently parked vehicles

SELECT vehicle_type, COUNT(*) 
FROM parking_entries 
GROUP BY vehicle_type 
ORDER BY COUNT(*) DESC;
-- Returns: Trailer (525), 6 Wheeler (375), 4 Wheeler (375), 2 Wheeler (225)

SELECT AVG(parking_fee) 
FROM parking_entries 
WHERE payment_status = 'Paid';
-- Returns: ~₹156.75 average fee

-- Test performance
SELECT * FROM validate_index_performance();
-- Validates sub-second query performance

-- Clean up when done
SELECT cleanup_test_data();
-- Removes all 1500 test records
```

This test data provides a comprehensive, realistic dataset for validating database performance, testing queries, and ensuring the system can handle production-scale data loads.