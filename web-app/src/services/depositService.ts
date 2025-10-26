// =============================================================================
// DEPOSIT MANAGEMENT SERVICE
// Handles deposit creation, retrieval, and role-based access control
// =============================================================================

import { supabase } from '../lib/supabase';
import { log } from '../utils/secureLogger';

export interface Deposit {
  id: string;
  shift_session_id: string;
  deposit_date: string;
  cash_amount: number;
  digital_amount: number;
  total_amount: number;
  deposited_by: string | null;
  employee_name?: string;
  shift_employee?: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DepositSummary {
  totalCashDeposits: number;
  totalDigitalDeposits: number;
  totalDeposits: number;
  depositCount: number;
  pendingCash: number; // Cash on hand not yet deposited
}

export interface CreateDepositParams {
  shift_session_id: string;
  cash_amount: number;
  digital_amount: number;
  notes?: string;
}

export interface DepositResult {
  success: boolean;
  data?: Deposit;
  error?: string;
}

export class DepositService {
  private static instance: DepositService;

  public static getInstance(): DepositService {
    if (!DepositService.instance) {
      DepositService.instance = new DepositService();
    }
    return DepositService.instance;
  }

  /**
   * Create a new deposit
   */
  async createDeposit(params: CreateDepositParams): Promise<DepositResult> {
    try {
      // Validate amounts
      if (params.cash_amount < 0 || params.digital_amount < 0) {
        return {
          success: false,
          error: 'Deposit amounts cannot be negative'
        };
      }

      if (params.cash_amount === 0 && params.digital_amount === 0) {
        return {
          success: false,
          error: 'At least one deposit amount must be greater than zero'
        };
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Create deposit record
      const { data, error } = await supabase
        .from('shift_deposits')
        .insert({
          shift_session_id: params.shift_session_id,
          cash_amount: params.cash_amount,
          digital_amount: params.digital_amount,
          deposited_by: user.id,
          notes: params.notes || null,
          deposit_date: new Date().toISOString().split('T')[0] // YYYY-MM-DD
        })
        .select(`
          *,
          shift_sessions!inner(employee_name)
        `)
        .single();

      if (error) {
        log.error('Error creating deposit', error);
        return {
          success: false,
          error: error.message
        };
      }

      // Transform data to include employee name
      const deposit: Deposit = {
        ...data,
        shift_employee: data.shift_sessions?.employee_name,
        employee_name: data.shift_sessions?.employee_name
      };

      return {
        success: true,
        data: deposit
      };
    } catch (error) {
      log.error('Unexpected error creating deposit', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get deposits based on user role
   * Admin: All deposits with optional date filter
   * Operator/Viewer: Today's deposits only
   */
  async getDeposits(userRole: 'admin' | 'operator' | 'viewer', startDate?: string, endDate?: string): Promise<Deposit[]> {
    try {
      let query = supabase
        .from('shift_deposits')
        .select(`
          *,
          shift_sessions!inner(employee_name),
          users:deposited_by(email)
        `)
        .order('deposit_date', { ascending: false })
        .order('created_at', { ascending: false });

      // Apply role-based filtering
      if (userRole === 'admin') {
        // Admin can filter by date range
        if (startDate) {
          query = query.gte('deposit_date', startDate);
        }
        if (endDate) {
          query = query.lte('deposit_date', endDate);
        }
      } else {
        // Operator and Viewer can only see today's deposits
        const today = new Date().toISOString().split('T')[0];
        query = query.eq('deposit_date', today);
      }

      const { data, error } = await query;

      if (error) {
        log.error('Error fetching deposits', error);
        return [];
      }

      // Transform data to include employee name
      return (data || []).map(deposit => ({
        ...deposit,
        employee_name: deposit.shift_sessions?.employee_name,
        shift_employee: deposit.shift_sessions?.employee_name
      }));
    } catch (error) {
      log.error('Unexpected error fetching deposits', error);
      return [];
    }
  }

  /**
   * Get today's deposits only (used by all roles)
   */
  async getTodayDeposits(): Promise<Deposit[]> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('shift_deposits')
        .select(`
          *,
          shift_sessions!inner(employee_name),
          users:deposited_by(email)
        `)
        .eq('deposit_date', today)
        .order('created_at', { ascending: false });

      if (error) {
        log.error('Error fetching today\'s deposits', error);
        return [];
      }

      return (data || []).map(deposit => ({
        ...deposit,
        employee_name: deposit.shift_sessions?.employee_name,
        shift_employee: deposit.shift_sessions?.employee_name
      }));
    } catch (error) {
      log.error('Unexpected error fetching today\'s deposits', error);
      return [];
    }
  }

  /**
   * Get deposit summary for a specific shift
   */
  async getDepositSummary(shiftId: string, cashRevenue: number = 0): Promise<DepositSummary> {
    try {
      const { data, error } = await supabase
        .from('shift_deposits')
        .select('cash_amount, digital_amount')
        .eq('shift_session_id', shiftId);

      if (error) {
        log.error('Error fetching deposit summary', error);
        return {
          totalCashDeposits: 0,
          totalDigitalDeposits: 0,
          totalDeposits: 0,
          depositCount: 0,
          pendingCash: cashRevenue
        };
      }

      const deposits = data || [];
      const totalCash = deposits.reduce((sum, d) => sum + Number(d.cash_amount), 0);
      const totalDigital = deposits.reduce((sum, d) => sum + Number(d.digital_amount), 0);

      return {
        totalCashDeposits: totalCash,
        totalDigitalDeposits: totalDigital,
        totalDeposits: totalCash + totalDigital,
        depositCount: deposits.length,
        pendingCash: Math.max(0, cashRevenue - totalCash) // Cash still on hand
      };
    } catch (error) {
      log.error('Unexpected error fetching deposit summary', error);
      return {
        totalCashDeposits: 0,
        totalDigitalDeposits: 0,
        totalDeposits: 0,
        depositCount: 0,
        pendingCash: cashRevenue
      };
    }
  }

  /**
   * Get deposits for a specific shift
   */
  async getShiftDeposits(shiftId: string): Promise<Deposit[]> {
    try {
      const { data, error } = await supabase
        .from('shift_deposits')
        .select(`
          *,
          shift_sessions!inner(employee_name),
          users:deposited_by(email)
        `)
        .eq('shift_session_id', shiftId)
        .order('created_at', { ascending: false });

      if (error) {
        log.error('Error fetching shift deposits', error);
        return [];
      }

      return (data || []).map(deposit => ({
        ...deposit,
        employee_name: deposit.shift_sessions?.employee_name,
        shift_employee: deposit.shift_sessions?.employee_name
      }));
    } catch (error) {
      log.error('Unexpected error fetching shift deposits', error);
      return [];
    }
  }

  /**
   * Update a deposit (only for today's deposits by operators or any deposit by admins)
   */
  async updateDeposit(depositId: string, updates: Partial<CreateDepositParams>): Promise<DepositResult> {
    try {
      // Validate amounts if provided
      if (updates.cash_amount !== undefined && updates.cash_amount < 0) {
        return {
          success: false,
          error: 'Cash amount cannot be negative'
        };
      }

      if (updates.digital_amount !== undefined && updates.digital_amount < 0) {
        return {
          success: false,
          error: 'Digital amount cannot be negative'
        };
      }

      const { data, error } = await supabase
        .from('shift_deposits')
        .update({
          cash_amount: updates.cash_amount,
          digital_amount: updates.digital_amount,
          notes: updates.notes
        })
        .eq('id', depositId)
        .select(`
          *,
          shift_sessions!inner(employee_name)
        `)
        .single();

      if (error) {
        log.error('Error updating deposit', error);
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: {
          ...data,
          employee_name: data.shift_sessions?.employee_name,
          shift_employee: data.shift_sessions?.employee_name
        }
      };
    } catch (error) {
      log.error('Unexpected error updating deposit', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Delete a deposit (admin only)
   */
  async deleteDeposit(depositId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('shift_deposits')
        .delete()
        .eq('id', depositId);

      if (error) {
        log.error('Error deleting deposit', error);
        return {
          success: false,
          error: error.message
        };
      }

      return { success: true };
    } catch (error) {
      log.error('Unexpected error deleting deposit', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Subscribe to real-time deposit changes
   */
  subscribeToDeposits(callback: (deposit: Deposit) => void) {
    const channel = supabase
      .channel('shift_deposits_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shift_deposits'
        },
        async (payload) => {
          if (payload.new) {
            // Fetch complete deposit data with relations
            const { data } = await supabase
              .from('shift_deposits')
              .select(`
                *,
                shift_sessions!inner(employee_name),
                users:deposited_by(email)
              `)
              .eq('id', payload.new.id)
              .single();

            if (data) {
              callback({
                ...data,
                employee_name: data.shift_sessions?.employee_name,
                shift_employee: data.shift_sessions?.employee_name
              });
            }
          }
        }
      )
      .subscribe();

    return channel;
  }
}

// Export singleton instance
export const depositService = DepositService.getInstance();
