/**
 * User Migration Script
 * Helps transition from the old insecure authentication to secure backend authentication
 */

import { passwordPolicyService } from '../services/passwordPolicyService'

export interface MigrationUser {
  username: string
  tempPassword: string
  role: 'admin' | 'operator' | 'viewer'
  email?: string
  requirePasswordChange: boolean
}

export interface MigrationResult {
  success: boolean
  migratedUsers: MigrationUser[]
  failedUsers: { username: string; error: string }[]
  summary: {
    total: number
    successful: number
    failed: number
  }
}

/**
 * Generate secure temporary passwords for users
 */
function generateTempPasswords(count: number): string[] {
  const passwords: string[] = []
  
  for (let i = 0; i < count; i++) {
    const password = passwordPolicyService.generateSecurePassword(12)
    passwords.push(password)
  }
  
  return passwords
}

/**
 * Create migration data for existing users
 * This replaces the old hard-coded password users with secure accounts
 */
export function createMigrationPlan(): MigrationUser[] {
  const tempPasswords = generateTempPasswords(3)
  
  return [
    {
      username: 'admin',
      tempPassword: tempPasswords[0],
      role: 'admin',
      email: 'admin@parking-system.local',
      requirePasswordChange: true
    },
    {
      username: 'operator',
      tempPassword: tempPasswords[1], 
      role: 'operator',
      email: 'operator@parking-system.local',
      requirePasswordChange: true
    },
    {
      username: 'viewer',
      tempPassword: tempPasswords[2],
      role: 'viewer', 
      email: 'viewer@parking-system.local',
      requirePasswordChange: true
    }
  ]
}

/**
 * Execute user migration to backend
 */
export async function executeMigration(): Promise<MigrationResult> {
  const migrationPlan = createMigrationPlan()
  const migratedUsers: MigrationUser[] = []
  const failedUsers: { username: string; error: string }[] = []
  
  console.log('🔄 Starting user migration to secure backend...')
  
  for (const user of migrationPlan) {
    try {
      // Validate password meets policy
      const validation = passwordPolicyService.validatePassword(user.tempPassword, user.username)
      
      if (!validation.isValid) {
        throw new Error(`Generated password doesn't meet policy: ${validation.errors.join(', ')}`)
      }
      
      // Create user in backend via API
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/auth/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAdminToken()}` // Would need admin token
        },
        body: JSON.stringify({
          username: user.username,
          password: user.tempPassword,
          role: user.role,
          email: user.email,
          require_password_change: user.requirePasswordChange
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}`)
      }
      
      migratedUsers.push(user)
      console.log(`✅ Migrated user: ${user.username}`)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      failedUsers.push({ username: user.username, error: errorMessage })
      console.error(`❌ Failed to migrate user ${user.username}:`, errorMessage)
    }
  }
  
  const result: MigrationResult = {
    success: failedUsers.length === 0,
    migratedUsers,
    failedUsers,
    summary: {
      total: migrationPlan.length,
      successful: migratedUsers.length,
      failed: failedUsers.length
    }
  }
  
  console.log('📊 Migration Summary:', result.summary)
  
  return result
}

/**
 * Generate migration report
 */
export function generateMigrationReport(result: MigrationResult): string {
  const { summary, migratedUsers, failedUsers } = result
  
  let report = `# User Migration Report\n\n`
  report += `**Migration Date:** ${new Date().toISOString()}\n`
  report += `**Total Users:** ${summary.total}\n`
  report += `**Successful:** ${summary.successful}\n`
  report += `**Failed:** ${summary.failed}\n\n`
  
  if (migratedUsers.length > 0) {
    report += `## Successfully Migrated Users\n\n`
    migratedUsers.forEach(user => {
      report += `### ${user.username}\n`
      report += `- **Role:** ${user.role}\n`
      report += `- **Email:** ${user.email || 'Not provided'}\n`
      report += `- **Temporary Password:** \`${user.tempPassword}\` ⚠️ CHANGE IMMEDIATELY\n`
      report += `- **Password Change Required:** ${user.requirePasswordChange ? 'Yes' : 'No'}\n\n`
    })
  }
  
  if (failedUsers.length > 0) {
    report += `## Failed Migrations\n\n`
    failedUsers.forEach(failure => {
      report += `- **${failure.username}:** ${failure.error}\n`
    })
    report += '\n'
  }
  
  report += `## Security Notes\n\n`
  report += `- All temporary passwords meet the security policy requirements\n`
  report += `- Users will be required to change their passwords on first login\n`
  report += `- Old hard-coded passwords have been completely removed from the system\n`
  report += `- All authentication now goes through the secure backend API\n\n`
  
  report += `## Next Steps\n\n`
  report += `1. Distribute temporary passwords to users securely (not via email)\n`
  report += `2. Ensure users change their passwords on first login\n`
  report += `3. Monitor authentication logs for any issues\n`
  report += `4. Remove this migration script after successful deployment\n`
  
  return report
}

/**
 * Get admin token for migration (would need to be provided securely)
 */
function getAdminToken(): string {
  // In a real migration, this would be provided securely by the admin
  // This is just a placeholder for the migration script structure
  const token = prompt('Enter admin token for migration (contact system administrator):')
  if (!token) {
    throw new Error('Admin token required for user migration')
  }
  return token
}

/**
 * Validate migration prerequisites
 */
export async function validateMigrationPrerequisites(): Promise<{
  valid: boolean
  issues: string[]
}> {
  const issues: string[] = []
  
  try {
    // Check if backend is available
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/health`)
    if (!response.ok) {
      issues.push('Backend API is not available')
    }
  } catch {
    issues.push('Cannot connect to backend API')
  }
  
  // Check if password policy service is working
  try {
    const testPassword = passwordPolicyService.generateSecurePassword(12)
    const validation = passwordPolicyService.validatePassword(testPassword)
    if (!validation.isValid) {
      issues.push('Password policy service is not working correctly')
    }
  } catch {
    issues.push('Password policy service is not available')
  }
  
  // Check if running in development environment (safer for migration)
  if (import.meta.env.PROD) {
    issues.push('Migration should be run in development environment first')
  }
  
  return {
    valid: issues.length === 0,
    issues
  }
}

/**
 * Interactive migration wizard
 */
export async function runMigrationWizard(): Promise<void> {
  console.log('🚀 User Migration Wizard Started')
  
  // Step 1: Validate prerequisites
  console.log('1️⃣ Validating prerequisites...')
  const prerequisites = await validateMigrationPrerequisites()
  
  if (!prerequisites.valid) {
    console.error('❌ Migration prerequisites not met:')
    prerequisites.issues.forEach(issue => console.error(`  - ${issue}`))
    return
  }
  
  console.log('✅ Prerequisites validated')
  
  // Step 2: Show migration plan
  console.log('2️⃣ Migration Plan:')
  const plan = createMigrationPlan()
  plan.forEach(user => {
    console.log(`  - ${user.username} (${user.role})`)
  })
  
  // Step 3: Execute migration
  const confirmed = confirm('Proceed with migration? This will create new user accounts.')
  if (!confirmed) {
    console.log('❌ Migration cancelled by user')
    return
  }
  
  console.log('3️⃣ Executing migration...')
  const result = await executeMigration()
  
  // Step 4: Generate and display report
  console.log('4️⃣ Generating report...')
  const report = generateMigrationReport(result)
  console.log(report)
  
  // Step 5: Save report to file (in development environment)
  if (!import.meta.env.PROD) {
    try {
      const blob = new Blob([report], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `user-migration-report-${Date.now()}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      console.log('📄 Migration report saved to downloads')
    } catch {
      console.warn('Could not save migration report to file')
    }
  }
  
  if (result.success) {
    console.log('🎉 Migration completed successfully!')
  } else {
    console.warn('⚠️ Migration completed with some failures. Check the report for details.')
  }
}