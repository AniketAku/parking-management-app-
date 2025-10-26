import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { ShiftLinkingState, ShiftLinkingMetrics } from '../../hooks/useShiftLinking'
import { Card, CardHeader, CardContent } from '../ui'
import { Button } from '../ui/Button'
import toast from 'react-hot-toast'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInHours, differenceInMinutes } from 'date-fns'
import { log } from '../../utils/secureLogger'

interface ShiftHistoryTabProps {
  linkingState: ShiftLinkingState
  linkingMetrics: ShiftLinkingMetrics
  onRefresh: () => Promise<void>
  isLoading: boolean
}

interface ShiftSession {
  id: string
  employee_id: string
  employee_name: string
  shift_start_time: string
  shift_end_time: string | null
  opening_cash_amount: number
  closing_cash_amount: number | null
  status: 'active' | 'completed' | 'handover' | 'emergency_ended'
  shift_notes: string | null
  revenue?: number
  sessions_count?: number
  duration_hours?: number
}

type HistoryPeriod = 'today' | 'week' | 'month' | 'all'
type SortField = 'shift_start_time' | 'duration' | 'revenue' | 'employee_name'
type SortOrder = 'asc' | 'desc'

interface HistoryFilters {
  period: HistoryPeriod
  operatorFilter: string
  statusFilter: string
  sortField: SortField
  sortOrder: SortOrder
  searchTerm: string
}

export const ShiftHistoryTab: React.FC<ShiftHistoryTabProps> = ({
  linkingState,
  linkingMetrics,
  onRefresh,
  isLoading
}) => {
  const [shiftHistory, setShiftHistory] = useState<ShiftSession[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [selectedShift, setSelectedShift] = useState<ShiftSession | null>(null)
  const [availableOperators, setAvailableOperators] = useState<string[]>([])
  const [filters, setFilters] = useState<HistoryFilters>({
    period: 'week',
    operatorFilter: '',
    statusFilter: '',
    sortField: 'shift_start_time',
    sortOrder: 'desc',
    searchTerm: ''
  })

  // Load shift history based on filters
  const loadShiftHistory = useCallback(async () => {
    try {
      setHistoryLoading(true)

      // Calculate date range based on period
      let dateFilter: { start?: Date; end?: Date } = {}
      const today = new Date()

      switch (filters.period) {
        case 'today':
          dateFilter = {
            start: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
            end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
          }
          break
        case 'week':
          dateFilter = {
            start: startOfWeek(today, { weekStartsOn: 1 }),
            end: endOfWeek(today, { weekStartsOn: 1 })
          }
          break
        case 'month':
          dateFilter = {
            start: startOfMonth(today),
            end: endOfMonth(today)
          }
          break
        case 'all':
          // No date filter
          break
      }

      // Build query
      let query = supabase
        .from('shift_sessions')
        .select(`
          id,
          employee_id,
          employee_name,
          shift_start_time,
          shift_end_time,
          opening_cash_amount,
          closing_cash_amount,
          status,
          shift_notes
        `)

      // Apply date filters
      if (dateFilter.start) {
        query = query.gte('shift_start_time', dateFilter.start.toISOString())
      }
      if (dateFilter.end) {
        query = query.lte('shift_start_time', dateFilter.end.toISOString())
      }

      // Apply operator filter
      if (filters.operatorFilter) {
        query = query.eq('employee_name', filters.operatorFilter)
      }

      // Apply status filter
      if (filters.statusFilter) {
        query = query.eq('status', filters.statusFilter)
      }

      // Apply sorting
      query = query.order(filters.sortField, { ascending: filters.sortOrder === 'asc' })

      const { data: shifts, error } = await query

      if (error) throw error

      // Process shifts with additional calculated fields
      const processedShifts = await Promise.all((shifts || []).map(async (shift) => {
        // Calculate duration
        let duration_hours = 0
        if (shift.shift_end_time) {
          const startTime = new Date(shift.shift_start_time)
          const endTime = new Date(shift.shift_end_time)
          duration_hours = differenceInHours(endTime, startTime) +
                          differenceInMinutes(endTime, startTime) % 60 / 60
        }

        // Get shift revenue and session count (if available)
        let revenue = 0
        let sessions_count = 0

        try {
          // Query linked parking sessions for this shift
          const { data: linkedSessions } = await supabase
            .from('parking_sessions')
            .select('total_fee')
            .eq('shift_session_id', shift.id)

          if (linkedSessions) {
            revenue = linkedSessions.reduce((sum, session) => sum + (session.total_fee || 0), 0)
            sessions_count = linkedSessions.length
          }
        } catch (error) {
          log.warn('Failed to load shift revenue', error)
        }

        return {
          ...shift,
          duration_hours,
          revenue,
          sessions_count
        }
      }))

      setShiftHistory(processedShifts)

      // Extract available operators for filter (temporarily showing user IDs)
      // TODO: Join with users table to get actual operator names
      const operators = [...new Set(processedShifts.map(shift => shift.employee_name))]
      setAvailableOperators(operators)

    } catch (error) {
      log.error('Failed to load shift history', error)
      toast.error('Failed to load shift history')
    } finally {
      setHistoryLoading(false)
    }
  }, [filters])

  // Load initial data
  useEffect(() => {
    loadShiftHistory()
  }, [loadShiftHistory])

  // Filter shifts based on search term
  const filteredShifts = useMemo(() => {
    if (!filters.searchTerm) return shiftHistory

    const searchLower = filters.searchTerm.toLowerCase()
    return shiftHistory.filter(shift =>
      shift.employee_name.toLowerCase().includes(searchLower) ||
      shift.id.toLowerCase().includes(searchLower) ||
      (shift.shift_notes && shift.shift_notes.toLowerCase().includes(searchLower))
    )
  }, [shiftHistory, filters.searchTerm])

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'handover':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'emergency_ended':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Format shift duration
  const formatDuration = (hours: number) => {
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    return `${wholeHours}h ${minutes}m`
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Shift History</h2>
        <div className="text-sm text-gray-500">
          {filteredShifts.length} shifts found
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Filters & Search</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Period Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
              <select
                value={filters.period}
                onChange={(e) => setFilters(prev => ({ ...prev, period: e.target.value as HistoryPeriod }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="all">All Time</option>
              </select>
            </div>

            {/* Operator Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
              <select
                value={filters.operatorFilter}
                onChange={(e) => setFilters(prev => ({ ...prev, operatorFilter: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Operators</option>
                {availableOperators.map(operator => (
                  <option key={operator} value={operator}>{operator}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.statusFilter}
                onChange={(e) => setFilters(prev => ({ ...prev, statusFilter: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="handover">Handover</option>
                <option value="emergency_ended">Emergency Ended</option>
              </select>
            </div>

            {/* Sort Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={filters.sortField}
                onChange={(e) => setFilters(prev => ({ ...prev, sortField: e.target.value as SortField }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="shift_start_time">Start Time</option>
                <option value="duration">Duration</option>
                <option value="revenue">Revenue</option>
                <option value="employee_name">Employee Name</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
              <select
                value={filters.sortOrder}
                onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value as SortOrder }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search shifts..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shift List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Shift Sessions</h3>
            <Button onClick={loadShiftHistory} disabled={historyLoading} variant="secondary">
              {historyLoading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : filteredShifts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No shifts found matching the current filters.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedShift(shift)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="font-semibold text-gray-900">{shift.employee_name}</div>
                        <div className="text-sm text-gray-600">
                          {format(new Date(shift.shift_start_time), 'MMM dd, yyyy HH:mm')}
                          {shift.shift_end_time && ` - ${format(new Date(shift.shift_end_time), 'HH:mm')}`}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(shift.status)}`}>
                        {shift.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">₹{shift.revenue?.toLocaleString() || 0}</div>
                      <div className="text-sm text-gray-600">
                        {shift.duration_hours ? formatDuration(shift.duration_hours) : 'Ongoing'}
                        {shift.sessions_count ? ` • ${shift.sessions_count} sessions` : ''}
                      </div>
                    </div>
                  </div>
                  {(shift.notes || shift.end_notes) && (
                    <div className="mt-2 text-sm text-gray-600">
                      {shift.notes && (
                        <div><strong>Start:</strong> {shift.notes}</div>
                      )}
                      {shift.end_notes && (
                        <div><strong>End:</strong> {shift.end_notes}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shift Details Modal */}
      {selectedShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Shift Details</h3>
                <button
                  onClick={() => setSelectedShift(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Operator</label>
                    <div className="text-lg font-semibold">{selectedShift.employee_name}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <div>
                      <span className={`px-3 py-1 rounded-full text-sm border ${getStatusColor(selectedShift.status)}`}>
                        {selectedShift.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timing */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Started At</label>
                    <div className="text-lg">
                      {format(new Date(selectedShift.shift_start_time), 'MMM dd, yyyy HH:mm:ss')}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      {selectedShift.shift_end_time ? 'Ended At' : 'Status'}
                    </label>
                    <div className="text-lg">
                      {selectedShift.shift_end_time
                        ? format(new Date(selectedShift.shift_end_time), 'MMM dd, yyyy HH:mm:ss')
                        : 'Still Active'
                      }
                    </div>
                  </div>
                </div>

                {/* Duration & Performance */}
                {selectedShift.duration_hours && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Duration</label>
                      <div className="text-lg font-semibold">
                        {formatDuration(selectedShift.duration_hours)}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Revenue</label>
                      <div className="text-lg font-semibold text-green-600">
                        ₹{selectedShift.revenue?.toLocaleString() || 0}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Sessions</label>
                      <div className="text-lg font-semibold">
                        {selectedShift.sessions_count || 0}
                      </div>
                    </div>
                  </div>
                )}

                {/* Cash Management */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Starting Cash</label>
                    <div className="text-lg">₹{selectedShift.opening_cash_amount.toLocaleString()}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Ending Cash</label>
                    <div className="text-lg">
                      {selectedShift.closing_cash_amount !== null
                        ? `₹${selectedShift.closing_cash_amount.toLocaleString()}`
                        : 'N/A'
                      }
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedShift.shift_notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Shift Notes</label>
                    <div className="bg-gray-50 p-3 rounded text-sm">{selectedShift.shift_notes}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ShiftHistoryTab