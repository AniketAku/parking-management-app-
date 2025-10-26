import React from 'react'
import { Card, CardHeader, CardContent } from '../ui'
import { useParkingStore } from '../../stores/parkingStore'
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns'
import { getRevenueAmount, formatCurrency } from '../../utils/helpers'
import { isCurrentlyParked } from '../../utils/statusHelpers'
import { log } from '../../utils/secureLogger'

interface DailyMetrics {
  totalEntries: number
  totalExits: number
  currentlyParked: number
  dailyRevenue: number
  averageStayDuration: number
  peakHourEntries: number
  peakHour: string
}

const DailyAnalytics: React.FC = () => {
  const { entries, loading } = useParkingStore()

  // Debug logging (only in development and when needed)
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development' && entries?.length === 0) {
      log.debug('DailyAnalytics: No entries loaded yet')
    }
  }, [entries, loading])

  const calculateDailyMetrics = (): DailyMetrics => {
    // Only use real entries from database, not mock data
    if (!entries || entries.length === 0) {
      return {
        totalEntries: 0,
        totalExits: 0,
        currentlyParked: 0,
        dailyRevenue: 0,
        averageStayDuration: 0,
        peakHourEntries: 0,
        peakHour: 'N/A'
      }
    }

    // Filter out any potential mock/test data by checking for real database IDs
    const realEntries = entries.filter(entry => {
      // Real database entries should have proper UUIDs or numeric IDs
      return entry.id &&
             entry.id.length > 10 &&
             !entry.id.startsWith('mock-') &&
             !entry.id.startsWith('test-')
    })

    if (realEntries.length === 0) {
      return {
        totalEntries: 0,
        totalExits: 0,
        currentlyParked: 0,
        dailyRevenue: 0,
        averageStayDuration: 0,
        peakHourEntries: 0,
        peakHour: 'N/A'
      }
    }

    const today = new Date()
    const todayStart = startOfDay(today)
    const todayEnd = endOfDay(today)

    // Filter real entries for today only
    const todayEntries = realEntries.filter(entry => {
      // Handle both field formats for compatibility
      const entryTime = entry.entryTime || (entry as any).entry_time
      if (!entryTime) return false

      const entryDate = new Date(entryTime)
      const isToday = isWithinInterval(entryDate, { start: todayStart, end: todayEnd })

      // Debug logging (development only)
      if (process.env.NODE_ENV === 'development' && realEntries.indexOf(entry) === 0 && !isToday) {
        log.debug('No entries for today found')
      }

      return isToday
    })

    // Minimal logging for development
    if (process.env.NODE_ENV === 'development' && todayEntries.length === 0 && realEntries.length > 0) {
      log.debug('DailyAnalytics: No entries for today, but found entries for other days')
    }

    // Calculate basic metrics
    const totalEntries = todayEntries.length
    const totalExits = todayEntries.filter(entry => entry.exitTime || (entry as any).exit_time).length

    // 🔧 FIXED: Currently parked should include ALL vehicles currently in parking, not just today's entries
    const currentlyParked = realEntries.filter(entry => isCurrentlyParked(entry.status)).length

    // Status debugging removed to improve performance
    // 🔧 FIXED: Use consistent revenue calculation utility (debug logging removed for performance)

    const dailyRevenue = todayEntries.reduce((sum, entry) => sum + getRevenueAmount(entry), 0)

    // Calculate average stay duration (in hours)
    const completedStays = todayEntries.filter(entry => entry.exitTime || (entry as any).exit_time)
    const averageStayDuration = completedStays.length > 0 
      ? completedStays.reduce((sum, entry) => {
          const entryTime = new Date(entry.entryTime || (entry as any).entry_time)
          const exitTime = new Date(entry.exitTime || (entry as any).exit_time!)
          const duration = (exitTime.getTime() - entryTime.getTime()) / (1000 * 60 * 60) // Convert to hours
          return sum + duration
        }, 0) / completedStays.length
      : 0

    // Calculate peak hour
    const hourCounts: { [hour: string]: number } = {}
    todayEntries.forEach(entry => {
      const entryDate = new Date(entry.entryTime || (entry as any).entry_time)
      const hour = format(entryDate, 'HH:00')
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })

    const peakHour = Object.keys(hourCounts).reduce((a, b) => 
      hourCounts[a] > hourCounts[b] ? a : b, Object.keys(hourCounts)[0] || 'N/A'
    )
    const peakHourEntries = hourCounts[peakHour] || 0

    return {
      totalEntries,
      totalExits,
      currentlyParked,
      dailyRevenue,
      averageStayDuration,
      peakHourEntries,
      peakHour
    }
  }

  const metrics = calculateDailyMetrics()

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Daily Analytics</h2>
        <div className="text-sm text-gray-500">
          {format(new Date(), 'EEEE, MMMM do, yyyy')}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-600">Today's Entries</h3>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-gray-900">{metrics.totalEntries}</div>
            <p className="text-xs text-gray-500">Vehicles entered today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-600">Today's Exits</h3>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-gray-900">{metrics.totalExits}</div>
            <p className="text-xs text-gray-500">Vehicles exited today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-600">Currently Parked</h3>
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-gray-900">{metrics.currentlyParked}</div>
            <p className="text-xs text-gray-500">Total vehicles in parking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-600">Daily Revenue</h3>
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-gray-900">₹{metrics.dailyRevenue.toLocaleString()}</div>
            <p className="text-xs text-gray-500">Revenue earned today</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Stay Duration</h3>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="text-3xl font-bold text-gray-900">
                  {metrics.averageStayDuration.toFixed(1)}
                </div>
                <p className="text-sm text-gray-600">Average hours per vehicle</p>
              </div>
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Peak Hour</h3>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="text-3xl font-bold text-gray-900">{metrics.peakHour}</div>
                <p className="text-sm text-gray-600">{metrics.peakHourEntries} entries this hour</p>
              </div>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Summary */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Daily Summary</h3>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-700 leading-relaxed">
              Today, we had <span className="font-semibold text-blue-600">{metrics.totalEntries} vehicles enter</span> the parking facility with{' '}
              <span className="font-semibold text-green-600">{metrics.totalExits} exits</span> processed.{' '}
              There are currently <span className="font-semibold text-yellow-600">{metrics.currentlyParked} vehicles parked</span> in total (from all days).{' '}
              The facility generated <span className="font-semibold text-purple-600">₹{metrics.dailyRevenue.toLocaleString()} in revenue</span> today{' '}
              {metrics.peakHour !== 'N/A' && (
                <>with the busiest hour being <span className="font-semibold text-red-600">{metrics.peakHour}</span>.</>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DailyAnalytics