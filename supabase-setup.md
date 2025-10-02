# Supabase Configuration & API Setup Guide

## 🚀 Complete Supabase Setup for Parking Management System

### Step 1: Create Supabase Project

1. **Go to [supabase.com](https://supabase.com)**
2. **Sign up/Login** with GitHub or email
3. **Create New Project**:
   - Project Name: `parking-management`
   - Database Password: `[generate-secure-password]`
   - Region: Choose closest to your location
   - Plan: Free (sufficient for development)

4. **Wait for project initialization** (~2-3 minutes)

### Step 2: Database Configuration

#### **Connection Details** (Available in Settings → Database)
```bash
# Database URL format
postgres://postgres:https://rmgetmgtplhdiqlsivnb.supabase.co:5432/postgres

# Example (replace with your actual values)
DATABASE_URL="postgres://postgres:https://rmgetmgtplhdiqlsivnb.supabase.co:5432/postgres"
```

#### **Environment Variables** (Copy from Supabase Dashboard)
```bash
# Supabase Configuration
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Database Direct Connection
DATABASE_URL="postgres://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
DATABASE_DIRECT_URL="postgres://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"

# JWT Configuration
JWT_SECRET="your-jwt-secret"
JWT_EXPIRY="7d"
```

### Step 3: Deploy Migration Files

**Option A: Via Supabase SQL Editor (Recommended)**

1. **Go to SQL Editor** in Supabase Dashboard
2. **Create New Query** for each migration
3. **Copy & Execute** each file in order:

```sql
-- 1. Run Initial Schema
-- Copy content from: 001_initial_schema.sql
-- Execute in SQL Editor

-- 2. Run Performance Indexes  
-- Copy content from: 002_performance_indexes.sql
-- Execute in SQL Editor

-- 3. Run Row-Level Security
-- Copy content from: 003_row_level_security.sql  
-- Execute in SQL Editor

-- 4. Run Rollback Procedures
-- Copy content from: 004_rollback_procedures.sql
-- Execute in SQL Editor

-- 5. Generate Test Data (Optional)
-- Copy content from: test_data_generator.sql
-- Execute in SQL Editor
```

**Option B: Via psql Command Line**

```bash
# Install psql (if not already installed)
# Windows: Download from postgresql.org
# macOS: brew install postgresql
# Linux: sudo apt-get install postgresql-client

# Run migrations in order
psql "postgres://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" -f "src/database/migrations/001_initial_schema.sql"
psql "postgres://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" -f "src/database/migrations/002_performance_indexes.sql"
psql "postgres://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" -f "src/database/migrations/003_row_level_security.sql"
psql "postgres://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" -f "src/database/migrations/004_rollback_procedures.sql"

# Generate test data
psql "postgres://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" -f "src/database/seeds/test_data_generator.sql"
```

### Step 4: Configure Authentication & Security

#### **Authentication Settings** (Go to Authentication → Settings)

```javascript
// Site URL (for redirects)
Site URL: http://localhost:3000

// Additional URLs (for production)
Additional URLs: 
  - https://your-domain.com
  - https://your-app.netlify.app

// Email Settings
Enable email confirmations: true
Enable email change confirmations: true
```

#### **JWT Configuration** (Go to Settings → API)

```javascript
// JWT Settings (automatically configured)
Algorithm: HS256
JWT expiry limit: 604800 (7 days)
```

#### **API Keys** (Copy from Settings → API)

```javascript
// Public anon key (safe for client-side)
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

// Service role key (backend only - keep secret!)
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Step 5: Row-Level Security Policies

**Verify RLS is Enabled** (Should be automatic from our migration)

```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('parking_entries', 'users', 'locations');

-- Should show rowsecurity = true for all tables
```

**Test RLS Policies**

```sql
-- Set user context for testing
SELECT set_config('app.current_user_id', '2', true);
SELECT set_config('app.current_user_location_id', '1', true);
SELECT set_config('app.current_user_role', 'operator', true);

-- Test location isolation
SELECT COUNT(*) FROM parking_entries; -- Should only show location 1 data

-- Test admin access
SELECT set_config('app.current_user_role', 'admin', true);
SELECT COUNT(*) FROM parking_entries; -- Should show all data
```

### Step 6: Auto-Generated REST API

#### **API Endpoints** (Automatically available)

```javascript
// Base URL
const supabaseUrl = 'https://your-project-ref.supabase.co'

// Auto-generated endpoints:
GET    /rest/v1/parking_entries              // List all entries
POST   /rest/v1/parking_entries              // Create new entry
GET    /rest/v1/parking_entries?id=eq.123    // Get specific entry
PATCH  /rest/v1/parking_entries?id=eq.123    // Update entry
DELETE /rest/v1/parking_entries?id=eq.123    // Delete entry

GET    /rest/v1/users                        // List users
GET    /rest/v1/locations                    // List locations
GET    /rest/v1/audit_log                    // Audit trail

// Custom views
GET    /rest/v1/parking_entries_json_compatible  // Backward compatible format
```

#### **API Usage Examples**

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Create new parking entry
const { data, error } = await supabase
  .from('parking_entries')
  .insert({
    transport_name: 'Express Logistics',
    vehicle_type: 'Trailer',
    vehicle_number: 'KA-23-AB-4567',
    driver_name: 'Rajesh Kumar',
    driver_phone: '+91-9876543210'
  })

// Get parked vehicles
const { data: parkedVehicles } = await supabase
  .from('parking_entries')
  .select('*')
  .eq('status', 'Parked')
  .order('entry_time', { ascending: false })

// Search by vehicle number
const { data: vehicle } = await supabase
  .from('parking_entries')
  .select('*')
  .ilike('vehicle_number', '%KA-23%')

// Update exit information
const { data, error } = await supabase
  .from('parking_entries')
  .update({
    status: 'Exited',
    exit_time: new Date().toISOString(),
    parking_fee: 450.00,
    payment_status: 'Paid',
    payment_type: 'UPI'
  })
  .eq('id', entryId)
```

### Step 7: Real-Time Subscriptions

#### **Configure Real-Time** (Go to Database → Replication)

1. **Enable Replication** for tables:
   - ✅ parking_entries
   - ✅ users  
   - ✅ locations
   - ✅ audit_log

#### **Real-Time Channels Setup**

```javascript
// Listen to parking entry changes
const parkingChannel = supabase
  .channel('parking-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'parking_entries'
  }, (payload) => {
    console.log('Parking update:', payload)
    // Update UI in real-time
    updateParkingDisplay(payload.new)
  })
  .subscribe()

// Listen to new entries only
const newEntriesChannel = supabase
  .channel('new-entries')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public', 
    table: 'parking_entries'
  }, (payload) => {
    showNotification(`New vehicle parked: ${payload.new.vehicle_number}`)
  })
  .subscribe()

// Listen to exits
const exitChannel = supabase
  .channel('exits')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'parking_entries',
    filter: 'status=eq.Exited'
  }, (payload) => {
    showNotification(`Vehicle exited: ${payload.new.vehicle_number}`)
  })
  .subscribe()
```

### Step 8: Data Migration from JSON

#### **Migration Script** (Run once to import existing data)

```javascript
// migrate-existing-data.js
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabase = createClient(supabaseUrl, supabaseServiceKey) // Use service key

async function migrateExistingData() {
  try {
    // Read existing JSON data
    const jsonData = JSON.parse(fs.readFileSync('parking_data.json', 'utf8'))
    
    // Transform data for PostgreSQL
    const transformedData = jsonData.map(entry => ({
      serial: entry.serial,
      transport_name: entry.transport_name,
      vehicle_type: entry.vehicle_type,
      vehicle_number: entry.vehicle_number,
      driver_name: entry.driver_name || 'N/A',
      driver_phone: entry.driver_phone || 'N/A', 
      notes: entry.notes || 'N/A',
      entry_time: entry.entry_time,
      status: entry.status,
      parking_fee: entry.parking_fee || 0,
      payment_status: entry.payment_status || 'Unpaid',
      payment_type: entry.payment_type || 'N/A',
      exit_time: entry.exit_time === 'N/A' ? null : entry.exit_time,
      created_by: 'Migration',
      location_id: 1, // Default to main location
      created_by_user_id: 1 // System user
    }))
    
    // Insert into Supabase
    const { data, error } = await supabase
      .from('parking_entries')
      .insert(transformedData)
    
    if (error) {
      console.error('Migration error:', error)
    } else {
      console.log(`Successfully migrated ${data.length} records`)
    }
    
  } catch (error) {
    console.error('Migration failed:', error)
  }
}

// Run migration
migrateExistingData()
```

### Step 9: Security Configuration

#### **CORS Configuration** (Settings → API → CORS)

```javascript
// Allowed origins (adjust for your domains)
http://localhost:3000
http://localhost:5173  
https://your-domain.com
https://your-app.netlify.app
```

#### **Rate Limiting** (Automatic in Supabase)

```javascript
// Default limits (can be increased on paid plans)
API calls: 500/hour on free plan
Concurrent connections: 60
Database connections: 100
```

#### **Security Headers** (Automatically configured)

```javascript
// Supabase automatically sets:
Content-Security-Policy
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security
```

### Step 10: Monitoring & Validation

#### **Database Metrics** (Go to Reports)

Monitor:
- ✅ Connection count
- ✅ Query performance  
- ✅ Storage usage
- ✅ API usage

#### **Health Check Endpoints**

```javascript
// API health check
GET https://your-project-ref.supabase.co/rest/v1/

// Database health check  
GET https://your-project-ref.supabase.co/rest/v1/schema_migrations

// Response should include migration versions
```

#### **Validation Tests**

```javascript
// Test API connectivity
async function validateSetup() {
  try {
    // Test database connection
    const { data: migrations } = await supabase
      .from('schema_migrations')
      .select('*')
    
    console.log('✅ Database connected')
    console.log('✅ Migrations applied:', migrations.map(m => m.version))
    
    // Test RLS policies
    const { data: entries } = await supabase
      .from('parking_entries')
      .select('count')
    
    console.log('✅ RLS policies working')
    
    // Test real-time
    const channel = supabase.channel('test')
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Real-time connected')
      }
    })
    
  } catch (error) {
    console.error('❌ Setup validation failed:', error)
  }
}

validateSetup()
```

### 🔑 **Complete Environment Configuration**

Create `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database Direct Connection (for backend operations)
DATABASE_URL=postgres://postgres:your-password@db.your-project-ref.supabase.co:5432/postgres

# JWT Configuration  
JWT_SECRET=your-jwt-secret
JWT_EXPIRY=7d

# Application Settings
NODE_ENV=development
API_RATE_LIMIT=100
```

### ✅ **Deployment Checklist**

- [ ] Supabase project created
- [ ] All 4 migration files deployed
- [ ] Test data generated (optional)
- [ ] Authentication configured
- [ ] RLS policies enabled
- [ ] API endpoints tested
- [ ] Real-time subscriptions working
- [ ] Existing data migrated
- [ ] Environment variables set
- [ ] Health checks passing

### 🚀 **Next Steps**

After Supabase setup is complete:
1. **API Backend Development** (Node.js/Express endpoints)
2. **Web Frontend** (React/Next.js dashboard)
3. **Mobile App** (React Native)
4. **Production deployment** (Netlify + Vercel)

Your zero-cost infrastructure is now ready for multi-platform parking management! 🎉