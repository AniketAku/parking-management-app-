// =============================================================================
// ACTIVE SHIFT PANEL COMPONENT
// Real-time Shift Management Dashboard - Main Panel
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useShiftRealtime } from '../../hooks/useShiftRealtime';
import { ShiftSession, ShiftStatistics } from '../../lib/types/shift';
import { ShiftHandoverModal } from './ShiftHandoverModal';
import { ShiftReportModal } from './ShiftReportModal';
import { EmergencyEndModal } from './EmergencyEndModal';
import { ShiftStartForm } from './ShiftStartForm';
import { RealTimeStatistics } from './RealTimeStatistics';
import { ConnectionStatus } from './ConnectionStatus';

interface ActiveShiftPanelProps {
  className?: string;
}

export const ActiveShiftPanel: React.FC<ActiveShiftPanelProps> = ({ className = '' }) => {
  // Real-time shift data
  const {
    activeShift,
    shiftStatistics,
    dashboardData,
    isConnected,
    isLoading,
    error,
    lastUpdate,
    refreshActiveShift,
    onShiftStarted,
    onShiftEnded,
    onShiftHandover
  } = useShiftRealtime({
    enableShiftUpdates: true,
    enableParkingUpdates: true,
    enableShiftEvents: true,
    enableDashboardUpdates: true
  });

  // Component state
  const [shiftDuration, setShiftDuration] = useState<string>('00:00:00');
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [shiftReport, setShiftReport] = useState(null);

  // Duration calculation
  const calculateDuration = useCallback((startTime: string): string => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Update duration every second
  useEffect(() => {
    if (!activeShift) return;

    const updateDuration = () => {
      setShiftDuration(calculateDuration(activeShift.shift_start_time));
    };

    updateDuration(); // Initial update
    const interval = setInterval(updateDuration, 1000);

    return () => clearInterval(interval);
  }, [activeShift, calculateDuration]);

  // Event handlers
  const handleShiftStarted = useCallback((data: any) => {
    console.log('Shift started:', data);
    refreshActiveShift();
  }, [refreshActiveShift]);

  const handleShiftEnded = useCallback((data: any) => {
    console.log('Shift ended:', data);
    if (data.shift_report) {
      setShiftReport(data.shift_report);
      setShowReportModal(true);
    }
    refreshActiveShift();
  }, [refreshActiveShift]);

  const handleShiftHandover = useCallback((data: any) => {
    console.log('Shift handover:', data);
    if (data.shift_report) {
      setShiftReport(data.shift_report);
      setShowReportModal(true);
    }
    refreshActiveShift();
  }, [refreshActiveShift]);

  // Register event handlers
  useEffect(() => {
    const unsubscribe1 = onShiftStarted(handleShiftStarted);
    const unsubscribe2 = onShiftEnded(handleShiftEnded);
    const unsubscribe3 = onShiftHandover(handleShiftHandover);

    return () => {
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
    };
  }, [onShiftStarted, onShiftEnded, onShiftHandover, handleShiftStarted, handleShiftEnded, handleShiftHandover]);

  const handleHandoverComplete = useCallback((result: any) => {
    setShowHandoverModal(false);
    if (result.shift_report) {
      setShiftReport(result.shift_report);
      setShowReportModal(true);
    }
  }, []);

  const handleEmergencyEnd = useCallback(() => {
    setShowEmergencyModal(true);
  }, []);

  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`} role="status" aria-live="polite">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" aria-label="Loading shift information"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2" aria-label="Loading shift details"></div>
          <div className="grid grid-cols-3 gap-4" aria-label="Loading statistics">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
          <div className="h-12 bg-gray-200 rounded" aria-label="Loading action buttons"></div>
        </div>
        <span className="sr-only">Loading shift dashboard data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`} role="alert">
        <div className="flex items-center mb-4">
          <div className="bg-red-100 rounded-full p-2 mr-3">
            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-800">Connection Error</h3>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={refreshActiveShift}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          aria-describedby="error-description"
        >
          Retry Connection
        </button>
        <span id="error-description" className="sr-only">
          Click to retry establishing connection to the shift management system
        </span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Connection Status */}
      <ConnectionStatus
        isConnected={isConnected}
        lastUpdate={lastUpdate}
        className="mb-4"
      />

      {activeShift ? (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg shadow-lg"
             role="main" aria-labelledby="shift-header">
          <div className="p-6 space-y-6">
            {/* Shift Header */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start space-y-4 lg:space-y-0">
              <div className="space-y-2">
                <h2 id="shift-header" className="text-2xl lg:text-3xl font-bold text-gray-800">
                  Active Shift: {activeShift.employee_name}
                </h2>
                <div className="space-y-1 text-sm lg:text-base text-gray-600">
                  <p>
                    <span className="font-medium">Started:</span>
                    <time dateTime={activeShift.shift_start_time}>
                      {formatTime(activeShift.shift_start_time)}
                    </time>
                  </p>
                  <p className="text-lg lg:text-xl font-mono text-blue-600 font-semibold"
                     aria-live="polite" aria-label={`Shift duration: ${shiftDuration}`}>
                    Duration: {shiftDuration}
                  </p>
                </div>
              </div>

              <div className="text-center lg:text-right space-y-2" role="region" aria-label="Revenue and activity summary">
                <div className="text-2xl lg:text-3xl font-bold text-green-600"
                     aria-label={`Revenue this hour: ${formatCurrency(dashboardData?.real_time_stats?.revenue_last_hour || 0)}`}>
                  {formatCurrency(dashboardData?.real_time_stats?.revenue_last_hour || 0)}
                </div>
                <div className="text-sm text-gray-600"
                     aria-label={`${dashboardData?.recent_parking_entries || 0} vehicles processed today`}>
                  {dashboardData?.recent_parking_entries || 0} vehicles processed today
                </div>
                <div className="text-sm text-gray-500"
                     aria-label={`Current cash position: ${formatCurrency(dashboardData?.current_cash_position || activeShift.opening_cash_amount)}`}>
                  Cash Position: {formatCurrency(dashboardData?.current_cash_position || activeShift.opening_cash_amount)}
                </div>
              </div>
            </div>

            {/* Real-time Statistics */}
            <RealTimeStatistics
              dashboardData={dashboardData}
              shiftStatistics={shiftStatistics}
            />

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => setShowHandoverModal(true)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-lg py-3 px-6 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Start shift handover process"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
                Change Shift
              </button>

              <button
                onClick={handleEmergencyEnd}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label="Emergency end shift"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Emergency End
              </button>
            </div>
          </div>
        </div>
      ) : (
        <ShiftStartForm onShiftStarted={refreshActiveShift} />
      )}

      {/* Modals */}
      <ShiftHandoverModal
        isOpen={showHandoverModal}
        onClose={() => setShowHandoverModal(false)}
        currentShift={activeShift}
        onHandoverComplete={handleHandoverComplete}
      />

      <ShiftReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        shiftReport={shiftReport}
      />

      <EmergencyEndModal
        isOpen={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        currentShift={activeShift}
        onEmergencyComplete={() => {
          setShowEmergencyModal(false);
          refreshActiveShift();
        }}
      />
    </div>
  );
};