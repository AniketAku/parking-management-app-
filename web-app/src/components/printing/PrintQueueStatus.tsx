import React, { useState, useEffect } from 'react';
import type { PrintQueueStatus as PrintQueueStatusType, PrinterProfile } from '../../types/printQueue';
import { printQueueApi } from '../../services/printQueueApi';
import { log } from '../../utils/secureLogger';

interface PrintQueueStatusProps {
  showDetailedStats?: boolean;
  refreshInterval?: number;
  onStatusClick?: () => void;
}

const PrintQueueStatus: React.FC<PrintQueueStatusProps> = ({
  showDetailedStats = false,
  refreshInterval = 10000,
  onStatusClick
}) => {
  const [status, setStatus] = useState<PrintQueueStatusType | null>(null);
  const [printers, setPrinters] = useState<PrinterProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
    loadPrinters();

    const interval = setInterval(loadStatus, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const loadStatus = async () => {
    try {
      const statusData = await printQueueApi.getQueueStatus();
      setStatus(statusData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status');
    } finally {
      setLoading(false);
    }
  };

  const loadPrinters = async () => {
    try {
      const printersData = await printQueueApi.getAvailablePrinters();
      setPrinters(printersData);
    } catch (err) {
      log.error('Failed to load printers', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-sm text-red-800">{error}</div>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const hasActiveJobs = status.queuedJobs > 0 || status.processingJobs > 0 || status.retryingJobs > 0;
  const hasFailedJobs = status.failedJobs > 0;

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border border-gray-200 ${onStatusClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onStatusClick}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900">Print Queue</h3>
          <div className="flex items-center">
            {status.isProcessing && (
              <div className="flex items-center text-blue-600 text-xs">
                <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600 mr-1"></div>
                Processing
              </div>
            )}
            {hasFailedJobs && (
              <div className="ml-2 text-xs text-red-600 font-medium">
                {status.failedJobs} failed
              </div>
            )}
          </div>
        </div>

        {/* Quick Status */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className={`text-lg font-bold ${hasActiveJobs ? 'text-yellow-600' : 'text-gray-400'}`}>
              {status.queuedJobs + status.retryingJobs}
            </div>
            <div className="text-xs text-gray-500">Pending</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${status.processingJobs > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
              {status.processingJobs}
            </div>
            <div className="text-xs text-gray-500">Printing</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${hasFailedJobs ? 'text-red-600' : 'text-green-600'}`}>
              {hasFailedJobs ? status.failedJobs : status.completedJobs}
            </div>
            <div className="text-xs text-gray-500">
              {hasFailedJobs ? 'Failed' : 'Completed'}
            </div>
          </div>
        </div>

        {/* Estimated Wait Time */}
        {status.estimatedWaitTime && status.estimatedWaitTime > 0 && (
          <div className="mt-3 p-2 bg-yellow-50 rounded-md">
            <div className="text-xs text-yellow-800 text-center">
              Estimated wait: {Math.ceil(status.estimatedWaitTime / 60)} min
            </div>
          </div>
        )}

        {/* Detailed Stats */}
        {showDetailedStats && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Total jobs:</span>
                <span className="font-medium">{status.totalJobs}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Retrying:</span>
                <span className="font-medium text-orange-600">{status.retryingJobs}</span>
              </div>
              {status.lastProcessedAt && (
                <div className="flex justify-between col-span-2">
                  <span className="text-gray-500">Last processed:</span>
                  <span className="font-medium">
                    {new Date(status.lastProcessedAt).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Printer Status */}
        {printers.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-500 mb-2">Printers</div>
            <div className="space-y-2">
              {printers.slice(0, 3).map(printer => (
                <div key={printer.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      printer.isOnline ? 'bg-green-400' : 'bg-red-400'
                    }`}></div>
                    <span className="text-gray-700 truncate" title={printer.name}>
                      {printer.name.substring(0, 20)}
                      {printer.name.length > 20 ? '...' : ''}
                    </span>
                  </div>
                  <span className="text-gray-500">
                    {printer.type}
                  </span>
                </div>
              ))}
              {printers.length > 3 && (
                <div className="text-xs text-gray-500 text-center">
                  +{printers.length - 3} more printers
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrintQueueStatus;