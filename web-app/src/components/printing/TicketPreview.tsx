import React, { useState } from 'react';
import type { ParkingEntry } from '../../types';
import TicketPrinter from './TicketPrinter';
import EntryTicket from './EntryTicket';
import ExitReceipt from './ExitReceipt';
import ThermalTicket from './ThermalTicket';
import { useTicketPrint } from '../../hooks/useTicketPrint';
import { 
  createEntryTicketData, 
  createExitReceiptData, 
  createThermalTicketData,
  getRecommendedPrintSettings
} from '../../utils/ticketHelpers';

interface TicketPreviewProps {
  entry: ParkingEntry;
  defaultTicketType?: 'entry' | 'exit' | 'thermal';
  onPrintSuccess?: () => void;
  onPrintError?: (error: Error) => void;
  showPrintButton?: boolean;
}

const TicketPreview: React.FC<TicketPreviewProps> = ({
  entry,
  defaultTicketType = 'entry',
  onPrintSuccess,
  onPrintError,
  showPrintButton = true
}) => {
  const [selectedTicketType, setSelectedTicketType] = useState<'entry' | 'exit' | 'thermal'>(defaultTicketType);
  const [showPreview, setShowPreview] = useState(true);
  
  const {
    isPrinting,
    printSettings,
    updatePrintSettings,
    handlePrintStart,
    handlePrintComplete,
    handlePrintError
  } = useTicketPrint({
    defaultPrintSettings: getRecommendedPrintSettings(selectedTicketType),
    onPrintSuccess,
    onPrintError
  });

  // Update print settings when ticket type changes
  React.useEffect(() => {
    updatePrintSettings(getRecommendedPrintSettings(selectedTicketType));
  }, [selectedTicketType, updatePrintSettings]);

  const getTicketData = () => {
    switch (selectedTicketType) {
      case 'entry':
        return createEntryTicketData(entry);
      case 'exit':
        return createExitReceiptData(entry);
      case 'thermal':
        return createThermalTicketData(entry, entry.exitTime ? 'exit' : 'entry');
      default:
        return createEntryTicketData(entry);
    }
  };

  const renderTicketPreview = () => {
    try {
      const ticketData = getTicketData();
      
      switch (selectedTicketType) {
        case 'entry':
          return <EntryTicket {...(ticketData as any)} />;
        case 'exit':
          return <ExitReceipt {...(ticketData as any)} />;
        case 'thermal':
          return <ThermalTicket {...(ticketData as any)} />;
        default:
          return null;
      }
    } catch (error) {
      console.error('Error rendering ticket preview:', error);
      return <div className="error">Unable to render ticket preview</div>;
    }
  };

  const handleTicketTypeChange = (type: 'entry' | 'exit' | 'thermal') => {
    setSelectedTicketType(type);
  };

  const isExitDisabled = !entry.exitTime;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 rounded-lg shadow-sm">
      <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <label className="text-sm font-medium text-gray-700">Ticket Type:</label>
            <div className="flex gap-2">
              <button
                className={`px-3 py-1 text-sm font-medium rounded-md border transition-colors ${
                  selectedTicketType === 'entry' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-blue-600'
                }`}
                onClick={() => handleTicketTypeChange('entry')}
                type="button"
              >
                Entry Ticket
              </button>
              <button
                className={`px-3 py-1 text-sm font-medium rounded-md border transition-colors ${
                  selectedTicketType === 'exit' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : isExitDisabled 
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-blue-600'
                }`}
                onClick={() => handleTicketTypeChange('exit')}
                disabled={isExitDisabled}
                type="button"
                title={isExitDisabled ? 'Vehicle must exit first' : ''}
              >
                Exit Receipt
              </button>
              <button
                className={`px-3 py-1 text-sm font-medium rounded-md border transition-colors ${
                  selectedTicketType === 'thermal' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-blue-600'
                }`}
                onClick={() => handleTicketTypeChange('thermal')}
                type="button"
              >
                Thermal Ticket
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              className="px-3 py-1 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
              onClick={() => setShowPreview(!showPreview)}
              type="button"
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>

            {showPrintButton && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Paper Size:</label>
                <select
                  className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white"
                  value={printSettings.paperSize}
                  onChange={(e) => updatePrintSettings({ 
                    paperSize: e.target.value as 'A4' | 'thermal-2.75' | 'thermal-3' 
                  })}
                >
                  <option value="A4">A4</option>
                  <option value="thermal-2.75">Thermal 2.75"</option>
                  <option value="thermal-3">Thermal 3"</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {showPreview && (
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ticket Preview</h3>
          <div className="flex justify-center p-6 bg-gray-100 rounded-lg min-h-96 items-start">
            {renderTicketPreview()}
          </div>
        </div>
      )}

      {showPrintButton && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex flex-col items-center gap-4">
            <TicketPrinter
              ticketType={selectedTicketType}
              ticketData={getTicketData()}
              printSettings={printSettings}
              onPrintStart={handlePrintStart}
              onPrintComplete={handlePrintComplete}
              onPrintError={handlePrintError}
            />
            {isPrinting && (
              <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
                <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">Printing...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketPreview;