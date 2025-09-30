import React, { useState, useEffect } from 'react'
import { Button } from '../ui/Button'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Plus, Bluetooth, Settings } from 'lucide-react'
import type { BluetoothDevice, BluetoothPrinterStatus, BluetoothPrinterProfile } from '../../types/bluetoothPrinter'
import printService from '../../services/printService'
import BluetoothPrinterSetupWizard from './BluetoothPrinterSetupWizard'
import toast from 'react-hot-toast'

interface BluetoothPrinterManagerProps {
  onDeviceConnected?: (device: BluetoothDevice) => void
  onDeviceDisconnected?: (deviceId: string) => void
  onPrinterAdded?: (printer: BluetoothPrinterProfile) => void
}

export const BluetoothPrinterManager: React.FC<BluetoothPrinterManagerProps> = ({
  onDeviceConnected,
  onDeviceDisconnected,
  onPrinterAdded
}) => {
  const [bluetoothSupported, setBluetoothSupported] = useState(false)
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [availableDevices, setAvailableDevices] = useState<BluetoothDevice[]>([])
  const [connectedDevices, setConnectedDevices] = useState<BluetoothDevice[]>([])
  const [deviceStatuses, setDeviceStatuses] = useState<Map<string, BluetoothPrinterStatus>>(new Map())
  const [mobileInfo, setMobileInfo] = useState<any>(null)
  const [showSetupWizard, setShowSetupWizard] = useState(false)
  const [printers, setPrinters] = useState<BluetoothPrinterProfile[]>([])

  useEffect(() => {
    initializeBluetooth()
    loadConnectedDevices()
    const interval = setInterval(updateDeviceStatuses, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const initializeBluetooth = async () => {
    try {
      const supported = await printService.isBluetoothSupported()
      setBluetoothSupported(supported)
      
      if (supported) {
        const enabled = await printService.isBluetoothEnabled()
        setBluetoothEnabled(enabled)
        
        // Get mobile optimization info
        const info = printService.getMobileOptimizationInfo()
        setMobileInfo(info)
      }
    } catch (error) {
      console.error('Failed to initialize Bluetooth:', error)
    }
  }

  const loadConnectedDevices = async () => {
    try {
      const devices = await printService.getBluetoothConnectedDevices()
      setConnectedDevices(devices)
      
      // Get statuses for connected devices
      for (const device of devices) {
        try {
          const status = await printService.getBluetoothPrinterStatus(device.id)
          setDeviceStatuses(prev => new Map(prev.set(device.id, status)))
        } catch (error) {
          console.error(`Failed to get status for device ${device.id}:`, error)
        }
      }
    } catch (error) {
      console.error('Failed to load connected devices:', error)
    }
  }

  const updateDeviceStatuses = async () => {
    for (const device of connectedDevices) {
      try {
        const status = await printService.getBluetoothPrinterStatus(device.id)
        setDeviceStatuses(prev => new Map(prev.set(device.id, status)))
      } catch (error) {
        console.error(`Failed to update status for device ${device.id}:`, error)
      }
    }
  }

  const requestPermissions = async () => {
    try {
      const granted = await printService.requestBluetoothPermissions()
      if (granted) {
        toast.success('Bluetooth permissions granted')
        await initializeBluetooth()
      } else {
        toast.error('Bluetooth permissions required for printer discovery')
      }
    } catch (error) {
      toast.error('Failed to request Bluetooth permissions')
      console.error('Permission request failed:', error)
    }
  }

  const scanForPrinters = async () => {
    if (!bluetoothSupported) {
      toast.error('Bluetooth not supported on this device')
      return
    }

    setScanning(true)
    try {
      const devices = await printService.scanForBluetoothPrinters()
      setAvailableDevices(devices)
      
      if (devices.length === 0) {
        toast.info('No Bluetooth printers found. Make sure printer is discoverable.')
      } else {
        toast.success(`Found ${devices.length} Bluetooth printer(s)`)
      }
    } catch (error) {
      toast.error('Failed to scan for Bluetooth printers')
      console.error('Scan failed:', error)
    } finally {
      setScanning(false)
    }
  }

  const connectToPrinter = async (device: BluetoothDevice) => {
    setConnecting(device.id)
    try {
      const connected = await printService.connectBluetoothPrinter(device.id)
      
      if (connected) {
        toast.success(`Connected to ${device.name}`)
        await loadConnectedDevices()
        onDeviceConnected?.(device)
      } else {
        toast.error(`Failed to connect to ${device.name}`)
      }
    } catch (error) {
      toast.error(`Connection failed: ${error.message}`)
      console.error('Connection failed:', error)
    } finally {
      setConnecting(null)
    }
  }

  const disconnectFromPrinter = async (device: BluetoothDevice) => {
    try {
      await printService.disconnectBluetoothPrinter(device.id)
      toast.success(`Disconnected from ${device.name}`)
      await loadConnectedDevices()
      onDeviceDisconnected?.(device.id)
    } catch (error) {
      toast.error(`Disconnection failed: ${error.message}`)
      console.error('Disconnection failed:', error)
    }
  }

  const testConnection = async (device: BluetoothDevice) => {
    try {
      const result = await printService.testBluetoothConnection(device.id)
      
      if (result.success) {
        toast.success(`Connection test passed (${result.responseTime}ms)`)
      } else {
        toast.error(`Connection test failed: ${result.error}`)
      }
    } catch (error) {
      toast.error('Connection test failed')
      console.error('Test failed:', error)
    }
  }

  const getStatusColor = (status?: BluetoothPrinterStatus) => {
    if (!status) return 'text-gray-500'
    if (!status.connected) return 'text-red-500'
    if (status.signalStrength > 70) return 'text-green-500'
    if (status.signalStrength > 40) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getStatusText = (status?: BluetoothPrinterStatus) => {
    if (!status) return 'Unknown'
    if (!status.connected) return 'Disconnected'
    return `Connected (${status.signalStrength}% signal)`
  }

  const handlePrinterAdded = (printer: BluetoothPrinterProfile) => {
    setPrinters(prev => [...prev, printer])
    setShowSetupWizard(false)
    onPrinterAdded?.(printer)
    
    // Reload connected devices to reflect the new setup
    loadConnectedDevices()
  }

  if (!bluetoothSupported) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-red-600">Bluetooth Not Supported</h3>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            This device does not support Bluetooth or Web Bluetooth API is not available.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Please use a modern browser with HTTPS connection for Bluetooth printer support.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Bluetooth Status */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Bluetooth Printer Manager</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Bluetooth Status:</span>
              <span className={bluetoothEnabled ? 'text-green-600' : 'text-red-600'}>
                {bluetoothEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            
            {mobileInfo?.deviceInfo.isMobile && (
              <div className="bg-blue-50 p-3 rounded">
                <h4 className="font-medium text-blue-800">Mobile Device Detected</h4>
                <p className="text-sm text-blue-600 mt-1">
                  {mobileInfo.deviceInfo.isIOS ? 'iOS' : 'Android'} - {mobileInfo.deviceInfo.browserName}
                </p>
                {mobileInfo.batteryInfo && (
                  <p className="text-sm text-blue-600">
                    Battery: {Math.round(mobileInfo.batteryInfo.level * 100)}% 
                    {mobileInfo.batteryInfo.charging && ' (Charging)'}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {!bluetoothEnabled && (
                <Button onClick={requestPermissions} variant="primary">
                  Request Permissions
                </Button>
              )}
              
              <Button 
                onClick={scanForPrinters} 
                disabled={!bluetoothEnabled || scanning}
                variant="secondary"
              >
                {scanning ? 'Scanning...' : 'Scan for Printers'}
              </Button>
              
              <Button
                onClick={() => setShowSetupWizard(true)}
                disabled={!bluetoothEnabled}
                variant="primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Printer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Devices */}
      {availableDevices.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Available Printers</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {availableDevices.map((device) => (
                <div 
                  key={device.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <h4 className="font-medium">{device.name}</h4>
                    <p className="text-sm text-gray-500">
                      {device.id} • {device.paired ? 'Paired' : 'Not paired'}
                    </p>
                  </div>
                  <Button
                    onClick={() => connectToPrinter(device)}
                    disabled={connecting === device.id || device.connected}
                    variant="primary"
                    size="sm"
                  >
                    {connecting === device.id ? 'Connecting...' : 
                     device.connected ? 'Connected' : 'Connect'}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configured Printers */}
      {printers.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Configured Bluetooth Printers</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {printers.map((printer) => {
                const status = deviceStatuses.get(printer.bluetoothConfig?.deviceId || '')
                const isConnected = connectedDevices.some(d => d.id === printer.bluetoothConfig?.deviceId)
                return (
                  <div 
                    key={printer.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-full bg-blue-100">
                        <Bluetooth className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">{printer.name}</h4>
                        <p className="text-sm text-gray-500">
                          {printer.model} • {printer.paperSize}
                        </p>
                        <p className={`text-xs ${isConnected ? 'text-green-600' : 'text-gray-400'}`}>
                          {isConnected ? 'Connected' : 'Offline'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!isConnected && (
                        <Button
                          onClick={() => connectToPrinter({ 
                            id: printer.bluetoothConfig?.deviceId || '',
                            name: printer.name,
                            connected: false,
                            paired: true,
                            lastSeen: new Date()
                          })}
                          variant="primary"
                          size="sm"
                        >
                          Connect
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                      >
                        <Settings className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connected Devices */}
      {connectedDevices.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Active Connections</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {connectedDevices.map((device) => {
                const status = deviceStatuses.get(device.id)
                return (
                  <div 
                    key={device.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium">{device.name}</h4>
                      <p className={`text-sm ${getStatusColor(status)}`}>
                        {getStatusText(status)}
                      </p>
                      {status?.batteryLevel && (
                        <p className="text-sm text-gray-500">
                          Battery: {status.batteryLevel}%
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => testConnection(device)}
                        variant="secondary"
                        size="sm"
                      >
                        Test
                      </Button>
                      <Button
                        onClick={() => disconnectFromPrinter(device)}
                        variant="danger"
                        size="sm"
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup Wizard */}
      <BluetoothPrinterSetupWizard
        isOpen={showSetupWizard}
        onPrinterAdded={handlePrinterAdded}
        onCancel={() => setShowSetupWizard(false)}
      />
    </div>
  )
}

export default BluetoothPrinterManager