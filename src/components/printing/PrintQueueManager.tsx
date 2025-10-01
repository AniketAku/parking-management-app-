import React, { useState, useEffect } from 'react';
import type { PrintJob, PrintQueueStatus, PrinterProfile } from '../../types/printQueue';
import { printQueueApi } from '../../services/printQueueApi';
import { formatDistanceToNow, format } from 'date-fns';

interface PrintQueueManagerProps {
  onJobSelect?: (job: PrintJob) => void;
  showFilters?: boolean;
  showStats?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const PrintQueueManager: React.FC<PrintQueueManagerProps> = ({
  onJobSelect,
  showFilters = true,
  showStats = true,
  autoRefresh = true,
  refreshInterval = 5000
}) => {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [queueStatus, setQueueStatus] = useState<PrintQueueStatus | null>(null);
  const [printers, setPrinters] = useState<PrinterProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [printerFilter, setPrinterFilter] = useState<string>('all');
  
  // Actions loading states
  const [retryingJobs, setRetryingJobs] = useState<Set<string>>(new Set());
  const [cancellingJobs, setCancellingJobs] = useState<Set<string>>(new Set());

  // Load initial data
  useEffect(() => {
    loadData();
    loadPrinters();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(loadData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const loadData = async () => {
    try {
      const [jobsData, statusData] = await Promise.all([
        printQueueApi.getPrintHistory({ limit: 100 }),
        printQueueApi.getQueueStatus()
      ]);
      
      setJobs(jobsData);
      setQueueStatus(statusData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load print queue data');
    } finally {
      setLoading(false);
    }
  };

  const loadPrinters = async () => {
    try {
      const printersData = await printQueueApi.getAvailablePrinters();
      setPrinters(printersData);
    } catch (err) {
      console.error('Failed to load printers:', err);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    setRetryingJobs(prev => new Set(prev).add(jobId));
    try {
      await printQueueApi.retryPrintJob(jobId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry job');
    } finally {
      setRetryingJobs(prev => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const handleCancelJob = async (jobId: string) => {
    setCancellingJobs(prev => new Set(prev).add(jobId));
    try {
      await printQueueApi.cancelPrintJob(jobId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel job');
    } finally {
      setCancellingJobs(prev => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const handleClearCompleted = async () => {
    try {
      await printQueueApi.clearCompletedJobs();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear completed jobs');
    }
  };

  const filteredJobs = jobs.filter(job => {
    if (statusFilter !== 'all' && job.status !== statusFilter) return false;
    if (typeFilter !== 'all' && job.ticketType !== typeFilter) return false;
    if (printerFilter !== 'all' && job.printerProfile.id !== printerFilter) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'printing': return 'text-blue-600 bg-blue-100';
      case 'retrying': return 'text-yellow-600 bg-yellow-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading print queue...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Print Queue Manager</h2>
          <div className="flex gap-2">
            <button
              onClick={loadData}
              className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={handleClearCompleted}
              className="px-3 py-1 text-sm bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors"
            >
              Clear Completed
            </button>
          </div>
        </div>

        {/* Queue Statistics */}
        {showStats && queueStatus && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-900">{queueStatus.totalJobs}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-700">{queueStatus.queuedJobs}</div>
              <div className="text-xs text-yellow-600">Queued</div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-700">{queueStatus.processingJobs}</div>
              <div className="text-xs text-blue-600">Processing</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-700">{queueStatus.completedJobs}</div>
              <div className="text-xs text-green-600">Completed</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-700">{queueStatus.failedJobs}</div>
              <div className="text-xs text-red-600">Failed</div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-700">{queueStatus.retryingJobs}</div>
              <div className="text-xs text-orange-600">Retrying</div>
            </div>
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-4 mb-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Status</option>
              <option value="queued">Queued</option>
              <option value="printing">Printing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="retrying">Retrying</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Types</option>
              <option value="entry">Entry Tickets</option>
              <option value="exit">Exit Receipts</option>
              <option value="receipt">Receipts</option>
              <option value="thermal">Thermal Tickets</option>
            </select>

            <select
              value={printerFilter}
              onChange={(e) => setPrinterFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Printers</option>
              {printers.map(printer => (
                <option key={printer.id} value={printer.id}>
                  {printer.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Jobs List */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ticket
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Printer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredJobs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No print jobs found
                </td>
              </tr>
            ) : (
              filteredJobs.map((job) => (
                <tr 
                  key={job.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onJobSelect?.(job)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="font-medium">{job.ticketId}</div>
                    <div className="text-xs text-gray-500">ID: {job.id.slice(0, 8)}...</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                    {job.ticketType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{job.printerProfile.name}</div>
                    <div className="text-xs text-gray-500">{job.printerProfile.type}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`capitalize font-medium ${getPriorityColor(job.priority)}`}>
                      {job.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                    {job.attempts > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        Attempt {job.attempts}/{job.maxAttempts}
                      </div>
                    )}
                    {job.error && (
                      <div className="text-xs text-red-600 mt-1 truncate max-w-32" title={job.error}>
                        {job.error}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{formatDistanceToNow(job.createdAt, { addSuffix: true })}</div>
                    <div className="text-xs">{format(job.createdAt, 'MMM dd, HH:mm')}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex gap-2">
                      {job.status === 'failed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRetryJob(job.id);
                          }}
                          disabled={retryingJobs.has(job.id)}
                          className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                          {retryingJobs.has(job.id) ? 'Retrying...' : 'Retry'}
                        </button>
                      )}
                      {['queued', 'retrying'].includes(job.status) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelJob(job.id);
                          }}
                          disabled={cancellingJobs.has(job.id)}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          {cancellingJobs.has(job.id) ? 'Cancelling...' : 'Cancel'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PrintQueueManager;