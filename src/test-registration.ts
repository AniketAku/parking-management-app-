/**
 * Quick test script to verify phone-only user registration workflow
 * Tests both UserService and secureAuthService after email cleanup
 */

import { UserService } from './services/userService'
import { secureAuthService } from './services/secureAuthService'

async function testUserRegistrationWorkflow() {
  console.log('🧪 Testing Phone-Only User Registration Workflow')
  console.log('=' .repeat(60))
  
  try {
    // Test 1: UserService registration (clean system)
    console.log('🔍 Test 1: UserService Registration')
    const testUser1 = {
      username: 'testuser1',
      password: 'TestPass123!',
      fullName: 'Test User One',
      phone: '+9876543210'
    }
    
    const result1 = await UserService.registerUser(testUser1)
    console.log('UserService Result:', result1)
    
    // Test 2: SecureAuthService registration (refactored system) 
    console.log('\n🔍 Test 2: SecureAuthService Registration')
    const testUser2 = {
      username: 'testuser2',
      password: 'TestPass456!', 
      fullName: 'Test User Two',
      phone: '+1987654321'
    }
    
    const result2 = await secureAuthService.register(testUser2)
    console.log('SecureAuthService Result:', result2)
    
    // Test 3: Login with SecureAuthService
    console.log('\n🔍 Test 3: Login Test')
    const loginResult = await secureAuthService.login({
      username: 'testuser2',
      password: 'TestPass456!'
    })
    console.log('Login Result:', loginResult.success ? '✅ Success' : `❌ Failed: ${loginResult.error}`)
    
    console.log('\n✅ All registration tests completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Only run if called directly
if (import.meta.main) {
  testUserRegistrationWorkflow()
}

export { testUserRegistrationWorkflow }