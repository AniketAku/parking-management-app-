// =============================================================================
// INTEGRATION MANAGER
// Orchestrates all real-time services for seamless integration and performance
// =============================================================================

import { realtimeDashboardService } from './RealtimeDashboardService';
import { shiftLinkingService } from './ShiftLinkingService';
import { performanceOptimizationService } from './PerformanceOptimizationService';
import { errorHandlingService } from './ErrorHandlingService';
import { log } from '../utils/secureLogger';

export interface IntegrationStatus {
  services: {
    realtimeDashboard: 'initializing' | 'ready' | 'error' | 'disconnected';
    shiftLinking: 'ready' | 'error';
    performanceOptimization: 'ready' | 'error';
    errorHandling: 'ready' | 'error';
  };
  overallHealth: 'healthy' | 'degraded' | 'critical';
  lastHealthCheck: number;
  metrics: {
    connectionQuality: string;
    cacheHitRate: number;
    errorRate: number;
    responseTime: number;
  };
}

export class IntegrationManager {
  private static instance: IntegrationManager;
  private initializationPromise?: Promise<void>;
  private status: IntegrationStatus = {
    services: {
      realtimeDashboard: 'initializing',
      shiftLinking: 'ready',
      performanceOptimization: 'ready',
      errorHandling: 'ready'
    },
    overallHealth: 'healthy',
    lastHealthCheck: Date.now(),
    metrics: {
      connectionQuality: 'disconnected',
      cacheHitRate: 0,
      errorRate: 0,
      responseTime: 0
    }
  };

  private healthCheckInterval?: NodeJS.Timeout;

  public static getInstance(): IntegrationManager {
    if (!IntegrationManager.instance) {
      IntegrationManager.instance = new IntegrationManager();
    }
    return IntegrationManager.instance;
  }

  /**
   * Initialize all services with coordinated startup
   */
  async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      log.info('Initializing Real-Time Integration Manager...');

      // Initialize services in order of dependency
      await this.initializeErrorHandling();
      await this.initializePerformanceOptimization();
      await this.initializeShiftLinking();
      await this.initializeRealtimeDashboard();

      // Set up service coordination
      this.setupServiceCoordination();

      // Start health monitoring
      this.startHealthMonitoring();

      log.success('Real-Time Integration Manager initialized successfully');
    } catch (error) {
      log.error('Failed to initialize Integration Manager', error);
      await errorHandlingService.reportError(error as Error, {
        operation: 'integration_manager_init'
      }, 'critical');
      throw error;
    }
  }

  private async initializeErrorHandling(): Promise<void> {
    try {
      // Error handling service is initialized on instantiation
      this.status.services.errorHandling = 'ready';
      log.success('Error Handling Service ready');
    } catch (error) {
      this.status.services.errorHandling = 'error';
      throw error;
    }
  }

  private async initializePerformanceOptimization(): Promise<void> {
    try {
      // Performance optimization service is initialized on instantiation
      this.status.services.performanceOptimization = 'ready';
      log.success('Performance Optimization Service ready');
    } catch (error) {
      this.status.services.performanceOptimization = 'error';
      throw error;
    }
  }

  private async initializeShiftLinking(): Promise<void> {
    try {
      // Shift linking service is ready on instantiation
      this.status.services.shiftLinking = 'ready';
      log.success('Shift Linking Service ready');
    } catch (error) {
      this.status.services.shiftLinking = 'error';
      throw error;
    }
  }

  private async initializeRealtimeDashboard(): Promise<void> {
    try {
      await realtimeDashboardService.initialize();
      this.status.services.realtimeDashboard = 'ready';
      log.success('Real-Time Dashboard Service ready');
    } catch (error) {
      this.status.services.realtimeDashboard = 'error';
      throw error;
    }
  }

  private setupServiceCoordination(): void {
    // Set up real-time dashboard to use performance optimization for caching
    realtimeDashboardService.onDashboardUpdate((update) => {
      // Cache frequently accessed updates
      const cacheKey = `dashboard_update_${update.type}_${update.shift_id}`;
      performanceOptimizationService.set(cacheKey, update, 30000); // 30 second TTL
    });

    // Set up shift linking to report errors through error handling service
    realtimeDashboardService.onConnectionStatusUpdate((status) => {
      if (!status.isConnected) {
        errorHandlingService.reportError('Real-time connection lost', {
          operation: 'realtime_dashboard_connection',
          metadata: { quality: status.quality }
        }, 'high');
      }
    });

    // Integrate performance monitoring with error handling
    const originalReportError = errorHandlingService.reportError.bind(errorHandlingService);
    (errorHandlingService as any).reportError = async (error: any, context: any, severity: any) => {
      // Use performance service for batching error reports
      await performanceOptimizationService.batchOperation({
        type: 'INSERT',
        table: 'error_logs',
        data: { error, context, severity },
        priority: severity === 'critical' ? 'critical' : 'normal',
        maxRetries: 3
      });

      return originalReportError(error, context, severity);
    };
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Every 30 seconds

    // Initial health check
    this.performHealthCheck();
  }

  private performHealthCheck(): void {
    try {
      // Check real-time dashboard connection
      const dashboardState = realtimeDashboardService.getState();
      this.status.services.realtimeDashboard = dashboardState.isConnected ? 'ready' : 'disconnected';

      // Get performance metrics
      const perfMetrics = performanceOptimizationService.getMetrics();
      const errorStats = errorHandlingService.getErrorStatistics();

      // Update status metrics
      this.status.metrics = {
        connectionQuality: dashboardState.connectionQuality,
        cacheHitRate: perfMetrics.cacheHitRate,
        errorRate: perfMetrics.errorRate,
        responseTime: perfMetrics.averageResponseTime
      };

      // Determine overall health
      let healthyServices = 0;
      let totalServices = 0;

      Object.values(this.status.services).forEach(serviceStatus => {
        totalServices++;
        if (serviceStatus === 'ready') {
          healthyServices++;
        }
      });

      const healthRatio = healthyServices / totalServices;

      if (healthRatio >= 0.8 && perfMetrics.errorRate < 0.05) {
        this.status.overallHealth = 'healthy';
      } else if (healthRatio >= 0.6 && perfMetrics.errorRate < 0.15) {
        this.status.overallHealth = 'degraded';
      } else {
        this.status.overallHealth = 'critical';
      }

      this.status.lastHealthCheck = Date.now();

      // Log health status changes
      if (this.status.overallHealth !== 'healthy') {
        log.warn('Integration Manager health', { health: this.status.overallHealth, status: this.status });
      }

    } catch (error) {
      log.error('Health check failed', error);
      this.status.overallHealth = 'critical';
    }
  }

  /**
   * Get current integration status
   */
  getStatus(): IntegrationStatus {
    return { ...this.status };
  }

  /**
   * Force reconnection of all services
   */
  async reconnectAll(): Promise<void> {
    try {
      log.info('Reconnecting all services...');

      // Clear caches
      await performanceOptimizationService.clearCache();
      shiftLinkingService.clearShiftCache();

      // Reconnect real-time dashboard
      await realtimeDashboardService.reconnect();

      // Update status
      this.status.services.realtimeDashboard = 'ready';
      this.status.overallHealth = 'healthy';

      log.success('All services reconnected successfully');
    } catch (error) {
      log.error('Failed to reconnect services', error);
      await errorHandlingService.reportError(error as Error, {
        operation: 'integration_manager_reconnect'
      }, 'high');
      throw error;
    }
  }

  /**
   * Graceful shutdown of all services
   */
  async shutdown(): Promise<void> {
    try {
      log.info('Shutting down Integration Manager...');

      // Stop health monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      // Shutdown services in reverse order
      await realtimeDashboardService.destroy();
      performanceOptimizationService.destroy();
      errorHandlingService.destroy();

      log.success('Integration Manager shutdown completed');
    } catch (error) {
      log.error('Error during shutdown', error);
    }
  }

  /**
   * Get comprehensive system metrics
   */
  async getSystemMetrics(): Promise<{
    integration: IntegrationStatus;
    performance: any;
    errors: any;
    realtime: any;
  }> {
    return {
      integration: this.getStatus(),
      performance: performanceOptimizationService.getMetrics(),
      errors: errorHandlingService.getErrorStatistics(),
      realtime: realtimeDashboardService.getState()
    };
  }

  /**
   * Execute operation with full integration support
   */
  async executeIntegratedOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    options: {
      useCache?: boolean;
      cacheKey?: string;
      cacheTTL?: number;
      priority?: 'low' | 'normal' | 'high' | 'critical';
      timeout?: number;
      retries?: number;
    } = {}
  ): Promise<T> {
    const {
      useCache = true,
      cacheKey,
      cacheTTL = 300000,
      priority = 'normal',
      timeout = 30000,
      retries = 3
    } = options;

    // Use error handling with retry logic
    return errorHandlingService.executeWithErrorHandling(
      async () => {
        // Use performance optimization for caching and batching
        return performanceOptimizationService.optimizedQuery(
          operation,
          cacheKey,
          {
            ttl: cacheTTL,
            priority,
            useCache
          }
        );
      },
      operationName,
      {
        timeout,
        retryPolicy: { maxAttempts: retries },
        context: { operation: operationName }
      }
    );
  }
}

// Export singleton instance
export const integrationManager = IntegrationManager.getInstance();

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  integrationManager.initialize().catch(error => {
    log.error('Failed to auto-initialize Integration Manager', error);
  });
}