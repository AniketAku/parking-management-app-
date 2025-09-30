import { io, Socket } from 'socket.io-client'
import type { ParkingEntry, ParkingStatistics } from '../types'
import { toast } from 'react-hot-toast'
import { mockSocketServer } from './mockSocketServer'

export interface ServerToClientEvents {
  // Parking entry events
  'entry:created': (entry: ParkingEntry) => void
  'entry:updated': (entry: ParkingEntry) => void
  'entry:deleted': (entryId: string) => void
  
  // Exit events
  'exit:processed': (entry: ParkingEntry) => void
  'exit:payment': (entry: ParkingEntry) => void
  
  // Statistics updates
  'stats:updated': (stats: ParkingStatistics) => void
  
  // System events
  'system:notification': (message: string, type: 'info' | 'success' | 'warning' | 'error') => void
  'system:alert': (alert: { id: string; message: string; type: 'overstay' | 'payment' | 'capacity' }) => void
  
  // User events
  'user:connected': (userCount: number) => void
  'user:disconnected': (userCount: number) => void
  
  // Connection events
  'connect': () => void
  'disconnect': () => void
  'reconnect': (attemptNumber: number) => void
}

export interface ClientToServerEvents {
  // Join/leave rooms
  'join:dashboard': () => void
  'leave:dashboard': () => void
  'join:reports': () => void
  'leave:reports': () => void
  
  // Parking operations
  'entry:create': (entry: Omit<ParkingEntry, 'id' | 'createdAt' | 'updatedAt'>) => void
  'entry:update': (entryId: string, updates: Partial<ParkingEntry>) => void
  'exit:process': (entryId: string, exitData: { exitTime: Date; paymentType?: string; amountPaid?: number }) => void
  
  // Heartbeat
  'heartbeat': () => void
}

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval = 1000
  private isConnecting = false
  private connectionCallbacks: Array<() => void> = []
  private disconnectionCallbacks: Array<() => void> = []
  private useMockServer = false

  constructor() {
    // Use mock server if no real server URL is configured
    this.useMockServer = !import.meta.env.VITE_SOCKET_URL
    
    // Auto-connect when service is instantiated
    this.connect()
  }

  connect(): Promise<Socket<ServerToClientEvents, ClientToServerEvents>> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve(this.socket)
        return
      }

      if (this.isConnecting) {
        // Wait for existing connection attempt
        this.connectionCallbacks.push(() => {
          if (this.socket) {
            resolve(this.socket)
          } else {
            reject(new Error('Failed to connect'))
          }
        })
        return
      }

      this.isConnecting = true

      // Use mock server for development if no real server URL
      if (this.useMockServer) {
        console.log('🧪 Using mock Socket.IO server for development')
        // Create a mock socket interface
        this.socket = this.createMockSocket()
        
        // Simulate connection after a short delay
        setTimeout(() => {
          this.handleMockConnection()
          resolve(this.socket!)
        }, 500)
        return
      }

      // Initialize real socket connection
      this.socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001', {
        autoConnect: true,
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectInterval,
        forceNew: false,
        transports: ['websocket', 'polling']
      })

      // Connection successful
      this.socket.on('connect', () => {
        console.log('✅ Socket connected:', this.socket?.id)
        this.isConnecting = false
        this.reconnectAttempts = 0
        
        // Execute connection callbacks
        this.connectionCallbacks.forEach(callback => callback())
        this.connectionCallbacks = []
        
        // Show connection toast
        toast.success('🔄 Real-time updates connected', {
          duration: 2000,
          position: 'bottom-right'
        })

        resolve(this.socket!)
      })

      // Connection failed
      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error)
        this.isConnecting = false
        this.reconnectAttempts++

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          toast.error('Failed to connect to real-time updates', {
            duration: 4000,
            position: 'bottom-right'
          })
          reject(error)
        }
      })

      // Disconnection handling
      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason)
        
        // Execute disconnection callbacks
        this.disconnectionCallbacks.forEach(callback => callback())
        
        // Show disconnection toast if it wasn't intentional
        if (reason === 'io server disconnect') {
          toast.error('Real-time updates disconnected', {
            duration: 3000,
            position: 'bottom-right'
          })
        }
      })

      // Reconnection successful
      this.socket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Socket reconnected after', attemptNumber, 'attempts')
        toast.success('🔄 Real-time updates reconnected', {
          duration: 2000,
          position: 'bottom-right'
        })
      })

      // Setup system event handlers
      this.setupSystemEventHandlers()
    })
  }

  private createMockSocket(): any {
    // Create a mock socket that interfaces with our mock server
    const mockSocket = {
      connected: true,
      id: 'mock_' + Math.random().toString(36).substr(2, 9),
      on: (event: string, callback: Function) => mockSocketServer.on(event, callback),
      off: (event: string, callback: Function) => mockSocketServer.off(event, callback),
      emit: (event: string, ...args: any[]) => {
        console.log('📤 Mock emit:', event, ...args)
        // For client-to-server events, we could simulate server responses
        this.handleMockClientEvent(event, ...args)
      },
      disconnect: () => {
        mockSocket.connected = false
        mockSocketServer.disconnect()
      }
    }
    return mockSocket
  }

  private handleMockConnection() {
    this.isConnecting = false
    this.reconnectAttempts = 0
    
    // Execute connection callbacks
    this.connectionCallbacks.forEach(callback => callback())
    this.connectionCallbacks = []
    
    // Show connection toast
    toast.success('🔄 Real-time updates connected (Mock Server)', {
      duration: 2000,
      position: 'bottom-right'
    })

    // Setup mock event handlers
    this.setupMockEventHandlers()
  }

  private handleMockClientEvent(event: string, ...args: any[]) {
    // Simulate server responses to client events
    switch (event) {
      case 'join:dashboard':
      case 'join:reports':
        console.log(`🏠 Mock: Joined room ${event.split(':')[1]}`)
        break
      case 'entry:create':
        // Simulate successful entry creation
        setTimeout(() => {
          const entry = args[0]
          const newEntry: ParkingEntry = {
            ...entry,
            id: `mock_${Date.now()}`,
            createdAt: new Date(),
            updatedAt: new Date()
          }
          mockSocketServer.emit('entry:created', newEntry)
        }, 200)
        break
      case 'exit:process':
        // Simulate successful exit processing
        setTimeout(() => {
          const [entryId, exitData] = args
          const updatedEntry: ParkingEntry = {
            id: entryId,
            vehicleNumber: 'DEMO1234',
            vehicleType: '4 Wheeler',
            transportName: 'Demo Transport',
            driverName: 'Demo Driver',
            entryTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
            exitTime: exitData.exitTime,
            status: 'Exited',
            paymentStatus: 'Paid',
            paymentType: exitData.paymentType,
            amountPaid: exitData.amountPaid,
            createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
            updatedAt: new Date()
          }
          mockSocketServer.emit('exit:processed', updatedEntry)
        }, 300)
        break
    }
  }

  private setupMockEventHandlers() {
    // The mock server will emit events, which will be handled by the existing system handlers
    this.setupSystemEventHandlers()
  }

  private setupSystemEventHandlers(): void {
    if (!this.socket) return

    // System notifications (only show toast for user actions, not automatic events)
    this.socket.on('system:notification', (message, type) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`📢 System notification [${type}]:`, message)
      }
      
      // Show toast notifications for user-initiated actions only
      // Automatic/random events will only be logged, not shown as toasts
      switch (type) {
        case 'success':
          toast.success(message)
          break
        case 'warning':
          toast.error(message, { duration: 4000 })
          break
        case 'error':
          toast.error(message, { duration: 5000 })
          break
        default:
          toast(message)
      }
    })

    // System alerts (overstays, payment issues, etc.)
    this.socket.on('system:alert', (alert) => {
      const alertMessages = {
        overstay: `🚨 Vehicle overstaying detected!`,
        payment: `💳 Payment issue requires attention`,
        capacity: `⚠️ Parking capacity limit reached`
      }

      toast.error(alertMessages[alert.type] || alert.message, {
        duration: 6000,
        position: 'top-center'
      })
    })

    // User connection updates
    this.socket.on('user:connected', (userCount) => {
      console.log(`👥 Users online: ${userCount}`)
    })

    this.socket.on('user:disconnected', (userCount) => {
      console.log(`👥 Users online: ${userCount}`)
    })
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    
    if (this.useMockServer) {
      mockSocketServer.disconnect()
    }
  }

  // Room management
  joinRoom(room: 'dashboard' | 'reports'): void {
    if (!this.socket?.connected) {
      console.warn('Cannot join room: Socket not connected')
      return
    }

    switch (room) {
      case 'dashboard':
        this.socket.emit('join:dashboard')
        break
      case 'reports':
        this.socket.emit('join:reports')
        break
    }
  }

  leaveRoom(room: 'dashboard' | 'reports'): void {
    if (!this.socket?.connected) return

    switch (room) {
      case 'dashboard':
        this.socket.emit('leave:dashboard')
        break
      case 'reports':
        this.socket.emit('leave:reports')
        break
    }
  }

  // Event listeners
  onEntryCreated(callback: (entry: ParkingEntry) => void): () => void {
    this.socket?.on('entry:created', callback)
    return () => this.socket?.off('entry:created', callback)
  }

  onEntryUpdated(callback: (entry: ParkingEntry) => void): () => void {
    this.socket?.on('entry:updated', callback)
    return () => this.socket?.off('entry:updated', callback)
  }

  onEntryDeleted(callback: (entryId: string) => void): () => void {
    this.socket?.on('entry:deleted', callback)
    return () => this.socket?.off('entry:deleted', callback)
  }

  onExitProcessed(callback: (entry: ParkingEntry) => void): () => void {
    this.socket?.on('exit:processed', callback)
    return () => this.socket?.off('exit:processed', callback)
  }

  onStatsUpdated(callback: (stats: ParkingStatistics) => void): () => void {
    this.socket?.on('stats:updated', callback)
    return () => this.socket?.off('stats:updated', callback)
  }

  onConnection(callback: () => void): () => void {
    if (this.socket?.connected) {
      callback()
    }
    this.connectionCallbacks.push(callback)
    return () => {
      this.connectionCallbacks = this.connectionCallbacks.filter(cb => cb !== callback)
    }
  }

  onDisconnection(callback: () => void): () => void {
    this.disconnectionCallbacks.push(callback)
    return () => {
      this.disconnectionCallbacks = this.disconnectionCallbacks.filter(cb => cb !== callback)
    }
  }

  // Event emitters
  createEntry(entry: Omit<ParkingEntry, 'id' | 'createdAt' | 'updatedAt'>): void {
    if (!this.socket?.connected) {
      toast.error('Cannot create entry: Not connected to server')
      return
    }
    this.socket.emit('entry:create', entry)
  }

  updateEntry(entryId: string, updates: Partial<ParkingEntry>): void {
    if (!this.socket?.connected) {
      toast.error('Cannot update entry: Not connected to server')
      return
    }
    this.socket.emit('entry:update', entryId, updates)
  }

  processExit(entryId: string, exitData: { exitTime: Date; paymentType?: string; amountPaid?: number }): void {
    if (!this.socket?.connected) {
      toast.error('Cannot process exit: Not connected to server')
      return
    }
    this.socket.emit('exit:process', entryId, exitData)
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  getConnectionState(): 'connected' | 'disconnected' | 'connecting' {
    if (this.isConnecting) return 'connecting'
    return this.socket?.connected ? 'connected' : 'disconnected'
  }

  startHeartbeat(): void {
    setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('heartbeat')
      }
    }, 30000) // Every 30 seconds
  }
}

// Singleton instance
export const socketService = new SocketService()

// Auto-start heartbeat
socketService.startHeartbeat()

export default socketService