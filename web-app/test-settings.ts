/**
 * Test script for the new settings architecture
 * This script tests if the settings service and hooks work correctly
 */

import { newSettingsService } from './src/services/settingsService'

async function testSettingsArchitecture() {
  console.log('🧪 Testing New Settings Architecture...\n')

  try {
    // Test 1: Database Connection
    console.log('1. Testing database connection...')
    const isConnected = await newSettingsService.testConnection()
    console.log(`   Database connected: ${isConnected ? '✅' : '❌'}`)

    if (!isConnected) {
      console.log('   ❌ Cannot test further without database connection')
      return
    }

    // Test 2: Get Available Categories
    console.log('\n2. Testing available categories...')
    const categories = await newSettingsService.getAvailableCategories()
    console.log(`   Available categories: ${categories.join(', ')}`)

    // Test 3: Load Business Settings
    console.log('\n3. Testing business settings load...')
    const businessSettings = await newSettingsService.getBusinessSettings()
    console.log(`   Business settings keys: ${Object.keys(businessSettings).join(', ')}`)
    
    if (businessSettings.vehicle_rates) {
      console.log('   ✅ Vehicle rates found:', businessSettings.vehicle_rates)
    } else {
      console.log('   ⚠️ Vehicle rates not found')
    }

    if (businessSettings.vehicle_types) {
      console.log('   ✅ Vehicle types found:', businessSettings.vehicle_types)
    } else {
      console.log('   ⚠️ Vehicle types not found')
    }

    // Test 4: Cache Stats
    console.log('\n4. Testing cache functionality...')
    const cacheStats = newSettingsService.getCacheStats()
    console.log(`   Cache size: ${cacheStats.size}`)
    console.log(`   Cached keys: ${cacheStats.keys.join(', ')}`)
    console.log(`   Active channels: ${cacheStats.channels.join(', ')}`)

    console.log('\n🎉 Settings architecture test completed!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
if (require.main === module) {
  testSettingsArchitecture()
}

export { testSettingsArchitecture }