# Deploy to Your Supabase Project

## 🎯 **Your Project Details**
- **Project URL**: `https://rmgetmgtplhdiqlsivnb.supabase.co`
- **Anon Key**: Already configured ✅
- **Project Ref**: `rmgetmgtplhdiqlsivnb`

## 🚀 **Step-by-Step Deployment**

### **Step 1: Complete Environment Setup**

1. **Get Service Role Key**:
   - Go to [Supabase Dashboard](https://supabase.com/dashboard/project/rmgetmgtplhdiqlsivnb/settings/api)
   - Copy the `service_role` key (NOT the anon key)
   - Update `.env.local` file:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_SERVICE_KEY_HERE
   ```

2. **Get Database Password**:
   - You set this during project creation
   - Update `.env.local` file:
   ```bash
   DATABASE_URL=postgres://postgres:YOUR_PASSWORD@db.rmgetmgtplhdiqlsivnb.supabase.co:5432/postgres
   ```

### **Step 2: Deploy Database Schema**

**Option A: Via Supabase SQL Editor (Recommended)**

1. **Go to SQL Editor**: https://supabase.com/dashboard/project/rmgetmgtplhdiqlsivnb/sql/new

2. **Run Migration 1** - Copy and execute:
   ```sql
   -- Copy entire content from: src/database/migrations/001_initial_schema.sql
   -- This creates: tables, ENUMs, constraints, default data
   ```

3. **Run Migration 2** - Copy and execute:
   ```sql
   -- Copy entire content from: src/database/migrations/002_performance_indexes.sql
   -- This creates: 27 performance indexes for sub-second queries
   ```

4. **Run Migration 3** - Copy and execute:
   ```sql
   -- Copy entire content from: src/database/migrations/003_row_level_security.sql
   -- This creates: RLS policies, security functions, audit triggers
   ```

5. **Run Migration 4** - Copy and execute:
   ```sql
   -- Copy entire content from: src/database/migrations/004_rollback_procedures.sql
   -- This creates: rollback procedures and data preservation
   ```

6. **Run Stored Procedures** - Copy and execute:
   ```sql
   -- Copy entire content from: src/database/stored-procedures/parking_procedures.sql
   -- This creates: Custom business logic procedures for API
   ```

**Option B: Via Command Line**

```bash
# Install PostgreSQL client (if not already installed)
# Windows: Download from postgresql.org
# macOS: brew install postgresql
# Linux: sudo apt-get install postgresql-client

# Set your database password
set PGPASSWORD=your_database_password

# Run migrations in order
psql "postgres://postgres:your_password@db.rmgetmgtplhdiqlsivnb.supabase.co:5432/postgres" -f "src/database/migrations/001_initial_schema.sql"
psql "postgres://postgres:your_password@db.rmgetmgtplhdiqlsivnb.supabase.co:5432/postgres" -f "src/database/migrations/002_performance_indexes.sql"
psql "postgres://postgres:your_password@db.rmgetmgtplhdiqlsivnb.supabase.co:5432/postgres" -f "src/database/migrations/003_row_level_security.sql"
psql "postgres://postgres:your_password@db.rmgetmgtplhdiqlsivnb.supabase.co:5432/postgres" -f "src/database/migrations/004_rollback_procedures.sql"
psql "postgres://postgres:your_password@db.rmgetmgtplhdiqlsivnb.supabase.co:5432/postgres" -f "src/database/stored-procedures/parking_procedures.sql"
```

### **Step 3: Generate Test Data (Optional)**

**Via SQL Editor**:
```sql
-- Copy entire content from: src/database/seeds/test_data_generator.sql
-- This creates: 1,500 realistic test records for performance validation
```

**Expected Output**:
```
=== TEST DATA VALIDATION SUMMARY ===
Total test records: 1500
Currently parked: 225
Exited vehicles: 1275
Average parking fee: ₹156.75
Overstayed vehicles: 18
```

### **Step 4: Configure Authentication**

1. **Go to Authentication Settings**: https://supabase.com/dashboard/project/rmgetmgtplhdiqlsivnb/auth/settings

2. **Configure Site URL**:
   ```
   Site URL: http://localhost:3000
   Additional URLs: 
     - https://your-domain.com
     - https://your-app.netlify.app
   ```

3. **Email Settings** (if using email auth):
   - ✅ Enable email confirmations
   - ✅ Enable email change confirmations

### **Step 5: Enable Real-Time**

1. **Go to Database → Replication**: https://supabase.com/dashboard/project/rmgetmgtplhdiqlsivnb/database/replication

2. **Enable Replication** for these tables:
   - ✅ `parking_entries`
   - ✅ `users`
   - ✅ `locations`
   - ✅ `audit_log`

### **Step 6: Migrate Existing Data**

```bash
# Ensure environment variables are set
# Then run the migration script

cd "C:\Users\Aniket\OneDrive\Desktop\Parking App"
npm install @supabase/supabase-js
node src/scripts/migrate-existing-data.js migrate
```

**Expected Output**:
```
🚀 Starting JSON to Supabase migration...
✅ Backup created: backups/parking_data_backup_2025-08-17.json
✅ Database accessible
✅ Applied migrations: 001, 002, 003, 004
✅ Validated 2 records
✅ Transformed 2 records
📤 Inserting 2 records...
✅ Batch 1/1 completed: 2 records
✅ Data count validated: 2 records
✅ Business logic preserved
🎉 Migration completed successfully!
```

### **Step 7: Test API Connectivity**

**Create test file** `test-connection.js`:
```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://rmgetmgtplhdiqlsivnb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtZ2V0bWd0cGxoZGlxbHNpdm5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NDAzODcsImV4cCI6MjA3MTAxNjM4N30.vXbDc2P3JQeRhDhL24Bs3xKa8B3Y3Y5a8Kh7tOIEZww'
)

async function testConnection() {
  try {
    // Test health check
    const { data: health, error: healthError } = await supabase.rpc('api_health_check')
    if (healthError) throw healthError
    console.log('✅ API Health Check:', health)

    // Test data access
    const { data: entries, error: entriesError } = await supabase
      .from('parking_entries')
      .select('*')
      .limit(5)
    if (entriesError) throw entriesError
    console.log('✅ Data Access:', entries.length, 'records found')

    // Test RPC function
    const { data: stats, error: statsError } = await supabase.rpc('get_daily_statistics')
    if (statsError) throw statsError
    console.log('✅ Statistics RPC:', stats)

    console.log('🎉 All tests passed! Your API is ready.')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testConnection()
```

**Run test**:
```bash
node test-connection.js
```

### **Step 8: Verify Setup**

**Check these endpoints are working**:

1. **REST API**:
   ```bash
   curl "https://rmgetmgtplhdiqlsivnb.supabase.co/rest/v1/parking_entries" \
     -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtZ2V0bWd0cGxoZGlxbHNpdm5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NDAzODcsImV4cCI6MjA3MTAxNjM4N30.vXbDc2P3JQeRhDhL24Bs3xKa8B3Y3Y5a8Kh7tOIEZww"
   ```

2. **Health Check**:
   ```bash
   curl "https://rmgetmgtplhdiqlsivnb.supabase.co/rest/v1/rpc/api_health_check" \
     -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtZ2V0bWd0cGxoZGlxbHNpdm5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NDAzODcsImV4cCI6MjA3MTAxNjM4N60.vXbDc2P3JQeRhDhL24Bs3xKa8B3Y3Y5a8Kh7tOIEZww"
   ```

## ✅ **Deployment Checklist**

- [ ] Service role key added to `.env.local`
- [ ] Database password added to `.env.local`
- [ ] Migration 001: Initial schema deployed
- [ ] Migration 002: Performance indexes deployed  
- [ ] Migration 003: Row-level security deployed
- [ ] Migration 004: Rollback procedures deployed
- [ ] Stored procedures deployed
- [ ] Test data generated (optional)
- [ ] Authentication configured
- [ ] Real-time replication enabled
- [ ] Existing data migrated
- [ ] API connectivity tested
- [ ] Health checks passing

## 🎯 **Next Steps After Deployment**

1. **Test API endpoints** with your data
2. **Configure Row-Level Security** user context
3. **Set up real-time subscriptions** for live updates
4. **Build API backend** (Node.js/Express)
5. **Create web dashboard** (React/Next.js)
6. **Develop mobile app** (React Native)

## 🚨 **Important Notes**

- **Keep service role key secret** - never expose in client-side code
- **Test in development first** before using with production data
- **RLS policies are active** - set user context for proper access
- **Real-time requires subscription** to receive live updates
- **Free tier limits**: 500MB storage, 2GB bandwidth, 500 API calls/hour

Your zero-cost multi-platform parking management infrastructure is ready! 🚀