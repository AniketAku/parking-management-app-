// =============================================================================
// DEPOSITS TAB
// Track and manage daily deposits with role-based access control
// =============================================================================

import React, { useState, useEffect, useMemo } from 'react'
import { useCurrentUser } from '../../hooks/useAuth'
import type { UseShiftDataReturn } from '../../hooks/useShiftData'
import { depositService } from '../../services/depositService'
import toast from 'react-hot-toast'
import { log } from '../../utils/secureLogger'

interface DepositsTabProps {
  shiftData: UseShiftDataReturn
  onRefresh?: () => Promise<void>
  isLoading?: boolean
}

interface DepositFormData {
  cashAmount: string
  digitalAmount: string
  notes: string
}

export const DepositsTab: React.FC<DepositsTabProps> = ({
  shiftData,
  onRefresh
}) => {
  const { user } = useCurrentUser()
  const [loading, setLoading] = useState(false)
  const [userRole, setUserRole] = useState<'admin' | 'operator' | 'viewer'>('viewer')
  const [formData, setFormData] = useState<DepositFormData>({
    cashAmount: '',
    digitalAmount: '',
    notes: ''
  })
  const [formErrors, setFormErrors] = useState<Partial<DepositFormData>>({})

  // ✅ CLEAN: All data comes from centralized shiftData hook
  const { shift, deposits, totalCashDeposits, totalDigitalDeposits, currentCash } = shiftData

  // ✅ Calculate summary from shiftData (no separate fetch needed)
  const summary = useMemo(() => {
    const totalDeposits = totalCashDeposits + totalDigitalDeposits
    const depositCount = deposits.length

    // Pending cash = current cash on hand (already accounts for deposits)
    const pendingCash = currentCash

    return {
      totalCashDeposits,
      totalDigitalDeposits,
      totalDeposits,
      depositCount,
      pendingCash
    }
  }, [totalCashDeposits, totalDigitalDeposits, deposits.length, currentCash])


  // ✅ REMOVED: Data fetching - now comes from shiftData prop
  // ✅ REMOVED: Real-time subscriptions - handled by useShiftData hook

  // Get user role from user object
  useEffect(() => {
    if (!user) return

    // The user object already contains the role
    const role = (user as { role?: string }).role

    if (role && ['admin', 'operator', 'viewer'].includes(role)) {
      setUserRole(role as 'admin' | 'operator' | 'viewer')
    } else {
      setUserRole('operator')
    }
  }, [user])

  // Validate form
  const validateForm = (): boolean => {
    const errors: Partial<DepositFormData> = {}

    const cashAmount = parseFloat(formData.cashAmount || '0')
    const digitalAmount = parseFloat(formData.digitalAmount || '0')

    if (isNaN(cashAmount) || cashAmount < 0) {
      errors.cashAmount = 'Invalid cash amount'
    }

    if (isNaN(digitalAmount) || digitalAmount < 0) {
      errors.digitalAmount = 'Invalid digital amount'
    }

    if (cashAmount === 0 && digitalAmount === 0) {
      errors.cashAmount = 'At least one amount must be greater than zero'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!shift) {
      toast.error('No active shift found')
      return
    }

    if (!validateForm()) return

    try {
      setLoading(true)

      const result = await depositService.createDeposit({
        shift_session_id: shift.id,
        cash_amount: parseFloat(formData.cashAmount || '0'),
        digital_amount: parseFloat(formData.digitalAmount || '0'),
        notes: formData.notes || undefined
      })

      if (result.success) {
        toast.success('Deposit created successfully')
        setFormData({
          cashAmount: '',
          digitalAmount: '',
          notes: ''
        })
        // ✅ Real-time subscription will auto-update deposits
        // Just refresh to ensure consistency
        if (onRefresh) await onRefresh()
      } else {
        toast.error(result.error || 'Failed to create deposit')
      }
    } catch (error) {
      log.error('Error creating deposit', error)
      toast.error('Failed to create deposit')
    } finally {
      setLoading(false)
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  // Format time
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!shift && userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Shift</h3>
          <p className="text-gray-600">Start a shift to record deposits.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6 border-2 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Total Cash Deposits</p>
              <p className="text-3xl font-bold text-green-900">{formatCurrency(summary.totalCashDeposits)}</p>
            </div>
            <div className="p-3 bg-green-500 rounded-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 border-2 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Digital Deposits</p>
              <p className="text-3xl font-bold text-blue-900">{formatCurrency(summary.totalDigitalDeposits)}</p>
            </div>
            <div className="p-3 bg-blue-500 rounded-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-6 border-2 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Total Deposits</p>
              <p className="text-3xl font-bold text-purple-900">{formatCurrency(summary.totalDeposits)}</p>
              <p className="text-xs text-purple-500 mt-1">{summary.depositCount} {summary.depositCount === 1 ? 'deposit' : 'deposits'}</p>
            </div>
            <div className="p-3 bg-purple-500 rounded-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        <div className={`bg-gradient-to-r rounded-lg p-6 border-2 ${
          summary.pendingCash > 0
            ? 'from-orange-50 to-orange-100 border-orange-200'
            : 'from-gray-50 to-gray-100 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${summary.pendingCash > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                Pending Cash
              </p>
              <p className={`text-3xl font-bold ${summary.pendingCash > 0 ? 'text-orange-900' : 'text-gray-900'}`}>
                {formatCurrency(summary.pendingCash)}
              </p>
              <p className={`text-xs mt-1 ${summary.pendingCash > 0 ? 'text-orange-500' : 'text-gray-500'}`}>
                Not yet deposited
              </p>
            </div>
            <div className={`p-3 rounded-lg ${summary.pendingCash > 0 ? 'bg-orange-500' : 'bg-gray-500'}`}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Create Deposit Form - Operator and Admin */}
      {(userRole === 'operator' || userRole === 'admin') && shift && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Record New Deposit</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cash Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cashAmount}
                  onChange={(e) => setFormData({ ...formData, cashAmount: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    formErrors.cashAmount ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {formErrors.cashAmount && (
                  <p className="text-sm text-red-600 mt-1">{formErrors.cashAmount}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Digital Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.digitalAmount}
                  onChange={(e) => setFormData({ ...formData, digitalAmount: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.digitalAmount ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {formErrors.digitalAmount && (
                  <p className="text-sm text-red-600 mt-1">{formErrors.digitalAmount}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Add any notes about this deposit..."
              />
            </div>

            <div className="flex items-center justify-end space-x-4">
              <button
                type="button"
                onClick={() => setFormData({ cashAmount: '', digitalAmount: '', notes: '' })}
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={loading}
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading && (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                <span>Create Deposit</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Deposits Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {userRole === 'admin' ? 'All Deposits' : "Today's Deposits"}
            </h3>
            <div className="text-sm text-gray-600">
              {deposits.length} {deposits.length === 1 ? 'deposit' : 'deposits'}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading && deposits.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : deposits.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-lg font-medium text-gray-900 mb-2">No deposits recorded</p>
              <p className="text-gray-600">
                {userRole === 'operator' ? 'Create your first deposit using the form above.' : 'No deposits found for the selected period.'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cash Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Digital Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {deposits.map((deposit) => (
                  <tr key={deposit.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{formatDate(deposit.deposit_date)}</div>
                      <div className="text-sm text-gray-500">{formatTime(deposit.created_at)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{deposit.users?.username || 'Unknown'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-medium text-green-600">{formatCurrency(deposit.cash_amount)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-medium text-blue-600">{formatCurrency(deposit.digital_amount)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-bold text-purple-600">{formatCurrency(deposit.total_amount)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-xs truncate">{deposit.notes || '-'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
