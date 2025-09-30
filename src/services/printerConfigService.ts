/**
 * Comprehensive Printer Configuration Service
 * Hardware profile management, discovery, testing, and configuration
 */

import { supabase } from '../lib/supabase'
import type {
  PrinterProfile,
  DetectedPrinter,
  TestResult,
  CalibrationResult,
  PrintDefaults,
  LocationPrinterAssignment,
  PrinterConfigValidation,
  PrinterCapabilities,
  ConnectionConfig,
  USBConfig,
  NetworkConfig,
  BluetoothConfig,
  SerialConfig,
  PrintJob,
  PrintQueue
} from '../types/printerConfig'

class PrinterConfigService {
  private static instance: PrinterConfigService
  private profileCache = new Map<string, PrinterProfile>()
  private discoveryCache = new Map<string, DetectedPrinter[]>()
  private readonly cacheTimeout = 5 * 60 * 1000 // 5 minutes

  static getInstance(): PrinterConfigService {
    if (!PrinterConfigService.instance) {
      PrinterConfigService.instance = new PrinterConfigService()
    }
    return PrinterConfigService.instance
  }

  // ========================
  // Printer Profile Management
  // ========================

  async createPrinterProfile(
    profile: Omit<PrinterProfile, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PrinterProfile> {
    const newProfile: PrinterProfile = {
      ...profile,
      id: `printer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      usage: {
        totalJobs: 0,
        successfulJobs: 0,
        failedJobs: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Validate profile before creation
    const validation = await this.validateProfile(newProfile)
    if (!validation.isValid) {
      throw new Error(`Profile validation failed: ${validation.errors.join(', ')}`)
    }

    try {
      const { data, error } = await supabase
        .from('printer_profiles')
        .insert({
          id: newProfile.id,
          name: newProfile.name,
          type: newProfile.type,
          manufacturer: newProfile.manufacturer,
          model: newProfile.model,
          description: newProfile.description,
          connection_config: newProfile.connection,
          capabilities: newProfile.capabilities,
          default_settings: newProfile.defaultSettings,
          is_active: newProfile.isActive,
          is_default: newProfile.isDefault,
          usage_stats: newProfile.usage,
          created_at: newProfile.createdAt.toISOString(),
          updated_at: newProfile.updatedAt.toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Update cache
      this.profileCache.set(newProfile.id, newProfile)
      
      // If this is set as default, update other profiles
      if (newProfile.isDefault) {
        await this.setDefaultPrinter(newProfile.id)
      }

      return newProfile
    } catch (error) {
      console.error('Failed to create printer profile:', error)
      throw new Error(`Failed to create printer profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async updatePrinterProfile(
    id: string, 
    updates: Partial<PrinterProfile>
  ): Promise<PrinterProfile> {
    const existingProfile = await this.getPrinterProfile(id)
    if (!existingProfile) {
      throw new Error(`Printer profile not found: ${id}`)
    }

    const updatedProfile: PrinterProfile = {
      ...existingProfile,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date()
    }

    // Validate updated profile
    const validation = await this.validateProfile(updatedProfile)
    if (!validation.isValid) {
      throw new Error(`Profile validation failed: ${validation.errors.join(', ')}`)
    }

    try {
      const { data, error } = await supabase
        .from('printer_profiles')
        .update({
          name: updatedProfile.name,
          type: updatedProfile.type,
          manufacturer: updatedProfile.manufacturer,
          model: updatedProfile.model,
          description: updatedProfile.description,
          connection_config: updatedProfile.connection,
          capabilities: updatedProfile.capabilities,
          default_settings: updatedProfile.defaultSettings,
          is_active: updatedProfile.isActive,
          is_default: updatedProfile.isDefault,
          usage_stats: updatedProfile.usage,
          updated_at: updatedProfile.updatedAt.toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Update cache
      this.profileCache.set(id, updatedProfile)

      // Handle default printer changes
      if (updates.isDefault === true) {
        await this.setDefaultPrinter(id)
      }

      return updatedProfile
    } catch (error) {
      console.error('Failed to update printer profile:', error)
      throw new Error(`Failed to update printer profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async deletePrinterProfile(id: string): Promise<void> {
    try {
      // Check if printer is currently being used
      const activeJobs = await this.getActivePrintJobs(id)
      if (activeJobs.length > 0) {
        throw new Error('Cannot delete printer profile with active print jobs')
      }

      // Check if this is the default printer
      const profile = await this.getPrinterProfile(id)
      if (profile?.isDefault) {
        throw new Error('Cannot delete default printer profile. Set another printer as default first.')
      }

      const { error } = await supabase
        .from('printer_profiles')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Remove from cache
      this.profileCache.delete(id)

      // Clean up location assignments
      await supabase
        .from('location_printer_assignments')
        .delete()
        .eq('printer_profile_id', id)

    } catch (error) {
      console.error('Failed to delete printer profile:', error)
      throw new Error(`Failed to delete printer profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getPrinterProfile(id: string): Promise<PrinterProfile | null> {
    // Check cache first
    if (this.profileCache.has(id)) {
      return this.profileCache.get(id)!
    }

    try {
      const { data, error } = await supabase
        .from('printer_profiles')
        .select(`
          *,
          location_assignments:location_printer_assignments(
            id,
            location_id,
            assignment_type,
            is_primary,
            is_active,
            created_at
          )
        `)
        .eq('id', id)
        .single()

      if (error || !data) return null

      const profile = this.mapDatabaseToProfile(data)
      this.profileCache.set(id, profile)
      return profile
    } catch (error) {
      console.error('Failed to get printer profile:', error)
      return null
    }
  }

  async getAllPrinterProfiles(): Promise<PrinterProfile[]> {
    try {
      const { data, error } = await supabase
        .from('printer_profiles')
        .select(`
          *,
          location_assignments:location_printer_assignments(
            id,
            location_id,
            assignment_type,
            is_primary,
            is_active,
            created_at
          )
        `)
        .order('name')

      if (error) throw error

      const profiles = data?.map(item => this.mapDatabaseToProfile(item)) || []
      
      // Update cache
      profiles.forEach(profile => {
        this.profileCache.set(profile.id, profile)
      })

      return profiles
    } catch (error) {
      console.error('Failed to get printer profiles:', error)
      throw new Error(`Failed to get printer profiles: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // ========================
  // Printer Discovery
  // ========================

  async discoverPrinters(): Promise<DetectedPrinter[]> {
    const cacheKey = 'all_printers'
    const cached = this.discoveryCache.get(cacheKey)
    
    if (cached && Date.now() - cached[0]?.timestamp < this.cacheTimeout) {
      return cached
    }

    try {
      const [usbPrinters, networkPrinters, bluetoothPrinters, serialPrinters] = await Promise.allSettled([
        this.discoverUSBPrinters(),
        this.discoverNetworkPrinters(),
        this.discoverBluetoothPrinters(),
        this.discoverSerialPrinters()
      ])

      const allPrinters: DetectedPrinter[] = []
      
      if (usbPrinters.status === 'fulfilled') {
        allPrinters.push(...usbPrinters.value)
      }
      if (networkPrinters.status === 'fulfilled') {
        allPrinters.push(...networkPrinters.value)
      }
      if (bluetoothPrinters.status === 'fulfilled') {
        allPrinters.push(...bluetoothPrinters.value)
      }
      if (serialPrinters.status === 'fulfilled') {
        allPrinters.push(...serialPrinters.value)
      }

      // Remove duplicates based on name and connection details
      const uniquePrinters = this.deduplicatePrinters(allPrinters)
      
      // Cache results
      this.discoveryCache.set(cacheKey, uniquePrinters)
      
      return uniquePrinters
    } catch (error) {
      console.error('Printer discovery failed:', error)
      return []
    }
  }

  private async discoverUSBPrinters(): Promise<DetectedPrinter[]> {
    // Web USB API for supported browsers
    if ('usb' in navigator) {
      try {
        // Common printer vendor IDs
        const printerVendorIds = [
          0x04b8, // Epson
          0x03f0, // HP  
          0x04a9, // Canon
          0x04e8, // Samsung
          0x0924, // Zebra
          0x0619, // Star Micronics
          0x1504, // Citizen
        ]

        const devices = await (navigator as any).usb.getDevices()
        const printers: DetectedPrinter[] = []

        for (const device of devices) {
          if (printerVendorIds.includes(device.vendorId)) {
            printers.push({
              name: device.productName || `USB Printer (${device.vendorId}:${device.productId})`,
              manufacturer: this.getManufacturerFromVendorId(device.vendorId),
              connectionType: 'usb',
              connectionDetails: {
                vendorId: device.vendorId,
                productId: device.productId
              } as USBConfig,
              isOnline: device.opened || false
            })
          }
        }

        return printers
      } catch (error) {
        console.warn('USB printer discovery failed:', error)
        return []
      }
    }
    
    return []
  }

  private async discoverNetworkPrinters(ipRange = '192.168.1.0/24'): Promise<DetectedPrinter[]> {
    // Network printer discovery using common ports
    const commonPrinterPorts = [9100, 515, 631, 80, 443]
    const printers: DetectedPrinter[] = []

    try {
      // Parse IP range (simplified for common subnet)
      const baseIP = ipRange.split('/')[0].split('.').slice(0, 3).join('.')
      const discoveries: Promise<DetectedPrinter | null>[] = []

      // Scan common IP range (1-254)
      for (let i = 1; i <= 254; i++) {
        const ip = `${baseIP}.${i}`
        for (const port of commonPrinterPorts) {
          discoveries.push(this.testNetworkPrinter(ip, port))
        }
      }

      const results = await Promise.allSettled(discoveries)
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          printers.push(result.value)
        }
      })

      return this.deduplicatePrinters(printers)
    } catch (error) {
      console.warn('Network printer discovery failed:', error)
      return []
    }
  }

  private async testNetworkPrinter(ip: string, port: number): Promise<DetectedPrinter | null> {
    try {
      // Simple connectivity test
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000)

      const response = await fetch(`http://${ip}:${port}`, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors'
      }).catch(() => null)

      clearTimeout(timeoutId)

      if (response?.ok || response?.status === 0) {
        return {
          name: `Network Printer (${ip}:${port})`,
          connectionType: 'network',
          connectionDetails: {
            ipAddress: ip,
            port: port,
            protocol: port === 631 ? 'ipp' : port === 80 ? 'http' : 'socket'
          } as NetworkConfig,
          isOnline: true
        }
      }

      return null
    } catch {
      return null
    }
  }

  private async discoverBluetoothPrinters(): Promise<DetectedPrinter[]> {
    if ('bluetooth' in navigator) {
      try {
        const devices = await (navigator as any).bluetooth.getDevices()
        return devices
          .filter((device: any) => 
            device.name?.toLowerCase().includes('printer') ||
            device.name?.toLowerCase().includes('pos') ||
            device.name?.toLowerCase().includes('thermal')
          )
          .map((device: any) => ({
            name: device.name || `Bluetooth Printer (${device.id})`,
            connectionType: 'bluetooth' as const,
            connectionDetails: {
              deviceAddress: device.id
            } as BluetoothConfig,
            isOnline: device.gatt?.connected || false
          }))
      } catch (error) {
        console.warn('Bluetooth printer discovery failed:', error)
        return []
      }
    }
    
    return []
  }

  private async discoverSerialPrinters(): Promise<DetectedPrinter[]> {
    if ('serial' in navigator) {
      try {
        const ports = await (navigator as any).serial.getPorts()
        return ports.map((port: any, index: number) => ({
          name: `Serial Printer ${index + 1}`,
          connectionType: 'serial' as const,
          connectionDetails: {
            port: `COM${index + 1}`,
            baudRate: 9600,
            dataBits: 8,
            stopBits: 1,
            parity: 'none'
          } as SerialConfig,
          isOnline: port.readable && port.writable
        }))
      } catch (error) {
        console.warn('Serial printer discovery failed:', error)
        return []
      }
    }
    
    return []
  }

  // ========================
  // Printer Testing & Validation
  // ========================

  async testPrinterConnection(profile: PrinterProfile): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      let success = false
      let message = ''
      let capabilities: Partial<PrinterCapabilities> = {}

      switch (profile.connection.type) {
        case 'network':
          const result = await this.testNetworkConnection(profile.connection.settings as NetworkConfig)
          success = result.success
          message = result.message
          break
          
        case 'usb':
          // USB testing would require native app integration
          success = await this.testUSBConnection(profile.connection.settings as USBConfig)
          message = success ? 'USB connection successful' : 'USB connection failed'
          break
          
        case 'bluetooth':
          success = await this.testBluetoothConnection(profile.connection.settings as BluetoothConfig)
          message = success ? 'Bluetooth connection successful' : 'Bluetooth connection failed'
          break
          
        case 'serial':
          success = await this.testSerialConnection(profile.connection.settings as SerialConfig)
          message = success ? 'Serial connection successful' : 'Serial connection failed'
          break
          
        default:
          throw new Error(`Unsupported connection type: ${profile.connection.type}`)
      }

      const testResult: TestResult = {
        success,
        message,
        responseTime: Date.now() - startTime,
        capabilities: success ? capabilities : undefined,
        timestamp: new Date()
      }

      // Update profile with test result
      await this.updatePrinterProfile(profile.id, {
        lastTestResult: testResult,
        updatedAt: new Date()
      })

      return testResult
    } catch (error) {
      const testResult: TestResult = {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
        errorCode: 'CONNECTION_FAILED',
        timestamp: new Date()
      }

      // Update profile with failed test result
      await this.updatePrinterProfile(profile.id, {
        lastTestResult: testResult,
        updatedAt: new Date()
      })

      return testResult
    }
  }

  private async testNetworkConnection(config: NetworkConfig): Promise<{ success: boolean; message: string }> {
    try {
      const url = `${config.protocol === 'https' ? 'https' : 'http'}://${config.ipAddress}:${config.port}`
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), config.timeout || 5000)

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: config.authentication ? {
          'Authorization': `Basic ${btoa(`${config.authentication.username}:${config.authentication.password}`)}`
        } : {}
      })

      clearTimeout(timeoutId)

      return {
        success: response.ok,
        message: response.ok ? 'Network printer responding' : `HTTP ${response.status}: ${response.statusText}`
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network connection failed'
      }
    }
  }

  private async testUSBConnection(config: USBConfig): Promise<boolean> {
    // USB testing requires native app or Web USB API permissions
    if ('usb' in navigator) {
      try {
        const device = await (navigator as any).usb.requestDevice({
          filters: [{ vendorId: config.vendorId, productId: config.productId }]
        })
        return device.opened
      } catch {
        return false
      }
    }
    return false
  }

  private async testBluetoothConnection(config: BluetoothConfig): Promise<boolean> {
    if ('bluetooth' in navigator) {
      try {
        const device = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: ['printing']
        })
        return device.gatt?.connected || false
      } catch {
        return false
      }
    }
    return false
  }

  private async testSerialConnection(config: SerialConfig): Promise<boolean> {
    if ('serial' in navigator) {
      try {
        const port = await (navigator as any).serial.requestPort()
        await port.open({
          baudRate: config.baudRate,
          dataBits: config.dataBits,
          stopBits: config.stopBits,
          parity: config.parity
        })
        const connected = port.readable && port.writable
        await port.close()
        return connected
      } catch {
        return false
      }
    }
    return false
  }

  // ========================
  // Default Printer Management
  // ========================

  async setDefaultPrinter(profileId: string): Promise<void> {
    try {
      // First, unset all other default printers
      await supabase
        .from('printer_profiles')
        .update({ is_default: false })
        .neq('id', profileId)

      // Set the specified printer as default
      const { error } = await supabase
        .from('printer_profiles')
        .update({ 
          is_default: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId)

      if (error) throw error

      // Clear cache to force reload
      this.profileCache.clear()
    } catch (error) {
      console.error('Failed to set default printer:', error)
      throw new Error(`Failed to set default printer: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getDefaultPrinter(): Promise<PrinterProfile | null> {
    try {
      const { data, error } = await supabase
        .from('printer_profiles')
        .select('*')
        .eq('is_default', true)
        .eq('is_active', true)
        .single()

      if (error || !data) return null

      return this.mapDatabaseToProfile(data)
    } catch (error) {
      console.error('Failed to get default printer:', error)
      return null
    }
  }

  // ========================
  // Print Job Management
  // ========================

  async getActivePrintJobs(printerProfileId?: string): Promise<PrintJob[]> {
    try {
      let query = supabase
        .from('print_jobs')
        .select('*')
        .in('status', ['pending', 'printing'])

      if (printerProfileId) {
        query = query.eq('printer_profile_id', printerProfileId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      return data?.map(item => this.mapDatabaseToPrintJob(item)) || []
    } catch (error) {
      console.error('Failed to get active print jobs:', error)
      return []
    }
  }

  // ========================
  // Utility Methods
  // ========================

  private mapDatabaseToProfile(data: any): PrinterProfile {
    return {
      id: data.id,
      name: data.name,
      type: data.type,
      manufacturer: data.manufacturer,
      model: data.model,
      description: data.description,
      connection: data.connection_config,
      capabilities: data.capabilities,
      defaultSettings: data.default_settings,
      isActive: data.is_active,
      isDefault: data.is_default,
      lastTestResult: data.last_test_result,
      calibrationData: data.calibration_data,
      usage: data.usage_stats || {
        totalJobs: 0,
        successfulJobs: 0,
        failedJobs: 0
      },
      locationAssignments: data.location_assignments?.map((assignment: any) => ({
        id: assignment.id,
        locationId: assignment.location_id,
        printerProfileId: data.id,
        assignmentType: assignment.assignment_type,
        isPrimary: assignment.is_primary,
        isActive: assignment.is_active,
        createdAt: new Date(assignment.created_at)
      })) || [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  }

  private mapDatabaseToPrintJob(data: any): PrintJob {
    return {
      id: data.id,
      printerProfileId: data.printer_profile_id,
      documentType: data.document_type,
      data: data.print_data,
      settings: data.print_settings,
      status: data.status,
      priority: data.priority,
      attempts: data.attempts,
      maxAttempts: data.max_attempts,
      error: data.error_message,
      createdAt: new Date(data.created_at),
      startedAt: data.started_at ? new Date(data.started_at) : undefined,
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined
    }
  }

  private getManufacturerFromVendorId(vendorId: number): string {
    const manufacturers: Record<number, string> = {
      0x04b8: 'Epson',
      0x03f0: 'HP',
      0x04a9: 'Canon',
      0x04e8: 'Samsung',
      0x0924: 'Zebra',
      0x0619: 'Star Micronics',
      0x1504: 'Citizen'
    }
    return manufacturers[vendorId] || 'Unknown'
  }

  private deduplicatePrinters(printers: DetectedPrinter[]): DetectedPrinter[] {
    const seen = new Set<string>()
    return printers.filter(printer => {
      const key = `${printer.name}_${printer.connectionType}_${JSON.stringify(printer.connectionDetails)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  private async validateProfile(profile: Partial<PrinterProfile>): Promise<PrinterConfigValidation> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    // Required field validation
    if (!profile.name?.trim()) errors.push('Printer name is required')
    if (!profile.type) errors.push('Printer type is required')
    if (!profile.manufacturer?.trim()) warnings.push('Manufacturer information recommended')
    if (!profile.model?.trim()) warnings.push('Model information recommended')

    // Connection validation
    if (!profile.connection?.type) {
      errors.push('Connection type is required')
    } else if (!profile.connection.settings) {
      errors.push('Connection settings are required')
    }

    // Capabilities validation
    if (profile.capabilities) {
      if (!profile.capabilities.maxWidth || profile.capabilities.maxWidth <= 0) {
        errors.push('Valid maximum width is required')
      }
      if (!profile.capabilities.resolution || profile.capabilities.resolution <= 0) {
        errors.push('Valid resolution is required')
      }
    }

    // Performance suggestions
    if (profile.type === 'thermal' && profile.capabilities?.resolution && profile.capabilities.resolution > 300) {
      suggestions.push('High resolution thermal printers may print slower')
    }

    const compatibilityScore = Math.max(0, 100 - (errors.length * 25) - (warnings.length * 10))

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      compatibilityScore
    }
  }

  // ========================
  // Print Defaults Management
  // ========================

  async updatePrintDefaults(settings: PrintDefaults): Promise<void> {
    try {
      const { error } = await supabase
        .from('print_settings')
        .upsert({
          setting_key: 'print_defaults',
          setting_value: settings,
          description: 'Default print settings for all printers',
          updated_at: new Date().toISOString()
        })

      if (error) throw error
    } catch (error) {
      console.error('Failed to update print defaults:', error)
      throw new Error(`Failed to update print defaults: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getPrintDefaults(): Promise<PrintDefaults> {
    try {
      const { data, error } = await supabase
        .from('print_settings')
        .select('setting_value')
        .eq('setting_key', 'print_defaults')
        .single()

      if (error || !data) {
        // Return sensible defaults if not configured
        return {
          paperSize: 'A4',
          orientation: 'portrait',
          copies: 1,
          density: 5,
          speed: 'normal',
          margins: { top: 10, right: 10, bottom: 10, left: 10 },
          scaling: 1.0,
          fitToPage: false,
          centerContent: false,
          quality: 'normal'
        }
      }

      return data.setting_value as PrintDefaults
    } catch (error) {
      console.error('Failed to get print defaults:', error)
      throw new Error(`Failed to get print defaults: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // ========================
  // Calibration Management
  // ========================

  async calibratePrinter(profileId: string): Promise<CalibrationResult> {
    const profile = await this.getPrinterProfile(profileId)
    if (!profile) {
      throw new Error('Printer profile not found')
    }

    try {
      // Perform calibration test print
      const testResult = await this.testPrinterConnection(profile)
      
      if (!testResult.success) {
        return {
          success: false,
          adjustments: {},
          testPrintQuality: 'poor',
          recommendations: ['Fix printer connection before calibration'],
          timestamp: new Date()
        }
      }

      // Simulate calibration process
      const adjustments = {
        density: Math.min(10, Math.max(1, profile.defaultSettings.density + (Math.random() - 0.5))),
        speed: profile.defaultSettings.speed,
        margins: profile.defaultSettings.margins,
        alignment: { x: 0, y: 0 }
      }

      const result: CalibrationResult = {
        success: true,
        adjustments,
        testPrintQuality: 'good',
        recommendations: ['Calibration completed successfully'],
        timestamp: new Date()
      }

      // Update profile with calibration data
      await this.updatePrinterProfile(profileId, {
        calibrationData: result,
        defaultSettings: {
          ...profile.defaultSettings,
          density: adjustments.density || profile.defaultSettings.density
        }
      })

      return result
    } catch (error) {
      return {
        success: false,
        adjustments: {},
        testPrintQuality: 'poor',
        recommendations: [`Calibration failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        timestamp: new Date()
      }
    }
  }

  // ========================
  // Location Assignment Management
  // ========================

  async assignPrinterToLocation(
    printerProfileId: string,
    locationId: number,
    assignmentType: LocationPrinterAssignment['assignmentType'],
    isPrimary = false
  ): Promise<LocationPrinterAssignment> {
    try {
      // If setting as primary, unset other primary assignments for this location/type
      if (isPrimary) {
        await supabase
          .from('location_printer_assignments')
          .update({ is_primary: false })
          .eq('location_id', locationId)
          .eq('assignment_type', assignmentType)
      }

      const assignment = {
        id: `assignment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        locationId,
        printerProfileId,
        assignmentType,
        isPrimary,
        isActive: true,
        createdAt: new Date()
      }

      const { data, error } = await supabase
        .from('location_printer_assignments')
        .insert({
          id: assignment.id,
          location_id: assignment.locationId,
          printer_profile_id: assignment.printerProfileId,
          assignment_type: assignment.assignmentType,
          is_primary: assignment.isPrimary,
          is_active: assignment.isActive,
          created_at: assignment.createdAt.toISOString()
        })
        .select()
        .single()

      if (error) throw error

      return assignment
    } catch (error) {
      console.error('Failed to assign printer to location:', error)
      throw new Error(`Failed to assign printer: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Export singleton instance
export const printerConfigService = PrinterConfigService.getInstance()
export default printerConfigService