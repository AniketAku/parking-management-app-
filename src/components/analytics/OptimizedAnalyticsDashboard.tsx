import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/Button'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts'
import {
  TrendingUp, TrendingDown, AlertTriangle, Car, DollarSign, Clock, Users,
  Activity, RefreshCw, Download
} from 'lucide-react'
import type { ParkingEntry } from '../../types'

interface AnalyticsProps {
  entries: ParkingEntry[]
  loading?: boolean
  error?: string | null
}

interface DashboardMetrics {
  totalEntries: number
  activeVehicles: number
  totalRevenue: number
  avgStayDuration: number
  occupancyRate: number
  topVehicleType: string
  revenueGrowth: number
  utilizationTrend: 'up' | 'down' | 'stable'
}

const CHART_COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444']

export const OptimizedAnalyticsDashboard: React.FC<AnalyticsProps> = ({
  entries = [],
  loading = false,
  error = null
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'today' | 'week' | 'month'>('today')
  const [refreshing, setRefreshing] = useState(false)

  // Memoized calculations for performance
  const metrics = useMemo((): DashboardMetrics => {
    if (!entries.length) {
      return {
        totalEntries: 0,
        activeVehicles: 0,
        totalRevenue: 0,
        avgStayDuration: 0,
        occupancyRate: 0,
        topVehicleType: 'N/A',
        revenueGrowth: 0,
        utilizationTrend: 'stable'
      }
    }

    const now = new Date()
    const timeFilter = getTimeFilter(selectedTimeframe, now)
    const filteredEntries = entries.filter(entry =>
      new Date(entry.entryTime) >= timeFilter
    )

    const activeVehicles = filteredEntries.filter(entry => !entry.exitTime).length
    const totalRevenue = filteredEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0)

    // Calculate average stay duration (in hours)
    const completedEntries = filteredEntries.filter(entry => entry.exitTime)
    const avgStayDuration = completedEntries.length > 0
      ? completedEntries.reduce((sum, entry) => {
          const entryTime = new Date(entry.entryTime)
          const exitTime = new Date(entry.exitTime!)
          return sum + (exitTime.getTime() - entryTime.getTime()) / (1000 * 60 * 60)
        }, 0) / completedEntries.length
      : 0

    // Vehicle type distribution
    const vehicleTypes = filteredEntries.reduce((acc, entry) => {
      acc[entry.vehicleType] = (acc[entry.vehicleType] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topVehicleType = Object.entries(vehicleTypes)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'

    return {
      totalEntries: filteredEntries.length,
      activeVehicles,
      totalRevenue,
      avgStayDuration,
      occupancyRate: (activeVehicles / Math.max(filteredEntries.length, 1)) * 100,
      topVehicleType,
      revenueGrowth: calculateGrowth(entries, selectedTimeframe),
      utilizationTrend: calculateTrend(entries, selectedTimeframe)
    }
  }, [entries, selectedTimeframe])

  // Chart data preparation
  const chartData = useMemo(() => {
    const now = new Date()
    const timeFilter = getTimeFilter(selectedTimeframe, now)
    const filteredEntries = entries.filter(entry =>
      new Date(entry.entryTime) >= timeFilter
    )

    // Revenue over time
    const revenueData = prepareRevenueChartData(filteredEntries, selectedTimeframe)

    // Vehicle type distribution
    const vehicleTypeData = prepareVehicleTypeData(filteredEntries)

    // Hourly activity
    const hourlyData = prepareHourlyData(filteredEntries)

    return { revenueData, vehicleTypeData, hourlyData }
  }, [entries, selectedTimeframe])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    setRefreshing(false)
  }, [])

  const handleExport = useCallback(() => {
    // Export analytics data as CSV
    const csvData = entries.map(entry => ({
      'Entry Time': entry.entryTime,
      'Exit Time': entry.exitTime || 'N/A',
      'Vehicle Number': entry.vehicleNumber,
      'Vehicle Type': entry.vehicleType,
      'Amount': entry.amount || 0,
      'Status': entry.status
    }))

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `parking-analytics-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [entries])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-text-muted ml-4">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Analytics Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-2">
          <h2 className="text-xl font-semibold">Analytics Dashboard</h2>
          <Badge variant="outline" className="text-xs">
            {entries.length} total entries
          </Badge>
        </div>

        <div className="flex items-center space-x-2">
          {/* Timeframe Selector */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            {(['today', 'week', 'month'] as const).map((timeframe) => (
              <button
                key={timeframe}
                onClick={() => setSelectedTimeframe(timeframe)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  selectedTimeframe === timeframe
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-1"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex items-center space-x-1"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Entries"
          value={metrics.totalEntries.toString()}
          subtitle="parking sessions"
          icon={Car}
          trend={metrics.totalEntries > 0 ? 'up' : 'stable'}
          color="blue"
        />
        <MetricCard
          title="Active Vehicles"
          value={metrics.activeVehicles.toString()}
          subtitle="currently parked"
          icon={Activity}
          trend={metrics.activeVehicles > 0 ? 'up' : 'stable'}
          color="green"
        />
        <MetricCard
          title="Total Revenue"
          value={`₹${metrics.totalRevenue.toLocaleString('en-IN')}`}
          subtitle={`${metrics.revenueGrowth >= 0 ? '+' : ''}${metrics.revenueGrowth.toFixed(1)}% growth`}
          icon={DollarSign}
          trend={metrics.revenueGrowth >= 0 ? 'up' : 'down'}
          color="purple"
        />
        <MetricCard
          title="Avg Stay Duration"
          value={`${metrics.avgStayDuration.toFixed(1)}h`}
          subtitle={`${metrics.occupancyRate.toFixed(1)}% occupancy`}
          icon={Clock}
          trend={metrics.utilizationTrend}
          color="orange"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Revenue Trend</span>
            </CardTitle>
            <CardDescription>Revenue over time for selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData.revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip
                  formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                  labelStyle={{ color: '#666' }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8B5CF6"
                  fill="#8B5CF6"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Vehicle Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Car className="h-5 w-5" />
              <span>Vehicle Types</span>
            </CardTitle>
            <CardDescription>Distribution by vehicle type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.vehicleTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.vehicleTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Hourly Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Hourly Activity</span>
            </CardTitle>
            <CardDescription>Vehicle entries and exits by hour</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hour" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip />
                <Legend />
                <Bar dataKey="entries" fill="#3B82F6" name="Entries" />
                <Bar dataKey="exits" fill="#10B981" name="Exits" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Summary Footer */}
      {entries.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Car className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600">Start recording parking entries to see analytics.</p>
        </div>
      )}
    </div>
  )
}

// Helper Components
interface MetricCardProps {
  title: string
  value: string
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  trend: 'up' | 'down' | 'stable'
  color: 'blue' | 'green' | 'purple' | 'orange'
}

const MetricCard: React.FC<MetricCardProps> = ({
  title, value, subtitle, icon: Icon, trend, color
}) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    purple: 'text-purple-600 bg-purple-50',
    orange: 'text-orange-600 bg-orange-50'
  }

  const trendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Activity

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Utility Functions
function getTimeFilter(timeframe: 'today' | 'week' | 'month', now: Date): Date {
  const filter = new Date(now)
  switch (timeframe) {
    case 'today':
      filter.setHours(0, 0, 0, 0)
      break
    case 'week':
      filter.setDate(now.getDate() - 7)
      break
    case 'month':
      filter.setMonth(now.getMonth() - 1)
      break
  }
  return filter
}

function calculateGrowth(entries: ParkingEntry[], timeframe: 'today' | 'week' | 'month'): number {
  // Simplified growth calculation - compare current period with previous period
  const now = new Date()
  const currentPeriodStart = getTimeFilter(timeframe, now)
  const previousPeriodStart = new Date(currentPeriodStart)

  switch (timeframe) {
    case 'today':
      previousPeriodStart.setDate(previousPeriodStart.getDate() - 1)
      break
    case 'week':
      previousPeriodStart.setDate(previousPeriodStart.getDate() - 7)
      break
    case 'month':
      previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1)
      break
  }

  const currentRevenue = entries
    .filter(entry => new Date(entry.entryTime) >= currentPeriodStart)
    .reduce((sum, entry) => sum + (entry.amount || 0), 0)

  const previousRevenue = entries
    .filter(entry => {
      const entryDate = new Date(entry.entryTime)
      return entryDate >= previousPeriodStart && entryDate < currentPeriodStart
    })
    .reduce((sum, entry) => sum + (entry.amount || 0), 0)

  return previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0
}

function calculateTrend(entries: ParkingEntry[], timeframe: 'today' | 'week' | 'month'): 'up' | 'down' | 'stable' {
  const growth = calculateGrowth(entries, timeframe)
  return growth > 5 ? 'up' : growth < -5 ? 'down' : 'stable'
}

function prepareRevenueChartData(entries: ParkingEntry[], timeframe: 'today' | 'week' | 'month') {
  const data: { date: string; revenue: number }[] = []
  const now = new Date()

  if (timeframe === 'today') {
    // Hourly data for today
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0') + ':00'
      const revenue = entries
        .filter(entry => new Date(entry.entryTime).getHours() === i)
        .reduce((sum, entry) => sum + (entry.amount || 0), 0)
      data.push({ date: hour, revenue })
    }
  } else {
    // Daily data for week/month
    const days = timeframe === 'week' ? 7 : 30
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })

      const revenue = entries
        .filter(entry => {
          const entryDate = new Date(entry.entryTime)
          return entryDate.toDateString() === date.toDateString()
        })
        .reduce((sum, entry) => sum + (entry.amount || 0), 0)

      data.push({ date: dateStr, revenue })
    }
  }

  return data
}

function prepareVehicleTypeData(entries: ParkingEntry[]) {
  const types = entries.reduce((acc, entry) => {
    acc[entry.vehicleType] = (acc[entry.vehicleType] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return Object.entries(types).map(([name, value]) => ({ name, value }))
}

function prepareHourlyData(entries: ParkingEntry[]) {
  const data: { hour: string; entries: number; exits: number }[] = []

  for (let i = 0; i < 24; i++) {
    const hour = i.toString().padStart(2, '0') + ':00'
    const entryCount = entries.filter(entry => new Date(entry.entryTime).getHours() === i).length
    const exitCount = entries.filter(entry =>
      entry.exitTime && new Date(entry.exitTime).getHours() === i
    ).length

    data.push({ hour, entries: entryCount, exits: exitCount })
  }

  return data
}

export default OptimizedAnalyticsDashboard