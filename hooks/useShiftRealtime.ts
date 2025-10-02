// =============================================================================
// SHIFT REALTIME HOOK
// Event-Driven Shift Management - React Hook for Real-time Updates
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, ShiftRealtimeManager } from '../lib/supabase';
import { ShiftSession, ShiftStatistics, ShiftRealtimeEvent, DashboardData } from '../lib/types/shift';

interface UseShiftRealtimeOptions {
  enableShiftUpdates?: boolean;
  enableParkingUpdates?: boolean;
  enableShiftEvents?: boolean;
  enableDashboardUpdates?: boolean;
  autoReconnect?: boolean;
  onConnectionChange?: (connected: boolean) => void;
}

interface UseShiftRealtimeReturn {
  // State
  activeShift: ShiftSession | null;
  shiftStatistics: ShiftStatistics | null;
  dashboardData: DashboardData | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;

  // Actions
  refreshActiveShift: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
  reconnect: () => void;
  disconnect: () => void;

  // Event handlers (for manual subscription)
  onShiftStarted: (callback: (data: any) => void) => void;
  onShiftEnded: (callback: (data: any) => void) => void;
  onShiftHandover: (callback: (data: any) => void) => void;
  onEmergencyEnd: (callback: (data: any) => void) => void;
  onParkingUpdate: (callback: (data: any) => void) => void;
}

export function useShiftRealtime(options: UseShiftRealtimeOptions = {}): UseShiftRealtimeReturn {
  const {
    enableShiftUpdates = true,
    enableParkingUpdates = true,
    enableShiftEvents = true,
    enableDashboardUpdates = true,
    autoReconnect = true,
    onConnectionChange
  } = options;

  // State
  const [activeShift, setActiveShift] = useState<ShiftSession | null>(null);
  const [shiftStatistics, setShiftStatistics] = useState<ShiftStatistics | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Refs for callbacks
  const callbacksRef = useRef({
    onShiftStarted: [] as Array<(data: any) => void>,
    onShiftEnded: [] as Array<(data: any) => void>,
    onShiftHandover: [] as Array<(data: any) => void>,
    onEmergencyEnd: [] as Array<(data: any) => void>,
    onParkingUpdate: [] as Array<(data: any) => void>
  });

  const realtimeManagerRef = useRef<ShiftRealtimeManager | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Use Supabase RPC to get active shift instead of missing API endpoints
      const { data: activeShiftData, error: activeShiftError } = await supabase
        .rpc('get_current_active_shift');

      if (activeShiftError) {
        console.error('Error fetching active shift:', activeShiftError);
        setError(activeShiftError.message || 'Failed to fetch active shift');
      } else {
        setActiveShift(activeShiftData);
        // For now, we'll set basic statistics - can be enhanced later
        if (activeShiftData) {
          setShiftStatistics({
            total_entries: 0,
            total_exits: 0,
            total_revenue: activeShiftData.opening_cash_amount,
            shift_duration_minutes: 0,
            average_parking_duration: 0,
            peak_hour: '12:00'
          });
        }
      }

      // Get basic dashboard data from parking entries if dashboard updates enabled
      if (enableDashboardUpdates) {
        const { data: parkingEntries, error: entriesError } = await supabase
          .from('parking_entries')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (!entriesError && parkingEntries) {
          const totalEntries = parkingEntries.length;
          const recentRevenue = parkingEntries
            .filter(entry => entry.parking_fee)
            .reduce((sum, entry) => sum + (entry.parking_fee || 0), 0);

          setDashboardData({
            real_time_stats: {
              revenue_last_hour: recentRevenue,
              entries_last_hour: totalEntries,
              current_occupancy: parkingEntries.filter(e => e.status === 'Parked').length
            },
            recent_parking_entries: totalEntries,
            current_cash_position: (activeShiftData?.opening_cash_amount || 0) + recentRevenue
          });
        }
      }

      setLastUpdate(new Date());
    } catch (err: any) {
      console.error('Error fetching initial shift data:', err);
      setError(err.message || 'Failed to fetch initial data');
    } finally {
      setIsLoading(false);
    }
  }, [enableDashboardUpdates]);

  // Refresh functions
  const refreshActiveShift = useCallback(async () => {
    try {
      const { data: activeShiftData, error: activeShiftError } = await supabase
        .rpc('get_current_active_shift');

      if (activeShiftError) {
        console.error('Error refreshing active shift:', activeShiftError);
        setError(activeShiftError.message);
      } else {
        setActiveShift(activeShiftData);
        if (activeShiftData) {
          setShiftStatistics({
            total_entries: 0,
            total_exits: 0,
            total_revenue: activeShiftData.opening_cash_amount,
            shift_duration_minutes: 0,
            average_parking_duration: 0,
            peak_hour: '12:00'
          });
        }
        setLastUpdate(new Date());
      }
    } catch (err: any) {
      console.error('Error refreshing active shift:', err);
      setError(err.message);
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    if (!enableDashboardUpdates) return;

    try {
      const { data: parkingEntries, error: entriesError } = await supabase
        .from('parking_entries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (entriesError) {
        console.error('Error refreshing dashboard:', entriesError);
        setError(entriesError.message);
      } else if (parkingEntries) {
        const totalEntries = parkingEntries.length;
        const recentRevenue = parkingEntries
          .filter(entry => entry.parking_fee)
          .reduce((sum, entry) => sum + (entry.parking_fee || 0), 0);

        setDashboardData({
          real_time_stats: {
            revenue_last_hour: recentRevenue,
            entries_last_hour: totalEntries,
            current_occupancy: parkingEntries.filter(e => e.status === 'Parked').length
          },
          recent_parking_entries: totalEntries,
          current_cash_position: (activeShift?.opening_cash_amount || 0) + recentRevenue
        });
        setLastUpdate(new Date());
      }
    } catch (err: any) {
      console.error('Error refreshing dashboard:', err);
      setError(err.message);
    }
  }, [enableDashboardUpdates, activeShift]);

  // Real-time event handlers
  const handleShiftUpdate = useCallback((payload: any) => {
    console.log('Shift update received:', payload);

    if (payload.eventType === 'INSERT' && payload.new) {
      setActiveShift(payload.new);
      callbacksRef.current.onShiftStarted.forEach(cb => cb(payload.new));
    } else if (payload.eventType === 'UPDATE' && payload.new) {
      setActiveShift(payload.new);

      // Check if shift was ended
      if (payload.old?.status === 'active' && payload.new.status !== 'active') {
        callbacksRef.current.onShiftEnded.forEach(cb => cb(payload.new));
      }
    } else if (payload.eventType === 'DELETE' && payload.old) {
      if (payload.old.status === 'active') {
        setActiveShift(null);
        setShiftStatistics(null);
      }
    }

    setLastUpdate(new Date());
  }, []);

  const handleShiftChange = useCallback((payload: any) => {
    console.log('Shift change received:', payload);

    if (payload.eventType === 'INSERT' && payload.new) {
      const change = payload.new;

      // Determine type of change
      if (change.change_type === 'emergency') {
        callbacksRef.current.onEmergencyEnd.forEach(cb => cb(change));
      } else if (change.new_shift_session_id) {
        callbacksRef.current.onShiftHandover.forEach(cb => cb(change));
      }
    }

    setLastUpdate(new Date());
  }, []);

  const handleParkingUpdate = useCallback((payload: any) => {
    console.log('Parking update received:', payload);

    callbacksRef.current.onParkingUpdate.forEach(cb => cb(payload));

    // Refresh statistics when parking entries change
    if (enableDashboardUpdates) {
      refreshDashboard();
    }

    setLastUpdate(new Date());
  }, [enableDashboardUpdates, refreshDashboard]);

  // Handle broadcast events
  const handleShiftEvent = useCallback((eventType: string, payload: any) => {
    console.log('Shift event received:', eventType, payload);

    switch (eventType) {
      case 'shift-started':
        callbacksRef.current.onShiftStarted.forEach(cb => cb(payload));
        refreshActiveShift();
        break;
      case 'shift-ended':
        callbacksRef.current.onShiftEnded.forEach(cb => cb(payload));
        refreshActiveShift();
        break;
      case 'shift-handover':
        callbacksRef.current.onShiftHandover.forEach(cb => cb(payload));
        refreshActiveShift();
        break;
      case 'emergency-end':
        callbacksRef.current.onEmergencyEnd.forEach(cb => cb(payload));
        refreshActiveShift();
        break;
    }

    if (enableDashboardUpdates) {
      refreshDashboard();
    }
  }, [refreshActiveShift, refreshDashboard, enableDashboardUpdates]);

  // Connection management
  const connect = useCallback(() => {
    if (realtimeManagerRef.current) {
      disconnect();
    }

    try {
      realtimeManagerRef.current = ShiftRealtimeManager.getInstance();

      // Subscribe to database changes
      if (enableShiftUpdates || enableParkingUpdates) {
        realtimeManagerRef.current.subscribeToShiftManagement({
          onShiftUpdate: enableShiftUpdates ? handleShiftUpdate : undefined,
          onParkingUpdate: enableParkingUpdates ? handleParkingUpdate : undefined,
          onShiftChange: handleShiftChange
        });
      }

      // Subscribe to broadcast events
      if (enableShiftEvents) {
        realtimeManagerRef.current.subscribeToShiftEvents({
          onShiftStarted: (payload) => handleShiftEvent('shift-started', payload),
          onShiftEnded: (payload) => handleShiftEvent('shift-ended', payload),
          onShiftHandover: (payload) => handleShiftEvent('shift-handover', payload),
          onEmergencyEnd: (payload) => handleShiftEvent('emergency-end', payload)
        });
      }

      setIsConnected(true);
      setError(null);
      onConnectionChange?.(true);
    } catch (err: any) {
      console.error('Error connecting to realtime:', err);
      setError(err.message);
      setIsConnected(false);
      onConnectionChange?.(false);

      // Auto-reconnect if enabled
      if (autoReconnect) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      }
    }
  }, [
    enableShiftUpdates,
    enableParkingUpdates,
    enableShiftEvents,
    handleShiftUpdate,
    handleParkingUpdate,
    handleShiftChange,
    handleShiftEvent,
    autoReconnect,
    onConnectionChange
  ]);

  const disconnect = useCallback(() => {
    if (realtimeManagerRef.current) {
      realtimeManagerRef.current.unsubscribeAll();
      realtimeManagerRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setIsConnected(false);
    onConnectionChange?.(false);
  }, [onConnectionChange]);

  const reconnect = useCallback(() => {
    disconnect();
    connect();
  }, [disconnect, connect]);

  // Callback registration functions
  const onShiftStarted = useCallback((callback: (data: any) => void) => {
    callbacksRef.current.onShiftStarted.push(callback);
    return () => {
      const index = callbacksRef.current.onShiftStarted.indexOf(callback);
      if (index > -1) {
        callbacksRef.current.onShiftStarted.splice(index, 1);
      }
    };
  }, []);

  const onShiftEnded = useCallback((callback: (data: any) => void) => {
    callbacksRef.current.onShiftEnded.push(callback);
    return () => {
      const index = callbacksRef.current.onShiftEnded.indexOf(callback);
      if (index > -1) {
        callbacksRef.current.onShiftEnded.splice(index, 1);
      }
    };
  }, []);

  const onShiftHandover = useCallback((callback: (data: any) => void) => {
    callbacksRef.current.onShiftHandover.push(callback);
    return () => {
      const index = callbacksRef.current.onShiftHandover.indexOf(callback);
      if (index > -1) {
        callbacksRef.current.onShiftHandover.splice(index, 1);
      }
    };
  }, []);

  const onEmergencyEnd = useCallback((callback: (data: any) => void) => {
    callbacksRef.current.onEmergencyEnd.push(callback);
    return () => {
      const index = callbacksRef.current.onEmergencyEnd.indexOf(callback);
      if (index > -1) {
        callbacksRef.current.onEmergencyEnd.splice(index, 1);
      }
    };
  }, []);

  const onParkingUpdate = useCallback((callback: (data: any) => void) => {
    callbacksRef.current.onParkingUpdate.push(callback);
    return () => {
      const index = callbacksRef.current.onParkingUpdate.indexOf(callback);
      if (index > -1) {
        callbacksRef.current.onParkingUpdate.splice(index, 1);
      }
    };
  }, []);

  // Effect for initial setup
  useEffect(() => {
    fetchInitialData();
    connect();

    return () => {
      disconnect();
    };
  }, [fetchInitialData, connect, disconnect]);

  return {
    // State
    activeShift,
    shiftStatistics,
    dashboardData,
    isConnected,
    isLoading,
    error,
    lastUpdate,

    // Actions
    refreshActiveShift,
    refreshDashboard,
    reconnect,
    disconnect,

    // Event handlers
    onShiftStarted,
    onShiftEnded,
    onShiftHandover,
    onEmergencyEnd,
    onParkingUpdate
  };
}