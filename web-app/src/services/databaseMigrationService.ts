/**
 * Database Migration Service
 * Handles schema updates and migrations for the parking management system
 */

import { supabase } from '../lib/supabase'

export interface MigrationResult {
  success: boolean
  message: string
  details?: string[]
  error?: string
}

export interface SchemaValidationResult {
  missingColumns: string[]
  existingColumns: string[]
  statusNeedsUpdate: boolean
  isValid: boolean
}

class DatabaseMigrationService {
  private readonly REQUIRED_COLUMNS = [
    'actual_fee',
    'payment_method',
    'calculated_fee',
    'driver_phone'
  ]

  /**
   * Check if we're in demo mode
   */
  private isDemoMode(): boolean {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    return !supabaseUrl || !supabaseAnonKey
  }

  /**
   * Validate current database schema
   */
  async validateSchema(): Promise<SchemaValidationResult> {
    try {
      if (this.isDemoMode()) {
        return {
          missingColumns: [],
          existingColumns: this.REQUIRED_COLUMNS,
          statusNeedsUpdate: false,
          isValid: true
        }
      }

      // Query information_schema to check existing columns
      const { data: columns, error } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'parking_entries')

      if (error) {
        console.error('Schema validation error:', error)
        throw new Error(`Failed to validate schema: ${error.message}`)
      }

      const existingColumns = columns?.map(col => col.column_name) || []
      const missingColumns = this.REQUIRED_COLUMNS.filter(
        col => !existingColumns.includes(col)
      )

      // Check if any entries have 'Parked' status that needs updating
      const { data: parkedEntries, error: statusError } = await supabase
        .from('parking_entries')
        .select('id')
        .eq('status', 'Parked')
        .limit(1)

      if (statusError) {
        console.warn('Could not check status values:', statusError)
      }

      const statusNeedsUpdate = !statusError && parkedEntries && parkedEntries.length > 0

      return {
        missingColumns,
        existingColumns: this.REQUIRED_COLUMNS.filter(col => existingColumns.includes(col)),
        statusNeedsUpdate,
        isValid: missingColumns.length === 0 && !statusNeedsUpdate
      }

    } catch (error) {
      console.error('Schema validation failed:', error)
      throw error
    }
  }

  /**
   * Execute database migration to add missing columns
   */
  async runMigration(): Promise<MigrationResult> {
    try {
      if (this.isDemoMode()) {
        return {
          success: true,
          message: 'Demo mode: Migration simulation completed',
          details: [
            '✅ Demo mode detected - no actual database changes needed',
            '✅ All required columns simulated as present',
            '✅ Status values simulated as correct'
          ]
        }
      }

      const validationResult = await this.validateSchema()

      if (validationResult.isValid) {
        return {
          success: true,
          message: 'Database schema is already up to date',
          details: ['✅ All required columns exist', '✅ Status values are correct']
        }
      }

      const migrationSteps: string[] = []
      let allSuccessful = true

      // Add missing columns
      for (const column of validationResult.missingColumns) {
        try {
          const result = await this.addColumn(column)
          if (result.success) {
            migrationSteps.push(`✅ Added column: ${column}`)
          } else {
            migrationSteps.push(`❌ Failed to add column: ${column} - ${result.error}`)
            allSuccessful = false
          }
        } catch (error) {
          migrationSteps.push(`❌ Error adding column ${column}: ${error}`)
          allSuccessful = false
        }
      }

      // Update status values if needed
      if (validationResult.statusNeedsUpdate) {
        try {
          const result = await this.updateStatusValues()
          if (result.success) {
            migrationSteps.push(`✅ Updated status values from 'Parked' to 'Active'`)
          } else {
            migrationSteps.push(`❌ Failed to update status values: ${result.error}`)
            allSuccessful = false
          }
        } catch (error) {
          migrationSteps.push(`❌ Error updating status values: ${error}`)
          allSuccessful = false
        }
      }

      return {
        success: allSuccessful,
        message: allSuccessful
          ? 'Database migration completed successfully'
          : 'Database migration completed with some errors',
        details: migrationSteps
      }

    } catch (error) {
      console.error('Migration failed:', error)
      return {
        success: false,
        message: 'Migration failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: ['❌ Migration process encountered an error']
      }
    }
  }

  /**
   * Add a specific column to the parking_entries table
   */
  private async addColumn(columnName: string): Promise<MigrationResult> {
    const columnDefinitions: Record<string, string> = {
      'actual_fee': 'DECIMAL(10,2)',
      'payment_method': 'VARCHAR(50)',
      'calculated_fee': 'DECIMAL(10,2)',
      'driver_phone': 'VARCHAR(20)'
    }

    const columnType = columnDefinitions[columnName]
    if (!columnType) {
      return {
        success: false,
        error: `Unknown column type for ${columnName}`
      }
    }

    try {
      // Use RPC to execute DDL statement
      const { error } = await supabase.rpc('execute_ddl', {
        sql_statement: `ALTER TABLE parking_entries ADD COLUMN IF NOT EXISTS ${columnName} ${columnType};`
      })

      if (error) {
        // If RPC doesn't exist, try direct SQL (this may not work depending on Supabase configuration)
        console.warn('RPC method failed, attempting direct SQL...')
        throw new Error(`RPC failed: ${error.message}`)
      }

      return {
        success: true,
        message: `Successfully added column ${columnName}`
      }

    } catch (error) {
      console.error(`Failed to add column ${columnName}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Update status values from 'Parked' to 'Active'
   */
  private async updateStatusValues(): Promise<MigrationResult> {
    try {
      const { data, error } = await supabase
        .from('parking_entries')
        .update({ status: 'Active' })
        .eq('status', 'Parked')

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true,
        message: `Successfully updated status values`
      }

    } catch (error) {
      console.error('Failed to update status values:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Create the execute_ddl RPC function if it doesn't exist
   */
  async createMigrationFunction(): Promise<MigrationResult> {
    if (this.isDemoMode()) {
      return {
        success: true,
        message: 'Demo mode: Migration function simulation created'
      }
    }

    try {
      // This would need to be run by a database admin
      const functionSQL = `
        CREATE OR REPLACE FUNCTION execute_ddl(sql_statement TEXT)
        RETURNS VOID AS $$
        BEGIN
          EXECUTE sql_statement;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `

      const { error } = await supabase.rpc('execute_ddl', {
        sql_statement: functionSQL
      })

      if (error) {
        return {
          success: false,
          message: 'Failed to create migration function',
          error: error.message,
          details: [
            'This function needs to be created by a database administrator',
            'Alternatively, run the migration SQL manually in Supabase SQL Editor'
          ]
        }
      }

      return {
        success: true,
        message: 'Migration function created successfully'
      }

    } catch (error) {
      return {
        success: false,
        message: 'Error creating migration function',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Generate SQL script for manual execution
   */
  generateMigrationSQL(): string {
    return `
-- Database Migration Script for Parking Management System
-- Run this in Supabase SQL Editor to add missing columns

-- Create migration function if it doesn't exist
CREATE OR REPLACE FUNCTION execute_ddl(sql_statement TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE sql_statement;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add missing columns to parking_entries table
DO $$
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

    -- Update status values from 'Parked' to 'Active'
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
END $$;

-- Verify the migration
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'parking_entries'
AND column_name IN ('actual_fee', 'payment_method', 'calculated_fee', 'driver_phone')
ORDER BY column_name;
    `.trim()
  }
}

export const databaseMigrationService = new DatabaseMigrationService()
export default databaseMigrationService