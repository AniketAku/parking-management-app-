/**
 * Database Migration Script
 * Executes the missing columns migration using Node.js and Supabase client
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Supabase configuration
const supabaseUrl = 'https://jmckgqtjbezxhsqcfezu.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptY2tncXRqYmV6eGhzcWNmZXp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjA4MjcwOCwiZXhwIjoyMDQ3NjU4NzA4fQ.zGNa-iMEQYl8mxP14UUaWoVBXLjLHSEy6_5RQo-7YJE'

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  console.log('🔧 Starting Database Migration...')
  console.log('=====================================')

  try {
    // Check current schema
    console.log('\n1️⃣ Checking current schema...')
    const { data: columns, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'parking_entries')

    if (schemaError) {
      console.error('❌ Error checking schema:', schemaError)
      return
    }

    const existingColumns = columns?.map(col => col.column_name) || []
    const requiredColumns = ['actual_fee', 'payment_method', 'calculated_fee', 'driver_phone']
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col))

    console.log('✅ Current columns:', existingColumns.filter(col => requiredColumns.includes(col)))
    console.log('❌ Missing columns:', missingColumns)

    if (missingColumns.length === 0) {
      console.log('\n✅ All required columns already exist!')
      return
    }

    // Execute migration SQL
    console.log('\n2️⃣ Executing migration SQL...')

    const migrationSQL = `
    DO $$
    DECLARE
        updated_count INTEGER;
    BEGIN
        -- Add actual_fee column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'parking_entries' AND column_name = 'actual_fee'
        ) THEN
            ALTER TABLE parking_entries ADD COLUMN actual_fee DECIMAL(10,2);
            RAISE NOTICE '✅ Added actual_fee column';
        ELSE
            RAISE NOTICE 'ℹ️ actual_fee column already exists';
        END IF;

        -- Add payment_method column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'parking_entries' AND column_name = 'payment_method'
        ) THEN
            ALTER TABLE parking_entries ADD COLUMN payment_method VARCHAR(50);
            RAISE NOTICE '✅ Added payment_method column';
        ELSE
            RAISE NOTICE 'ℹ️ payment_method column already exists';
        END IF;

        -- Add calculated_fee column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'parking_entries' AND column_name = 'calculated_fee'
        ) THEN
            ALTER TABLE parking_entries ADD COLUMN calculated_fee DECIMAL(10,2);
            RAISE NOTICE '✅ Added calculated_fee column';
        ELSE
            RAISE NOTICE 'ℹ️ calculated_fee column already exists';
        END IF;

        -- Add driver_phone column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'parking_entries' AND column_name = 'driver_phone'
        ) THEN
            ALTER TABLE parking_entries ADD COLUMN driver_phone VARCHAR(20);
            RAISE NOTICE '✅ Added driver_phone column';
        ELSE
            RAISE NOTICE 'ℹ️ driver_phone column already exists';
        END IF;

        -- Update status values from 'Parked' to 'Active' if needed
        UPDATE parking_entries SET status = 'Active' WHERE status = 'Parked';
        GET DIAGNOSTICS updated_count = ROW_COUNT;

        IF updated_count > 0 THEN
            RAISE NOTICE '✅ Updated % records from "Parked" to "Active" status', updated_count;
        ELSE
            RAISE NOTICE 'ℹ️ No status updates needed';
        END IF;

    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ Error: %', SQLERRM;
            RAISE;
    END $$;
    `

    const { data, error } = await supabase.rpc('exec', { sql: migrationSQL })

    if (error) {
      console.error('❌ Migration failed:', error)
      console.log('\n⚠️ Trying alternative approach...')

      // Try adding columns individually
      for (const column of missingColumns) {
        await addColumn(column)
      }
    } else {
      console.log('✅ Migration SQL executed successfully')
    }

    // Verify migration
    console.log('\n3️⃣ Verifying migration...')
    const { data: newColumns, error: verifyError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'parking_entries')
      .in('column_name', requiredColumns)

    if (verifyError) {
      console.error('❌ Error verifying migration:', verifyError)
    } else {
      console.log('✅ Migration verification:')
      newColumns?.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
      })
    }

    console.log('\n🎉 Database migration completed!')

  } catch (error) {
    console.error('❌ Migration failed:', error)
  }
}

async function addColumn(columnName) {
  const columnDefinitions = {
    'actual_fee': 'DECIMAL(10,2)',
    'payment_method': 'VARCHAR(50)',
    'calculated_fee': 'DECIMAL(10,2)',
    'driver_phone': 'VARCHAR(20)'
  }

  const columnType = columnDefinitions[columnName]
  if (!columnType) {
    console.error(`❌ Unknown column type for ${columnName}`)
    return
  }

  try {
    console.log(`  Adding ${columnName}...`)
    const sql = `ALTER TABLE parking_entries ADD COLUMN IF NOT EXISTS ${columnName} ${columnType};`

    const { error } = await supabase.rpc('exec', { sql })

    if (error) {
      console.error(`❌ Failed to add ${columnName}:`, error)
    } else {
      console.log(`✅ Added ${columnName}`)
    }
  } catch (error) {
    console.error(`❌ Error adding ${columnName}:`, error)
  }
}

// Run the migration
runMigration().then(() => {
  console.log('\n✅ Migration script completed')
  process.exit(0)
}).catch(error => {
  console.error('❌ Migration script failed:', error)
  process.exit(1)
})