// =============================================================================
// SHIFT LINKING HOOK
// React hook for automatic shift linking with real-time updates
// =============================================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { shiftLinkingService, type ShiftLinkingResult } from '../services/ShiftLinkingService';
import { supabase } from '../lib/supabase';

export interface ShiftLinkingState {
  isLinking: boolean;
  lastLinkResult: ShiftLinkingResult | null;
  activeShiftId: string | null;
  linkingErrors: string[];
  bulkLinkingInProgress: boolean;
}

export interface ShiftLinkingMetrics {
  sessionsLinkedToday: number;
  paymentsLinkedToday: number;
  unlinkedSessions: number;
  unlinkedPayments: number;
  linkingSuccessRate: number;
}

// Force HMR update after fixing database types - ver2

export interface UseShiftLinkingReturn {
  state: ShiftLinkingState;
  metrics: ShiftLinkingMetrics | null;

  // Core linking functions
  linkParkingSession: (sessionId: string, vehicleType?: string, paymentMode?: string) => Promise<ShiftLinkingResult>;
  linkPayment: (paymentId: string, amount: number, paymentMode: 'cash' | 'digital' | 'card', sessionId?: string) => Promise<ShiftLinkingResult>;
  updateExitStats: (shiftId: string, vehicleType?: string, durationMinutes?: number) => Promise<ShiftLinkingResult>;

  // Bulk operations
  bulkLinkExisting: () => Promise<{sessions_linked: number; payments_linked: number; errors: string[]}>;
  validateShiftLinking: (shiftId: string) => Promise<any>;

  // Utility functions
  clearCache: () => void;
  clearErrors: () => void;
  refreshMetrics: () => Promise<void>;
}

export function useShiftLinking(): UseShiftLinkingReturn {
  const [state, setState] = useState<ShiftLinkingState>({
    isLinking: false,
    lastLinkResult: null,
    activeShiftId: null,
    linkingErrors: [],
    bulkLinkingInProgress: false
  });

  const [metrics, setMetrics] = useState<ShiftLinkingMetrics | null>(null);

  // Refs for avoiding stale closures and managing async operations
  const stateRef = useRef(state);
  const metricsRef = useRef(metrics);
  const refreshingRef = useRef(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);

  // Subscribe to shift stats updates
  useEffect(() => {
    const channel = supabase
      .channel('shift-linking-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shift_sessions'
        },
        (payload) => {
          if (payload.new && payload.new.status === 'active') {
            setState(prev => ({
              ...prev,
              activeShiftId: payload.new.id
            }));
          } else if (payload.eventType === 'DELETE' ||
                    (payload.new && payload.new.status !== 'active')) {
            setState(prev => ({
              ...prev,
              activeShiftId: null
            }));
            shiftLinkingService.clearShiftCache();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'parking_sessions'
        },
        () => {
          // Use debounced refresh to prevent excessive re-renders
          debouncedRefreshMetrics();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payments'
        },
        () => {
          // Use debounced refresh to prevent excessive re-renders
          debouncedRefreshMetrics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      // Clear any pending debounced refresh
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, []);

  // Initialize active shift on mount
  useEffect(() => {
    initializeActiveShift();
    refreshMetrics();
  }, []);

  const initializeActiveShift = async () => {
    try {
      const { data, error } = await supabase
        .from('shift_sessions')
        .select('id')
        .eq('status', 'active')
        .single();

      if (!error && data) {
        setState(prev => ({
          ...prev,
          activeShiftId: data.id
        }));
      }
    } catch (error) {
      console.warn('No active shift found during initialization');
    }
  };

  const refreshMetrics = useCallback(async () => {
    // Prevent concurrent refreshes
    if (refreshingRef.current) {
      return;
    }

    try {
      refreshingRef.current = true;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get today's linking metrics
      const [sessionsResult, paymentsResult, unlinkSessionsResult, unlinkedPaymentsResult] = await Promise.all([
        supabase
          .from('parking_sessions')
          .select('id', { count: 'exact' })
          .not('shift_session_id', 'is', null)
          .gte('entry_time', today.toISOString()),

        supabase
          .from('payments')
          .select('id', { count: 'exact' })
          .not('shift_session_id', 'is', null)
          .gte('payment_time', today.toISOString()),

        supabase
          .from('parking_sessions')
          .select('id', { count: 'exact' })
          .is('shift_session_id', null)
          .gte('entry_time', today.toISOString()),

        supabase
          .from('payments')
          .select('id', { count: 'exact' })
          .is('shift_session_id', null)
          .gte('payment_time', today.toISOString())
      ]);

      const sessionsLinked = sessionsResult.count || 0;
      const paymentsLinked = paymentsResult.count || 0;
      const unlinkedSessions = unlinkSessionsResult.count || 0;
      const unlinkedPayments = unlinkedPaymentsResult.count || 0;

      const totalSessions = sessionsLinked + unlinkedSessions;
      const totalPayments = paymentsLinked + unlinkedPayments;
      const totalOperations = totalSessions + totalPayments;
      const successfulOperations = sessionsLinked + paymentsLinked;

      const successRate = totalOperations > 0 ? (successfulOperations / totalOperations) * 100 : 100;

      setMetrics({
        sessionsLinkedToday: sessionsLinked,
        paymentsLinkedToday: paymentsLinked,
        unlinkedSessions,
        unlinkedPayments,
        linkingSuccessRate: Math.round(successRate * 100) / 100
      });
    } catch (error) {
      console.error('Error refreshing linking metrics:', error);
    } finally {
      refreshingRef.current = false;
    }
  }, []);

  // Debounced metrics refresh to prevent excessive re-renders
  const debouncedRefreshMetrics = useCallback(() => {
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // Set a new timeout for debounced refresh
    refreshTimeoutRef.current = setTimeout(() => {
      refreshMetrics();
    }, 1500); // Wait 1.5 seconds before refreshing
  }, [refreshMetrics]);

  const linkParkingSession = useCallback(async (
    sessionId: string,
    vehicleType?: string,
    paymentMode?: string
  ): Promise<ShiftLinkingResult> => {
    setState(prev => ({ ...prev, isLinking: true }));

    try {
      const result = await shiftLinkingService.linkParkingSession(sessionId, vehicleType, paymentMode);

      setState(prev => ({
        ...prev,
        isLinking: false,
        lastLinkResult: result,
        linkingErrors: result.success ? prev.linkingErrors : [...prev.linkingErrors, result.message]
      }));

      if (result.success) {
        await refreshMetrics();
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown linking error';
      const errorResult: ShiftLinkingResult = {
        success: false,
        shift_id: null,
        message: errorMessage,
        error_code: 'HOOK_ERROR'
      };

      setState(prev => ({
        ...prev,
        isLinking: false,
        lastLinkResult: errorResult,
        linkingErrors: [...prev.linkingErrors, errorMessage]
      }));

      return errorResult;
    }
  }, [refreshMetrics]);

  const linkPayment = useCallback(async (
    paymentId: string,
    amount: number,
    paymentMode: 'cash' | 'digital' | 'card',
    sessionId?: string
  ): Promise<ShiftLinkingResult> => {
    setState(prev => ({ ...prev, isLinking: true }));

    try {
      const result = await shiftLinkingService.linkPayment(paymentId, amount, paymentMode, sessionId);

      setState(prev => ({
        ...prev,
        isLinking: false,
        lastLinkResult: result,
        linkingErrors: result.success ? prev.linkingErrors : [...prev.linkingErrors, result.message]
      }));

      if (result.success) {
        await refreshMetrics();
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown payment linking error';
      const errorResult: ShiftLinkingResult = {
        success: false,
        shift_id: null,
        message: errorMessage,
        error_code: 'HOOK_ERROR'
      };

      setState(prev => ({
        ...prev,
        isLinking: false,
        lastLinkResult: errorResult,
        linkingErrors: [...prev.linkingErrors, errorMessage]
      }));

      return errorResult;
    }
  }, [refreshMetrics]);

  const updateExitStats = useCallback(async (
    shiftId: string,
    vehicleType?: string,
    durationMinutes?: number
  ): Promise<ShiftLinkingResult> => {
    setState(prev => ({ ...prev, isLinking: true }));

    try {
      const result = await shiftLinkingService.updateShiftStatisticsForExit(shiftId, vehicleType, durationMinutes);

      setState(prev => ({
        ...prev,
        isLinking: false,
        lastLinkResult: result,
        linkingErrors: result.success ? prev.linkingErrors : [...prev.linkingErrors, result.message]
      }));

      if (result.success) {
        await refreshMetrics();
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown exit stats error';
      const errorResult: ShiftLinkingResult = {
        success: false,
        shift_id: shiftId,
        message: errorMessage,
        error_code: 'HOOK_ERROR'
      };

      setState(prev => ({
        ...prev,
        isLinking: false,
        lastLinkResult: errorResult,
        linkingErrors: [...prev.linkingErrors, errorMessage]
      }));

      return errorResult;
    }
  }, [refreshMetrics]);

  const bulkLinkExisting = useCallback(async () => {
    setState(prev => ({ ...prev, bulkLinkingInProgress: true }));

    try {
      const result = await shiftLinkingService.bulkLinkExistingSessions();

      setState(prev => ({
        ...prev,
        bulkLinkingInProgress: false,
        linkingErrors: result.errors.length > 0 ? [...prev.linkingErrors, ...result.errors] : prev.linkingErrors
      }));

      await refreshMetrics();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bulk linking failed';

      setState(prev => ({
        ...prev,
        bulkLinkingInProgress: false,
        linkingErrors: [...prev.linkingErrors, errorMessage]
      }));

      throw error;
    }
  }, [refreshMetrics]);

  const validateShiftLinking = useCallback(async (shiftId: string) => {
    try {
      return await shiftLinkingService.validateShiftLinking(shiftId);
    } catch (error) {
      console.error('Error validating shift linking:', error);
      throw error;
    }
  }, []);

  const clearCache = useCallback(() => {
    shiftLinkingService.clearShiftCache();
    setState(prev => ({ ...prev, activeShiftId: null }));
  }, []);

  const clearErrors = useCallback(() => {
    setState(prev => ({ ...prev, linkingErrors: [] }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any pending debounced refresh
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      // Reset refreshing flag
      refreshingRef.current = false;
    };
  }, []);

  return {
    state,
    metrics,
    linkParkingSession,
    linkPayment,
    updateExitStats,
    bulkLinkExisting,
    validateShiftLinking,
    clearCache,
    clearErrors,
    refreshMetrics
  };
}