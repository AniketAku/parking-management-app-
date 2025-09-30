// =============================================================================
// DATABASE TYPES
// Minimal type definitions for Supabase database tables
// =============================================================================

export interface Database {
  public: {
    Tables: {
      parking_sessions: {
        Row: {
          id: string;
          entry_time: string;
          exit_time?: string;
          vehicle_number: string;
          vehicle_type: string;
          fees?: number;
          payment_mode?: string;
          status: string;
          shift_session_id?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          amount: number;
          payment_mode: string;
          payment_time: string;
          session_id?: string;
          shift_session_id?: string;
        };
      };
      shift_sessions: {
        Row: {
          id: string;
          user_id: string;
          start_time: string;
          end_time?: string;
          status: string;
          total_sessions: number;
          total_payments: number;
          linked_sessions: number;
          linked_payments: number;
        };
      };
    };
  };
}