/**
 * Thermal Print Demo Component
 * Demonstration and testing interface for thermal printing capabilities
 */

import React, { useState } from 'react';
import { useThermalPrinter } from '../../hooks/useThermalPrinter';
import ThermalPrinterManager from './ThermalPrinterManager';
import type { ParkingTicketData } from '../../types/thermalPrinter';

interface ThermalPrintDemoProps {
  showPrinterManager?: boolean;
  compactMode?: boolean;
}

const ThermalPrintDemo: React.FC<ThermalPrintDemoProps> = ({
  showPrinterManager = true,
  compactMode = false
}) => {
  const {
    printers,
    selectedPrinter,
    printerStatus,
    isConnected,
    isConnecting,
    isPrinting,
    error,
    quickSetup,
    testPrint,
    printTicket,
    printEntryTicket,
    printExitReceipt,
    isReady
  } = useThermalPrinter({
    autoConnect: false,
    autoDiscover: false,
    onPrintComplete: (result) => {
      console.log('Print completed:', result);
      setLastPrintResult(result);
    },
    onError: (error) => {
      console.error('Thermal printer error:', error);
      setLastError(error);
    }
  });

  const [lastPrintResult, setLastPrintResult] = useState<any>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [sampleData, setSampleData] = useState({
    vehicleNumber: 'ABC-1234',
    vehicleType: 'Car',
    entryTime: new Date(),
    exitTime: null as Date | null,
    calculatedFee: 50,
    actualFee: 50,
    amountPaid: 50
  });

  // Sample parking ticket data
  const createSampleTicketData = (ticketType: 'entry' | 'exit'): ParkingTicketData => ({
    businessName: 'PARKING MANAGEMENT SYSTEM',
    facilityName: 'Main Parking Facility',
    location: '123 Main Street, City',
    contactPhone: '+1-234-567-8900',
    ticketNumber: `T${Date.now().toString().slice(-6)}`,
    vehicleNumber: sampleData.vehicleNumber,
    date: new Date().toLocaleDateString(),
    vehicleType: sampleData.vehicleType,
    inTime: sampleData.entryTime.toLocaleTimeString(),
    outTime: ticketType === 'exit' && sampleData.exitTime ? sampleData.exitTime.toLocaleTimeString() : undefined,
    receivedAmount: ticketType === 'exit' ? sampleData.amountPaid.toString() : undefined,
    ticketType
  });

  const handleTestPrint = async () => {
    try {
      setLastError(null);
      await testPrint();
    } catch (error) {
      console.error('Test print failed:', error);
    }
  };

  const handlePrintSample = async (ticketType: 'entry' | 'exit') => {
    try {
      setLastError(null);
      const ticketData = createSampleTicketData(ticketType);
      await printTicket(ticketData);
    } catch (error) {
      console.error('Sample print failed:', error);
    }
  };

  const handleQuickPrint = async (type: 'entry' | 'exit') => {
    try {
      setLastError(null);
      
      // Create sample parking entry
      const parkingEntry = {
        id: `demo_${Date.now()}`,
        vehicleNumber: sampleData.vehicleNumber,
        vehicleType: sampleData.vehicleType,
        entryTime: sampleData.entryTime,
        exitTime: type === 'exit' ? (sampleData.exitTime || new Date()) : undefined,
        calculatedFee: sampleData.calculatedFee,
        actualFee: sampleData.actualFee,
        amountPaid: type === 'exit' ? sampleData.amountPaid : undefined,
        paymentMethod: type === 'exit' ? 'cash' : undefined,
        paymentStatus: type === 'exit' ? 'completed' : 'pending',
        status: type === 'exit' ? 'completed' : 'active'
      };

      let jobId: string;
      if (type === 'entry') {
        jobId = await printEntryTicket(parkingEntry);
      } else {
        jobId = await printExitReceipt(parkingEntry);
      }
      
      console.log(`Print job created: ${jobId}`);
    } catch (error) {
      console.error('Quick print failed:', error);
    }
  };

  const handleQuickSetup = async () => {
    try {
      setLastError(null);
      const result = await quickSetup();
      console.log('Quick setup result:', result);
    } catch (error) {
      console.error('Quick setup failed:', error);
    }
  };

  if (compactMode) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-4">🖨️ Thermal Printing</h3>
        
        {/* Status */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm">
            <span>Status:</span>
            <span className={`font-medium ${isReady() ? 'text-green-600' : 'text-red-600'}`}>
              {isReady() ? '✅ Ready' : '❌ Not Ready'}
            </span>
          </div>
          {selectedPrinter && (
            <div className="flex items-center justify-between text-sm mt-1">
              <span>Printer:</span>
              <span className="font-medium">{selectedPrinter.name}</span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          {!isConnected && (
            <button
              onClick={handleQuickSetup}
              disabled={isConnecting}
              className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {isConnecting ? 'Setting up...' : '⚡ Setup'}
            </button>
          )}
          
          <button
            onClick={handleTestPrint}
            disabled={!isReady() || isPrinting}
            className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
          >
            {isPrinting ? 'Printing...' : '🧪 Test'}
          </button>
          
          <button
            onClick={() => handleQuickPrint('entry')}
            disabled={!isReady() || isPrinting}
            className="px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50"
          >
            📄 Entry
          </button>
          
          <button
            onClick={() => handleQuickPrint('exit')}
            disabled={!isReady() || isPrinting}
            className="px-3 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:opacity-50"
          >
            🧾 Exit
          </button>
        </div>

        {(error || lastError) && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            {error || lastError}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Printer Manager */}
      {showPrinterManager && (
        <ThermalPrinterManager
          onPrinterConnected={(printer) => {
            console.log('Printer connected:', printer);
          }}
          onPrintTestComplete={(result) => {
            setLastPrintResult(result);
          }}
        />
      )}

      {/* Demo Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">🖨️ Thermal Print Demo</h2>

        {/* Status Section */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-3">Current Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Connected:</span>
              <span className={`ml-2 font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Ready:</span>
              <span className={`ml-2 font-medium ${isReady() ? 'text-green-600' : 'text-red-600'}`}>
                {isReady() ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Printers:</span>
              <span className="ml-2 font-medium">{printers.length}</span>
            </div>
            <div>
              <span className="text-gray-500">Selected:</span>
              <span className="ml-2 font-medium">{selectedPrinter?.name || 'None'}</span>
            </div>
          </div>
        </div>

        {/* Sample Data Configuration */}
        <div className="mb-6">
          <h3 className="font-medium text-gray-900 mb-3">Sample Data Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
              <input
                type="text"
                value={sampleData.vehicleNumber}
                onChange={(e) => setSampleData({...sampleData, vehicleNumber: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
              <select
                value={sampleData.vehicleType}
                onChange={(e) => setSampleData({...sampleData, vehicleType: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Car">Car</option>
                <option value="Truck">Truck</option>
                <option value="Motorcycle">Motorcycle</option>
                <option value="Bus">Bus</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="number"
                value={sampleData.amountPaid}
                onChange={(e) => setSampleData({...sampleData, amountPaid: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exit Time (for exit tickets)</label>
              <input
                type="datetime-local"
                value={sampleData.exitTime?.toISOString().slice(0, 16) || ''}
                onChange={(e) => setSampleData({
                  ...sampleData, 
                  exitTime: e.target.value ? new Date(e.target.value) : null
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Print Actions */}
        <div className="mb-6">
          <h3 className="font-medium text-gray-900 mb-3">Print Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={handleQuickSetup}
              disabled={isConnecting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
              onClick={handleTestPrint}
              disabled={!isReady() || isPrinting}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isPrinting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Printing...
                </>
              ) : (
                '🧪 Test Print'
              )}
            </button>

            <button
              onClick={() => handlePrintSample('entry')}
              disabled={!isReady() || isPrinting}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📄 Entry Ticket
            </button>

            <button
              onClick={() => handlePrintSample('exit')}
              disabled={!isReady() || isPrinting}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🧾 Exit Receipt
            </button>
          </div>
        </div>

        {/* Results */}
        {(lastPrintResult || lastError || error) && (
          <div className="space-y-3">
            {(error || lastError) && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-800 mb-2">❌ Error</h4>
                <p className="text-red-700 text-sm">{error || lastError}</p>
              </div>
            )}

            {lastPrintResult && (
              <div className={`p-4 border rounded-lg ${
                lastPrintResult.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <h4 className={`font-medium mb-2 ${
                  lastPrintResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {lastPrintResult.success ? '✅ Print Result' : '❌ Print Failed'}
                </h4>
                <div className="text-sm space-y-1">
                  {lastPrintResult.message && (
                    <p className={lastPrintResult.success ? 'text-green-700' : 'text-red-700'}>
                      {lastPrintResult.message}
                    </p>
                  )}
                  {lastPrintResult.bytesWritten && (
                    <p className="text-gray-600">Bytes written: {lastPrintResult.bytesWritten}</p>
                  )}
                  {lastPrintResult.printTime && (
                    <p className="text-gray-600">Print time: {lastPrintResult.printTime}ms</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="font-medium text-gray-900 mb-2">📝 Instructions</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>1. Click "Quick Setup" to automatically detect and connect to a thermal printer</p>
            <p>2. Alternatively, use the Printer Manager above to manually configure printers</p>
            <p>3. Once connected, use "Test Print" to verify the printer is working correctly</p>
            <p>4. Configure sample data and try printing entry tickets and exit receipts</p>
            <p>5. The system uses ESC/POS commands for optimal thermal printer compatibility</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThermalPrintDemo;