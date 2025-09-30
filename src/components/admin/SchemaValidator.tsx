import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { databaseMigrationService, type SchemaValidationResult, type MigrationResult } from '../../services/databaseMigrationService'
import { toast } from 'react-hot-toast'

interface SchemaValidatorProps {
  className?: string
}

export const SchemaValidator: React.FC<SchemaValidatorProps> = ({ className = '' }) => {
  const [validationResult, setValidationResult] = useState<SchemaValidationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  // Auto-validate on component mount
  useEffect(() => {
    validateSchema()
  }, [])

  const validateSchema = async () => {
    setLoading(true)
    try {
      const result = await databaseMigrationService.validateSchema()
      setValidationResult(result)
      setLastChecked(new Date())

      if (result.isValid) {
        toast.success('Database schema is valid')
      } else {
        const issueCount = result.missingColumns.length + (result.statusNeedsUpdate ? 1 : 0)
        toast.warning(`Found ${issueCount} schema issue(s) that need attention`)
      }
    } catch (error) {
      console.error('Schema validation error:', error)
      toast.error('Failed to validate database schema')
      setValidationResult(null)
    } finally {
      setLoading(false)
    }
  }

  const runMigration = async () => {
    if (!validationResult || validationResult.isValid) {
      toast.info('No migration needed - schema is already valid')
      return
    }

    setMigrating(true)
    setMigrationResult(null)

    try {
      const result = await databaseMigrationService.runMigration()
      setMigrationResult(result)

      if (result.success) {
        toast.success('Database migration completed successfully!')
        // Re-validate to update the UI
        await validateSchema()
      } else {
        toast.error(`Migration failed: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Migration error:', error)
      toast.error('Migration process encountered an error')
      setMigrationResult({
        success: false,
        message: 'Migration failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setMigrating(false)
    }
  }

  const generateSQL = () => {
    const sql = databaseMigrationService.generateMigrationSQL()

    // Copy to clipboard
    navigator.clipboard.writeText(sql).then(() => {
      toast.success('Migration SQL copied to clipboard')
    }).catch(() => {
      toast.error('Failed to copy SQL to clipboard')
    })

    // Also log to console for easy access
    console.log('=== DATABASE MIGRATION SQL ===')
    console.log(sql)
    console.log('=== END MIGRATION SQL ===')
  }

  const getStatusIcon = (isValid: boolean) => {
    return isValid ? '✅' : '⚠️'
  }

  const getStatusColor = (isValid: boolean) => {
    return isValid ? 'text-success-600' : 'text-warning-600'
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Schema Status Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary">Database Schema Status</h3>
          <Button
            onClick={validateSchema}
            disabled={loading}
            variant="outline"
            className="px-4 py-2"
          >
            {loading ? '🔄 Checking...' : '🔍 Validate Schema'}
          </Button>
        </CardHeader>
        <CardContent>
          {validationResult ? (
            <div className="space-y-4">
              {/* Overall Status */}
              <div className={`flex items-center gap-3 p-4 rounded-lg ${
                validationResult.isValid ? 'bg-success-50 border border-success-200' : 'bg-warning-50 border border-warning-200'
              }`}>
                <span className="text-2xl">{getStatusIcon(validationResult.isValid)}</span>
                <div>
                  <p className={`font-semibold ${getStatusColor(validationResult.isValid)}`}>
                    {validationResult.isValid ? 'Schema is Valid' : 'Schema Issues Detected'}
                  </p>
                  <p className="text-sm text-text-secondary">
                    Last checked: {lastChecked?.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Missing Columns */}
              {validationResult.missingColumns.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-text-primary">Missing Columns:</h4>
                  <div className="bg-surface-light p-3 rounded-lg">
                    {validationResult.missingColumns.map(column => (
                      <div key={column} className="flex items-center gap-2 text-sm">
                        <span className="text-error-600">❌</span>
                        <code className="bg-gray-100 px-2 py-1 rounded">{column}</code>
                        <span className="text-text-secondary">- required for vehicle exit processing</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Existing Columns */}
              {validationResult.existingColumns.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-text-primary">Existing Columns:</h4>
                  <div className="bg-surface-light p-3 rounded-lg">
                    {validationResult.existingColumns.map(column => (
                      <div key={column} className="flex items-center gap-2 text-sm">
                        <span className="text-success-600">✅</span>
                        <code className="bg-gray-100 px-2 py-1 rounded">{column}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Update Issue */}
              {validationResult.statusNeedsUpdate && (
                <div className="bg-warning-50 border border-warning-200 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-warning-600">⚠️</span>
                    <span className="font-medium text-warning-800">Status Values Need Update</span>
                  </div>
                  <p className="text-sm text-warning-700 mt-1">
                    Some entries have 'Parked' status that should be updated to 'Active'
                  </p>
                </div>
              )}
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin text-2xl mb-2">🔄</div>
                <p className="text-text-secondary">Validating database schema...</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-text-secondary">Click "Validate Schema" to check database status</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Migration Actions */}
      {validationResult && !validationResult.isValid && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">Migration Actions</h3>
            <p className="text-sm text-text-secondary">
              Choose how to apply the required database changes
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Automatic Migration */}
            <div className="flex items-center justify-between p-4 border border-border-light rounded-lg">
              <div>
                <h4 className="font-medium text-text-primary">Automatic Migration</h4>
                <p className="text-sm text-text-secondary">
                  Run migration automatically using Supabase client
                </p>
              </div>
              <Button
                onClick={runMigration}
                disabled={migrating}
                variant="success"
                className="px-6"
              >
                {migrating ? '🔄 Migrating...' : '🚀 Run Migration'}
              </Button>
            </div>

            {/* Manual SQL Generation */}
            <div className="flex items-center justify-between p-4 border border-border-light rounded-lg">
              <div>
                <h4 className="font-medium text-text-primary">Manual SQL</h4>
                <p className="text-sm text-text-secondary">
                  Generate SQL script for manual execution in Supabase SQL Editor
                </p>
              </div>
              <Button
                onClick={generateSQL}
                variant="outline"
                className="px-6"
              >
                📋 Copy SQL
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Migration Results */}
      {migrationResult && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">Migration Results</h3>
          </CardHeader>
          <CardContent>
            <div className={`p-4 rounded-lg border ${
              migrationResult.success
                ? 'bg-success-50 border-success-200'
                : 'bg-error-50 border-error-200'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">
                  {migrationResult.success ? '✅' : '❌'}
                </span>
                <p className={`font-semibold ${
                  migrationResult.success ? 'text-success-800' : 'text-error-800'
                }`}>
                  {migrationResult.message}
                </p>
              </div>

              {migrationResult.details && migrationResult.details.length > 0 && (
                <div className="space-y-1">
                  {migrationResult.details.map((detail, index) => (
                    <p key={index} className="text-sm font-mono">
                      {detail}
                    </p>
                  ))}
                </div>
              )}

              {migrationResult.error && (
                <div className="mt-3 p-3 bg-error-100 border border-error-200 rounded text-sm">
                  <strong>Error Details:</strong> {migrationResult.error}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default SchemaValidator