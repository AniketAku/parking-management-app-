import React, { useState, useEffect, useCallback, useRef } from 'react'
import { 
  Bluetooth, 
  Search, 
  Loader2, 
  Printer, 
  Check, 
  AlertCircle,
  Settings,
  TestTube,
  X,
  Smartphone,
  Wifi,
  Battery,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Card, CardHeader, CardContent } from '../ui'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import StepIndicator, { type Step } from '../ui/StepIndicator'
import type { 
  BluetoothDevice, 
  BluetoothPrinterProfile,
  BluetoothPrinterStatus 
} from '../../types/bluetoothPrinter'
import printService from '../../services/printService'
import { mobileBluetoothOptimizer } from '../../services/mobileBluetoothOptimizer'
import toast from 'react-hot-toast'

interface BluetoothPrinterSetupWizardProps {
  isOpen: boolean
  onPrinterAdded: (printer: BluetoothPrinterProfile) => void
  onCancel: () => void
}

interface WizardError {
  type: 'bluetooth' | 'permission' | 'connection' | 'scan' | 'test' | 'general'
  message: string
  canRetry: boolean
  retryAction?: () => void
  details?: string
}

export const BluetoothPrinterSetupWizard: React.FC<BluetoothPrinterSetupWizardProps> = ({
  isOpen,
  onPrinterAdded,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [bluetoothSupported, setBluetoothSupported] = useState(false)
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [discoveredDevices, setDiscoveredDevices] = useState<BluetoothDevice[]>([])
  const [selectedDevice, setSelectedDevice] = useState<BluetoothDevice | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [printerProfile, setPrinterProfile] = useState<Partial<BluetoothPrinterProfile>>({})
  const [mobileInfo, setMobileInfo] = useState<any>(null)
  const [currentError, setCurrentError] = useState<WizardError | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [canGoBack, setCanGoBack] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const steps: Step[] = [
    { id: 1, title: 'Enable Bluetooth', description: 'Check Bluetooth status' },
    { id: 2, title: 'Scan for Printers', description: 'Discover available devices' },
    { id: 3, title: 'Select Printer', description: 'Choose your printer' },
    { id: 4, title: 'Test Connection', description: 'Verify connectivity' },
    { id: 5, title: 'Configure Settings', description: 'Setup printer profile' }
  ]

  useEffect(() => {
    if (isOpen) {
      initializeWizard()
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isOpen])

  useEffect(() => {
    setCanGoBack(currentStep > 1 && !scanning && !connecting && !testing)
  }, [currentStep, scanning, connecting, testing])

  const clearError = useCallback(() => {
    setCurrentError(null)
  }, [])

  const handleError = useCallback((error: any, type: WizardError['type'], retryAction?: () => void) => {
    const wizardError: WizardError = {
      type,
      message: error.message || `${type} error occurred`,
      canRetry: !!retryAction,
      retryAction,
      details: error.stack || error.toString()
    }
    setCurrentError(wizardError)
    console.error(`Wizard ${type} error:`, error)
  }, [])

  const handleRetry = useCallback(async () => {
    if (!currentError?.retryAction) return
    
    setIsRetrying(true)
    setCurrentError(null)
    
    try {
      await currentError.retryAction()
    } catch (error) {
      handleError(error, currentError.type, currentError.retryAction)
    } finally {
      setIsRetrying(false)
    }
  }, [currentError, handleError])

  const goToPreviousStep = useCallback(() => {
    if (!canGoBack) return
    
    clearError()
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }, [canGoBack, currentStep, clearError])

  const initializeWizard = async () => {
    try {
      // Check Bluetooth support
      const supported = await printService.isBluetoothSupported()
      setBluetoothSupported(supported)
      
      if (supported) {
        const enabled = await printService.isBluetoothEnabled()
        setBluetoothEnabled(enabled)
        
        // Get mobile info
        const info = printService.getMobileOptimizationInfo()
        setMobileInfo(info)
        
        if (enabled) {
          setCurrentStep(2)
        }
      }
    } catch (error) {
      handleError(error, 'bluetooth', () => initializeWizard())
      toast.error('Failed to initialize Bluetooth setup')
    }
  }

  const handleRequestPermissions = async () => {
    try {
      const granted = await printService.requestBluetoothPermissions()
      if (granted) {
        const enabled = await printService.isBluetoothEnabled()
        setBluetoothEnabled(enabled)
        
        if (enabled) {
          toast.success('Bluetooth permissions granted')
          setCurrentStep(2)
        } else {
          toast.error('Please enable Bluetooth on your device')
        }
      } else {
        toast.error('Bluetooth permissions required for printer setup')
      }
    } catch (error) {
      handleError(error, 'permission', handleRequestPermissions)
      toast.error('Failed to request Bluetooth permissions')
    }
  }

  const handleScanForPrinters = async () => {
    setScanning(true)
    setDiscoveredDevices([])
    
    try {
      const devices = await printService.scanForBluetoothPrinters()
      setDiscoveredDevices(devices)
      
      if (devices.length === 0) {
        toast.info('No Bluetooth printers found. Ensure printer is discoverable.')
      } else {
        toast.success(`Found ${devices.length} Bluetooth printer${devices.length !== 1 ? 's' : ''}`)
        setCurrentStep(3)
      }
    } catch (error) {
      handleError(error, 'scan', handleScanForPrinters)
      toast.error(`Bluetooth scan failed: ${error.message}`)
    } finally {
      setScanning(false)
    }
  }

  const handleDeviceSelect = async (device: BluetoothDevice) => {
    setSelectedDevice(device)
    setConnecting(true)
    
    try {
      const connected = await printService.connectBluetoothPrinter(device.id)
      
      if (connected) {
        // Initialize printer profile
        setPrinterProfile({
          id: `bt_${device.id}`,
          name: device.name || 'Bluetooth Printer',
          type: 'thermal',
          manufacturer: 'Unknown',
          model: device.name || 'Bluetooth Printer',
          connection: 'bluetooth',
          bluetoothConfig: {
            deviceId: device.id,
            deviceName: device.name || '',
            macAddress: device.id,
            serviceUUID: '000018f0-0000-1000-8000-00805f9b34fb',
            characteristicUUID: '00002af1-0000-1000-8000-00805f9b34fb',
            autoReconnect: true,
            connectionTimeout: 15000,
            chunkSize: mobileInfo?.deviceInfo.isMobile ? 20 : 512,
            chunkDelay: mobileInfo?.deviceInfo.isMobile ? 100 : 50,
            keepAliveInterval: 30000,
            maxRetryAttempts: 3
          },
          isActive: true,
          paperSize: '80mm',
          dpi: 203,
          maxWidth: 576,
          features: {
            cutter: true,
            cashDrawer: false,
            display: false,
            logo: true
          },
          usage: {
            totalJobs: 0,
            successfulJobs: 0,
            failedJobs: 0,
            lastUsed: new Date(),
            averageJobTime: 0
          },
          createdAt: new Date(),
          updatedAt: new Date()
        })
        
        toast.success(`Connected to ${device.name}`)
        setCurrentStep(4)
      } else {
        throw new Error('Connection failed')
      }
    } catch (error) {
      handleError(error, 'connection', () => handleDeviceSelect(device))
      toast.error(`Failed to connect: ${error.message}`)
    } finally {
      setConnecting(false)
    }
  }

  const handleTestConnection = async () => {
    if (!selectedDevice) return
    
    setTesting(true)
    setTestResult(null)
    
    try {
      const result = await printService.testBluetoothConnection(selectedDevice.id)
      
      setTestResult({
        success: result.success,
        message: result.success 
          ? `Connection test passed (${result.responseTime}ms response time)`
          : `Test failed: ${result.error}`
      })
      
      if (result.success) {
        setTimeout(() => setCurrentStep(5), 1500)
      }
    } catch (error) {
      const testResult = {
        success: false,
        message: `Test failed: ${error.message}`
      }
      setTestResult(testResult)
      handleError(error, 'test', handleTestConnection)
    } finally {
      setTesting(false)
    }
  }

  const handleCompleteSetup = async () => {
    if (!printerProfile.name) {
      toast.error('Please enter a printer name')
      return
    }
    
    try {
      const completeProfile = printerProfile as BluetoothPrinterProfile
      onPrinterAdded(completeProfile)
      toast.success(`Bluetooth printer "${completeProfile.name}" added successfully!`)
    } catch (error) {
      handleError(error, 'general', handleCompleteSetup)
      toast.error('Failed to add printer profile')
    }
  }

  const handleCancel = () => {
    if (selectedDevice) {
      printService.disconnectBluetoothPrinter(selectedDevice.id).catch(console.error)
    }
    onCancel()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b flex-shrink-0">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center space-x-2">
              {canGoBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToPreviousStep}
                  className="p-1 sm:p-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              )}
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                Bluetooth Printer Setup
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="p-1 sm:p-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <StepIndicator 
            steps={steps} 
            currentStep={currentStep}
            variant="compact"
          />
        </div>

        {/* Error Display */}
        {currentError && (
          <div className="px-4 sm:px-6 pt-4 flex-shrink-0">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-red-800 capitalize">
                    {currentError.type} Error
                  </h4>
                  <p className="text-sm text-red-700 mt-1 break-words">
                    {currentError.message}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 mt-3">
                    {currentError.canRetry && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRetry}
                        disabled={isRetrying}
                        className="flex-shrink-0"
                      >
                        {isRetrying ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Retrying...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Retry
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={clearError}
                      className="flex-shrink-0"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          {/* Step 1: Bluetooth Enable */}
          {currentStep === 1 && (
            <BluetoothEnableStep
              bluetoothSupported={bluetoothSupported}
              bluetoothEnabled={bluetoothEnabled}
              mobileInfo={mobileInfo}
              onRequestPermissions={handleRequestPermissions}
              onNext={() => setCurrentStep(2)}
            />
          )}

          {/* Step 2: Scan */}
          {currentStep === 2 && (
            <BluetoothScanStep
              scanning={scanning}
              onScan={handleScanForPrinters}
              onNext={() => setCurrentStep(3)}
            />
          )}

          {/* Step 3: Device Selection */}
          {currentStep === 3 && (
            <DeviceSelectionStep
              devices={discoveredDevices}
              selectedDevice={selectedDevice}
              connecting={connecting}
              onDeviceSelect={handleDeviceSelect}
              onRescan={handleScanForPrinters}
            />
          )}

          {/* Step 4: Connection Test */}
          {currentStep === 4 && (
            <ConnectionTestStep
              device={selectedDevice}
              testing={testing}
              testResult={testResult}
              onTest={handleTestConnection}
              onNext={() => setCurrentStep(5)}
            />
          )}

          {/* Step 5: Configuration */}
          {currentStep === 5 && (
            <PrinterConfigurationStep
              printerProfile={printerProfile}
              onConfigChange={setPrinterProfile}
              onComplete={handleCompleteSetup}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// Individual Step Components
const BluetoothEnableStep: React.FC<{
  bluetoothSupported: boolean
  bluetoothEnabled: boolean
  mobileInfo: any
  onRequestPermissions: () => void
  onNext: () => void
}> = ({ bluetoothSupported, bluetoothEnabled, mobileInfo, onRequestPermissions, onNext }) => (
  <div className="text-center py-4 sm:py-8 space-y-4 sm:space-y-6">
    <div className="space-y-3 sm:space-y-4">
      <Bluetooth className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-blue-500" />
      <div className="px-4">
        <h3 className="text-lg sm:text-xl font-semibold">Enable Bluetooth</h3>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">
          We need Bluetooth access to connect to your printer
        </p>
      </div>
    </div>

    {!bluetoothSupported ? (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mx-4">
        <div className="flex items-start space-x-2 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-sm sm:text-base">Bluetooth Not Supported</span>
            <p className="text-red-600 mt-1 text-xs sm:text-sm">
              Your browser or device doesn't support Web Bluetooth API.
            </p>
          </div>
        </div>
      </div>
    ) : (
      <div className="space-y-3 sm:space-y-4 px-4">
        <div className={`p-3 sm:p-4 rounded-lg border ${
          bluetoothEnabled ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center justify-center space-x-2">
            {bluetoothEnabled ? (
              <>
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                <span className="text-green-700 font-medium text-sm sm:text-base">Bluetooth is enabled</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                <span className="text-yellow-700 font-medium text-sm sm:text-base">Bluetooth permissions needed</span>
              </>
            )}
          </div>
        </div>

        {mobileInfo?.deviceInfo.isMobile && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-center space-x-2 text-blue-700 mb-2">
              <Smartphone className="w-4 h-4" />
              <span className="font-medium text-sm sm:text-base">Mobile Device Detected</span>
            </div>
            <div className="text-xs sm:text-sm text-blue-600 space-y-1">
              <p>{mobileInfo.deviceInfo.isIOS ? 'iOS' : 'Android'} - {mobileInfo.deviceInfo.browserName}</p>
              {mobileInfo.batteryInfo && (
                <div className="flex items-center space-x-2">
                  <Battery className="w-3 h-3" />
                  <span>
                    Battery: {Math.round(mobileInfo.batteryInfo.level * 100)}%
                    {mobileInfo.batteryInfo.charging && ' (Charging)'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <Button
          onClick={bluetoothEnabled ? onNext : onRequestPermissions}
          size="lg"
          className="w-full"
        >
          {bluetoothEnabled ? 'Continue' : 'Enable Bluetooth'}
        </Button>
      </div>
    )}
  </div>
)

const BluetoothScanStep: React.FC<{
  scanning: boolean
  onScan: () => void
  onNext: () => void
}> = ({ scanning, onScan, onNext }) => (
  <div className="text-center py-4 sm:py-8 space-y-4 sm:space-y-6">
    <div className="space-y-3 sm:space-y-4">
      <Search className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-blue-500" />
      <div className="px-4">
        <h3 className="text-lg sm:text-xl font-semibold">Scan for Bluetooth Printers</h3>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">
          Make sure your printer is powered on and in pairing mode
        </p>
      </div>
    </div>
    
    <div className="space-y-3 sm:space-y-4 px-4">
      <Button
        onClick={onScan}
        disabled={scanning}
        size="lg"
        className="w-full"
      >
        {scanning ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            <span className="text-sm sm:text-base">Scanning for Printers...</span>
          </>
        ) : (
          <>
            <Search className="w-4 h-4 mr-2" />
            <span className="text-sm sm:text-base">Start Scanning</span>
          </>
        )}
      </Button>
      
      <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-left">
        <h4 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">Tips for successful pairing:</h4>
        <ul className="text-xs sm:text-sm text-gray-600 space-y-1">
          <li>• Keep printer within 10 feet of your device</li>
          <li>• Ensure printer is in discoverable/pairing mode</li>
          <li>• Check printer manual for pairing instructions</li>
          <li>• Make sure printer is not connected to another device</li>
        </ul>
      </div>
    </div>
  </div>
)

const DeviceSelectionStep: React.FC<{
  devices: BluetoothDevice[]
  selectedDevice: BluetoothDevice | null
  connecting: boolean
  onDeviceSelect: (device: BluetoothDevice) => void
  onRescan: () => void
}> = ({ devices, selectedDevice, connecting, onDeviceSelect, onRescan }) => (
  <div className="space-y-4 sm:space-y-6">
    <div className="text-center px-4">
      <h3 className="text-lg sm:text-xl font-semibold">Select Your Printer</h3>
      <p className="text-gray-600 mt-1 text-sm sm:text-base">
        Found {devices.length} Bluetooth printer{devices.length !== 1 ? 's' : ''}
      </p>
    </div>
    
    <div className="space-y-2 sm:space-y-3 max-h-64 sm:max-h-80 overflow-y-auto px-4">
      {devices.map(device => (
        <div
          key={device.id}
          className={`border rounded-lg p-3 sm:p-4 cursor-pointer transition-all ${
            selectedDevice?.id === device.id 
              ? 'border-blue-500 bg-blue-50 shadow-md' 
              : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
          } ${connecting && selectedDevice?.id === device.id ? 'opacity-75' : ''}`}
          onClick={() => !connecting && onDeviceSelect(device)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="p-2 rounded-full bg-gray-100 flex-shrink-0">
                <Printer className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-900 text-sm sm:text-base truncate">
                  {device.name || 'Unknown Printer'}
                </div>
                <div className="text-xs sm:text-sm text-gray-500 truncate">
                  ID: {device.id.substring(0, 8)}...
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {device.paired ? 'Previously paired' : 'Not paired'}
                </div>
              </div>
            </div>
            
            {connecting && selectedDevice?.id === device.id && (
              <div className="flex items-center space-x-2 text-blue-600 flex-shrink-0">
                <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                <span className="text-xs sm:text-sm hidden sm:inline">Connecting...</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
    
    {devices.length === 0 && (
      <div className="text-center py-6 sm:py-8 text-gray-500 px-4">
        <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-400" />
        <p className="text-base sm:text-lg mb-2">No printers found</p>
        <p className="text-xs sm:text-sm mb-4">Make sure your printer is discoverable</p>
        <Button variant="outline" onClick={onRescan} size="sm">
          <Search className="w-4 h-4 mr-2" />
          Scan Again
        </Button>
      </div>
    )}
  </div>
)

const ConnectionTestStep: React.FC<{
  device: BluetoothDevice | null
  testing: boolean
  testResult: { success: boolean; message: string } | null
  onTest: () => void
  onNext: () => void
}> = ({ device, testing, testResult, onTest, onNext }) => (
  <div className="text-center py-4 sm:py-8 space-y-4 sm:space-y-6">
    <div className="space-y-3 sm:space-y-4">
      <div className="p-3 rounded-full bg-blue-100 w-fit mx-auto">
        <TestTube className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600" />
      </div>
      <div className="px-4">
        <h3 className="text-lg sm:text-xl font-semibold">Test Connection</h3>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">
          Let's verify the connection to <span className="font-medium">{device?.name}</span>
        </p>
      </div>
    </div>

    <div className="space-y-3 sm:space-y-4 px-4">
      {testResult && (
        <div className={`p-3 sm:p-4 rounded-lg border ${
          testResult.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start space-x-2">
            {testResult.success ? (
              <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <span className={`font-medium text-sm sm:text-base ${
              testResult.success ? 'text-green-700' : 'text-red-700'
            }`}>
              {testResult.message}
            </span>
          </div>
        </div>
      )}

      {!testResult && (
        <Button
          onClick={onTest}
          disabled={testing}
          size="lg"
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              <span className="text-sm sm:text-base">Testing Connection...</span>
            </>
          ) : (
            <>
              <TestTube className="w-4 h-4 mr-2" />
              <span className="text-sm sm:text-base">Test Connection</span>
            </>
          )}
        </Button>
      )}

      {testResult?.success && (
        <Button
          onClick={onNext}
          size="lg"
          className="w-full"
          variant="primary"
        >
          Continue to Setup
        </Button>
      )}

      {testResult && !testResult.success && (
        <Button
          onClick={onTest}
          size="lg"
          className="w-full"
          variant="outline"
        >
          Try Again
        </Button>
      )}
    </div>
  </div>
)

const PrinterConfigurationStep: React.FC<{
  printerProfile: Partial<BluetoothPrinterProfile>
  onConfigChange: (profile: Partial<BluetoothPrinterProfile>) => void
  onComplete: () => void
}> = ({ printerProfile, onConfigChange, onComplete }) => (
  <div className="space-y-4 sm:space-y-6">
    <div className="text-center">
      <div className="p-3 rounded-full bg-green-100 w-fit mx-auto mb-3 sm:mb-4">
        <Settings className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" />
      </div>
      <div className="px-4">
        <h3 className="text-lg sm:text-xl font-semibold">Configure Printer Settings</h3>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">
          Set up your printer profile and preferences
        </p>
      </div>
    </div>

    <div className="space-y-4 px-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Printer Name *
        </label>
        <Input
          value={printerProfile.name || ''}
          onChange={(e) => onConfigChange({
            ...printerProfile,
            name: e.target.value
          })}
          placeholder="Enter printer name"
          className="w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Paper Size
        </label>
        <Select
          value={printerProfile.paperSize || '80mm'}
          onChange={(value) => onConfigChange({
            ...printerProfile,
            paperSize: value
          })}
          options={[
            { value: '58mm', label: '58mm (2.3")' },
            { value: '80mm', label: '80mm (3.1")' },
            { value: '112mm', label: '112mm (4.4")' }
          ]}
          className="w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Auto-reconnect
        </label>
        <div className="flex items-start space-x-2">
          <input
            type="checkbox"
            checked={printerProfile.bluetoothConfig?.autoReconnect ?? true}
            onChange={(e) => onConfigChange({
              ...printerProfile,
              bluetoothConfig: {
                ...printerProfile.bluetoothConfig,
                autoReconnect: e.target.checked
              } as any
            })}
            className="rounded border-gray-300 mt-0.5 flex-shrink-0"
          />
          <span className="text-xs sm:text-sm text-gray-600">
            Automatically reconnect if connection is lost
          </span>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
        <h4 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">Connection Details</h4>
        <div className="text-xs sm:text-sm text-gray-600 space-y-1">
          <p className="break-words">Device ID: {printerProfile.bluetoothConfig?.deviceId}</p>
          <p>Chunk Size: {printerProfile.bluetoothConfig?.chunkSize} bytes</p>
          <p>Chunk Delay: {printerProfile.bluetoothConfig?.chunkDelay}ms</p>
        </div>
      </div>
    </div>

    <div className="px-4">
      <Button
        onClick={onComplete}
        size="lg"
        className="w-full"
        disabled={!printerProfile.name}
      >
        <Check className="w-4 h-4 mr-2" />
        <span className="text-sm sm:text-base">Complete Setup</span>
      </Button>
    </div>
  </div>
)

export default BluetoothPrinterSetupWizard