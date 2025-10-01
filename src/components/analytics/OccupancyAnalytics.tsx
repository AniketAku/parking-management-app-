import React, { useState } from 'react'
import { StatisticsChart } from './StatisticsChart'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Select } from '../ui'
import { useUserRole } from '../../hooks/useUserRole'
import { useParkingStore } from '../../stores/parkingStore'
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns'
import type { ParkingEntry } from '../../types'

interface OccupancyAnalyticsProps {
  entries: ParkingEntry[]
  loading?: boolean
}

type TimeRange = '24h' | '7d' | '30d' | '90d'

interface OccupancyMetrics {
  currentOccupancy: number
  peakOccupancy: number
  averageOccupancy: number
  turnoverRate: number
  averageStayDuration: number
  overstayingVehicles: number
}

export const OccupancyAnalytics: React.FC<Omit<OccupancyAnalyticsProps, 'entries'>> = ({
  loading = false
}) => {
  const { role } = useUserRole()
  const { entries } = useParkingStore()
  const [timeRange, setTimeRange] = useState<TimeRange>('24h')

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

  // Calculate occupancy metrics
  const calculateMetrics = (): OccupancyMetrics => {
    const now = new Date()
    const currentlyParked = filteredEntries.filter(e => e.status === 'Active' || e.status === 'Parked')
    const overstaying = currentlyParked.filter(e => {
      const entryTime = new Date(e.entryTime)
      const hoursSinceEntry = (now.getTime() - entryTime.getTime()) / (1000 * 60 * 60)
      return hoursSinceEntry > 24
    })

    // Calculate average stay duration for exited vehicles
    const exitedEntries = filteredEntries.filter(e => e.status === 'Exited' && e.exitTime)
    const totalDuration = exitedEntries.reduce((sum, entry) => {
      if (entry.exitTime) {
        const exitTime = new Date(entry.exitTime)
        const entryTime = new Date(entry.entryTime)
        return sum + (exitTime.getTime() - entryTime.getTime())
      }
      return sum
    }, 0)
    const avgStayDuration = exitedEntries.length > 0 
      ? totalDuration / (exitedEntries.length * 1000 * 60 * 60) // in hours
      : 0

    // Estimate peak occupancy (simplified - actual implementation would need hourly data)
    const peakOccupancy = Math.max(currentlyParked.length, Math.floor(entries.length * 0.7))

    return {
      currentOccupancy: currentlyParked.length,
      peakOccupancy,
      averageOccupancy: Math.floor(entries.length * 0.4),
      turnoverRate: exitedEntries.length / Math.max(entries.length, 1),
      averageStayDuration: avgStayDuration,
      overstayingVehicles: overstaying.length
    }
  }

  // Generate hourly occupancy data for the last 24 hours
  const generateHourlyData = () => {
    const hours = []
    const now = new Date()
    
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - (i * 60 * 60 * 1000))
      const hourStart = new Date(hour)
      hourStart.setMinutes(0, 0, 0)
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000)

      // Count vehicles that were parked during this hour
      const occupancy = filteredEntries.filter(entry => {
        const entryTime = new Date(entry.entryTime)
        const exitTime = entry.exitTime ? new Date(entry.exitTime) : now

        return entryTime <= hourEnd && exitTime >= hourStart
      }).length

      hours.push({
        name: hourStart.getHours().toString().padStart(2, '0') + ':00',
        value: occupancy,
        hour: hourStart.getHours()
      })
    }

    return hours
  }

  // Generate daily occupancy data
  const generateDailyData = () => {
    const days = []
    const now = new Date()
    const daysToShow = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90

    for (let i = daysToShow - 1; i >= 0; i--) {
      const day = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000))
      const dayStart = new Date(day)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

      const dayEntries = filteredEntries.filter(entry => {
        const entryTime = new Date(entry.entryTime)
        return entryTime >= dayStart && entryTime < dayEnd
      })

      const exitedOnDay = filteredEntries.filter(entry => {
        if (!entry.exitTime) return false
        const exitTime = new Date(entry.exitTime)
        return exitTime >= dayStart && exitTime < dayEnd
      })

      days.push({
        name: dayStart.toLocaleDateString('en-IN', { 
          month: 'short', 
          day: 'numeric' 
        }),
        entries: dayEntries.length,
        exits: exitedOnDay.length,
        occupancy: Math.max(0, dayEntries.length - exitedOnDay.length),
        date: dayStart
      })
    }

    return days
  }

  // Vehicle type distribution
  const generateVehicleTypeDistribution = () => {
    const currentlyParked = filteredEntries.filter(e => e.status === 'Active' || e.status === 'Parked')
    const typeCount: { [key: string]: number } = {}

    currentlyParked.forEach(entry => {
      typeCount[entry.vehicleType] = (typeCount[entry.vehicleType] || 0) + 1
    })

    return Object.entries(typeCount).map(([type, count]) => ({
      name: type,
      value: count
    }))
  }

  // Duration analysis
  const generateDurationAnalysis = () => {
    const currentlyParked = filteredEntries.filter(e => e.status === 'Active' || e.status === 'Parked')
    const now = new Date()
    const durationRanges = [
      { label: '< 2 hours', min: 0, max: 2, count: 0 },
      { label: '2-8 hours', min: 2, max: 8, count: 0 },
      { label: '8-24 hours', min: 8, max: 24, count: 0 },
      { label: '> 24 hours', min: 24, max: Infinity, count: 0 }
    ]

    currentlyParked.forEach(entry => {
      const entryTime = new Date(entry.entryTime)
      const hours = (now.getTime() - entryTime.getTime()) / (1000 * 60 * 60)
      const range = durationRanges.find(r => hours >= r.min && hours < r.max)
      if (range) range.count++
    })

    return durationRanges.map(range => ({
      name: range.label,
      value: range.count
    }))
  }

  const metrics = calculateMetrics()
  const hourlyData = generateHourlyData()
  const dailyData = generateDailyData()
  const vehicleTypeData = generateVehicleTypeDistribution()
  const durationData = generateDurationAnalysis()

  const getOccupancyStatus = (occupancy: number) => {
    if (occupancy >= 80) return { status: 'High', variant: 'danger' as const }
    if (occupancy >= 50) return { status: 'Moderate', variant: 'warning' as const }
    return { status: 'Low', variant: 'success' as const }
  }

  const occupancyStatus = getOccupancyStatus(metrics.currentOccupancy)

  return (
    <div className="space-y-6">
      {/* Occupancy Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Current Occupancy</p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold text-text-primary">
                    {metrics.currentOccupancy}
                  </p>
                  <Badge variant={occupancyStatus.variant}>
                    {occupancyStatus.status}
                  </Badge>
                </div>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Peak Occupancy</p>
                <p className="text-2xl font-bold text-warning-600">
                  {metrics.peakOccupancy}
                </p>
              </div>
              <div className="w-12 h-12 bg-warning-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Avg Stay Duration</p>
                <p className="text-2xl font-bold text-info-600">
                  {metrics.averageStayDuration.toFixed(1)}h
                </p>
              </div>
              <div className="w-12 h-12 bg-info-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-info-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Overstaying</p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold text-danger-600">
                    {metrics.overstayingVehicles}
                  </p>
                  {metrics.overstayingVehicles > 0 && (
                    <Badge variant="danger">Alert</Badge>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 bg-danger-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-danger-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Occupancy Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">Hourly Occupancy (Last 24h)</h3>
          </CardHeader>
          <CardContent>
            <StatisticsChart
              data={hourlyData}
              title=""
              type="line"
              dataKey="value"
              color="#3B82F6"
              height={300}
              loading={loading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary">Entry/Exit Trends</h3>
              <Select
                value={timeRange}
                onChange={setTimeRange}
                options={[
                  { value: '7d', label: 'Last 7 Days' },
                  { value: '30d', label: 'Last 30 Days' },
                  { value: '90d', label: 'Last 90 Days' }
                ]}
              />
            </div>
          </CardHeader>
          <CardContent>
            <StatisticsChart
              data={dailyData}
              title=""
              type="bar"
              dataKey="entries"
              color="#10B981"
              height={300}
              loading={loading}
            />
          </CardContent>
        </Card>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatisticsChart
          data={vehicleTypeData}
          title="Current Parking by Vehicle Type"
          type="pie"
          dataKey="value"
          height={300}
          loading={loading}
          showLegend={true}
        />

        <StatisticsChart
          data={durationData}
          title="Parking Duration Distribution"
          type="pie"
          dataKey="value"
          height={300}
          loading={loading}
          showLegend={true}
        />
      </div>

      {/* Occupancy Patterns Table */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">Occupancy Patterns</h3>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Time Period</th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Average Occupancy</th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Peak Hours</th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Utilization</th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border-light hover:bg-surface-light transition-colors">
                  <td className="py-3 px-4 font-medium">Morning (6-12)</td>
                  <td className="py-3 px-4 text-text-primary">12</td>
                  <td className="py-3 px-4 text-text-primary">9-11 AM</td>
                  <td className="py-3 px-4 text-text-primary">60%</td>
                  <td className="py-3 px-4">
                    <Badge variant="success">Good</Badge>
                  </td>
                </tr>
                <tr className="border-b border-border-light hover:bg-surface-light transition-colors">
                  <td className="py-3 px-4 font-medium">Afternoon (12-18)</td>
                  <td className="py-3 px-4 text-text-primary">18</td>
                  <td className="py-3 px-4 text-text-primary">2-4 PM</td>
                  <td className="py-3 px-4 text-text-primary">90%</td>
                  <td className="py-3 px-4">
                    <Badge variant="warning">High</Badge>
                  </td>
                </tr>
                <tr className="border-b border-border-light hover:bg-surface-light transition-colors">
                  <td className="py-3 px-4 font-medium">Evening (18-24)</td>
                  <td className="py-3 px-4 text-text-primary">8</td>
                  <td className="py-3 px-4 text-text-primary">7-9 PM</td>
                  <td className="py-3 px-4 text-text-primary">40%</td>
                  <td className="py-3 px-4">
                    <Badge variant="success">Low</Badge>
                  </td>
                </tr>
                <tr className="hover:bg-surface-light transition-colors">
                  <td className="py-3 px-4 font-medium">Night (0-6)</td>
                  <td className="py-3 px-4 text-text-primary">15</td>
                  <td className="py-3 px-4 text-text-primary">11PM-2AM</td>
                  <td className="py-3 px-4 text-text-primary">75%</td>
                  <td className="py-3 px-4">
                    <Badge variant="warning">Moderate</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}