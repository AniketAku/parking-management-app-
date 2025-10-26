// =============================================================================
// SHIFT DATA HOOK
// Centralized data fetching with real-time subscriptions for all shift data
// Eliminates duplicate queries and provides single source of truth
// =============================================================================

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { log } from '../utils/secureLogger';

// =============================================================================
// TYPES
// =============================================================================

interface ShiftSession {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_phone?: string;
  shift_start_time: string;
  shift_end_time?: string;
  status: string;
  opening_cash_amount?: number;
  closing_cash_amount?: number;
  shift_notes?: string;
}

interface ShiftExpense {
  id: string;
  shift_session_id: string;
  expense_category: string;
  amount: number;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ShiftDeposit {
  id: string;
  shift_session_id: string;
  deposit_date: string;
  cash_amount: number;
  digital_amount: number;
  total_amount: number;
  deposited_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  users?: {
    username: string;
  };
}

interface ParkingEntry {
  id: string;
  vehicle_number: string;
  vehicle_type: string;
  entry_time: string;
  exit_time: string | null;
  status: string;
  parking_fee: number | null;
  actual_fee: number | null;
  calculated_fee: number | null;
  payment_mode: string | null;
  shift_session_id: string | null;
}

interface TodayStats {
  totalRevenue: number;
  cashRevenue: number;
  digitalRevenue: number;
  vehiclesProcessed: number;
  currentlyParked: number;
  averageSessionTime: number;
}

interface ExpensesByCategory {
  [category: string]: number;
}

interface ShiftData {
  shift: ShiftSession | null;
  expenses: ShiftExpense[];
  deposits: ShiftDeposit[];
  parkingEntries: ParkingEntry[];
  todayStats: TodayStats;
  totalExpenses: number;
  totalCashDeposits: number;
  totalDigitalDeposits: number;
  currentCash: number;
  expensesByCategory: ExpensesByCategory;
  loading: boolean;
  error: string | null;
}

export interface UseShiftDataReturn extends ShiftData {
  refreshData: () => Promise<void>;
  isRefreshing: boolean;
}

// =============================================================================
// HOOK
// =============================================================================

export function useShiftData(shiftId: string | null): UseShiftDataReturn {
  // State
  const [data, setData] = useState<ShiftData>({
    shift: null,
    expenses: [],
    deposits: [],
    parkingEntries: [],
    todayStats: {
      totalRevenue: 0,
      cashRevenue: 0,
      digitalRevenue: 0,
      vehiclesProcessed: 0,
      currentlyParked: 0,
      averageSessionTime: 0
    },
    totalExpenses: 0,
    totalCashDeposits: 0,
    totalDigitalDeposits: 0,
    currentCash: 0,
    expensesByCategory: {},
    loading: true,
    error: null
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshingRef = useRef(false);

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  const fetchAllData = useCallback(async () => {
    if (!shiftId) {
      setData({
        shift: null,
        expenses: [],
        deposits: [],
        parkingEntries: [],
        todayStats: {
          totalRevenue: 0,
          cashRevenue: 0,
          digitalRevenue: 0,
          vehiclesProcessed: 0,
          currentlyParked: 0,
          averageSessionTime: 0
        },
        totalExpenses: 0,
        totalCashDeposits: 0,
        totalDigitalDeposits: 0,
        currentCash: 0,
        expensesByCategory: {},
        loading: false,
        error: null
      });
      return;
    }

    // Prevent concurrent refreshes
    if (refreshingRef.current) {
      return;
    }

    try {
      refreshingRef.current = true;
      setIsRefreshing(true);
      setData(prev => ({ ...prev, loading: true, error: null }));

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      log.debug('SHIFT DATA - Fetching shift with ID', { shiftId });

      // ✅ PARALLEL FETCHING: All queries run simultaneously (8 queries → 4 queries)
      const [
        shiftResult,
        expensesResult,
        depositsResult,
        parkingEntriesResult,
        activeVehiclesResult
      ] = await Promise.all([
        // 1. Fetch shift session
        supabase
          .from('shift_sessions')
          .select('*')
          .eq('id', shiftId)
          .single(),

        // 2. Fetch expenses for this shift
        supabase
          .from('shift_expenses')
          .select('*')
          .eq('shift_session_id', shiftId)
          .order('created_at', { ascending: false }),

        // 3. Fetch deposits for this shift
        supabase
          .from('shift_deposits')
          .select(`
            *,
            users:deposited_by (
              username
            )
          `)
          .eq('shift_session_id', shiftId)
          .order('created_at', { ascending: false }),

        // 4. Fetch today's parking entries for this shift
        supabase
          .from('parking_entries')
          .select('*')
          .eq('shift_session_id', shiftId)
          .or(`and(entry_time.gte.${todayStart.toISOString()},entry_time.lte.${todayEnd.toISOString()}),and(exit_time.gte.${todayStart.toISOString()},exit_time.lte.${todayEnd.toISOString()})`),

        // 5. Fetch ALL currently active vehicles (includes multi-day sessions)
        supabase
          .from('parking_entries')
          .select('id, vehicle_number, entry_time, status')
          .eq('status', 'Active')
      ]);

      log.debug('SHIFT DATA - Query results', {
        shiftError: shiftResult.error,
        shiftData: shiftResult.data,
        expensesCount: expensesResult.data?.length,
        depositsCount: depositsResult.data?.length
      });

      // Check for errors
      if (shiftResult.error) {
        log.error('SHIFT DATA - Shift query error', shiftResult.error);
        throw shiftResult.error;
      }
      if (expensesResult.error) throw expensesResult.error;
      if (depositsResult.error) throw depositsResult.error;
      if (parkingEntriesResult.error) throw parkingEntriesResult.error;
      if (activeVehiclesResult.error) throw activeVehiclesResult.error;

      const shift = shiftResult.data as ShiftSession;
      const expenses = expensesResult.data || [];
      const deposits = depositsResult.data || [];
      const parkingEntries = parkingEntriesResult.data || [];
      const activeVehicles = activeVehiclesResult.data || [];

      // =============================================================================
      // CALCULATIONS (Business Logic)
      // =============================================================================

      // Total expenses
      const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

      // Expenses by category
      const expensesByCategory = expenses.reduce((acc, exp) => {
        const category = exp.expense_category || 'Other';
        acc[category] = (acc[category] || 0) + Number(exp.amount);
        return acc;
      }, {} as ExpensesByCategory);

      // Total deposits
      const totalCashDeposits = deposits.reduce((sum, dep) => sum + Number(dep.cash_amount), 0);
      const totalDigitalDeposits = deposits.reduce((sum, dep) => sum + Number(dep.digital_amount), 0);

      // Revenue calculations (Cash vs Digital separation)
      let cashRevenue = 0;
      let digitalRevenue = 0;

      parkingEntries.forEach(entry => {
        if (entry.status === 'Exited' || entry.exit_time) {
          const fee = entry.parking_fee || entry.actual_fee || entry.calculated_fee || 0;
          const paymentMode = entry.payment_mode || 'cash'; // Default to cash if not set

          if (paymentMode === 'cash') {
            cashRevenue += fee;
          } else {
            // Digital includes: card, upi, digital, wallet, etc.
            digitalRevenue += fee;
          }
        }
      });

      const totalRevenue = cashRevenue + digitalRevenue;

      // Currently parked vehicles (includes multi-day sessions)
      const currentlyParked = activeVehicles.length;

      // Average session time (completed sessions only)
      const completedSessions = parkingEntries.filter(entry => entry.exit_time);
      const averageSessionTime = completedSessions.length > 0
        ? completedSessions.reduce((sum, entry) => {
            const entryTime = new Date(entry.entry_time).getTime();
            const exitTime = new Date(entry.exit_time!).getTime();
            return sum + (exitTime - entryTime);
          }, 0) / (completedSessions.length * 1000 * 60) // Convert to minutes
        : 0;

      // ✅ CORRECT CALCULATION: Current Cash = Opening Cash + Cash Revenue - Expenses - Cash Deposits
      // Digital revenue is NOT included because employee never physically has it
      const openingCash = shift.opening_cash_amount || 0;
      const currentCash = openingCash + cashRevenue - totalExpenses - totalCashDeposits;

      // Today's statistics
      const todayStats: TodayStats = {
        totalRevenue,
        cashRevenue,
        digitalRevenue,
        vehiclesProcessed: parkingEntries.length,
        currentlyParked,
        averageSessionTime: Math.round(averageSessionTime)
      };

      log.debug('SHIFT DATA - Fetched all data', {
        shiftId,
        expensesCount: expenses.length,
        depositsCount: deposits.length,
        parkingEntriesCount: parkingEntries.length,
        currentlyParked,
        totalExpenses,
        totalCashDeposits,
        currentCash,
        cashRevenue,
        digitalRevenue
      });

      // Update state
      setData({
        shift,
        expenses,
        deposits,
        parkingEntries,
        todayStats,
        totalExpenses,
        totalCashDeposits,
        totalDigitalDeposits,
        currentCash,
        expensesByCategory,
        loading: false,
        error: null
      });
    } catch (error) {
      log.error('SHIFT DATA - Error fetching shift data', error);
      log.error('SHIFT DATA - Error details', {
        shiftId,
        errorType: error?.constructor?.name,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch shift data'
      }));
    } finally {
      refreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [shiftId]);

  // =============================================================================
  // REAL-TIME SUBSCRIPTIONS
  // =============================================================================

  useEffect(() => {
    if (!shiftId) return;

    log.debug('SHIFT DATA - Setting up real-time subscriptions for shift', { shiftId });

    const channel = supabase
      .channel('shift-data-updates')
      // Shift session changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shift_sessions',
          filter: `id=eq.${shiftId}`
        },
        () => {
          log.debug('SHIFT DATA - Shift session updated');
          fetchAllData();
        }
      )
      // Expense changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shift_expenses',
          filter: `shift_session_id=eq.${shiftId}`
        },
        () => {
          log.debug('SHIFT DATA - Expense updated');
          fetchAllData();
        }
      )
      // Deposit changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shift_deposits',
          filter: `shift_session_id=eq.${shiftId}`
        },
        () => {
          log.debug('SHIFT DATA - Deposit updated');
          fetchAllData();
        }
      )
      // Parking entry changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parking_entries',
          filter: `shift_session_id=eq.${shiftId}`
        },
        () => {
          log.debug('SHIFT DATA - Parking entry updated');
          fetchAllData();
        }
      )
      .subscribe();

    return () => {
      log.debug('SHIFT DATA - Cleaning up real-time subscriptions');
      supabase.removeChannel(channel);
    };
  }, [shiftId, fetchAllData]);

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // =============================================================================
  // RETURN
  // =============================================================================

  return {
    ...data,
    refreshData: fetchAllData,
    isRefreshing
  };
}
