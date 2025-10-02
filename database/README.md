# 🎯 Flexible Shift Management System - Database Implementation

## Overview

This is a comprehensive **event-driven shift management database schema** designed for parking management web applications. The system eliminates fixed scheduling constraints and operates based on real-time employee actions, providing flexible shift timing, seamless handovers, and comprehensive reporting.

## 🏗️ Architecture Features

### **Event-Driven Design**
- **Dynamic Timing**: Shift boundaries determined by actual "Change Shift" button presses
- **No Fixed Schedules**: Eliminates predetermined 6AM-6PM constraints
- **Independent Sessions**: Each shift session is completely autonomous
- **Real-time Updates**: Instant dashboard synchronization via Supabase Realtime

### **Core Components**
- **Shift Sessions**: Track individual shift instances with flexible timing
- **Shift Changes**: Complete audit trail for all handover events
- **Parking Integration**: Automatic assignment of parking activities to active shifts
- **Real-time Statistics**: Live performance metrics and reporting
- **Security Framework**: Row Level Security with role-based access control

## 📁 File Structure

```
database/
├── migrations/
│   ├── 001_create_shift_management_schema.sql   # Core tables and constraints
│   ├── 002_setup_realtime_integration.sql       # Supabase Realtime triggers
│   ├── 003_setup_row_level_security.sql         # RLS policies and access control
│   ├── 004_shift_management_functions.sql       # Business logic functions
│   ├── 005_parking_shift_integration.sql        # Parking table integration
│   └── 006_test_and_validation.sql              # Testing and validation suite
├── deploy_shift_management.sql                  # Complete deployment script
└── README.md                                    # This documentation
```

## 🚀 Deployment

### Prerequisites

1. **Supabase Project** with PostgreSQL database
2. **Realtime enabled** for your Supabase project
3. **Authentication setup** (auth.users table)
4. **Existing parking_entries table** (will be enhanced with shift tracking)
5. **Database privileges** (CREATE, ALTER, etc.)

### Quick Deployment

Run the complete deployment script:

```sql
\i database/deploy_shift_management.sql
```

### Manual Migration

Execute migrations in order:

```sql
-- 1. Core schema
\i database/migrations/001_create_shift_management_schema.sql

-- 2. Realtime integration
\i database/migrations/002_setup_realtime_integration.sql

-- 3. Security policies
\i database/migrations/003_setup_row_level_security.sql

-- 4. Business logic functions
\i database/migrations/004_shift_management_functions.sql

-- 5. Parking integration
\i database/migrations/005_parking_shift_integration.sql

-- 6. Testing suite
\i database/migrations/006_test_and_validation.sql
```

### Post-Deployment Validation

```sql
-- Run comprehensive test suite
SELECT run_shift_management_tests();

-- Check deployment status
SELECT * FROM deployment_log ORDER BY executed_at DESC;

-- View usage examples
SELECT show_usage_examples();
```

## 💾 Database Schema

### Core Tables

#### **shift_sessions**
```sql
CREATE TABLE shift_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  employee_name VARCHAR(255) NOT NULL,
  employee_phone VARCHAR(20),
  shift_start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shift_end_time TIMESTAMPTZ NULL,
  status shift_status_enum DEFAULT 'active',
  opening_cash_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  closing_cash_amount DECIMAL(10,2) NULL,
  shift_notes TEXT,
  -- Generated columns for convenience
  cash_discrepancy DECIMAL(10,2) GENERATED ALWAYS AS (...) STORED,
  shift_duration_minutes INTEGER GENERATED ALWAYS AS (...) STORED
);
```

#### **shift_changes**
```sql
CREATE TABLE shift_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  previous_shift_session_id UUID REFERENCES shift_sessions(id),
  new_shift_session_id UUID REFERENCES shift_sessions(id),
  change_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  handover_notes TEXT,
  cash_transferred DECIMAL(10,2),
  pending_issues TEXT,
  outgoing_employee_id UUID,
  incoming_employee_id UUID,
  change_type change_type_enum DEFAULT 'normal'
);
```

#### **Enhanced parking_entries**
```sql
-- Added to existing table
ALTER TABLE parking_entries
ADD COLUMN shift_session_id UUID REFERENCES shift_sessions(id);
```

### Enums

```sql
CREATE TYPE shift_status_enum AS ENUM ('active', 'completed', 'emergency_ended');
CREATE TYPE change_type_enum AS ENUM ('normal', 'emergency', 'extended', 'overlap');
```

## 🔧 Core Functions

### Shift Operations

```sql
-- Start a new shift
SELECT start_shift(
  employee_id UUID,
  employee_name VARCHAR,
  employee_phone VARCHAR DEFAULT NULL,
  opening_cash DECIMAL DEFAULT 0,
  shift_notes TEXT DEFAULT NULL
) RETURNS UUID;

-- End a shift
SELECT end_shift(
  shift_id UUID,
  closing_cash DECIMAL,
  shift_notes TEXT DEFAULT NULL,
  emergency_end BOOLEAN DEFAULT FALSE,
  supervisor_id UUID DEFAULT NULL
) RETURNS JSONB;

-- Perform shift handover
SELECT perform_shift_handover(
  outgoing_shift_id UUID,
  incoming_employee_id UUID,
  incoming_employee_name VARCHAR,
  incoming_employee_phone VARCHAR DEFAULT NULL,
  closing_cash DECIMAL,
  opening_cash DECIMAL,
  handover_notes TEXT DEFAULT NULL,
  pending_issues TEXT DEFAULT NULL
) RETURNS JSONB;
```

### Information Retrieval

```sql
-- Get current active shift
SELECT get_current_active_shift();

-- Get shift statistics
SELECT get_shift_statistics(shift_id UUID);

-- Generate comprehensive report
SELECT generate_shift_report(shift_id UUID);

-- Get daily summary
SELECT get_daily_shift_summary(date DEFAULT CURRENT_DATE);
```

## 🔄 Real-time Integration

### Supabase Realtime Setup

The system automatically broadcasts changes to these channels:

- **shift-management**: Shift session changes
- **shift-changes**: Handover events
- **parking-updates**: Parking activity updates

### Frontend Integration Example

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);

// Subscribe to shift changes
const shiftChannel = supabase
  .channel('shift-management')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'shift_sessions'
  }, (payload) => {
    updateDashboard(payload);
  })
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'parking_entries'
  }, (payload) => {
    updateShiftStatistics(payload);
  })
  .subscribe();
```

## 🔒 Security & Access Control

### Row Level Security

The system implements comprehensive RLS policies:

- **Operators**: Can only access their own shifts
- **Supervisors/Managers**: Can access all shifts
- **Audit Protection**: Shift changes are immutable except by supervisors

### Role Configuration

Configure user roles in JWT claims:

```json
{
  "role": "supervisor", // or "manager", "employee"
  "employee_id": "uuid-here"
}
```

### Security Functions

```sql
-- Check if user has supervisor privileges
SELECT is_supervisor_or_manager();

-- Get current user's employee ID
SELECT current_employee_id();

-- Check access to specific employee data
SELECT can_access_employee_data(target_employee_id);
```

## 📊 Reporting & Analytics

### Shift Statistics View

```sql
SELECT * FROM shift_statistics
WHERE shift_id = 'your-shift-id';
```

Returns comprehensive metrics:
- Vehicle entry/exit counts
- Revenue and payment statistics
- Performance metrics (vehicles/hour, efficiency score)
- Real-time duration and status

### Report Generation

```sql
-- Comprehensive shift report
SELECT generate_shift_report('shift-id');

-- Revenue breakdown
SELECT get_shift_revenue_breakdown('shift-id');

-- Current activity
SELECT get_current_shift_parking_activity();
```

## 🧪 Testing

### Run Test Suite

```sql
-- Complete validation
SELECT run_shift_management_tests();

-- Individual test categories
SELECT * FROM validate_shift_constraints();
SELECT * FROM validate_parking_integration();
SELECT * FROM test_query_performance();
```

### Create Test Data

```sql
-- Generate test scenario
SELECT create_test_shift_scenario();

-- Clean up test data
SELECT cleanup_test_data();
```

## 🎮 Usage Examples

### Basic Workflow

```sql
-- 1. Start shift
SELECT start_shift(
  auth.uid(),
  'John Smith',
  '+1234567890',
  100.00,
  'Morning shift'
);

-- 2. Parking entries automatically assigned to active shift
INSERT INTO parking_entries (vehicle_number, vehicle_type, ...)
VALUES ('ABC123', 'Car', ...);

-- 3. Monitor real-time statistics
SELECT get_current_active_shift();
SELECT get_shift_statistics(current_shift_id);

-- 4. Perform handover
SELECT perform_shift_handover(
  current_shift_id,
  next_employee_id,
  'Jane Doe',
  '+0987654321',
  150.00, -- closing cash
  120.00, -- opening cash
  'Handover notes',
  'No pending issues'
);
```

### Emergency Procedures

```sql
-- Emergency shift end (requires supervisor)
SELECT end_shift(
  shift_id,
  emergency_cash_count,
  'Emergency: staff illness',
  TRUE, -- emergency flag
  supervisor_id
);
```

## 🚨 Business Rules & Constraints

### Automatic Enforcement

- **Single Active Shift**: Only one active shift allowed at any time
- **Cash Validation**: Opening/closing amounts must be non-negative
- **Timing Constraints**: Shift end time must be after start time
- **Handover Requirements**: Closing cash mandatory for shift completion
- **Audit Integrity**: Completed shifts immutable without supervisor approval

### Data Integrity

- **Foreign Key Constraints**: Ensure referential integrity
- **Generated Columns**: Automatic calculation of duration and discrepancies
- **Triggers**: Business logic validation before data changes
- **Indexes**: Optimized performance for common queries

## 📈 Performance Optimization

### Indexes

- **Active Shift Lookup**: Unique index on active status
- **Employee Access**: Index on employee_id for RLS
- **Time-based Queries**: Index on shift_start_time
- **Parking Integration**: Index on shift_session_id

### Query Performance

The system includes performance monitoring:

```sql
SELECT * FROM test_query_performance();
```

Expected performance targets:
- Active shift lookup: <1ms
- Shift statistics: <10ms
- Parking-shift joins: <5ms

## 🔄 Migration & Rollback

### Backup Before Migration

```sql
-- Backup existing data
pg_dump your_database > backup_before_shift_migration.sql
```

### Rollback Procedure

```sql
-- Emergency rollback (development only)
SELECT rollback_shift_management_schema();
```

⚠️ **Warning**: Rollback removes all shift management data

## 🐛 Troubleshooting

### Common Issues

1. **No Active Shift Error**
   ```sql
   -- Check for active shifts
   SELECT * FROM shift_sessions WHERE status = 'active';

   -- Start new shift if none exists
   SELECT start_shift(...);
   ```

2. **Permission Denied**
   ```sql
   -- Check RLS policies
   SELECT * FROM pg_policies WHERE tablename = 'shift_sessions';

   -- Verify user role
   SELECT auth.jwt() ->> 'role';
   ```

3. **Realtime Not Working**
   ```sql
   -- Check publication
   SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

   -- Verify triggers
   SELECT * FROM pg_trigger WHERE tgname LIKE '%realtime%';
   ```

### Debug Functions

```sql
-- Check system status
SELECT get_current_active_shift();

-- Validate constraints
SELECT * FROM validate_shift_constraints();

-- Performance check
SELECT * FROM test_query_performance();
```

## 📞 Support

For issues or questions:

1. Check the test suite results: `SELECT run_shift_management_tests()`
2. Review deployment logs: `SELECT * FROM deployment_log`
3. Validate business rules: `SELECT * FROM validate_shift_constraints()`
4. Check usage examples: `SELECT show_usage_examples()`

## 📝 Version History

- **v1.0.0**: Initial implementation with event-driven architecture
  - Core shift management with flexible timing
  - Real-time updates via Supabase
  - Comprehensive security and audit trail
  - Parking integration and reporting
  - Full test suite and validation

---

**🎯 Ready to implement flexible shift management with real-time capabilities and comprehensive audit trails!**