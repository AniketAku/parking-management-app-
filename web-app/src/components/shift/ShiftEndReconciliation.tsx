import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, CardHeader, CardContent } from '../ui'
import { log } from '../../utils/secureLogger'

interface ShiftEndReconciliationProps {
  shiftId: string
  openingCashAmount: number
  enteredClosingCash: number
  onClosingCashSuggestion?: (suggestedAmount: number) => void
  onDiscrepancyDetected?: (discrepancy: number, isSignificant: boolean) => void
}

interface ShiftRevenueData {
  totalRevenue: number
  cashRevenue: number
  digitalRevenue: number
  vehiclesProcessed: number
  expectedClosingCash: number
}

const DISCREPANCY_THRESHOLD = 100 // ₹100 threshold for warnings

export const ShiftEndReconciliation: React.FC<ShiftEndReconciliationProps> = ({
  shiftId,
  openingCashAmount,
  enteredClosingCash,
  onClosingCashSuggestion,
  onDiscrepancyDetected
}) => {
  const [revenueData, setRevenueData] = useState<ShiftRevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Try to fetch from shift_statistics view first (if migration deployed)
        const { data: shiftStats, error: statsError } = await supabase
          .from('shift_statistics')
          .select('*')
          .eq('shift_id', shiftId)
          .single()

        if (!statsError && shiftStats) {
          // Migration deployed - use shift_statistics view
          const cashRevenue = shiftStats.cash_revenue || 0
          const digitalRevenue = shiftStats.digital_revenue || 0
          const totalRevenue = shiftStats.revenue_collected || 0
          const expectedClosingCash = openingCashAmount + cashRevenue

          const data: ShiftRevenueData = {
            totalRevenue,
            cashRevenue,
            digitalRevenue,
            vehiclesProcessed: shiftStats.vehicles_entered || 0,
            expectedClosingCash
          }

          setRevenueData(data)

          // Suggest closing cash amount
          if (onClosingCashSuggestion) {
            onClosingCashSuggestion(expectedClosingCash)
          }

          return
        }

        // Fallback: Query parking_entries directly (migration not deployed)
        const { data: shiftSession, error: shiftError } = await supabase
          .from('shift_sessions')
          .select('shift_start_time')
          .eq('id', shiftId)
          .single()

        if (shiftError) throw new Error('Failed to fetch shift details')

        const { data: parkingEntries, error: entriesError } = await supabase
          .from('parking_entries')
          .select('parking_fee, payment_type, payment_status')
          .gte('entry_time', shiftSession.shift_start_time)
          .eq('payment_status', 'Paid')

        if (entriesError) throw new Error('Failed to fetch parking entries')

        // Calculate revenue manually
        let cashRevenue = 0
        let digitalRevenue = 0
        let totalRevenue = 0

        parkingEntries?.forEach(entry => {
          const fee = entry.parking_fee || 0
          totalRevenue += fee

          if (entry.payment_type === 'Cash') {
            cashRevenue += fee
          } else if (entry.payment_type === 'Digital' || entry.payment_type === 'UPI') {
            digitalRevenue += fee
          }
        })

        const expectedClosingCash = openingCashAmount + cashRevenue

        const data: ShiftRevenueData = {
          totalRevenue,
          cashRevenue,
          digitalRevenue,
          vehiclesProcessed: parkingEntries?.length || 0,
          expectedClosingCash
        }

        setRevenueData(data)

        // Suggest closing cash amount
        if (onClosingCashSuggestion) {
          onClosingCashSuggestion(expectedClosingCash)
        }

      } catch (err) {
        log.error('Failed to fetch revenue data', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch revenue data')
      } finally {
        setLoading(false)
      }
    }

    if (shiftId) {
      fetchRevenueData()
    }
  }, [shiftId, openingCashAmount, onClosingCashSuggestion])

  // Calculate discrepancy when entered cash changes
  useEffect(() => {
    if (revenueData && onDiscrepancyDetected) {
      const discrepancy = enteredClosingCash - revenueData.expectedClosingCash
      const isSignificant = Math.abs(discrepancy) >= DISCREPANCY_THRESHOLD
      onDiscrepancyDetected(discrepancy, isSignificant)
    }
  }, [enteredClosingCash, revenueData, onDiscrepancyDetected])

  if (loading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Cash Reconciliation</h3>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="mt-6 border-yellow-200 bg-yellow-50">
        <CardHeader>
          <h3 className="text-lg font-semibold text-yellow-900">Cash Reconciliation</h3>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 text-yellow-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm">Reconciliation data unavailable: {error}</p>
          </div>
          <p className="text-sm text-yellow-700 mt-2">
            Please ensure parking entries are properly linked to this shift.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!revenueData) return null

  const discrepancy = enteredClosingCash - revenueData.expectedClosingCash
  const discrepancyPercent = revenueData.expectedClosingCash > 0
    ? (Math.abs(discrepancy) / revenueData.expectedClosingCash) * 100
    : 0
  const isSignificantDiscrepancy = Math.abs(discrepancy) >= DISCREPANCY_THRESHOLD

  return (
    <Card className="mt-6">
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900">💰 Cash Reconciliation</h3>
        <p className="text-sm text-gray-600 mt-1">Automatic revenue vs cash verification</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Revenue Breakdown */}
        <div className="bg-blue-50 p-4 rounded-lg space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-blue-900">Total Revenue (All Payments)</span>
            <span className="text-lg font-bold text-blue-900">₹{revenueData.totalRevenue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center border-t border-blue-200 pt-2">
            <span className="text-sm text-blue-700">💵 Cash Payments</span>
            <span className="text-sm font-semibold text-blue-900">₹{revenueData.cashRevenue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-blue-700">💳 Digital/UPI Payments</span>
            <span className="text-sm font-semibold text-blue-900">₹{revenueData.digitalRevenue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center border-t border-blue-200 pt-2">
            <span className="text-sm text-blue-700">🚗 Vehicles Processed</span>
            <span className="text-sm font-semibold text-blue-900">{revenueData.vehiclesProcessed}</span>
          </div>
        </div>

        {/* Cash Calculation */}
        <div className="bg-green-50 p-4 rounded-lg space-y-3">
          <h4 className="text-sm font-semibold text-green-900">Expected Cash Flow</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-green-700">Opening Cash</span>
              <span className="text-sm font-semibold text-green-900">₹{openingCashAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-green-700">+ Cash Revenue</span>
              <span className="text-sm font-semibold text-green-900">₹{revenueData.cashRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center border-t-2 border-green-300 pt-2">
              <span className="text-sm font-bold text-green-900">Expected Closing Cash</span>
              <span className="text-lg font-bold text-green-900">₹{revenueData.expectedClosingCash.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Discrepancy Alert */}
        {enteredClosingCash > 0 && (
          <div className={`p-4 rounded-lg ${
            Math.abs(discrepancy) < 10
              ? 'bg-green-50 border border-green-200'
              : isSignificantDiscrepancy
                ? 'bg-red-50 border border-red-200'
                : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-start space-x-3">
              {Math.abs(discrepancy) < 10 ? (
                <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : isSignificantDiscrepancy ? (
                <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-sm font-semibold ${
                    Math.abs(discrepancy) < 10 ? 'text-green-900' : isSignificantDiscrepancy ? 'text-red-900' : 'text-yellow-900'
                  }`}>
                    {Math.abs(discrepancy) < 10 ? '✅ Cash Match' : isSignificantDiscrepancy ? '⚠️ Significant Discrepancy' : '⚡ Minor Discrepancy'}
                  </span>
                  <span className={`text-lg font-bold ${
                    discrepancy > 0 ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {discrepancy > 0 ? '+' : ''}₹{discrepancy.toFixed(2)}
                  </span>
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className={Math.abs(discrepancy) < 10 ? 'text-green-700' : isSignificantDiscrepancy ? 'text-red-700' : 'text-yellow-700'}>
                      Entered Closing Cash
                    </span>
                    <span className="font-semibold">₹{enteredClosingCash.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={Math.abs(discrepancy) < 10 ? 'text-green-700' : isSignificantDiscrepancy ? 'text-red-700' : 'text-yellow-700'}>
                      Expected Closing Cash
                    </span>
                    <span className="font-semibold">₹{revenueData.expectedClosingCash.toFixed(2)}</span>
                  </div>
                  {discrepancyPercent > 0 && (
                    <div className="flex justify-between pt-1 border-t border-gray-200">
                      <span className={Math.abs(discrepancy) < 10 ? 'text-green-600' : isSignificantDiscrepancy ? 'text-red-600' : 'text-yellow-600'}>
                        Variance
                      </span>
                      <span className="font-semibold">{discrepancyPercent.toFixed(1)}%</span>
                    </div>
                  )}
                </div>

                {/* Actionable Suggestions */}
                {isSignificantDiscrepancy && (
                  <div className={`mt-3 p-3 rounded ${discrepancy > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                    <p className={`text-xs font-medium ${discrepancy > 0 ? 'text-green-800' : 'text-red-800'}`}>
                      {discrepancy > 0 ? (
                        <>
                          💡 <strong>Excess Cash Detected:</strong> Please verify all payments were recorded correctly.
                          Consider checking for any unrecorded digital payments or cash deposits.
                        </>
                      ) : (
                        <>
                          💡 <strong>Cash Shortage Detected:</strong> Please recount cash and verify all transactions.
                          Check for any unreported expenses or missing payment records.
                        </>
                      )}
                    </p>
                  </div>
                )}

                {Math.abs(discrepancy) < 10 && (
                  <p className="text-xs text-green-700 mt-2">
                    ✓ Cash reconciliation successful. Discrepancy within acceptable range (±₹10).
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Help Text */}
        {enteredClosingCash === 0 && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              💡 <strong>Tip:</strong> The expected closing cash is <strong>₹{revenueData.expectedClosingCash.toFixed(2)}</strong> based on
              opening cash (₹{openingCashAmount.toFixed(2)}) + cash revenue (₹{revenueData.cashRevenue.toFixed(2)}).
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ShiftEndReconciliation
