// =============================================================================
// EXPENSE TAB
// Track and manage shift expenses with real-time updates
// =============================================================================

import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useCurrentUser } from '../../hooks/useAuth'
import type { UseShiftDataReturn } from '../../hooks/useShiftData'
import toast from 'react-hot-toast'
import { log } from '../../utils/secureLogger'

interface ExpenseTabProps {
  shiftData: UseShiftDataReturn
  onRefresh?: () => Promise<void>
  isLoading?: boolean
}

interface ExpenseFormData {
  category: string
  amount: string
  description: string
}

const EXPENSE_CATEGORIES = [
  'Maintenance',
  'Supplies',
  'Staff',
  'Utilities',
  'Other'
]

export const ExpenseTab: React.FC<ExpenseTabProps> = ({
  shiftData,
  onRefresh,
  isLoading
}) => {
  const { user } = useCurrentUser()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<ExpenseFormData>({
    category: 'Supplies',
    amount: '',
    description: ''
  })
  const [formErrors, setFormErrors] = useState<Partial<ExpenseFormData>>({})

  // ✅ CLEAN: All data comes from centralized shiftData hook
  const { shift, expenses, totalExpenses } = shiftData

  // ✅ REMOVED: All data fetching - now comes from shiftData prop
  // ✅ REMOVED: Real-time subscriptions - handled by useShiftData hook

  // Validate form
  const validateForm = (): boolean => {
    const errors: Partial<ExpenseFormData> = {}

    if (!formData.category) {
      errors.category = 'Category is required'
    }

    const amount = parseFloat(formData.amount)
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      errors.amount = 'Amount must be greater than 0'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle form submission
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!shift) {
      toast.error('No active shift. Please start a shift first.')
      return
    }

    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)

      const { error } = await supabase
        .from('shift_expenses')
        .insert({
          shift_session_id: shift.id,
          expense_category: formData.category,
          amount: parseFloat(formData.amount),
          description: formData.description || null,
          created_by: user?.id
        })

      if (error) throw error

      toast.success('Expense added successfully')

      // Reset form
      setFormData({
        category: 'Supplies',
        amount: '',
        description: ''
      })
      setFormErrors({})

      // ✅ Real-time subscription will auto-update expenses
      // Just refresh to ensure consistency
      await onRefresh?.()
    } catch (error: any) {
      log.error('Error adding expense', error)
      toast.error(error.message || 'Failed to add expense')
    } finally {
      setLoading(false)
    }
  }

  // Handle expense deletion
  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) {
      return
    }

    try {
      setLoading(true)

      const { error } = await supabase
        .from('shift_expenses')
        .delete()
        .eq('id', expenseId)

      if (error) throw error

      toast.success('Expense deleted successfully')

      // ✅ Real-time subscription will auto-update expenses
      // Just refresh to ensure consistency
      await onRefresh?.()
    } catch (error: any) {
      log.error('Error deleting expense', error)
      toast.error(error.message || 'Failed to delete expense')
    } finally {
      setLoading(false)
    }
  }

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Format date/time
  const formatDateTime = (timestamp: string): string => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // No active shift state
  if (!shift) {
    return (
      <div className="text-center py-12 text-gray-500">
        <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Shift</h3>
        <p className="text-gray-600">Start a new shift to track expenses.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Add Expense Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Add New Expense</h2>

        <form onSubmit={handleAddExpense} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.category ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              >
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {formErrors.category && (
                <p className="text-sm text-red-500 mt-1">{formErrors.category}</p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="amount"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                step="0.01"
                min="0"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.amount ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {formErrors.amount && (
                <p className="text-sm text-red-500 mt-1">{formErrors.amount}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <input
                type="text"
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional details"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Adding...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Expense
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Total Expenses Summary */}
      <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl border border-red-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-3 bg-red-500 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-red-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-900">{formatCurrency(totalExpenses)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-red-600">{expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}</p>
          </div>
        </div>
      </div>

      {/* Expense List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Expense History</h2>
          <button
            onClick={onRefresh}
            disabled={loading || isLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            <svg className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {shiftData.loading && expenses.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading expenses...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Expenses Yet</h3>
            <p className="text-gray-600">Add your first expense using the form above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {expense.expense_category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {expense.description || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDateTime(expense.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Delete expense"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default ExpenseTab
