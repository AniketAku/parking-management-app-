import type { ParkingEntry, ParkingStatistics } from '../types'
import { log } from '../utils/secureLogger'

// Mock Socket.IO server for development and testing
// This simulates real-time events when a real server isn't available

interface MockServerEvent {
  type: string
  data: any
  delay: number
}

class MockSocketServer {
  private isActive = false
  private eventQueue: MockServerEvent[] = []
  private eventHandlers: { [key: string]: Array<(...args: any[]) => void> } = {}
  private simulationInterval: NodeJS.Timeout | null = null
  private connectedUsers = 1
  private enableAutoEvents = true // Control auto-event generation

  constructor() {
    // Only activate mock server if no real server URL is configured
    if (!import.meta.env.VITE_SOCKET_URL) {
      this.isActive = true
      this.startSimulation()
    }
  }

  private startSimulation() {
    if (!this.isActive) return

    log.debug('Mock Socket.IO server started for development')

    // Simulate connection events
    setTimeout(() => {
      this.emit('connect')
      this.emit('user:connected', this.connectedUsers)
    }, 1000)

    // Disable automatic event generation - only generate events on user actions
    // this.simulationInterval = setInterval(() => {
    //   this.generateRandomEvents()
    // }, 120000)

    // Only emit initial connection events, no random notifications
    setTimeout(() => {
      this.emitInitialStats()
    }, 2000)
  }

  private emitInitialStats() {
    // Only emit initial statistics - no random events
    const mockStats: ParkingStatistics = {
      parkedVehicles: 0,
      todayEntries: 0,
      todayExits: 0,
      todayIncome: 0,
      unpaidVehicles: 0,
      overstayingVehicles: 0,
      averageStayDuration: 0,
      occupancyRate: 0
    }

    this.emit('stats:updated', mockStats)
    
    // No automatic vehicle events - these will only happen on user actions
  }

  private generateRandomEvents() {
    const events = [
      () => this.simulateVehicleEntry(),
      () => this.simulateVehicleExit(),
      () => this.simulateStatsUpdate(),
      () => this.simulateSystemNotification(),
      () => this.simulateSystemAlert()
    ]

    // Randomly pick 1-2 events
    const numEvents = Math.random() > 0.7 ? 2 : 1
    for (let i = 0; i < numEvents; i++) {
      const randomEvent = events[Math.floor(Math.random() * events.length)]
      setTimeout(randomEvent, Math.random() * 5000) // Spread events over 5 seconds
    }
  }

  private simulateVehicleEntry() {
    const vehicleTypes = ['Trailer', '6 Wheeler', '4 Wheeler', '2 Wheeler']
    const transportNames = ['ABC Transport', 'XYZ Logistics', 'Quick Move', 'Fast Cargo']
    const driverNames = ['Rajesh Kumar', 'Suresh Patel', 'Mahesh Singh', 'Ramesh Gupta']

    const mockEntry: ParkingEntry = {
      id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      vehicleNumber: `KA${String(Math.floor(Math.random() * 100)).padStart(2, '0')}MN${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
      vehicleType: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)],
      transportName: transportNames[Math.floor(Math.random() * transportNames.length)],
      driverName: driverNames[Math.floor(Math.random() * driverNames.length)],
      entryTime: new Date(),
      status: 'Parked',
      paymentStatus: 'Unpaid',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.emit('entry:created', mockEntry)
    this.emit('system:notification', `🚗 New vehicle entered: ${mockEntry.vehicleNumber}`, 'info')
  }

  private simulateVehicleExit() {
    // This would normally reference an actual parked vehicle
    // For demo purposes, we'll create a mock exit event
    const mockEntry: ParkingEntry = {
      id: `mock_exit_${Date.now()}`,
      vehicleNumber: `KA05MN${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
      vehicleType: '4 Wheeler',
      transportName: 'Demo Transport',
      driverName: 'Demo Driver',
      entryTime: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      exitTime: new Date(),
      status: 'Exited',
      paymentStatus: 'Paid',
      paymentType: Math.random() > 0.5 ? 'Cash' : 'UPI',
      amountPaid: 100,
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      updatedAt: new Date()
    }

    this.emit('exit:processed', mockEntry)
    this.emit('system:notification', `🚪 Vehicle exited: ${mockEntry.vehicleNumber}`, 'success')
  }

  private simulateStatsUpdate() {
    const mockStats: ParkingStatistics = {
      parkedVehicles: Math.floor(Math.random() * 20) + 5,
      todayEntries: Math.floor(Math.random() * 80) + 20,
      todayExits: Math.floor(Math.random() * 70) + 15,
      todayIncome: Math.floor(Math.random() * 15000) + 5000,
      unpaidVehicles: Math.floor(Math.random() * 8),
      overstayingVehicles: Math.floor(Math.random() * 3),
      averageStayDuration: Math.round((Math.random() * 10 + 3) * 10) / 10,
      occupancyRate: Math.floor(Math.random() * 40) + 40
    }

    this.emit('stats:updated', mockStats)
  }

  private simulateSystemNotification() {
    const notifications = [
      { message: '📊 Daily report generated', type: 'info' as const },
      { message: '💰 Payment reminder sent', type: 'info' as const },
      { message: '✅ Backup completed successfully', type: 'success' as const },
      { message: '🔄 Data sync completed', type: 'success' as const }
    ]

    const notification = notifications[Math.floor(Math.random() * notifications.length)]
    this.emit('system:notification', notification.message, notification.type)
  }

  private simulateSystemAlert() {
    const alerts = [
      { id: 'overstay_1', message: 'Vehicle KA05MN1234 overstaying (25 hours)', type: 'overstay' as const },
      { id: 'payment_1', message: 'Payment pending for 3 vehicles', type: 'payment' as const },
      { id: 'capacity_1', message: 'Parking 85% full - approaching capacity', type: 'capacity' as const }
    ]

    // Only send alerts occasionally (30% chance)
    if (Math.random() > 0.7) {
      const alert = alerts[Math.floor(Math.random() * alerts.length)]
      this.emit('system:alert', alert)
    }
  }

  // Event handling methods (mirror Socket.IO interface)
  on(event: string, callback: (...args: any[]) => void) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = []
    }
    this.eventHandlers[event].push(callback)
  }

  off(event: string, callback: (...args: any[]) => void) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(cb => cb !== callback)
    }
  }

  emit(event: string, ...args: any[]) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(callback => {
        // Simulate network delay
        setTimeout(() => callback(...args), Math.random() * 100 + 50)
      })
    }
  }

  // Connection simulation
  get connected() {
    return this.isActive
  }

  connect() {
    if (!this.isActive) {
      this.isActive = true
      this.startSimulation()
      setTimeout(() => this.emit('connect'), 500)
    }
    return Promise.resolve()
  }

  disconnect() {
    if (this.isActive) {
      this.isActive = false
      if (this.simulationInterval) {
        clearInterval(this.simulationInterval)
        this.simulationInterval = null
      }
      this.emit('disconnect', 'client disconnect')
    }
  }

  // Room simulation (no-op for mock)
  join(room: string) {
    log.debug('Mock: Joined room', { room })
  }

  leave(room: string) {
    log.debug('Mock: Left room', { room })
  }

  cleanup() {
    this.disconnect()
    this.eventHandlers = {}
  }
}

// Export singleton instance
export const mockSocketServer = new MockSocketServer()

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    mockSocketServer.cleanup()
  })
}

export default mockSocketServer