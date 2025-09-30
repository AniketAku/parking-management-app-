/**
 * Thermal Printer Manager Component
 * Comprehensive UI for managing thermal printers with ESC/POS support
 */

import React, { useState, useEffect } from 'react';
import type { 
  ThermalPrinterProfile,
  PrinterStatus,
  PrintResult
} from '../../types/thermalPrinter';
import { thermalPrinterManager } from '../../services/thermalPrinterService';
import { enhancedPrintQueueService, thermalPrintUtilities } from '../../services/thermalPrintQueueIntegration';

interface ThermalPrinterManagerProps {
  onPrinterConnected?: (printer: ThermalPrinterProfile) => void;
  onPrintTestComplete?: (result: PrintResult) => void;
  showAdvancedSettings?: boolean;
}

const ThermalPrinterManager: React.FC<ThermalPrinterManagerProps> = ({
  onPrinterConnected,
  onPrintTestComplete,
  showAdvancedSettings = true
}) => {
  const [printers, setPrinters] = useState<ThermalPrinterProfile[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string | null>(null);
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [connectionLog, setConnectionLog] = useState<string[]>([]);

  useEffect(() => {
    loadPrinters();
    checkCurrentStatus();
    
    // Set up status monitoring
    const statusInterval = setInterval(checkCurrentStatus, 5000);
    
    return () => clearInterval(statusInterval);
  }, []);

  const loadPrinters = async () => {
    try {
      const allPrinters = thermalPrinterManager.getAllPrinterProfiles();
      setPrinters(allPrinters);
      
      // Select default printer if available
      const defaultPrinter = allPrinters.find(p => p.isDefault);
      if (defaultPrinter && !selectedPrinter) {
        setSelectedPrinter(defaultPrinter.id);
      }
    } catch (error) {
      console.error('Error loading printers:', error);
    }
  };

  const checkCurrentStatus = async () => {
    try {
      const status = await thermalPrinterManager.checkPrinterStatus();
      setPrinterStatus(status);
      
      // Update printer profiles with active status
      const updatedPrinters = printers.map(printer => ({
        ...printer,
        isActive: status?.connected || false
      }));
      setPrinters(updatedPrinters);
    } catch (error) {
      console.error('Error checking printer status:', error);
    }
  };

  const discoverPrinters = async () => {
    setIsDiscovering(true);
    setError(null);
    addToLog('Starting printer discovery...');
    
    try {
      const discoveredPrinters = await thermalPrinterManager.discoverUSBPrinters();
      
      if (discoveredPrinters.length === 0) {
        setError('No USB thermal printers found. Please connect a thermal printer and try again.');
        addToLog('No printers discovered');
      } else {
        setSuccess(`Discovered ${discoveredPrinters.length} thermal printer(s)`);
        addToLog(`Discovered ${discoveredPrinters.length} printer(s): ${discoveredPrinters.map(p => p.name).join(', ')}`);
        await loadPrinters();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Discovery failed';
      setError(`Discovery failed: ${errorMessage}`);
      addToLog(`Discovery error: ${errorMessage}`);
    } finally {
      setIsDiscovering(false);
    }
  };

  const connectToPrinter = async (printerId: string) => {
    setIsConnecting(true);
    setError(null);
    setSuccess(null);
    
    const printer = printers.find(p => p.id === printerId);
    addToLog(`Connecting to ${printer?.name || printerId}...`);
    
    try {
      await thermalPrinterManager.connectToPrinter(printerId);
      setSuccess(`Successfully connected to ${printer?.name}`);
      addToLog(`Connected successfully to ${printer?.name}`);
      
      // Update status
      await checkCurrentStatus();
      
      // Notify parent component
      if (printer && onPrinterConnected) {
        onPrinterConnected(printer);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setError(`Connection failed: ${errorMessage}`);
      addToLog(`Connection error: ${errorMessage}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectPrinter = async () => {
    addToLog('Disconnecting printer...');
    
    try {
      await thermalPrinterManager.disconnectFromPrinter();
      setSuccess('Printer disconnected');
      addToLog('Disconnected successfully');
      await checkCurrentStatus();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Disconnect failed';
      setError(`Disconnect failed: ${errorMessage}`);
      addToLog(`Disconnect error: ${errorMessage}`);
    }
  };

  const testPrint = async () => {
    if (!selectedPrinter) {
      setError('Please select a printer first');
      return;
    }

    setIsTesting(true);
    setError(null);
    addToLog('Starting test print...');
    
    try {
      const result = await enhancedPrintQueueService.testThermalPrinter(selectedPrinter);
      
      if (result.success) {
        setSuccess('Test print completed successfully');
        addToLog('Test print completed successfully');
        
        if (onPrintTestComplete) {
          onPrintTestComplete(result);
        }
      } else {
        setError(`Test print failed: ${result.error}`);
        addToLog(`Test print failed: ${result.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Test print failed';
      setError(`Test print error: ${errorMessage}`);
      addToLog(`Test print error: ${errorMessage}`);
    } finally {
      setIsTesting(false);
    }
  };

  const quickSetup = async () => {
    setIsConnecting(true);
    setError(null);
    addToLog('Starting quick setup...');
    
    try {
      const setupResult = await thermalPrintUtilities.setupThermalPrinter();
      
      if (setupResult.success) {
        setSuccess(setupResult.message);
        addToLog(`Quick setup completed: ${setupResult.message}`);
        await loadPrinters();
        await checkCurrentStatus();
      } else {
        setError(setupResult.message);
        addToLog(`Quick setup failed: ${setupResult.message}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Quick setup failed';
      setError(errorMessage);
      addToLog(`Quick setup error: ${errorMessage}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const addToLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConnectionLog(prev => [...prev, `[${timestamp}] ${message}`].slice(-10)); // Keep last 10 entries
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const getPrinterStatusIcon = (printer: ThermalPrinterProfile) => {
    if (printer.isActive && printerStatus?.connected) {
      return '🟢'; // Connected
    } else if (printer.connection.type === 'usb') {
      return '🔌'; // USB
    } else if (printer.connection.type === 'network') {
      return '🌐'; // Network
    }
    return '🖨️'; // Generic printer
  };

  const getPrinterStatusText = (printer: ThermalPrinterProfile) => {
    if (printer.isActive && printerStatus?.connected) {
      return printerStatus.online ? 'Connected & Online' : 'Connected but Offline';
    }
    return 'Not Connected';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Thermal Printer Manager</h2>
        <div className="flex space-x-2">
          <button
            onClick={quickSetup}
            disabled={isConnecting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isConnecting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Setting up...
              </>
            ) : (
              '⚡ Quick Setup'
            )}
          </button>
          <button
            onClick={discoverPrinters}
            disabled={isDiscovering}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isDiscovering ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Discovering...
              </>
            ) : (
              '🔍 Discover Printers'
            )}
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {(error || success) && (
        <div className="mb-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-2">
              <div className="flex items-center justify-between">
                <span className="text-red-800 text-sm">{error}</span>
                <button onClick={clearMessages} className="text-red-600 hover:text-red-800">×</button>
              </div>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex items-center justify-between">
                <span className="text-green-800 text-sm">{success}</span>
                <button onClick={clearMessages} className="text-green-600 hover:text-green-800">×</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Printer Status Overview */}
      {printerStatus && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-3">Current Printer Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Connection:</span>
              <span className={`ml-2 font-medium ${printerStatus.connected ? 'text-green-600' : 'text-red-600'}`}>
                {printerStatus.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Status:</span>
              <span className={`ml-2 font-medium ${printerStatus.online ? 'text-green-600' : 'text-yellow-600'}`}>
                {printerStatus.online ? 'Online' : 'Offline'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Paper:</span>
              <span className={`ml-2 font-medium ${
                printerStatus.paperStatus === 'ok' ? 'text-green-600' : 
                printerStatus.paperStatus === 'low' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {printerStatus.paperStatus}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Temperature:</span>
              <span className={`ml-2 font-medium ${
                printerStatus.temperature === 'normal' ? 'text-green-600' : 'text-red-600'
              }`}>
                {printerStatus.temperature}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Printer List */}
      <div className="mb-6">
        <h3 className="font-medium text-gray-900 mb-3">Available Printers</h3>
        {printers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🖨️</div>
            <p>No thermal printers configured</p>
            <p className="text-sm">Use "Discover Printers" or "Quick Setup" to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {printers.map(printer => (
              <div
                key={printer.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedPrinter === printer.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedPrinter(printer.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{getPrinterStatusIcon(printer)}</span>
                    <div>
                      <h4 className="font-medium text-gray-900">{printer.name}</h4>
                      <p className="text-sm text-gray-500">{printer.model}</p>
                      <p className="text-xs text-gray-400">
                        {printer.connection.type.toUpperCase()} • {getPrinterStatusText(printer)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {printer.isDefault && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Default</span>
                    )}
                    {printer.isActive && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Active</span>
                    )}
                  </div>
                </div>

                {showAdvancedSettings && selectedPrinter === printer.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Paper Width:</span>
                        <span className="ml-2">{printer.capabilities.paperWidth}mm</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Resolution:</span>
                        <span className="ml-2">{printer.capabilities.resolution} DPI</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Max Speed:</span>
                        <span className="ml-2">{printer.capabilities.maxPrintSpeed}mm/s</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Cut Support:</span>
                        <span className="ml-2">{printer.capabilities.supportsCut ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => selectedPrinter && connectToPrinter(selectedPrinter)}
          disabled={!selectedPrinter || isConnecting || (printerStatus?.connected || false)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isConnecting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Connecting...
            </>
          ) : (
            '🔌 Connect'
          )}
        </button>

        <button
          onClick={disconnectPrinter}
          disabled={!(printerStatus?.connected || false)}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔌 Disconnect
        </button>

        <button
          onClick={testPrint}
          disabled={!selectedPrinter || !(printerStatus?.connected || false) || isTesting}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isTesting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Testing...
            </>
          ) : (
            '🧪 Test Print'
          )}
        </button>

        <button
          onClick={checkCurrentStatus}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          🔄 Refresh Status
        </button>
      </div>

      {/* Connection Log */}
      {connectionLog.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Connection Log</h3>
          <div className="text-xs text-gray-600 font-mono max-h-32 overflow-y-auto">
            {connectionLog.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))}
          </div>
          <button
            onClick={() => setConnectionLog([])}
            className="mt-2 text-xs text-gray-500 hover:text-gray-700"
          >
            Clear Log
          </button>
        </div>
      )}

      {/* Help Section */}
      <div className="mt-6 pt-6 border-t border-gray-200 text-sm text-gray-600">
        <h3 className="font-medium text-gray-900 mb-2">💡 Tips</h3>
        <ul className="space-y-1 list-disc list-inside">
          <li>Use "Quick Setup" for automatic printer detection and connection</li>
          <li>Ensure your thermal printer is connected via USB before discovering</li>
          <li>Test print helps verify printer functionality and paper alignment</li>
          <li>ESC/POS commands are automatically generated for optimal compatibility</li>
        </ul>
      </div>
    </div>
  );
};

export default ThermalPrinterManager;