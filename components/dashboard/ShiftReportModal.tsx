// =============================================================================
// SHIFT REPORT MODAL COMPONENT
// Event-Driven Shift Management - Comprehensive Shift Reports Display
// =============================================================================

import React from 'react';
import { ShiftReport } from '../../lib/types/shift';

interface ShiftReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftReport: ShiftReport | null;
}

export const ShiftReportModal: React.FC<ShiftReportModalProps> = ({
  isOpen,
  onClose,
  shiftReport
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDateTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!shiftReport) return;

    try {
      const response = await fetch(`/api/shifts/${shiftReport.shift_id}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: 'pdf',
          include_parking_details: true,
          include_cash_reconciliation: true
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `shift-report-${shiftReport.shift_id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  if (!isOpen || !shiftReport) return null;

  const efficiency = shiftReport.total_parking_entries > 0
    ? Math.round((shiftReport.total_parking_entries / shiftReport.duration_hours) * 100) / 100
    : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        ></div>

        {/* Modal positioning */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal content */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 pt-6 pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900" id="modal-title">
                  Shift Report
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Generated on {formatDateTime(new Date().toISOString())}
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </button>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </button>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1"
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Report Content */}
          <div className="bg-white px-6 py-6 max-h-[70vh] overflow-y-auto">
            <div className="space-y-6">
              {/* Shift Overview */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-blue-900 mb-4">Shift Overview</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">Employee</label>
                    <div className="text-lg font-semibold text-blue-900">{shiftReport.employee_name}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">Duration</label>
                    <div className="text-lg font-semibold text-blue-900">
                      {Math.floor(shiftReport.duration_hours)}h {Math.round((shiftReport.duration_hours % 1) * 60)}m
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">Status</label>
                    <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                      shiftReport.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : shiftReport.status === 'emergency_ended'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {shiftReport.status.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">Efficiency</label>
                    <div className="text-lg font-semibold text-blue-900">
                      {efficiency} vehicles/hour
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-blue-200">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">Start Time</label>
                    <div className="text-lg text-blue-900">{formatDateTime(shiftReport.start_time)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">End Time</label>
                    <div className="text-lg text-blue-900">{formatDateTime(shiftReport.end_time)}</div>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-green-900 mb-4">Financial Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-green-700 mb-1">Opening Cash</label>
                    <div className="text-xl font-bold text-green-900">
                      {formatCurrency(shiftReport.opening_cash)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-green-700 mb-1">Closing Cash</label>
                    <div className="text-xl font-bold text-green-900">
                      {formatCurrency(shiftReport.closing_cash)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-green-700 mb-1">Cash Difference</label>
                    <div className={`text-xl font-bold ${
                      shiftReport.cash_difference === 0
                        ? 'text-green-900'
                        : shiftReport.cash_difference > 0
                          ? 'text-blue-600'
                          : 'text-red-600'
                    }`}>
                      {shiftReport.cash_difference >= 0 ? '+' : ''}{formatCurrency(shiftReport.cash_difference)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-green-700 mb-1">Total Revenue</label>
                    <div className="text-xl font-bold text-green-900">
                      {formatCurrency(shiftReport.total_revenue)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Parking Statistics */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-purple-900 mb-4">Parking Statistics</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-700 mb-1">Total Entries</label>
                    <div className="text-2xl font-bold text-purple-900">
                      {shiftReport.total_parking_entries}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-700 mb-1">Average Transaction</label>
                    <div className="text-2xl font-bold text-purple-900">
                      {formatCurrency(shiftReport.average_transaction)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-700 mb-1">Revenue Rate</label>
                    <div className="text-2xl font-bold text-purple-900">
                      {formatCurrency(shiftReport.total_revenue / shiftReport.duration_hours)}/hour
                    </div>
                  </div>
                </div>

                {/* Vehicle Type Breakdown */}
                {shiftReport.parking_breakdown && shiftReport.parking_breakdown.length > 0 && (
                  <div>
                    <h5 className="text-md font-semibold text-purple-900 mb-3">Vehicle Type Breakdown</h5>
                    <div className="bg-white rounded-lg border border-purple-200 overflow-hidden">
                      <table className="min-w-full divide-y divide-purple-200">
                        <thead className="bg-purple-100">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">
                              Vehicle Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">
                              Count
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">
                              Revenue
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">
                              Percentage
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-purple-200">
                          {shiftReport.parking_breakdown.map((item, index) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-purple-25'}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {item.vehicle_type}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {item.count}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatCurrency(item.revenue)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {((item.count / shiftReport.total_parking_entries) * 100).toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Performance Metrics */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-orange-900 mb-4">Performance Metrics</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600 mb-2">
                      {efficiency}
                    </div>
                    <div className="text-sm text-orange-700">Vehicles per Hour</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600 mb-2">
                      {formatCurrency(shiftReport.total_revenue / shiftReport.duration_hours)}
                    </div>
                    <div className="text-sm text-orange-700">Revenue per Hour</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600 mb-2">
                      {shiftReport.total_parking_entries > 0 ?
                        Math.round((shiftReport.total_revenue / shiftReport.total_parking_entries / shiftReport.average_transaction) * 100)
                        : 0}%
                    </div>
                    <div className="text-sm text-orange-700">Efficiency Rating</div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {shiftReport.notes && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Shift Notes</h4>
                  <div className="text-gray-700 whitespace-pre-wrap">
                    {shiftReport.notes}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Report ID: {shiftReport.shift_id}
              </div>
              <button
                onClick={onClose}
                className="inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};