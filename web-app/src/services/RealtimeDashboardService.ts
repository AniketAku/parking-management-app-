// =============================================================================
// REAL-TIME DASHBOARD SERVICE
// Supabase subscriptions for live dashboard updates with performance optimization
// =============================================================================

import { supabase } from '../lib/supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { log } from '../utils/secureLogger';

type ShiftSession = Database['public']['Tables']['shift_sessions']['Row'];
type ParkingSession = Database['public']['Tables']['parking_sessions']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];

export interface DashboardUpdate {
  type: 'shift_stats' | 'vehicle_entry' | 'vehicle_exit' | 'payment' | 'shift_status' | 'connection_status';
  timestamp: string;
  data: any;
  shift_id?: string;
}

export interface DashboardMetrics {
  activeShifts: number;
  currentlyParked: number;
  totalRevenue: number;
  vehiclesEntered: number;
  vehiclesExited: number;
  averageStayDuration: number;
  peakHours: { hour: number; count: number }[];
  paymentModeBreakdown: Record<string, number>;
}

export interface RealtimeDashboardState {
  isConnected: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  lastUpdateTime: string | null;
  subscriptionCount: number;
  updates: DashboardUpdate[];
  metrics: DashboardMetrics | null;
}

type DashboardEventCallback = (update: DashboardUpdate) => void;
type MetricsUpdateCallback = (metrics: DashboardMetrics) => void;
type ConnectionStatusCallback = (status: { isConnected: boolean; quality: string }) => void;

export class RealtimeDashboardService {
  private static instance: RealtimeDashboardService;
  private channels: Map<string, RealtimeChannel> = new Map();
  private eventCallbacks: Set<DashboardEventCallback> = new Set();
  private metricsCallbacks: Set<MetricsUpdateCallback> = new Set();
  private connectionCallbacks: Set<ConnectionStatusCallback> = new Set();

  private state: RealtimeDashboardState = {
    isConnected: false,
    connectionQuality: 'disconnected',
    lastUpdateTime: null,
    subscriptionCount: 0,
    updates: [],
    metrics: null
  };

  private connectionCheckInterval?: NodeJS.Timeout;
  private metricsUpdateInterval?: NodeJS.Timeout;
  private updateBuffer: DashboardUpdate[] = [];
  private bufferFlushTimeout?: NodeJS.Timeout;

  // Performance optimization settings
  private readonly BUFFER_FLUSH_INTERVAL = 500; // ms
  private readonly MAX_BUFFER_SIZE = 50;
  private readonly MAX_UPDATES_HISTORY = 100;
  private readonly METRICS_UPDATE_INTERVAL = 30000; // 30 seconds
  private readonly CONNECTION_CHECK_INTERVAL = 10000; // 10 seconds

  public static getInstance(): RealtimeDashboardService {
    if (!RealtimeDashboardService.instance) {
      RealtimeDashboardService.instance = new RealtimeDashboardService();
    }
    return RealtimeDashboardService.instance;
  }

  /**
   * Initialize real-time subscriptions
   */
  async initialize(): Promise<void> {
    try {
      await this.setupShiftSubscription();
      await this.setupParkingSubscription();
      await this.setupPaymentSubscription();
      await this.setupNotificationSubscription();

      this.startConnectionMonitoring();
      this.startMetricsUpdates();

      log.success('Real-time dashboard service initialized successfully');
    } catch (error) {
      log.error('Error initializing real-time dashboard service', error);
      throw error;
    }
  }

  /**
   * Set up shift sessions subscription
   */
  private async setupShiftSubscription(): Promise<void> {
    const channel = supabase
      .channel('shift-sessions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shift_sessions'
        },
        (payload: RealtimePostgresChangesPayload<ShiftSession>) => {
          this.handleShiftUpdate(payload);
        }
      )
      .subscribe((status) => {
        log.debug('Shift subscription status', { status });
        this.updateConnectionStatus();
      });

    this.channels.set('shifts', channel);
  }

  /**
   * Set up parking sessions subscription
   */
  private async setupParkingSubscription(): Promise<void> {
    const channel = supabase
      .channel('parking-sessions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parking_sessions'
        },
        (payload: RealtimePostgresChangesPayload<ParkingSession>) => {
          this.handleParkingUpdate(payload);
        }
      )
      .subscribe((status) => {
        log.debug('Parking subscription status', { status });
        this.updateConnectionStatus();
      });

    this.channels.set('parking', channel);
  }

  /**
   * Set up payments subscription
   */
  private async setupPaymentSubscription(): Promise<void> {
    const channel = supabase
      .channel('payments-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payments'
        },
        (payload: RealtimePostgresChangesPayload<Payment>) => {
          this.handlePaymentUpdate(payload);
        }
      )
      .subscribe((status) => {
        log.debug('Payment subscription status', { status });
        this.updateConnectionStatus();
      });

    this.channels.set('payments', channel);
  }

  /**
   * Set up custom notification subscription for database triggers
   */
  private async setupNotificationSubscription(): Promise<void> {
    const channel = supabase
      .channel('database-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shift_sessions',
          filter: 'status=eq.active'
        },
        () => {
          // Trigger metrics refresh when active shift changes
          this.refreshMetrics();
        }
      )
      .subscribe();

    this.channels.set('notifications', channel);

    // Listen for custom database notifications
    if (typeof window !== 'undefined') {
      supabase
        .channel('shift-stats-notifications')
        .on('broadcast', { event: 'shift_stats_updated' }, (payload) => {
          this.handleStatsNotification(payload.payload);
        })
        .subscribe();
    }
  }

  /**
   * Handle shift session updates
   */
  private handleShiftUpdate(payload: RealtimePostgresChangesPayload<ShiftSession>): void {
    const update: DashboardUpdate = {
      type: 'shift_status',
      timestamp: new Date().toISOString(),
      data: {
        eventType: payload.eventType,
        shift: payload.new || payload.old,
        changes: payload.new ? this.getChanges(payload.old, payload.new) : null
      },
      shift_id: (payload.new || payload.old)?.id
    };

    this.bufferUpdate(update);
  }

  /**
   * Handle parking session updates
   */
  private handleParkingUpdate(payload: RealtimePostgresChangesPayload<ParkingSession>): void {
    const isEntry = payload.eventType === 'INSERT';
    const isExit = payload.eventType === 'UPDATE' && payload.old?.exit_time === null && payload.new?.exit_time !== null;

    if (isEntry) {
      const update: DashboardUpdate = {
        type: 'vehicle_entry',
        timestamp: new Date().toISOString(),
        data: {
          session: payload.new,
          vehicle_type: payload.new?.vehicle_type,
          entry_time: payload.new?.entry_time
        },
        shift_id: payload.new?.shift_session_id || undefined
      };
      this.bufferUpdate(update);
    }

    if (isExit) {
      const durationMs = new Date(payload.new!.exit_time!).getTime() - new Date(payload.new!.entry_time).getTime();
      const durationMinutes = Math.round(durationMs / (1000 * 60));

      const update: DashboardUpdate = {
        type: 'vehicle_exit',
        timestamp: new Date().toISOString(),
        data: {
          session: payload.new,
          vehicle_type: payload.new?.vehicle_type,
          duration_minutes: durationMinutes,
          exit_time: payload.new?.exit_time
        },
        shift_id: payload.new?.shift_session_id || undefined
      };
      this.bufferUpdate(update);
    }
  }

  /**
   * Handle payment updates
   */
  private handlePaymentUpdate(payload: RealtimePostgresChangesPayload<Payment>): void {
    if (payload.eventType === 'INSERT' && payload.new) {
      const update: DashboardUpdate = {
        type: 'payment',
        timestamp: new Date().toISOString(),
        data: {
          payment: payload.new,
          amount: payload.new.amount,
          payment_mode: payload.new.payment_mode,
          payment_time: payload.new.payment_time
        },
        shift_id: payload.new.shift_session_id || undefined
      };
      this.bufferUpdate(update);
    }
  }

  /**
   * Handle database notification from triggers
   */
  private handleStatsNotification(payload: any): void {
    const update: DashboardUpdate = {
      type: 'shift_stats',
      timestamp: new Date().toISOString(),
      data: payload,
      shift_id: payload.shift_id
    };

    this.bufferUpdate(update);
  }

  /**
   * Buffer updates for performance optimization
   */
  private bufferUpdate(update: DashboardUpdate): void {
    this.updateBuffer.push(update);

    // Flush buffer if it's getting too large
    if (this.updateBuffer.length >= this.MAX_BUFFER_SIZE) {
      this.flushUpdateBuffer();
    }

    // Set timeout to flush buffer periodically
    if (this.bufferFlushTimeout) {
      clearTimeout(this.bufferFlushTimeout);
    }

    this.bufferFlushTimeout = setTimeout(() => {
      this.flushUpdateBuffer();
    }, this.BUFFER_FLUSH_INTERVAL);
  }

  /**
   * Flush buffered updates to callbacks
   */
  private flushUpdateBuffer(): void {
    if (this.updateBuffer.length === 0) return;

    const updates = [...this.updateBuffer];
    this.updateBuffer = [];

    // Update state
    this.state.updates = [...updates, ...this.state.updates].slice(0, this.MAX_UPDATES_HISTORY);
    this.state.lastUpdateTime = new Date().toISOString();

    // Notify callbacks
    updates.forEach(update => {
      this.eventCallbacks.forEach(callback => {
        try {
          callback(update);
        } catch (error) {
          log.error('Error in dashboard update callback', error);
        }
      });
    });

    // Clear timeout
    if (this.bufferFlushTimeout) {
      clearTimeout(this.bufferFlushTimeout);
      this.bufferFlushTimeout = undefined;
    }
  }

  /**
   * Start connection quality monitoring
   */
  private startConnectionMonitoring(): void {
    this.connectionCheckInterval = setInterval(() => {
      this.updateConnectionStatus();
    }, this.CONNECTION_CHECK_INTERVAL);

    // Initial status check
    this.updateConnectionStatus();
  }

  /**
   * Start periodic metrics updates
   */
  private startMetricsUpdates(): void {
    this.metricsUpdateInterval = setInterval(() => {
      this.refreshMetrics();
    }, this.METRICS_UPDATE_INTERVAL);

    // Initial metrics load
    this.refreshMetrics();
  }

  /**
   * Update connection status and quality
   */
  private updateConnectionStatus(): void {
    const connectedChannels = Array.from(this.channels.values()).filter(
      channel => channel.state === 'joined'
    ).length;

    const totalChannels = this.channels.size;
    const connectionRatio = totalChannels > 0 ? connectedChannels / totalChannels : 0;

    let quality: 'excellent' | 'good' | 'poor' | 'disconnected';
    let isConnected: boolean;

    if (connectionRatio >= 0.9) {
      quality = 'excellent';
      isConnected = true;
    } else if (connectionRatio >= 0.7) {
      quality = 'good';
      isConnected = true;
    } else if (connectionRatio >= 0.3) {
      quality = 'poor';
      isConnected = true;
    } else {
      quality = 'disconnected';
      isConnected = false;
    }

    const statusChanged = this.state.isConnected !== isConnected ||
                         this.state.connectionQuality !== quality;

    this.state.isConnected = isConnected;
    this.state.connectionQuality = quality;
    this.state.subscriptionCount = connectedChannels;

    if (statusChanged) {
      // Notify connection status callbacks
      this.connectionCallbacks.forEach(callback => {
        try {
          callback({ isConnected, quality });
        } catch (error) {
          log.error('Error in connection status callback', error);
        }
      });

      // Emit connection status update
      const connectionUpdate: DashboardUpdate = {
        type: 'connection_status',
        timestamp: new Date().toISOString(),
        data: { isConnected, quality, subscriptionCount: connectedChannels }
      };

      this.bufferUpdate(connectionUpdate);
    }
  }

  /**
   * Refresh dashboard metrics
   */
  private async refreshMetrics(): Promise<void> {
    try {
      const [shiftsData, parkingData, paymentsData] = await Promise.all([
        supabase.from('shift_sessions').select('*').eq('status', 'active'),
        supabase.from('parking_sessions').select('*').is('exit_time', null),
        supabase.from('payments').select('amount, payment_mode').gte('payment_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      ]);

      const metrics: DashboardMetrics = {
        activeShifts: shiftsData.data?.length || 0,
        currentlyParked: parkingData.data?.length || 0,
        totalRevenue: paymentsData.data?.reduce((sum, p) => sum + p.amount, 0) || 0,
        vehiclesEntered: 0, // Will be calculated from active shift data
        vehiclesExited: 0, // Will be calculated from active shift data
        averageStayDuration: 0,
        peakHours: [],
        paymentModeBreakdown: {}
      };

      // Calculate payment mode breakdown
      if (paymentsData.data) {
        metrics.paymentModeBreakdown = paymentsData.data.reduce((breakdown, payment) => {
          breakdown[payment.payment_mode] = (breakdown[payment.payment_mode] || 0) + payment.amount;
          return breakdown;
        }, {} as Record<string, number>);
      }

      this.state.metrics = metrics;

      // Notify metrics callbacks
      this.metricsCallbacks.forEach(callback => {
        try {
          callback(metrics);
        } catch (error) {
          log.error('Error in metrics callback', error);
        }
      });

    } catch (error) {
      log.error('Error refreshing dashboard metrics', error);
    }
  }

  /**
   * Get differences between old and new records
   */
  private getChanges(oldRecord: any, newRecord: any): Record<string, { from: any; to: any }> | null {
    if (!oldRecord || !newRecord) return null;

    const changes: Record<string, { from: any; to: any }> = {};

    Object.keys(newRecord).forEach(key => {
      if (oldRecord[key] !== newRecord[key]) {
        changes[key] = {
          from: oldRecord[key],
          to: newRecord[key]
        };
      }
    });

    return Object.keys(changes).length > 0 ? changes : null;
  }

  /**
   * Subscribe to dashboard updates
   */
  onDashboardUpdate(callback: DashboardEventCallback): () => void {
    this.eventCallbacks.add(callback);

    return () => {
      this.eventCallbacks.delete(callback);
    };
  }

  /**
   * Subscribe to metrics updates
   */
  onMetricsUpdate(callback: MetricsUpdateCallback): () => void {
    this.metricsCallbacks.add(callback);

    // Call immediately with current metrics if available
    if (this.state.metrics) {
      callback(this.state.metrics);
    }

    return () => {
      this.metricsCallbacks.delete(callback);
    };
  }

  /**
   * Subscribe to connection status updates
   */
  onConnectionStatusUpdate(callback: ConnectionStatusCallback): () => void {
    this.connectionCallbacks.add(callback);

    // Call immediately with current status
    callback({
      isConnected: this.state.isConnected,
      quality: this.state.connectionQuality
    });

    return () => {
      this.connectionCallbacks.delete(callback);
    };
  }

  /**
   * Get current state
   */
  getState(): RealtimeDashboardState {
    return { ...this.state };
  }

  /**
   * Manually refresh metrics
   */
  async forceRefreshMetrics(): Promise<void> {
    await this.refreshMetrics();
  }

  /**
   * Reconnect all subscriptions
   */
  async reconnect(): Promise<void> {
    // Unsubscribe all channels
    for (const channel of this.channels.values()) {
      await supabase.removeChannel(channel);
    }
    this.channels.clear();

    // Reinitialize
    await this.initialize();
  }

  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    // Clear intervals
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval);
    }
    if (this.bufferFlushTimeout) {
      clearTimeout(this.bufferFlushTimeout);
    }

    // Flush any pending updates
    this.flushUpdateBuffer();

    // Unsubscribe all channels
    for (const channel of this.channels.values()) {
      await supabase.removeChannel(channel);
    }

    // Clear collections
    this.channels.clear();
    this.eventCallbacks.clear();
    this.metricsCallbacks.clear();
    this.connectionCallbacks.clear();

    log.info('Real-time dashboard service destroyed');
  }
}

// Export singleton instance
export const realtimeDashboardService = RealtimeDashboardService.getInstance();