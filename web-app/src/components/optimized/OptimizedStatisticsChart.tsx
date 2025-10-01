/**
 * Optimized Statistics Chart - Performance-Enhanced with React.memo and Chart Optimization
 * Features: Memoization, optimized chart rendering, dynamic chart type switching
 */

import React, { useMemo, useCallback, memo } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { Card, CardHeader, CardContent } from '../ui'
import { useRenderPerformance } from '../../hooks/usePerformance'
import { formatCurrency } from '../../utils/helpers'

interface ChartData {
  name: string
  value: number
  [key: string]: string | number
}

interface OptimizedStatisticsChartProps {
  data: ChartData[]
  title: string
  type: 'line' | 'area' | 'bar' | 'pie'
  dataKey?: string
  color?: string
  height?: number
  loading?: boolean
  showLegend?: boolean
  formatter?: (value: number) => string
  animationDuration?: number
  enableInteraction?: boolean
}

const COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16'  // Lime
] as const

// Memoized custom tooltip component
const MemoizedCustomTooltip = memo<{
  active?: boolean
  payload?: any[]
  label?: string
  formatter?: (value: number) => string
}>(({ active, payload, label, formatter }) => {
  useRenderPerformance('CustomTooltip')
  
  const tooltipContent = useMemo(() => {
    if (!active || !payload || !payload.length) return null

    return (
      <div className="bg-white p-3 border border-border-light rounded-lg shadow-lg">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm text-text-secondary">
            <span 
              className="inline-block w-3 h-3 rounded-full mr-2" 
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}: {formatter ? formatter(entry.value) : entry.value}
          </p>
        ))}
      </div>
    )
  }, [active, payload, label, formatter])

  return tooltipContent
})
MemoizedCustomTooltip.displayName = 'MemoizedCustomTooltip'

// Memoized loading skeleton
const MemoizedLoadingSkeleton = memo<{ height: number }>(({ height }) => {
  useRenderPerformance('LoadingSkeleton')
  
  return (
    <div className="animate-pulse" style={{ height }}>
      <div className="w-full h-full bg-surface-muted rounded"></div>
    </div>
  )
})
MemoizedLoadingSkeleton.displayName = 'MemoizedLoadingSkeleton'

// Memoized empty state
const MemoizedEmptyState = memo<{ height: number }>(({ height }) => {
  useRenderPerformance('EmptyState')
  
  return (
    <div className="flex items-center justify-center" style={{ height }}>
      <div className="text-center">
        <div className="w-16 h-16 bg-surface-muted rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-text-muted">No data to display</p>
      </div>
    </div>
  )
})
MemoizedEmptyState.displayName = 'MemoizedEmptyState'

// Memoized line chart component
const MemoizedLineChart = memo<{
  data: ChartData[]
  dataKey: string
  color: string
  formatter?: (value: number) => string
  showLegend: boolean
  animationDuration: number
  enableInteraction: boolean
}>(({ data, dataKey, color, formatter, showLegend, animationDuration, enableInteraction }) => {
  useRenderPerformance('LineChart')
  
  const commonProps = useMemo(() => ({
    data,
    margin: { top: 5, right: 30, left: 20, bottom: 5 }
  }), [data])

  return (
    <LineChart {...commonProps}>
      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
      <XAxis 
        dataKey="name" 
        tick={{ fontSize: 12 }}
        className="text-text-muted"
      />
      <YAxis 
        tick={{ fontSize: 12 }}
        className="text-text-muted"
      />
      {enableInteraction && (
        <Tooltip content={<MemoizedCustomTooltip formatter={formatter} />} />
      )}
      {showLegend && <Legend />}
      <Line
        type="monotone"
        dataKey={dataKey}
        stroke={color}
        strokeWidth={2}
        dot={{ fill: color, strokeWidth: 2, r: 4 }}
        activeDot={{ r: 6 }}
        animationDuration={animationDuration}
        isAnimationActive={enableInteraction}
      />
    </LineChart>
  )
})
MemoizedLineChart.displayName = 'MemoizedLineChart'

// Memoized area chart component
const MemoizedAreaChart = memo<{
  data: ChartData[]
  dataKey: string
  color: string
  formatter?: (value: number) => string
  showLegend: boolean
  animationDuration: number
  enableInteraction: boolean
}>(({ data, dataKey, color, formatter, showLegend, animationDuration, enableInteraction }) => {
  useRenderPerformance('AreaChart')
  
  const commonProps = useMemo(() => ({
    data,
    margin: { top: 5, right: 30, left: 20, bottom: 5 }
  }), [data])

  const fillColor = useMemo(() => `${color}20`, [color])

  return (
    <AreaChart {...commonProps}>
      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
      <XAxis 
        dataKey="name" 
        tick={{ fontSize: 12 }}
        className="text-text-muted"
      />
      <YAxis 
        tick={{ fontSize: 12 }}
        className="text-text-muted"
      />
      {enableInteraction && (
        <Tooltip content={<MemoizedCustomTooltip formatter={formatter} />} />
      )}
      {showLegend && <Legend />}
      <Area
        type="monotone"
        dataKey={dataKey}
        stroke={color}
        fill={fillColor}
        strokeWidth={2}
        animationDuration={animationDuration}
        isAnimationActive={enableInteraction}
      />
    </AreaChart>
  )
})
MemoizedAreaChart.displayName = 'MemoizedAreaChart'

// Memoized bar chart component
const MemoizedBarChart = memo<{
  data: ChartData[]
  dataKey: string
  color: string
  formatter?: (value: number) => string
  showLegend: boolean
  animationDuration: number
  enableInteraction: boolean
}>(({ data, dataKey, color, formatter, showLegend, animationDuration, enableInteraction }) => {
  useRenderPerformance('BarChart')
  
  const commonProps = useMemo(() => ({
    data,
    margin: { top: 5, right: 30, left: 20, bottom: 5 }
  }), [data])

  return (
    <BarChart {...commonProps}>
      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
      <XAxis 
        dataKey="name" 
        tick={{ fontSize: 12 }}
        className="text-text-muted"
      />
      <YAxis 
        tick={{ fontSize: 12 }}
        className="text-text-muted"
      />
      {enableInteraction && (
        <Tooltip content={<MemoizedCustomTooltip formatter={formatter} />} />
      )}
      {showLegend && <Legend />}
      <Bar 
        dataKey={dataKey} 
        fill={color} 
        radius={[4, 4, 0, 0]} 
        animationDuration={animationDuration}
        isAnimationActive={enableInteraction}
      />
    </BarChart>
  )
})
MemoizedBarChart.displayName = 'MemoizedBarChart'

// Memoized pie chart component
const MemoizedPieChart = memo<{
  data: ChartData[]
  dataKey: string
  formatter?: (value: number) => string
  showLegend: boolean
  animationDuration: number
  enableInteraction: boolean
}>(({ data, dataKey, formatter, showLegend, animationDuration, enableInteraction }) => {
  useRenderPerformance('PieChart')
  
  const pieData = useMemo(() => data, [data])

  const labelFormatter = useCallback(({ name, percent }: { name: string; percent: number }) => 
    `${name} ${(percent * 100).toFixed(0)}%`, 
    []
  )

  return (
    <PieChart>
      <Pie
        data={pieData}
        cx="50%"
        cy="50%"
        labelLine={false}
        label={labelFormatter}
        outerRadius={80}
        fill="#8884d8"
        dataKey={dataKey}
        animationDuration={animationDuration}
        isAnimationActive={enableInteraction}
      >
        {pieData.map((_, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      {enableInteraction && (
        <Tooltip content={<MemoizedCustomTooltip formatter={formatter} />} />
      )}
      {showLegend && <Legend />}
    </PieChart>
  )
})
MemoizedPieChart.displayName = 'MemoizedPieChart'

export const OptimizedStatisticsChart: React.FC<OptimizedStatisticsChartProps> = memo(({
  data,
  title,
  type,
  dataKey = 'value',
  color = '#3B82F6',
  height = 300,
  loading = false,
  showLegend = false,
  formatter,
  animationDuration = 750,
  enableInteraction = true
}) => {
  useRenderPerformance('OptimizedStatisticsChart')
  
  // Memoized chart renderer
  const chartRenderer = useMemo(() => {
    const chartProps = {
      data,
      dataKey,
      color,
      formatter,
      showLegend,
      animationDuration,
      enableInteraction
    }

    switch (type) {
      case 'line':
        return <MemoizedLineChart {...chartProps} />
      case 'area':
        return <MemoizedAreaChart {...chartProps} />
      case 'bar':
        return <MemoizedBarChart {...chartProps} />
      case 'pie':
        return <MemoizedPieChart {...chartProps} />
      default:
        return null
    }
  }, [type, data, dataKey, color, formatter, showLegend, animationDuration, enableInteraction])

  // Memoized data statistics for performance info
  const dataStats = useMemo(() => ({
    dataPoints: data.length,
    hasData: data.length > 0,
    maxValue: data.length > 0 ? Math.max(...data.map(d => d.value)) : 0
  }), [data])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        </CardHeader>
        <CardContent>
          <MemoizedLoadingSkeleton height={height} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          <div className="flex items-center space-x-2">
            {dataStats.hasData && (
              <span className="text-xs text-text-muted bg-surface-light px-2 py-1 rounded">
                {dataStats.dataPoints} points
              </span>
            )}
            {!dataStats.hasData && (
              <span className="text-sm text-text-muted">No data available</span>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {!dataStats.hasData ? (
          <MemoizedEmptyState height={height} />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={height}>
              {chartRenderer}
            </ResponsiveContainer>
            
            {/* Performance and data info */}
            <div className="mt-4 pt-3 border-t border-border-light">
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>Chart Type: {type.charAt(0).toUpperCase() + type.slice(1)}</span>
                <span>
                  Optimized rendering • Max value: {formatter ? formatter(dataStats.maxValue) : dataStats.maxValue}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
})
OptimizedStatisticsChart.displayName = 'OptimizedStatisticsChart'