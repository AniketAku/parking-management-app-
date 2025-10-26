import { createClient } from '@supabase/supabase-js'
import { secureDemoService } from '../services/secureDemoService'
import { log } from '../utils/secureLogger'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

// Debug logging for environment variables
log.debug('Supabase Config DEBUG', {
  hasUrl: Boolean(supabaseUrl),
  hasKey: Boolean(supabaseAnonKey),
  urlValue: supabaseUrl || 'MISSING',
  urlType: typeof supabaseUrl,
  urlLength: supabaseUrl?.length || 0,
  keyValue: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING',
  keyType: typeof supabaseAnonKey,
  keyLength: supabaseAnonKey?.length || 0,
  allEnvKeys: Object.keys(import.meta.env),
  rawEnvValues: {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? `${import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 20)}...` : 'MISSING'
  },
  afterTrim: {
    url: supabaseUrl,
    key: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING'
  }
})

// Create realistic sample parking data for demo mode
const generateSampleParkingData = () => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  return [
    // Today's entries with revenue
    {
      id: 'demo-001',
      serial: 101,
      transport_name: 'ABC Logistics',
      vehicle_type: '6 Wheeler',
      vehicle_number: 'KA05MN1234',
      driver_name: 'Rajesh Kumar',
      entry_time: new Date(today.getTime() + 9 * 60 * 60 * 1000).toISOString(), // 9 AM today
      exit_time: new Date(today.getTime() + 17 * 60 * 60 * 1000).toISOString(), // 5 PM today
      status: 'Exited',
      payment_status: 'Paid',
      payment_type: 'Cash',
      parking_fee: 150, // 6 Wheeler daily rate
      actual_fee: 150,
      calculated_fee: 150,
      notes: 'Regular delivery truck',
      created_at: new Date(today.getTime() + 9 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(today.getTime() + 17 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'demo-002',
      serial: 102,
      transport_name: 'XYZ Transport',
      vehicle_type: 'Trailer',
      vehicle_number: 'MH12AB5678',
      driver_name: 'Suresh Patil',
      entry_time: new Date(today.getTime() + 10 * 60 * 60 * 1000).toISOString(), // 10 AM today
      exit_time: new Date(today.getTime() + 16 * 60 * 60 * 1000).toISOString(), // 4 PM today
      status: 'Exited',
      payment_status: 'Paid',
      payment_type: 'UPI',
      parking_fee: 225, // Trailer daily rate
      actual_fee: 225,
      calculated_fee: 225,
      notes: 'Heavy cargo transport',
      created_at: new Date(today.getTime() + 10 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(today.getTime() + 16 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'demo-003',
      serial: 103,
      transport_name: 'Quick Delivery',
      vehicle_type: '4 Wheeler',
      vehicle_number: 'TN09CD3456',
      driver_name: 'Arjun Reddy',
      entry_time: new Date(today.getTime() + 14 * 60 * 60 * 1000).toISOString(), // 2 PM today
      exit_time: null,
      status: 'Active', // Currently parked
      payment_status: 'Pending',
      payment_type: null,
      parking_fee: 100, // 4 Wheeler daily rate
      actual_fee: null,
      calculated_fee: 100,
      notes: 'Waiting for cargo pickup',
      created_at: new Date(today.getTime() + 14 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(today.getTime() + 14 * 60 * 60 * 1000).toISOString()
    },
    // Yesterday's entries
    {
      id: 'demo-004',
      serial: 104,
      transport_name: 'Express Movers',
      vehicle_type: '6 Wheeler',
      vehicle_number: 'AP07EF7890',
      driver_name: 'Venkat Rao',
      entry_time: new Date(today.getTime() - 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000).toISOString(), // 11 AM yesterday
      exit_time: new Date(today.getTime() - 24 * 60 * 60 * 1000 + 18 * 60 * 60 * 1000).toISOString(), // 6 PM yesterday
      status: 'Exited',
      payment_status: 'Paid',
      payment_type: 'Card',
      parking_fee: 150,
      actual_fee: 150,
      calculated_fee: 150,
      notes: 'Furniture delivery',
      created_at: new Date(today.getTime() - 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(today.getTime() - 24 * 60 * 60 * 1000 + 18 * 60 * 60 * 1000).toISOString()
    }
  ]
}

// Create a secure mock client for demo mode
const createSecureMockSupabase = () => {
  // Ensure demo mode is only available in development
  if (import.meta.env.PROD) {
    throw new Error('Demo mode not available in production builds')
  }

  const sampleData = generateSampleParkingData()

  // Create a comprehensive mock query builder that supports all chaining combinations
  const createMockQueryBuilder = (data = sampleData, error = null) => ({
    data,
    error,
    // Query methods that return new query builders
    select: (columns?: string) => createMockQueryBuilder(data, error),
    insert: (values: any) => {
      // Generate mock data for successful demo operations
      const mockEntry = {
        id: Math.floor(Math.random() * 10000) + 1000,
        serial: Math.floor(Math.random() * 999) + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...values,
        // Ensure required database fields are present
        location_id: values.location_id || 1,
        status: values.status || 'Parked',
        payment_status: values.payment_status || 'Pending',
        parking_fee: values.parking_fee || null
      }
      return createMockQueryBuilder(mockEntry, null)
    },
    update: (values: any) => {
      // Generate mock updated data
      const mockUpdatedEntry = {
        id: Math.floor(Math.random() * 10000) + 1000,
        updated_at: new Date().toISOString(),
        ...values
      }
      return createMockQueryBuilder(mockUpdatedEntry, null)
    },
    delete: () => createMockQueryBuilder({ count: 1 }, null),
    upsert: (values: any) => {
      // Generate mock upserted data
      const mockEntry = {
        id: Math.floor(Math.random() * 10000) + 1000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...values
      }
      return createMockQueryBuilder(mockEntry, null)
    },
    
    // Filter methods that return new query builders
    eq: (column: string, value: any) => createMockQueryBuilder(data, error),
    neq: (column: string, value: any) => createMockQueryBuilder(data, error),
    gt: (column: string, value: any) => createMockQueryBuilder(data, error),
    gte: (column: string, value: any) => createMockQueryBuilder(data, error),
    lt: (column: string, value: any) => createMockQueryBuilder(data, error),
    lte: (column: string, value: any) => createMockQueryBuilder(data, error),
    like: (column: string, pattern: string) => createMockQueryBuilder(data, error),
    ilike: (column: string, pattern: string) => createMockQueryBuilder(data, error),
    is: (column: string, value: any) => createMockQueryBuilder(data, error),
    in: (column: string, values: any[]) => createMockQueryBuilder(data, error),
    contains: (column: string, value: any) => createMockQueryBuilder(data, error),
    containedBy: (column: string, value: any) => createMockQueryBuilder(data, error),
    rangeGt: (column: string, value: any) => createMockQueryBuilder(data, error),
    rangeGte: (column: string, value: any) => createMockQueryBuilder(data, error),
    rangeLt: (column: string, value: any) => createMockQueryBuilder(data, error),
    rangeLte: (column: string, value: any) => createMockQueryBuilder(data, error),
    rangeAdjacent: (column: string, value: any) => createMockQueryBuilder(data, error),
    overlaps: (column: string, value: any) => createMockQueryBuilder(data, error),
    textSearch: (column: string, query: string, options?: any) => createMockQueryBuilder(data, error),
    match: (query: Record<string, any>) => createMockQueryBuilder(data, error),
    not: (column: string, operator: string, value: any) => createMockQueryBuilder(data, error),
    or: (filters: string) => createMockQueryBuilder(data, error),
    filter: (column: string, operator: string, value: any) => createMockQueryBuilder(data, error),
    
    // Modifier methods that return new query builders
    order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) => createMockQueryBuilder(data, error),
    limit: (count: number) => createMockQueryBuilder(data, error),
    range: (from: number, to: number) => createMockQueryBuilder(data, error),
    single: () => createMockQueryBuilder(data?.[0] || null, error),
    maybeSingle: () => createMockQueryBuilder(data?.[0] || null, error),
    csv: () => createMockQueryBuilder('', error),
    geojson: () => createMockQueryBuilder(null, error),
    explain: (options?: any) => createMockQueryBuilder(null, error),
    rollback: () => createMockQueryBuilder(data, error),
    returns: () => createMockQueryBuilder(data, error),
    
    // Promise-like methods for async operations
    then: (onFulfilled?: any, onRejected?: any) => {
      const result = { data, error }
      return Promise.resolve(result).then(onFulfilled, onRejected)
    },
    catch: (onRejected?: any) => Promise.resolve({ data, error }).catch(onRejected),
    finally: (onFinally?: any) => Promise.resolve({ data, error }).finally(onFinally)
  })

  return {
    from: (table: string) => {
      if (table === 'parking_entries') {
        return createMockQueryBuilder(sampleData)
      }
      if (table === 'shift_sessions') {
        // Mock shift sessions data for demo mode (using correct schema column names)
        const mockShiftData = [{
          id: 'demo-shift-001',
          employee_id: 'demo-user-001',
          employee_name: 'Demo Operator',
          employee_phone: '9876543210',
          shift_start_time: new Date().toISOString(),
          shift_end_time: null,
          status: 'active',
          opening_cash_amount: 1000,
          closing_cash_amount: null,
          shift_notes: 'Demo shift session',
          total_sessions: 0,
          total_payments: 0,
          linked_sessions: 0,
          linked_payments: 0,
          total_revenue: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]
        return createMockQueryBuilder(mockShiftData)
      }
      return createMockQueryBuilder([])
    },
    
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signIn: async (credentials: any) => {
        try {
          const result = await secureDemoService.simulateLogin(credentials)
          return { data: { user: result.user, session: { user: result.user, access_token: result.tokens.accessToken } }, error: null }
        } catch (error) {
          return { data: null, error: { message: error instanceof Error ? error.message : 'Demo authentication failed' } }
        }
      },
      signInWithPassword: async (credentials: any) => {
        try {
          const result = await secureDemoService.simulateLogin(credentials)
          return { data: { user: result.user, session: { user: result.user, access_token: result.tokens.accessToken } }, error: null }
        } catch (error) {
          return { data: null, error: { message: error instanceof Error ? error.message : 'Demo authentication failed' } }
        }
      },
      signInWithOAuth: (provider: any) => Promise.resolve({ data: null, error: { message: 'OAuth not available in demo mode' } }),
      signUp: (credentials: any) => Promise.resolve({ data: null, error: { message: 'Registration not available in demo mode' } }),
      signOut: () => Promise.resolve({ error: null }),
      resetPasswordForEmail: (email: string) => Promise.resolve({ data: null, error: { message: 'Demo mode: Authentication disabled' } }),
      updateUser: (attributes: any) => Promise.resolve({ data: null, error: { message: 'Demo mode: Authentication disabled' } }),
      setSession: (session: any) => Promise.resolve({ data: { session: null }, error: null }),
      refreshSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        // Return a subscription object with proper unsubscribe method
        return {
          data: {
            subscription: {
              unsubscribe: () => {}
            }
          },
          error: null
        }
      }
    },
    
    // Realtime channels with proper unsubscribe support
    channel: (name: string, options?: any) => {
      const mockChannel = {
        on: (type: string, filter: any, callback?: any) => {
          // Handle different call patterns
          if (typeof filter === 'function' && !callback) {
            callback = filter
            filter = {}
          }
          return {
            ...mockChannel,
            subscribe: (callback?: any) => {
              if (callback) callback('SUBSCRIBED', null)
              return mockChannel
            }
          }
        },
        subscribe: (callback?: any) => {
          if (callback) callback('SUBSCRIBED', null)
          return mockChannel
        },
        unsubscribe: (callback?: any) => {
          if (callback) callback('CLOSED', null)
          return Promise.resolve('ok')
        },
        send: (payload: any) => Promise.resolve('ok'),
        track: (payload: any) => Promise.resolve('ok'),
        untrack: () => Promise.resolve('ok')
      }
      return mockChannel
    },
    
    removeChannel: (channel: any) => Promise.resolve('ok'),
    removeAllChannels: () => Promise.resolve('ok'),
    getChannels: () => [],
    
    // Storage methods
    storage: {
      from: (bucketId: string) => ({
        upload: (path: string, file: any) => Promise.resolve({ data: null, error: { message: 'Demo mode: Storage disabled' } }),
        download: (path: string) => Promise.resolve({ data: null, error: { message: 'Demo mode: Storage disabled' } }),
        remove: (paths: string[]) => Promise.resolve({ data: null, error: { message: 'Demo mode: Storage disabled' } }),
        list: (path?: string) => Promise.resolve({ data: [], error: null }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: '' } }),
        createSignedUrl: (path: string, expiresIn: number) => Promise.resolve({ data: null, error: { message: 'Demo mode: Storage disabled' } }),
        createSignedUrls: (paths: string[], expiresIn: number) => Promise.resolve({ data: null, error: { message: 'Demo mode: Storage disabled' } })
      }),
      listBuckets: () => Promise.resolve({ data: [], error: null }),
      getBucket: (id: string) => Promise.resolve({ data: null, error: null }),
      createBucket: (id: string) => Promise.resolve({ data: null, error: { message: 'Demo mode: Storage disabled' } }),
      updateBucket: (id: string, options: any) => Promise.resolve({ data: null, error: { message: 'Demo mode: Storage disabled' } }),
      emptyBucket: (id: string) => Promise.resolve({ data: null, error: { message: 'Demo mode: Storage disabled' } }),
      deleteBucket: (id: string) => Promise.resolve({ data: null, error: { message: 'Demo mode: Storage disabled' } })
    },
    
    // Edge Functions
    functions: {
      invoke: (functionName: string, options?: any) => Promise.resolve({ data: null, error: { message: 'Demo mode: Functions disabled' } })
    },
    
    // RPC (Remote Procedure Call)
    rpc: (fn: string, args?: any) => createMockQueryBuilder(null, { message: 'Demo mode: RPC disabled' })
  }
}

// Check if we have valid Supabase configuration
const hasValidSupabaseConfig = supabaseUrl && supabaseAnonKey && supabaseUrl.trim().length > 0 && supabaseAnonKey.trim().length > 0

log.debug('Supabase Validation', {
  hasValidConfig: hasValidSupabaseConfig,
  mode: hasValidSupabaseConfig ? 'Live Mode' : 'Demo Mode'
})

// Create the Supabase client based on configuration
let supabase: any

if (hasValidSupabaseConfig) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  })
} else {
  supabase = createSecureMockSupabase()
}

// Export supabase client
export { supabase }
export default supabase