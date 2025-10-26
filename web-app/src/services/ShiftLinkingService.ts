// =============================================================================
// AUTOMATIC SHIFT LINKING SERVICE
// Handles automatic assignment of parking sessions and payments to active shifts
// =============================================================================

import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';
import { log } from '../utils/secureLogger';

type ParkingSession = Database['public']['Tables']['parking_sessions']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];
type ShiftSession = Database['public']['Tables']['shift_sessions']['Row'];

export interface ShiftLinkingResult {
  success: boolean;
  shift_id: string | null;
  message: string;
  error_code?: string;
}

export interface ShiftStatUpdate {
  vehicles_entered?: number;
  vehicles_exited?: number;
  currently_parked?: number;
  total_revenue?: number;
  cash_collected?: number;
  digital_payments?: number;
}

export class ShiftLinkingService {
  private static instance: ShiftLinkingService;
  private activeShiftCache: { id: string; employee_id: string } | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 60000; // 1 minute

  public static getInstance(): ShiftLinkingService {
    if (!ShiftLinkingService.instance) {
      ShiftLinkingService.instance = new ShiftLinkingService();
    }
    return ShiftLinkingService.instance;
  }

  /**
   * Get current active shift with caching for performance
   */
  private async getCurrentActiveShift(): Promise<{ id: string; employee_id: string } | null> {
    const now = Date.now();

    // Return cached result if still valid
    if (this.activeShiftCache && now < this.cacheExpiry) {
      return this.activeShiftCache;
    }

    try {
      const { data, error } = await supabase
        .from('shift_sessions')
        .select('id, employee_id')
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is OK
        log.error('Error fetching active shift', error);
        return null;
      }

      if (data) {
        this.activeShiftCache = { id: data.id, employee_id: data.employee_id };
        this.cacheExpiry = now + this.CACHE_DURATION;
        return this.activeShiftCache;
      }

      this.activeShiftCache = null;
      this.cacheExpiry = now + (this.CACHE_DURATION / 4); // Shorter cache for null results
      return null;
    } catch (error) {
      log.error('Unexpected error fetching active shift', error);
      return null;
    }
  }

  /**
   * Clear the shift cache when shift status changes
   */
  public clearShiftCache(): void {
    this.activeShiftCache = null;
    this.cacheExpiry = 0;
  }

  /**
   * Automatically link parking session to active shift
   */
  async linkParkingSession(
    sessionId: string,
    vehicleType?: string,
    paymentMode?: string
  ): Promise<ShiftLinkingResult> {
    try {
      const activeShift = await this.getCurrentActiveShift();

      if (!activeShift) {
        return {
          success: false,
          shift_id: null,
          message: 'No active shift found. Cannot link parking session.',
          error_code: 'NO_ACTIVE_SHIFT'
        };
      }

      // Update parking session with shift ID
      const { error: updateError } = await supabase
        .from('parking_sessions')
        .update({
          shift_session_id: activeShift.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (updateError) {
        log.error('Error linking parking session to shift', updateError);
        return {
          success: false,
          shift_id: activeShift.id,
          message: `Failed to link session: ${updateError.message}`,
          error_code: 'LINK_FAILED'
        };
      }

      // Trigger real-time statistics update using database function
      await this.updateShiftStatisticsForEntry(activeShift.id, vehicleType);

      return {
        success: true,
        shift_id: activeShift.id,
        message: 'Parking session successfully linked to active shift'
      };

    } catch (error) {
      log.error('Error in linkParkingSession', error);
      return {
        success: false,
        shift_id: null,
        message: `Linking failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error_code: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * Automatically link payment to active shift
   */
  async linkPayment(
    paymentId: string,
    amount: number,
    paymentMode: 'cash' | 'digital' | 'card',
    parkingSessionId?: string
  ): Promise<ShiftLinkingResult> {
    try {
      const activeShift = await this.getCurrentActiveShift();

      if (!activeShift) {
        return {
          success: false,
          shift_id: null,
          message: 'No active shift found. Cannot link payment.',
          error_code: 'NO_ACTIVE_SHIFT'
        };
      }

      // Update payment with shift ID
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          shift_session_id: activeShift.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (updateError) {
        log.error('Error linking payment to shift', updateError);
        return {
          success: false,
          shift_id: activeShift.id,
          message: `Failed to link payment: ${updateError.message}`,
          error_code: 'LINK_FAILED'
        };
      }

      // Trigger real-time statistics update using database function
      await this.updateShiftStatisticsForPayment(activeShift.id, amount, paymentMode);

      return {
        success: true,
        shift_id: activeShift.id,
        message: 'Payment successfully linked to active shift'
      };

    } catch (error) {
      log.error('Error in linkPayment', error);
      return {
        success: false,
        shift_id: null,
        message: `Payment linking failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error_code: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * Update shift statistics for vehicle entry
   */
  private async updateShiftStatisticsForEntry(
    shiftId: string,
    vehicleType?: string
  ): Promise<void> {
    try {
      // Use database function for atomic statistics update
      const { error } = await supabase.rpc('update_shift_entry_stats', {
        p_shift_id: shiftId,
        p_vehicle_type: vehicleType || 'unknown'
      });

      if (error) {
        log.error('Error updating shift entry statistics', error);
      }
    } catch (error) {
      log.error('Unexpected error updating entry stats', error);
    }
  }

  /**
   * Update shift statistics for payment
   */
  private async updateShiftStatisticsForPayment(
    shiftId: string,
    amount: number,
    paymentMode: 'cash' | 'digital' | 'card'
  ): Promise<void> {
    try {
      // Use database function for atomic statistics update
      const { error } = await supabase.rpc('update_shift_payment_stats', {
        p_shift_id: shiftId,
        p_amount: amount,
        p_payment_mode: paymentMode
      });

      if (error) {
        log.error('Error updating shift payment statistics', error);
      }
    } catch (error) {
      log.error('Unexpected error updating payment stats', error);
    }
  }

  /**
   * Update shift statistics for vehicle exit
   */
  async updateShiftStatisticsForExit(
    shiftId: string,
    vehicleType?: string,
    durationMinutes?: number
  ): Promise<ShiftLinkingResult> {
    try {
      // Use database function for atomic statistics update
      const { error } = await supabase.rpc('update_shift_exit_stats', {
        p_shift_id: shiftId,
        p_vehicle_type: vehicleType || 'unknown',
        p_duration_minutes: durationMinutes || 0
      });

      if (error) {
        log.error('Error updating shift exit statistics', error);
        return {
          success: false,
          shift_id: shiftId,
          message: `Failed to update exit statistics: ${error.message}`,
          error_code: 'STATS_UPDATE_FAILED'
        };
      }

      return {
        success: true,
        shift_id: shiftId,
        message: 'Exit statistics updated successfully'
      };

    } catch (error) {
      log.error('Error in updateShiftStatisticsForExit', error);
      return {
        success: false,
        shift_id: shiftId,
        message: `Exit stats update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error_code: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * Bulk link existing unlinked sessions and payments
   */
  async bulkLinkExistingSessions(): Promise<{
    sessions_linked: number;
    payments_linked: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let sessionsLinked = 0;
    let paymentsLinked = 0;

    try {
      const activeShift = await this.getCurrentActiveShift();

      if (!activeShift) {
        return {
          sessions_linked: 0,
          payments_linked: 0,
          errors: ['No active shift found for bulk linking']
        };
      }

      // Link unlinked parking sessions from today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: unlinkSessions, error: sessionsError } = await supabase
        .from('parking_sessions')
        .select('id, vehicle_type, payment_mode')
        .is('shift_session_id', null)
        .gte('entry_time', today.toISOString())
        .limit(100); // Process in batches

      if (sessionsError) {
        errors.push(`Error fetching unlinked sessions: ${sessionsError.message}`);
      } else if (unlinkSessions && unlinkSessions.length > 0) {
        for (const session of unlinkSessions) {
          const result = await this.linkParkingSession(
            session.id,
            session.vehicle_type || undefined,
            session.payment_mode || undefined
          );

          if (result.success) {
            sessionsLinked++;
          } else {
            errors.push(`Session ${session.id}: ${result.message}`);
          }
        }
      }

      // Link unlinked payments from today
      const { data: unlinkPayments, error: paymentsError } = await supabase
        .from('payments')
        .select('id, amount, payment_mode')
        .is('shift_session_id', null)
        .gte('payment_time', today.toISOString())
        .limit(100); // Process in batches

      if (paymentsError) {
        errors.push(`Error fetching unlinked payments: ${paymentsError.message}`);
      } else if (unlinkPayments && unlinkPayments.length > 0) {
        for (const payment of unlinkPayments) {
          const result = await this.linkPayment(
            payment.id,
            payment.amount,
            payment.payment_mode as 'cash' | 'digital' | 'card'
          );

          if (result.success) {
            paymentsLinked++;
          } else {
            errors.push(`Payment ${payment.id}: ${result.message}`);
          }
        }
      }

      return {
        sessions_linked: sessionsLinked,
        payments_linked: paymentsLinked,
        errors: errors
      };

    } catch (error) {
      log.error('Error in bulkLinkExistingSessions', error);
      return {
        sessions_linked: sessionsLinked,
        payments_linked: paymentsLinked,
        errors: [...errors, `Bulk linking failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Validate shift linking integrity
   */
  async validateShiftLinking(shiftId: string): Promise<{
    valid: boolean;
    issues: string[];
    summary: {
      total_sessions: number;
      linked_sessions: number;
      total_payments: number;
      linked_payments: number;
      unlinked_sessions: number;
      unlinked_payments: number;
    };
  }> {
    const issues: string[] = [];

    try {
      // Get shift details
      const { data: shift, error: shiftError } = await supabase
        .from('shift_sessions')
        .select('*')
        .eq('id', shiftId)
        .single();

      if (shiftError || !shift) {
        return {
          valid: false,
          issues: ['Shift not found'],
          summary: {
            total_sessions: 0,
            linked_sessions: 0,
            total_payments: 0,
            linked_payments: 0,
            unlinked_sessions: 0,
            unlinked_payments: 0
          }
        };
      }

      // Check sessions during shift time
      const shiftStart = new Date(shift.shift_start_time);
      const shiftEnd = shift.shift_end_time ? new Date(shift.shift_end_time) : new Date();

      // Count total sessions in shift time range
      const { count: totalSessions } = await supabase
        .from('parking_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('entry_time', shiftStart.toISOString())
        .lte('entry_time', shiftEnd.toISOString());

      // Count linked sessions
      const { count: linkedSessions } = await supabase
        .from('parking_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('shift_session_id', shiftId);

      // Count total payments in shift time range
      const { count: totalPayments } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .gte('payment_time', shiftStart.toISOString())
        .lte('payment_time', shiftEnd.toISOString());

      // Count linked payments
      const { count: linkedPayments } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('shift_session_id', shiftId);

      const summary = {
        total_sessions: totalSessions || 0,
        linked_sessions: linkedSessions || 0,
        total_payments: totalPayments || 0,
        linked_payments: linkedPayments || 0,
        unlinked_sessions: (totalSessions || 0) - (linkedSessions || 0),
        unlinked_payments: (totalPayments || 0) - (linkedPayments || 0)
      };

      // Check for issues
      if (summary.unlinked_sessions > 0) {
        issues.push(`${summary.unlinked_sessions} parking sessions not linked to shift`);
      }

      if (summary.unlinked_payments > 0) {
        issues.push(`${summary.unlinked_payments} payments not linked to shift`);
      }

      // Check for orphaned links (sessions linked to shift but outside time range)
      const { count: orphanedSessions } = await supabase
        .from('parking_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('shift_session_id', shiftId)
        .or(`entry_time.lt.${shiftStart.toISOString()},entry_time.gt.${shiftEnd.toISOString()}`);

      if (orphanedSessions && orphanedSessions > 0) {
        issues.push(`${orphanedSessions} sessions linked to shift but outside time range`);
      }

      return {
        valid: issues.length === 0,
        issues,
        summary
      };

    } catch (error) {
      log.error('Error validating shift linking', error);
      return {
        valid: false,
        issues: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        summary: {
          total_sessions: 0,
          linked_sessions: 0,
          total_payments: 0,
          linked_payments: 0,
          unlinked_sessions: 0,
          unlinked_payments: 0
        }
      };
    }
  }

  /**
   * Process vehicle exit with shift-aware payment handling
   * Transforms payment data to match database trigger expectations
   */
  async processVehicleExitWithShift(
    entryId: string,
    payments: Array<{ mode: 'Cash' | 'Online'; amount: number; transactionId?: string; notes?: string }>,
    exitNotes?: string
  ): Promise<{
    success: boolean;
    entry?: any;
    message: string;
  }> {
    try {
      const activeShift = await this.getCurrentActiveShift();

      if (!activeShift) {
        return {
          success: false,
          message: 'No active shift found. Cannot process exit.',
        };
      }

      // Get the entry first
      const { data: entry, error: getError } = await supabase
        .from('parking_entries')
        .select('*')
        .eq('id', entryId)
        .single();

      if (getError || !entry) {
        return {
          success: false,
          message: 'Entry not found',
        };
      }

      // Calculate total from payments array
      const actualFee = payments.reduce((sum, payment) => sum + payment.amount, 0);

      // Determine payment type based on payment modes
      const hasCash = payments.some(p => p.mode === 'Cash');
      const hasOnline = payments.some(p => p.mode === 'Online');
      let paymentType: 'Cash' | 'Online' | 'Mixed';

      if (hasCash && hasOnline) {
        paymentType = 'Mixed';
      } else if (hasCash) {
        paymentType = 'Cash';
      } else {
        paymentType = 'Online';
      }

      // Legacy payment_mode for backward compatibility
      const paymentMode = paymentType === 'Cash' ? 'cash' : 'digital';

      const exitTime = new Date().toISOString();

      // Update entry with shift-aware payment data
      const { data: updatedEntry, error: updateError } = await supabase
        .from('parking_entries')
        .update({
          exit_time: exitTime,
          status: 'Exited',
          payment_status: 'Paid',
          payment_type: paymentType,
          payment_mode: paymentMode,
          parking_fee: actualFee,
          actual_fee: actualFee,
          notes: exitNotes || entry.notes,
          shift_session_id: activeShift.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', entryId)
        .select()
        .single();

      if (updateError) {
        log.error('Error updating entry for exit', updateError);
        return {
          success: false,
          message: `Failed to process exit: ${updateError.message}`,
        };
      }

      // Create individual payment records in the payments table
      for (const payment of payments) {
        const paymentRecord = {
          amount: payment.amount,
          payment_mode: payment.mode.toLowerCase(),
          payment_time: exitTime,
          session_id: entryId,
          shift_session_id: activeShift.id,
          transaction_id: payment.transactionId || null,
          notes: payment.notes || null,
          created_at: exitTime
        };

        const { error: paymentError } = await supabase
          .from('payments')
          .insert(paymentRecord);

        if (paymentError) {
          log.error('Error creating payment record', paymentError);
          // Continue with other payments even if one fails
        }
      }

      log.success('Entry updated with shift link and payment records', {
        entryId,
        shiftId: activeShift.id,
        paymentType,
        paymentCount: payments.length,
        totalAmount: actualFee
      });

      return {
        success: true,
        entry: updatedEntry,
        message: 'Vehicle exit processed successfully with shift link',
      };

    } catch (error) {
      log.error('Error in processVehicleExitWithShift', error);
      return {
        success: false,
        message: `Exit processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

// Export singleton instance
export const shiftLinkingService = ShiftLinkingService.getInstance();