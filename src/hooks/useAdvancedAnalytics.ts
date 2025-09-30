import { useState, useEffect, useCallback, useMemo } from 'react'
import { analyticsService, type AdvancedKPIs, type PredictiveInsights, type BusinessIntelligence } from '../services/analyticsService'
import { useRealTimeUpdates } from './useRealTimeUpdates'

export interface UseAdvancedAnalyticsOptions {
  refreshInterval?: number
  enableRealTimeUpdates?: boolean
  cacheResults?: boolean
  autoRefresh?: boolean
}

export interface AdvancedAnalyticsState {
  kpis: AdvancedKPIs | null
  predictions: PredictiveInsights | null
  businessIntelligence: BusinessIntelligence | null
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
}

export interface AdvancedAnalyticsActions {
  refreshKPIs: () => Promise<void>
  refreshPredictions: () => Promise<void>
  refreshBusinessIntelligence: () => Promise<void>
  refreshAll: () => Promise<void>
  clearCache: () => void
  setTimeframe: (timeframe: 'hour' | 'day' | 'week' | 'month') => void
  setAnalysisType: (type: 'operational' | 'strategic' | 'executive') => void
}

export const useAdvancedAnalytics = (options: UseAdvancedAnalyticsOptions = {}) => {
  const {
    refreshInterval = 60000, // 1 minute default
    enableRealTimeUpdates = true,
    cacheResults = true,
    autoRefresh = true
  } = options

  const [state, setState] = useState<AdvancedAnalyticsState>({
    kpis: null,
    predictions: null,
    businessIntelligence: null,
    isLoading: false,
    error: null,
    lastUpdated: null
  })

  const [timeframe, setTimeframe] = useState<'hour' | 'day' | 'week' | 'month'>('day')
  const [analysisType, setAnalysisType] = useState<'operational' | 'strategic' | 'executive'>('operational')

  const { isConnected, lastMessage } = useRealTimeUpdates()

  // Memoized analytics service calls
  const refreshKPIs = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const kpis = await analyticsService.getAdvancedKPIs(timeframe)
      setState(prev => ({ 
        ...prev, 
        kpis, 
        isLoading: false, 
        lastUpdated: new Date() 
      }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to fetch KPIs',
        isLoading: false 
      }))
    }
  }, [timeframe])

  const refreshPredictions = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const predictions = await analyticsService.getPredictiveInsights(timeframe)
      setState(prev => ({ 
        ...prev, 
        predictions, 
        isLoading: false, 
        lastUpdated: new Date() 
      }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to fetch predictions',
        isLoading: false 
      }))
    }
  }, [timeframe])

  const refreshBusinessIntelligence = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const businessIntelligence = await analyticsService.getBusinessIntelligence(analysisType)
      setState(prev => ({ 
        ...prev, 
        businessIntelligence, 
        isLoading: false, 
        lastUpdated: new Date() 
      }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to fetch business intelligence',
        isLoading: false 
      }))
    }
  }, [analysisType])

  const refreshAll = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const [kpis, predictions, businessIntelligence] = await Promise.all([
        analyticsService.getAdvancedKPIs(timeframe),
        analyticsService.getPredictiveInsights(timeframe),
        analyticsService.getBusinessIntelligence(analysisType)
      ])

      setState(prev => ({ 
        ...prev, 
        kpis, 
        predictions, 
        businessIntelligence,
        isLoading: false, 
        lastUpdated: new Date() 
      }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to refresh analytics',
        isLoading: false 
      }))
    }
  }, [timeframe, analysisType])

  const clearCache = useCallback(() => {
    analyticsService.clearCache()
  }, [])

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      refreshAll()
      
      const interval = setInterval(refreshAll, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [refreshAll, refreshInterval, autoRefresh])

  // Real-time updates effect
  useEffect(() => {
    if (enableRealTimeUpdates && isConnected && lastMessage) {
      // Only refresh KPIs on real-time updates for performance
      refreshKPIs()
    }
  }, [lastMessage, enableRealTimeUpdates, isConnected, refreshKPIs])

  // Computed metrics for dashboard
  const computedMetrics = useMemo(() => {
    if (!state.kpis) return null

    return {
      // Performance Score (0-100)
      performanceScore: Math.round(
        (state.kpis.occupancy.rate * 0.3 +
         state.kpis.efficiency.utilizationRate * 100 * 0.3 +
         state.kpis.customer.satisfactionScore * 100 * 0.2 +
         (state.kpis.revenue.collectionRate * 100) * 0.2)
      ),

      // Growth Indicators
      revenueGrowth: state.kpis.revenue.today > state.kpis.revenue.projectedDaily ? 'positive' : 'negative',
      
      // Efficiency Rating
      efficiencyRating: state.kpis.efficiency.utilizationRate > 0.8 ? 'excellent' :
                       state.kpis.efficiency.utilizationRate > 0.6 ? 'good' :
                       state.kpis.efficiency.utilizationRate > 0.4 ? 'fair' : 'poor',
      
      // Risk Level
      riskLevel: (state.predictions?.risks.reduce((max, risk) => 
        Math.max(max, risk.riskScore), 0) || 0) > 0.7 ? 'high' :
                 (state.predictions?.risks.reduce((max, risk) => 
        Math.max(max, risk.riskScore), 0) || 0) > 0.4 ? 'medium' : 'low'
    }
  }, [state.kpis, state.predictions])

  // Analytics insights
  const insights = useMemo(() => {
    const insights: Array<{
      type: 'opportunity' | 'warning' | 'success' | 'info'
      title: string
      description: string
      priority: number
      actionable: boolean
    }> = []

    if (state.kpis) {
      // Revenue opportunities
      if (state.kpis.occupancy.rate > 80 && state.kpis.revenue.collectionRate > 0.9) {
        insights.push({
          type: 'opportunity',
          title: 'High Demand Period',
          description: 'Consider implementing dynamic pricing to maximize revenue during peak occupancy',
          priority: 8,
          actionable: true
        })
      }

      // Efficiency warnings
      if (state.kpis.efficiency.turnoverRate < 1.5) {
        insights.push({
          type: 'warning',
          title: 'Low Turnover Rate',
          description: 'Average parking duration is high. Consider time limits or graduated pricing',
          priority: 6,
          actionable: true
        })
      }

      // Customer satisfaction
      if (state.kpis.customer.satisfactionScore > 0.9) {
        insights.push({
          type: 'success',
          title: 'Excellent Customer Satisfaction',
          description: `Customer satisfaction at ${(state.kpis.customer.satisfactionScore * 100).toFixed(1)}%`,
          priority: 4,
          actionable: false
        })
      }
    }

    // Predictive insights
    if (state.predictions) {
      state.predictions.anomalies.forEach(anomaly => {
        if (anomaly.severity === 'high' || anomaly.severity === 'critical') {
          insights.push({
            type: 'warning',
            title: `${anomaly.type} Anomaly Detected`,
            description: anomaly.description,
            priority: anomaly.severity === 'critical' ? 10 : 7,
            actionable: true
          })
        }
      })
    }

    return insights.sort((a, b) => b.priority - a.priority).slice(0, 5)
  }, [state.kpis, state.predictions])

  const actions: AdvancedAnalyticsActions = {
    refreshKPIs,
    refreshPredictions,
    refreshBusinessIntelligence,
    refreshAll,
    clearCache,
    setTimeframe,
    setAnalysisType
  }

  return {
    ...state,
    ...actions,
    timeframe,
    analysisType,
    computedMetrics,
    insights,
    isConnected
  }
}

// Specialized hooks for specific analytics needs
export const useOccupancyAnalytics = () => {
  const { kpis, refreshKPIs, isLoading } = useAdvancedAnalytics({
    refreshInterval: 30000, // 30 seconds for occupancy
    autoRefresh: true
  })

  return {
    occupancy: kpis?.occupancy || null,
    efficiency: kpis?.efficiency || null,
    refresh: refreshKPIs,
    isLoading
  }
}

export const useRevenueAnalytics = () => {
  const { kpis, predictions, refreshAll, isLoading } = useAdvancedAnalytics({
    refreshInterval: 120000, // 2 minutes for revenue
    autoRefresh: true
  })

  return {
    revenue: kpis?.revenue || null,
    optimization: predictions?.revenueOptimization || null,
    refresh: refreshAll,
    isLoading
  }
}

export const usePredictiveAnalytics = () => {
  const { predictions, refreshPredictions, isLoading } = useAdvancedAnalytics({
    refreshInterval: 300000, // 5 minutes for predictions
    autoRefresh: true
  })

  return {
    predictions,
    anomalies: predictions?.anomalies || [],
    forecast: predictions?.demandForecast || null,
    risks: predictions?.risks || [],
    refresh: refreshPredictions,
    isLoading
  }
}

export default useAdvancedAnalytics