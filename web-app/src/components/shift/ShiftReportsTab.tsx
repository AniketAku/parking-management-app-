import React, { useState, useCallback, useEffect } from 'react'
import { ShiftLinkingState, ShiftLinkingMetrics } from '../../hooks/useShiftLinking'
import { ReportGenerator } from '../reports/ReportGenerator'
import { Card, CardHeader, CardContent } from '../ui'
import { Button } from '../ui/Button'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import type { ReportGenerationResponse } from '../../types/reports'
import { log } from '../../utils/secureLogger'

interface ShiftReportsTabProps {
  linkingState: ShiftLinkingState
  linkingMetrics: ShiftLinkingMetrics | null
  onRefresh: () => Promise<void>
  isLoading: boolean
}

interface ShiftReportSummary {
  totalShifts: number
  totalRevenue: number
  totalSessions: number
  averageShiftDuration: number
  topOperator?: string
  activeShiftDetails?: {
    shiftId: string
    employeeName: string
    startTime: string
    currentRevenue: number
    currentSessions: number
  }
}

export const ShiftReportsTab: React.FC<ShiftReportsTabProps> = ({
  linkingState,
  linkingMetrics,
  onRefresh,
  isLoading
}) => {
  const [shiftSummary, setShiftSummary] = useState<ShiftReportSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  // Load shift-specific summary data
  useEffect(() => {
    const loadShiftSummary = async () => {
      try {
        setSummaryLoading(true)

        // Get today's date range
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        // Fetch shift sessions for today
        const { data: shifts, error: shiftsError } = await supabase
          .from('shift_sessions')
          .select('*')
          .gte('shift_start_time', today.toISOString())
          .lt('shift_start_time', tomorrow.toISOString())
          .order('shift_start_time', { ascending: false })

        if (shiftsError) throw shiftsError

        // Calculate metrics from shifts
        const totalShifts = shifts?.length || 0
        const totalRevenue = shifts?.reduce((sum, shift) => sum + (shift.total_revenue || 0), 0) || 0
        const totalSessions = shifts?.reduce((sum, shift) => sum + (shift.vehicles_entered || 0), 0) || 0

        // Calculate average shift duration
        const totalDuration = shifts?.reduce((sum, shift) => {
          if (shift.shift_start_time && shift.shift_end_time) {
            const start = new Date(shift.shift_start_time)
            const end = new Date(shift.shift_end_time)
            return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60) // hours
          }
          return sum
        }, 0) || 0

        const averageShiftDuration = totalShifts > 0 ? totalDuration / totalShifts : 0

        // Find top operator
        const operatorCounts: Record<string, number> = {}
        shifts?.forEach(shift => {
          if (shift.employee_name) {
            operatorCounts[shift.employee_name] = (operatorCounts[shift.employee_name] || 0) + 1
          }
        })

        const topOperator = Object.entries(operatorCounts)
          .sort(([,a], [,b]) => b - a)[0]?.[0]

        // Get active shift details if there's an active shift
        let activeShiftDetails
        if (linkingState.activeShiftId) {
          const activeShift = shifts?.find(s => s.id === linkingState.activeShiftId)
          if (activeShift) {
            activeShiftDetails = {
              shiftId: activeShift.id,
              employeeName: activeShift.employee_name || 'Unknown',
              startTime: format(new Date(activeShift.shift_start_time), 'HH:mm'),
              currentRevenue: activeShift.total_revenue || 0,
              currentSessions: activeShift.vehicles_entered || 0
            }
          }
        }

        setShiftSummary({
          totalShifts,
          totalRevenue,
          totalSessions,
          averageShiftDuration,
          topOperator,
          activeShiftDetails
        })
      } catch (error) {
        log.error('Failed to load shift summary', error)
        toast.error('Failed to load shift summary')
      } finally {
        setSummaryLoading(false)
      }
    }

    loadShiftSummary()
  }, [linkingState.activeShiftId])

  const handleReportGenerated = useCallback((report: ReportGenerationResponse) => {
    log.debug('Shift report generated', report)
    toast.success('Report generated successfully')
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Shift Reports</h2>
        <div className="text-sm text-gray-500">
          Generate comprehensive shift reports and analytics
        </div>
      </div>

      {/* Shift Summary Card */}
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-900">Today's Shift Summary</h3>
          <p className="text-sm text-gray-600">Overview of all shifts for today</p>
        </CardHeader>
        <CardContent>
          {summaryLoading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          ) : shiftSummary ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">Total Shifts</div>
                  <div className="text-xl font-bold text-blue-900">{shiftSummary.totalShifts}</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">Total Revenue</div>
                  <div className="text-xl font-bold text-green-900">₹{shiftSummary.totalRevenue.toLocaleString()}</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="text-sm text-purple-600 font-medium">Sessions</div>
                  <div className="text-xl font-bold text-purple-900">{shiftSummary.totalSessions}</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <div className="text-sm text-orange-600 font-medium">Avg Duration</div>
                  <div className="text-xl font-bold text-orange-900">{shiftSummary.averageShiftDuration.toFixed(1)}h</div>
                </div>
              </div>

              {/* Active Shift Details */}
              {shiftSummary.activeShiftDetails && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-600 font-medium">Active Shift</div>
                      <div className="text-lg font-bold text-gray-900">{shiftSummary.activeShiftDetails.employeeName}</div>
                      <div className="text-sm text-gray-600">Started at {shiftSummary.activeShiftDetails.startTime}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Current Revenue</div>
                      <div className="text-xl font-bold text-green-600">₹{shiftSummary.activeShiftDetails.currentRevenue.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">{shiftSummary.activeShiftDetails.currentSessions} sessions</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Top Operator */}
              {shiftSummary.topOperator && (
                <div className="bg-indigo-50 p-3 rounded-lg">
                  <div className="text-sm text-indigo-600 font-medium">Most Active Operator Today</div>
                  <div className="text-lg font-bold text-indigo-900">{shiftSummary.topOperator}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-4">No shift data available for today</div>
          )}
        </CardContent>
      </Card>

      {/* Integrated Report Generator */}
      <ReportGenerator
        defaultReportType="daily"
        onReportGenerated={handleReportGenerated}
      />
    </div>
  )
}

export default ShiftReportsTab