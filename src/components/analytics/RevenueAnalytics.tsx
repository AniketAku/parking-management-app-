import React, { useState } from 'react'
import { StatisticsChart } from './StatisticsChart'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Select } from '../ui'
import { formatCurrency, getRevenueAmount } from '../../utils/helpers'
import { useUserRole } from '../../hooks/useUserRole'
import { useParkingStore } from '../../stores/parkingStore'
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns'
import type { ParkingEntry } from '../../types'

interface RevenueAnalyticsProps {
  entries: ParkingEntry[]
  loading?: boolean
}

type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly'
type MetricType = 'revenue' | 'volume' | 'average'

interface RevenueMetrics {
  totalRevenue: number
  avgRevenuePerVehicle: number
  totalVehicles: number
  paidVehicles: number
  unpaidAmount: number
  conversionRate: number
}

export const RevenueAnalytics: React.FC<Omit<RevenueAnalyticsProps, 'entries'>> = ({
  loading = false
}) => {
  const { role } = useUserRole()
  const { entries } = useParkingStore()
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('daily')
  const [metricType, setMetricType] = useState<MetricType>('revenue')

  // Filter entries based on user role - non-admin users only see today's data
  const getFilteredEntries = (): ParkingEntry[] => {
    if (role === 'admin') {
      return entries
    }
    
    // For viewers and operators, only show today's data
    const today = new Date()
    const todayStart = startOfDay(today)
    const todayEnd = endOfDay(today)
    
    return entries.filter(entry => {
      const entryDate = new Date(entry.entryTime || (entry as any).entry_time)
      return isWithinInterval(entryDate, { start: todayStart, end: todayEnd })
    })
  }

  const filteredEntries = getFilteredEntries()

  // Calculate revenue metrics
  const calculateMetrics = (): RevenueMetrics => {
    // Use the consistent revenue calculation utility
    const paidEntries = filteredEntries.filter(e => e.paymentStatus === 'Paid')
    const totalRevenue = paidEntries.reduce((sum, entry) => sum + getRevenueAmount(entry), 0)
    const totalVehicles = filteredEntries.length
    const paidVehicles = paidEntries.length
    const unpaidEntries = filteredEntries.filter(e => e.paymentStatus === 'Unpaid')
    const unpaidAmount = unpaidEntries.reduce((sum, entry) => sum + getRevenueAmount(entry), 0)

    return {
      totalRevenue,
      avgRevenuePerVehicle: paidVehicles > 0 ? totalRevenue / paidVehicles : 0,
      totalVehicles,
      paidVehicles,
      unpaidAmount,
      conversionRate: totalVehicles > 0 ? (paidVehicles / totalVehicles) * 100 : 0
    }
  }

  // Generate chart data based on time period
  const generateChartData = () => {
    const paidEntries = filteredEntries.filter(e => e.paymentStatus === 'Paid')

    if (paidEntries.length === 0) return []

    // Group by time period
    const grouped: { [key: string]: { revenue: number; count: number } } = {}

    paidEntries.forEach(entry => {
      let key: string
      const date = new Date(entry.exitTime || entry.entryTime || (entry as any).exit_time || (entry as any).entry_time)

      switch (timePeriod) {
        case 'daily':
          key = date.toISOString().split('T')[0] // YYYY-MM-DD
          break
        case 'weekly':
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          key = weekStart.toISOString().split('T')[0]
          break
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
        case 'yearly':
          key = String(date.getFullYear())
          break
        default:
          key = date.toISOString().split('T')[0]
      }

      if (!grouped[key]) {
        grouped[key] = { revenue: 0, count: 0 }
      }

      grouped[key].revenue += getRevenueAmount(entry)
      grouped[key].count += 1
    })

    // Convert to chart data format
    return Object.entries(grouped)
      .map(([key, data]) => ({
        name: formatPeriodLabel(key),
        revenue: data.revenue,
        volume: data.count,
        average: data.count > 0 ? data.revenue / data.count : 0
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(-12) // Show last 12 periods
  }

  const formatPeriodLabel = (key: string): string => {
    switch (timePeriod) {
      case 'daily':
        return new Date(key).toLocaleDateString('en-IN', { 
          month: 'short', 
          day: 'numeric' 
        })
      case 'weekly':
        const weekStart = new Date(key)
        return `Week of ${weekStart.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`
      case 'monthly':
        const [year, month] = key.split('-')
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short'
        })
      case 'yearly':
        return key
      default:
        return key
    }
  }

  // Vehicle type revenue breakdown
  const generateVehicleTypeData = () => {
    const paidEntries = filteredEntries.filter(e => e.paymentStatus === 'Paid')
    const typeRevenue: { [key: string]: number } = {}

    paidEntries.forEach(entry => {
      if (!typeRevenue[entry.vehicleType]) {
        typeRevenue[entry.vehicleType] = 0
      }
      typeRevenue[entry.vehicleType] += getRevenueAmount(entry)
    })

    return Object.entries(typeRevenue).map(([type, revenue]) => ({
      name: type,
      value: revenue
    }))
  }

  const metrics = calculateMetrics()
  const chartData = generateChartData()
  const vehicleTypeData = generateVehicleTypeData()

  const getMetricColor = () => {
    switch (metricType) {
      case 'revenue': return '#10B981'
      case 'volume': return '#3B82F6'
      case 'average': return '#F59E0B'
      default: return '#10B981'
    }
  }

  const getMetricFormatter = () => {
    switch (metricType) {
      case 'revenue': return formatCurrency
      case 'volume': return (value: number) => value.toString()
      case 'average': return formatCurrency
      default: return formatCurrency
    }
  }

  return (
    <div className="space-y-6">
      {/* Revenue Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Total Revenue</p>
                <p className="text-2xl font-bold text-success-600">
                  {formatCurrency(metrics.totalRevenue)}
                </p>
              </div>
              <div className="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Avg per Vehicle</p>
                <p className="text-2xl font-bold text-primary-600">
                  {formatCurrency(metrics.avgRevenuePerVehicle)}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Collection Rate</p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold text-text-primary">
                    {metrics.conversionRate.toFixed(1)}%
                  </p>
                  <Badge variant={metrics.conversionRate >= 80 ? 'success' : metrics.conversionRate >= 60 ? 'warning' : 'danger'}>
                    {metrics.conversionRate >= 80 ? 'Good' : metrics.conversionRate >= 60 ? 'Fair' : 'Low'}
                  </Badge>
                </div>
              </div>
              <div className="w-12 h-12 bg-info-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-info-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Pending Amount</p>
                <p className="text-2xl font-bold text-warning-600">
                  {formatCurrency(metrics.unpaidAmount)}
                </p>
              </div>
              <div className="w-12 h-12 bg-warning-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trends Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text-primary">Revenue Trends</h3>
                <div className="flex items-center space-x-3">
                  <Select
                    value={metricType}
                    onChange={setMetricType}
                    options={[
                      { value: 'revenue', label: 'Revenue' },
                      { value: 'volume', label: 'Vehicle Count' },
                      { value: 'average', label: 'Average per Vehicle' }
                    ]}
                  />
                  <Select
                    value={timePeriod}
                    onChange={setTimePeriod}
                    options={[
                      { value: 'daily', label: 'Daily' },
                      { value: 'weekly', label: 'Weekly' },
                      { value: 'monthly', label: 'Monthly' },
                      { value: 'yearly', label: 'Yearly' }
                    ]}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <StatisticsChart
                data={chartData}
                title=""
                type="area"
                dataKey={metricType}
                color={getMetricColor()}
                height={350}
                loading={loading}
                formatter={getMetricFormatter()}
              />
            </CardContent>
          </Card>
        </div>

        {/* Vehicle Type Revenue Breakdown */}
        <div>
          <StatisticsChart
            data={vehicleTypeData}
            title="Revenue by Vehicle Type"
            type="pie"
            dataKey="value"
            height={350}
            loading={loading}
            showLegend={true}
            formatter={formatCurrency}
          />
        </div>
      </div>

      {/* Revenue Summary Table */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">Revenue Summary</h3>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Vehicle Type</th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Total Vehicles</th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Paid Vehicles</th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Total Revenue</th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Avg Revenue</th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Collection Rate</th>
                </tr>
              </thead>
              <tbody>
                {['Trailer', '6 Wheeler', '4 Wheeler', '2 Wheeler'].map(vehicleType => {
                  const typeEntries = filteredEntries.filter(e => e.vehicleType === vehicleType)
                  const paidEntries = typeEntries.filter(e => e.paymentStatus === 'Paid')
                  const totalRevenue = paidEntries.reduce((sum, e) => sum + getRevenueAmount(e), 0)
                  const avgRevenue = paidEntries.length > 0 ? totalRevenue / paidEntries.length : 0
                  const collectionRate = typeEntries.length > 0 ? (paidEntries.length / typeEntries.length) * 100 : 0

                  return (
                    <tr key={vehicleType} className="border-b border-border-light hover:bg-surface-light transition-colors">
                      <td className="py-3 px-4">
                        <Badge variant="secondary">{vehicleType}</Badge>
                      </td>
                      <td className="py-3 px-4 text-text-primary">{typeEntries.length}</td>
                      <td className="py-3 px-4 text-text-primary">{paidEntries.length}</td>
                      <td className="py-3 px-4 text-success-600 font-medium">
                        {formatCurrency(totalRevenue)}
                      </td>
                      <td className="py-3 px-4 text-text-primary">
                        {formatCurrency(avgRevenue)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={collectionRate >= 80 ? 'success' : collectionRate >= 60 ? 'warning' : 'danger'}>
                          {collectionRate.toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}