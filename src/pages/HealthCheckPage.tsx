import React, { useState, useEffect } from 'react'
import { api as supabaseApi } from '../services/supabaseApi'
import { supabase } from '../lib/supabase'

interface HealthStatus {
  database: 'connected' | 'disconnected' | 'testing'
  realtime: 'connected' | 'disconnected' | 'testing'
  auth: 'available' | 'unavailable' | 'testing'
  lastTested: Date | null
}

export default function HealthCheckPage() {
  const [status, setStatus] = useState<HealthStatus>({
    database: 'testing',
    realtime: 'testing',
    auth: 'testing',
    lastTested: null
  })
  const [testResults, setTestResults] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testDatabase = async () => {
    try {
      addTestResult('🧪 Testing database connection...')
      const { data, error } = await supabase
        .from('parking_entries')
        .select('id')
        .limit(1)
      
      if (error) {
        addTestResult(`❌ Database test failed: ${error.message}`)
        return 'disconnected'
      }
      
      addTestResult(`✅ Database connected! Found ${data.length} entries`)
      return 'connected'
    } catch (error) {
      addTestResult(`❌ Database test error: ${error}`)
      return 'disconnected'
    }
  }

  const testRealtime = async () => {
    try {
      addTestResult('🧪 Testing realtime connection...')
      
      // Test if we can subscribe to changes
      const channel = supabase
        .channel('health_check_channel')
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            addTestResult('✅ Realtime connected!')
            supabase.removeChannel(channel)
          } else if (status === 'CHANNEL_ERROR') {
            addTestResult('❌ Realtime connection failed')
          }
        })
      
      // Give it a moment to connect
      setTimeout(() => {
        const isConnected = channel.state === 'joined'
        if (!isConnected) {
          addTestResult('❌ Realtime connection timeout')
        }
      }, 3000)
      
      return 'connected'
    } catch (error) {
      addTestResult(`❌ Realtime test error: ${error}`)
      return 'disconnected'
    }
  }

  const testAuth = async () => {
    try {
      addTestResult('🧪 Testing auth service...')
      
      // Just check if auth is available (don't need to be logged in)
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error && error.message !== 'Invalid JWT') {
        addTestResult(`❌ Auth test failed: ${error.message}`)
        return 'unavailable'
      }
      
      addTestResult('✅ Auth service available')
      if (user) {
        addTestResult(`ℹ️ Current user: ${user.username}`)
      } else {
        addTestResult('ℹ️ No user currently logged in')
      }
      
      return 'available'
    } catch (error) {
      addTestResult(`❌ Auth test error: ${error}`)
      return 'unavailable'
    }
  }

  const runHealthCheck = async () => {
    setLoading(true)
    setTestResults([])
    addTestResult('🚀 Starting Supabase health check...')
    
    setStatus(prev => ({
      ...prev,
      database: 'testing',
      realtime: 'testing',
      auth: 'testing'
    }))

    try {
      // Test database
      const dbStatus = await testDatabase()
      setStatus(prev => ({ ...prev, database: dbStatus }))
      
      // Test auth
      const authStatus = await testAuth()
      setStatus(prev => ({ ...prev, auth: authStatus }))
      
      // Test realtime
      const realtimeStatus = await testRealtime()
      setStatus(prev => ({ ...prev, realtime: realtimeStatus }))
      
      setStatus(prev => ({ ...prev, lastTested: new Date() }))
      addTestResult('🎉 Health check completed!')
      
    } catch (error) {
      addTestResult(`💥 Health check failed: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runHealthCheck()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'available':
        return 'text-green-600'
      case 'disconnected':
      case 'unavailable':
        return 'text-red-600'
      case 'testing':
        return 'text-yellow-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'available':
        return '✅'
      case 'disconnected':
      case 'unavailable':
        return '❌'
      case 'testing':
        return '🔄'
      default:
        return '⚪'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            🏥 Supabase Health Check
          </h1>
          
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">Database</h3>
              <div className={`text-lg ${getStatusColor(status.database)}`}>
                {getStatusIcon(status.database)} {status.database}
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">Authentication</h3>
              <div className={`text-lg ${getStatusColor(status.auth)}`}>
                {getStatusIcon(status.auth)} {status.auth}
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">Realtime</h3>
              <div className={`text-lg ${getStatusColor(status.realtime)}`}>
                {getStatusIcon(status.realtime)} {status.realtime}
              </div>
            </div>
          </div>

          {/* Last Tested */}
          {status.lastTested && (
            <div className="mb-4 text-sm text-gray-600">
              Last tested: {status.lastTested.toLocaleString()}
            </div>
          )}

          {/* Run Test Button */}
          <button
            onClick={runHealthCheck}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 mb-6"
          >
            {loading ? '🔄 Testing...' : '🔄 Run Health Check'}
          </button>

          {/* Test Results Log */}
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Test Results:</h3>
            <div className="font-mono text-sm max-h-96 overflow-y-auto">
              {testResults.length === 0 ? (
                <div className="text-gray-500">No test results yet...</div>
              ) : (
                testResults.map((result, index) => (
                  <div key={index} className="mb-1">
                    {result}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Environment Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">Environment Info:</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <div>Supabase URL: {import.meta.env.VITE_SUPABASE_URL || 'Not configured'}</div>
              <div>Environment: {import.meta.env.MODE}</div>
              <div>Timestamp: {new Date().toISOString()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}