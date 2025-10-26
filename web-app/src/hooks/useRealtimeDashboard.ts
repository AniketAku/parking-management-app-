// =============================================================================
// REAL-TIME DASHBOARD HOOK
// React hook for consuming real-time dashboard updates with performance optimization
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  realtimeDashboardService,
  type DashboardUpdate,
  type DashboardMetrics,
  type RealtimeDashboardState
} from '../services/RealtimeDashboardService';
import { log } from '../utils/secureLogger';

export interface UseRealtimeDashboardOptions {
  autoConnect?: boolean;
  bufferUpdates?: boolean;
  maxHistorySize?: number;
  filterUpdateTypes?: DashboardUpdate['type'][];
}

export interface UseRealtimeDashboardReturn {
  // State
  isConnected: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  metrics: DashboardMetrics | null;
  recentUpdates: DashboardUpdate[];
  lastUpdateTime: string | null;
  subscriptionCount: number;

  // Statistics
  updateCounts: Record<DashboardUpdate['type'], number>;
  averageUpdateInterval: number;
  connectionUptime: number;

  // Actions
  reconnect: () => Promise<void>;
  refreshMetrics: () => Promise<void>;
  clearHistory: () => void;
  getUpdatesByType: (type: DashboardUpdate['type']) => DashboardUpdate[];
  getUpdatesForShift: (shiftId: string) => DashboardUpdate[];
}

export function useRealtimeDashboard(
  options: UseRealtimeDashboardOptions = {}
): UseRealtimeDashboardReturn {
  const {
    autoConnect = true,
    bufferUpdates = true,
    maxHistorySize = 100,
    filterUpdateTypes
  } = options;

  // State
  const [state, setState] = useState<RealtimeDashboardState>(() =>
    realtimeDashboardService.getState()
  );

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentUpdates, setRecentUpdates] = useState<DashboardUpdate[]>([]);
  const [updateCounts, setUpdateCounts] = useState<Record<DashboardUpdate['type'], number>>({
    shift_stats: 0,
    vehicle_entry: 0,
    vehicle_exit: 0,
    payment: 0,
    shift_status: 0,
    connection_status: 0
  });

  // Statistics tracking
  const [connectionStartTime] = useState<number>(Date.now());
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<number>(0);
  const [updateIntervals, setUpdateIntervals] = useState<number[]>([]);

  // Refs for performance
  const updateBuffer = useRef<DashboardUpdate[]>([]);
  const bufferFlushTimer = useRef<NodeJS.Timeout>();
  const unsubscribeRefs = useRef<(() => void)[]>([]);

  // Initialize service and subscriptions
  useEffect(() => {
    let mounted = true;

    const initializeService = async () => {
      if (autoConnect) {
        try {
          await realtimeDashboardService.initialize();
        } catch (error) {
          log.error('Failed to initialize real-time dashboard service', error);
        }
      }

      if (!mounted) return;

      // Subscribe to dashboard updates
      const unsubscribeUpdates = realtimeDashboardService.onDashboardUpdate((update) => {
        if (mounted) {
          handleDashboardUpdate(update);
        }
      });

      // Subscribe to metrics updates
      const unsubscribeMetrics = realtimeDashboardService.onMetricsUpdate((newMetrics) => {
        if (mounted) {
          setMetrics(newMetrics);
        }
      });

      // Subscribe to connection status updates
      const unsubscribeConnection = realtimeDashboardService.onConnectionStatusUpdate((status) => {
        if (mounted) {
          setState(prev => ({
            ...prev,
            isConnected: status.isConnected,
            connectionQuality: status.quality as any
          }));
        }
      });

      // Store unsubscribe functions
      unsubscribeRefs.current = [unsubscribeUpdates, unsubscribeMetrics, unsubscribeConnection];
    };

    initializeService();

    return () => {
      mounted = false;

      // Clean up subscriptions
      unsubscribeRefs.current.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          log.error('Error unsubscribing from real-time updates', error);
        }
      });

      // Clear any pending buffer flush
      if (bufferFlushTimer.current) {
        clearTimeout(bufferFlushTimer.current);
      }
    };
  }, [autoConnect]);

  // Handle dashboard updates with optional filtering and buffering
  const handleDashboardUpdate = useCallback((update: DashboardUpdate) => {
    // Filter updates if specified
    if (filterUpdateTypes && !filterUpdateTypes.includes(update.type)) {
      return;
    }

    // Track update statistics
    const now = Date.now();
    const updateTimestamp = new Date(update.timestamp).getTime();

    if (lastUpdateTimestamp > 0) {
      const interval = now - lastUpdateTimestamp;
      setUpdateIntervals(prev => [...prev.slice(-19), interval]); // Keep last 20 intervals
    }

    setLastUpdateTimestamp(now);

    // Update counters
    setUpdateCounts(prev => ({
      ...prev,
      [update.type]: prev[update.type] + 1
    }));

    if (bufferUpdates) {
      // Add to buffer
      updateBuffer.current.push(update);

      // Clear existing timer
      if (bufferFlushTimer.current) {
        clearTimeout(bufferFlushTimer.current);
      }

      // Set new timer to flush buffer
      bufferFlushTimer.current = setTimeout(() => {
        flushUpdateBuffer();
      }, 100); // 100ms buffer

      // Flush immediately if buffer is getting full
      if (updateBuffer.current.length >= 10) {
        flushUpdateBuffer();
      }
    } else {
      // Add update immediately
      addUpdateToHistory(update);
    }
  }, [bufferUpdates, filterUpdateTypes, lastUpdateTimestamp]);

  // Flush buffered updates
  const flushUpdateBuffer = useCallback(() => {
    if (updateBuffer.current.length === 0) return;

    const updates = [...updateBuffer.current];
    updateBuffer.current = [];

    // Add all buffered updates
    setRecentUpdates(prev => {
      const combined = [...updates, ...prev];
      return combined.slice(0, maxHistorySize);
    });

    // Update last update time
    setState(prev => ({
      ...prev,
      lastUpdateTime: updates[updates.length - 1]?.timestamp || prev.lastUpdateTime
    }));

    // Clear timer
    if (bufferFlushTimer.current) {
      clearTimeout(bufferFlushTimer.current);
      bufferFlushTimer.current = undefined;
    }
  }, [maxHistorySize]);

  // Add single update to history
  const addUpdateToHistory = useCallback((update: DashboardUpdate) => {
    setRecentUpdates(prev => [update, ...prev].slice(0, maxHistorySize));
    setState(prev => ({
      ...prev,
      lastUpdateTime: update.timestamp
    }));
  }, [maxHistorySize]);

  // Calculate average update interval
  const averageUpdateInterval = useCallback(() => {
    if (updateIntervals.length === 0) return 0;
    const sum = updateIntervals.reduce((acc, interval) => acc + interval, 0);
    return Math.round(sum / updateIntervals.length);
  }, [updateIntervals]);

  // Calculate connection uptime percentage
  const connectionUptime = useCallback(() => {
    const now = Date.now();
    const totalTime = now - connectionStartTime;

    if (totalTime === 0) return 100;

    // This is a simplified calculation - in a real implementation,
    // you'd track actual disconnect periods
    const uptimePercentage = state.isConnected ?
      Math.min(100, (totalTime / (totalTime + 1000)) * 100) : // Assume 1s downtime if disconnected
      Math.max(0, ((totalTime - 5000) / totalTime) * 100); // Assume 5s downtime

    return Math.round(uptimePercentage * 100) / 100;
  }, [state.isConnected, connectionStartTime]);

  // Action: Reconnect
  const reconnect = useCallback(async () => {
    try {
      await realtimeDashboardService.reconnect();
    } catch (error) {
      log.error('Failed to reconnect real-time dashboard service', error);
      throw error;
    }
  }, []);

  // Action: Refresh metrics
  const refreshMetrics = useCallback(async () => {
    try {
      await realtimeDashboardService.forceRefreshMetrics();
    } catch (error) {
      log.error('Failed to refresh dashboard metrics', error);
      throw error;
    }
  }, []);

  // Action: Clear history
  const clearHistory = useCallback(() => {
    setRecentUpdates([]);
    setUpdateCounts({
      shift_stats: 0,
      vehicle_entry: 0,
      vehicle_exit: 0,
      payment: 0,
      shift_status: 0,
      connection_status: 0
    });
    setUpdateIntervals([]);
    updateBuffer.current = [];

    setState(prev => ({
      ...prev,
      lastUpdateTime: null,
      updates: []
    }));
  }, []);

  // Utility: Get updates by type
  const getUpdatesByType = useCallback((type: DashboardUpdate['type']) => {
    return recentUpdates.filter(update => update.type === type);
  }, [recentUpdates]);

  // Utility: Get updates for specific shift
  const getUpdatesForShift = useCallback((shiftId: string) => {
    return recentUpdates.filter(update => update.shift_id === shiftId);
  }, [recentUpdates]);

  // Flush any remaining buffered updates on unmount or when dependencies change
  useEffect(() => {
    return () => {
      if (bufferFlushTimer.current) {
        clearTimeout(bufferFlushTimer.current);
      }
      flushUpdateBuffer();
    };
  }, [flushUpdateBuffer]);

  return {
    // State
    isConnected: state.isConnected,
    connectionQuality: state.connectionQuality,
    metrics,
    recentUpdates,
    lastUpdateTime: state.lastUpdateTime,
    subscriptionCount: state.subscriptionCount,

    // Statistics
    updateCounts,
    averageUpdateInterval: averageUpdateInterval(),
    connectionUptime: connectionUptime(),

    // Actions
    reconnect,
    refreshMetrics,
    clearHistory,
    getUpdatesByType,
    getUpdatesForShift
  };
}