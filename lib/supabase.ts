// =============================================================================
// SUPABASE CLIENT CONFIGURATION
// Event-Driven Shift Management Integration
// =============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ShiftSession, ShiftChange, ShiftStatistics } from './types/shift';

// Supabase configuration - Support both Next.js and Vite environments
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jmckgqtjbezxhsqcfezu.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptY2tncXRqYmV6eGhzcWNmZXp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNTQ5MTAsImV4cCI6MjA3MzgzMDkxMH0.Myrt9UdyNSSAtl5navE0B7VyIMOPCyawDxoXTOozipo';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseAnonKey;

// Debug logging
console.log('🔧 Parent Supabase Config:', {
  hasUrl: Boolean(supabaseUrl),
  hasKey: Boolean(supabaseAnonKey),
  mode: 'Parent Directory'
});

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Server-side Supabase client with service role
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Database interface for type safety
export interface Database {
  public: {
    Tables: {
      shift_sessions: {
        Row: ShiftSession;
        Insert: Omit<ShiftSession, 'id' | 'created_at' | 'updated_at' | 'cash_discrepancy' | 'shift_duration_minutes'>;
        Update: Partial<Omit<ShiftSession, 'id' | 'created_at' | 'cash_discrepancy' | 'shift_duration_minutes'>>;
      };
      shift_changes: {
        Row: ShiftChange;
        Insert: Omit<ShiftChange, 'id' | 'created_at'>;
        Update: Partial<Omit<ShiftChange, 'id' | 'created_at'>>;
      };
      parking_entries: {
        Row: {
          id: string;
          vehicle_number: string;
          vehicle_type: string;
          entry_time: string;
          exit_time?: string;
          status: string;
          parking_fee?: number;
          shift_session_id?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['parking_entries']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Database['public']['Tables']['parking_entries']['Row'], 'id' | 'created_at'>>;
      };
    };
    Views: {
      shift_statistics: {
        Row: ShiftStatistics;
      };
    };
    Functions: {
      start_shift: {
        Args: {
          p_employee_id: string;
          p_employee_name: string;
          p_employee_phone?: string;
          p_opening_cash: number;
          p_shift_notes?: string;
        };
        Returns: string; // UUID of new shift
      };
      end_shift: {
        Args: {
          p_shift_id: string;
          p_closing_cash: number;
          p_closing_notes?: string;
        };
        Returns: any; // JSON shift report
      };
      get_current_active_shift: {
        Args: {};
        Returns: ShiftSession | null;
      };
      validate_shift_system: {
        Args: {};
        Returns: {
          tables_created: boolean;
          functions_created: boolean;
          triggers_created: boolean;
          overall_status: string;
          timestamp: string;
        };
      };
      run_shift_management_tests: {
        Args: {};
        Returns: {
          test_name: string;
          result: string;
          details: string;
        }[];
      };
    };
  };
}

// Typed Supabase clients
export type TypedSupabaseClient = SupabaseClient<Database>;
export const typedSupabase = supabase as TypedSupabaseClient;
export const typedSupabaseAdmin = supabaseAdmin as TypedSupabaseClient;

// Real-time channel management
export class ShiftRealtimeManager {
  private static instance: ShiftRealtimeManager;
  private channels: Map<string, any> = new Map();

  static getInstance(): ShiftRealtimeManager {
    if (!ShiftRealtimeManager.instance) {
      ShiftRealtimeManager.instance = new ShiftRealtimeManager();
    }
    return ShiftRealtimeManager.instance;
  }

  subscribeToShiftManagement(callbacks: {
    onShiftUpdate?: (payload: any) => void;
    onParkingUpdate?: (payload: any) => void;
    onShiftChange?: (payload: any) => void;
  }) {
    const channelName = 'shift-management';

    if (this.channels.has(channelName)) {
      this.unsubscribe(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shift_sessions'
      }, (payload) => {
        callbacks.onShiftUpdate?.(payload);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shift_changes'
      }, (payload) => {
        callbacks.onShiftChange?.(payload);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'parking_entries'
      }, (payload) => {
        callbacks.onParkingUpdate?.(payload);
      })
      .subscribe();

    this.channels.set(channelName, channel);
    return channel;
  }

  subscribeToShiftEvents(callbacks: {
    onShiftStarted?: (payload: any) => void;
    onShiftEnded?: (payload: any) => void;
    onShiftHandover?: (payload: any) => void;
    onEmergencyEnd?: (payload: any) => void;
  }) {
    const channelName = 'shift-events';

    if (this.channels.has(channelName)) {
      this.unsubscribe(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'shift-started' }, callbacks.onShiftStarted || (() => {}))
      .on('broadcast', { event: 'shift-ended' }, callbacks.onShiftEnded || (() => {}))
      .on('broadcast', { event: 'shift-handover' }, callbacks.onShiftHandover || (() => {}))
      .on('broadcast', { event: 'emergency-end' }, callbacks.onEmergencyEnd || (() => {}))
      .subscribe();

    this.channels.set(channelName, channel);
    return channel;
  }

  broadcastShiftEvent(event: string, payload: any) {
    const channel = this.channels.get('shift-events');
    if (channel) {
      return channel.send({
        type: 'broadcast',
        event,
        payload
      });
    }
  }

  unsubscribe(channelName: string) {
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  unsubscribeAll() {
    this.channels.forEach((channel, name) => {
      this.unsubscribe(name);
    });
  }
}

// Utility functions for common database operations
export const dbUtils = {
  async getCurrentActiveShift(): Promise<ShiftSession | null> {
    const { data, error } = await typedSupabaseAdmin
      .rpc('get_current_active_shift');

    if (error) throw error;
    return data;
  },

  async getShiftStatistics(shiftId?: string): Promise<ShiftStatistics[]> {
    let query = typedSupabaseAdmin
      .from('shift_statistics')
      .select('*');

    if (shiftId) {
      query = query.eq('shift_id', shiftId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async validateSystem() {
    const { data, error } = await typedSupabaseAdmin
      .rpc('validate_shift_system');

    if (error) throw error;
    return data;
  },

  async runSystemTests() {
    const { data, error } = await typedSupabaseAdmin
      .rpc('run_shift_management_tests');

    if (error) throw error;
    return data;
  }
};

export default supabase;