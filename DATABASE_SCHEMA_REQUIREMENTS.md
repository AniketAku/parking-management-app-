# Database Schema Requirements

## Overview
This document outlines the required database schema configuration for the Parking Management System to ensure proper functioning of Supabase PostgREST automatic relationship queries.

## Critical Foreign Key Relationships

### 1. shift_sessions → users
**Relationship**: shift_sessions.user_id → users.id

**Required Configuration**:
```sql
ALTER TABLE shift_sessions
ADD CONSTRAINT fk_shift_sessions_user_id
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

**Purpose**: Enables automatic relationship queries like `users:user_id(id,email,role)` in ShiftReportService methods.

**Impact if Missing**:
- PGRST200 errors: "Could not find a relationship between 'shift_sessions' and 'user_id'"
- Requires manual join logic (implemented as fallback)

### 2. Other Required Relationships
Based on the codebase analysis, ensure these relationships are properly configured:

```sql
-- shift_sessions table foreign keys
ALTER TABLE shift_sessions
ADD CONSTRAINT fk_shift_sessions_user_id
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add other foreign key constraints as needed for the application
```

## Table Structure Requirements

### users table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR NOT NULL UNIQUE,
    role VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### shift_sessions table
```sql
CREATE TABLE shift_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Row Level Security (RLS) Configuration

Ensure RLS policies allow the application to:
1. Read user data for shift report generation
2. Query shift_sessions with user relationships
3. Aggregate data across tables for statistics

Example policies:
```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_sessions ENABLE ROW LEVEL SECURITY;

-- Basic read policy for shift reports
CREATE POLICY "Allow read access for shift reports" ON users
    FOR SELECT USING (true);

CREATE POLICY "Allow read access for shift data" ON shift_sessions
    FOR SELECT USING (true);
```

## Verification Queries

To verify the schema is correctly configured:

```sql
-- Check foreign key constraints
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('shift_sessions', 'users');

-- Test automatic relationship query
-- This should work without errors when schema is properly configured:
-- GET /rest/v1/shift_sessions?select=*,users:user_id(id,email,role)
```

## Migration Notes

If upgrading from the manual join implementation:
1. Ensure foreign key constraints are in place
2. Test automatic relationship queries in Supabase API
3. Update ShiftReportService.ts to use automatic relationships if desired
4. Keep manual join fallback for compatibility

## Troubleshooting

**Error**: "Could not find a relationship between 'shift_sessions' and 'user_id'"
**Solution**: Verify foreign key constraint exists and is properly named

**Error**: RLS policy blocks automatic joins
**Solution**: Review and update RLS policies to allow cross-table access

**Performance**: For large datasets, ensure proper indexing on foreign key columns:
```sql
CREATE INDEX idx_shift_sessions_user_id ON shift_sessions(user_id);
```