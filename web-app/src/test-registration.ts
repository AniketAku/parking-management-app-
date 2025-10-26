/**
 * Quick test script to verify phone-only user registration workflow
 * Tests both UserService and secureAuthService after email cleanup
 */

import { UserService } from './services/userService'
import { secureAuthService } from './services/secureAuthService'
import { log } from './utils/secureLogger'

async function testUserRegistrationWorkflow() {
  log.info('Testing Phone-Only User Registration Workflow')
  
  try {
    // Test 1: UserService registration (clean system)
    log.info('Test 1: UserService Registration')
    const testUser1 = {
      username: 'testuser1',
      password: 'TestPass123!',
      fullName: 'Test User One',
      phone: '+9876543210'
    }

    const result1 = await UserService.registerUser(testUser1)
    log.info('UserService Result', result1)

    // Test 2: SecureAuthService registration (refactored system)
    log.info('Test 2: SecureAuthService Registration')
    const testUser2 = {
      username: 'testuser2',
      password: 'TestPass456!',
      fullName: 'Test User Two',
      phone: '+1987654321'
    }

    const result2 = await secureAuthService.register(testUser2)
    log.info('SecureAuthService Result', result2)

    // Test 3: Login with SecureAuthService
    log.info('Test 3: Login Test')
    const loginResult = await secureAuthService.login({
      username: 'testuser2',
      password: 'TestPass456!'
    })
    log.info('Login Result', {
      success: loginResult.success,
      message: loginResult.success ? 'Success' : `Failed: ${loginResult.error}`
    })

    log.success('All registration tests completed')

  } catch (error) {
    log.error('Test failed', error)
  }
}

// Only run if called directly
if (import.meta.main) {
  testUserRegistrationWorkflow()
}

export { testUserRegistrationWorkflow }