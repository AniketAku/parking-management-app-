import React, { useState, useCallback, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ShiftLinkingState, ShiftLinkingMetrics } from '../../hooks/useShiftLinking'
import { useCurrentUser } from '../../hooks/useAuth'
import { Card, CardHeader, CardContent } from '../ui'
import { Button } from '../ui/Button'
import { ShiftEndReconciliation } from './ShiftEndReconciliation'
import toast from 'react-hot-toast'
import { log } from '../../utils/secureLogger'

interface ShiftOperationsTabProps {
  linkingState: ShiftLinkingState
  linkingMetrics: ShiftLinkingMetrics
  onRefresh: () => Promise<void>
  isLoading: boolean
}

interface StartShiftFormData {
  operatorName: string
  startingCash: number
  notes: string
}

interface EndShiftFormData {
  endingCash: number
  notes: string
  isEmergency: boolean
}

interface HandoverFormData {
  newOperatorName: string
  currentCash: number
  notes: string
}

export const ShiftOperationsTab: React.FC<ShiftOperationsTabProps> = ({
  linkingState,
  linkingMetrics,
  onRefresh,
  isLoading
}) => {
  const { user } = useCurrentUser()
  const [activeOperation, setActiveOperation] = useState<'start' | 'end' | 'handover' | null>(null)
  const [operationLoading, setOperationLoading] = useState(false)
  const [startShiftData, setStartShiftData] = useState<StartShiftFormData>({
    operatorName: '',
    startingCash: 0,
    notes: ''
  })
  const [endShiftData, setEndShiftData] = useState<EndShiftFormData>({
    endingCash: 0,
    notes: '',
    isEmergency: false
  })
  const [handoverData, setHandoverData] = useState<HandoverFormData>({
    newOperatorName: '',
    currentCash: 0,
    notes: ''
  })
  const [shiftOpeningCash, setShiftOpeningCash] = useState<number>(0)
  const [hasSignificantDiscrepancy, setHasSignificantDiscrepancy] = useState(false)
  const [discrepancyAmount, setDiscrepancyAmount] = useState<number>(0)

  // Reset forms when active shift changes
  useEffect(() => {
    if (!linkingState.activeShiftId) {
      setActiveOperation(null)
    }
  }, [linkingState.activeShiftId])

  // Load suggested opening cash when starting shift operation
  useEffect(() => {
    if (activeOperation === 'start') {
      const loadSuggestedCash = async () => {
        const { data: lastShift } = await supabase
          .from('shift_sessions')
          .select('closing_cash_amount')
          .eq('status', 'completed')
          .order('shift_end_time', { ascending: false })
          .limit(1)
          .single()

        if (lastShift?.closing_cash_amount) {
          setStartShiftData(prev => ({
            ...prev,
            startingCash: lastShift.closing_cash_amount
          }))
        }
      }
      loadSuggestedCash()
    }
  }, [activeOperation])

  // Load shift opening cash when ending shift operation
  useEffect(() => {
    if (activeOperation === 'end' && linkingState.activeShiftId) {
      const loadShiftDetails = async () => {
        const { data: shiftDetails } = await supabase
          .from('shift_sessions')
          .select('opening_cash_amount')
          .eq('id', linkingState.activeShiftId)
          .single()

        if (shiftDetails?.opening_cash_amount !== undefined) {
          setShiftOpeningCash(shiftDetails.opening_cash_amount)
        }
      }
      loadShiftDetails()
    }
  }, [activeOperation, linkingState.activeShiftId])

  // Load current cash when handover operation is activated
  useEffect(() => {
    if (activeOperation === 'handover' && linkingState.activeShiftId) {
      const loadCurrentCash = async () => {
        try {
          // Get shift opening cash
          const { data: shiftData } = await supabase
            .from('shift_sessions')
            .select('opening_cash_amount')
            .eq('id', linkingState.activeShiftId)
            .single()

          const openingCash = shiftData?.opening_cash_amount || 0

          // Get today's revenue
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const todayStart = today.toISOString()
          const todayEnd = new Date()
          todayEnd.setHours(23, 59, 59, 999)

          const { data: todayEntries } = await supabase
            .from('parking_entries')
            .select('parking_fee, actual_fee, calculated_fee, status, exit_time')
            .eq('shift_session_id', linkingState.activeShiftId)
            .or(`and(entry_time.gte.${todayStart},entry_time.lte.${todayEnd.toISOString()}),and(exit_time.gte.${todayStart},exit_time.lte.${todayEnd.toISOString()})`)

          const todayRevenue = todayEntries?.reduce((sum, entry) => {
            if (entry.status === 'Exited' || entry.exit_time) {
              const fee = entry.parking_fee || entry.actual_fee || entry.calculated_fee || 0
              return sum + fee
            }
            return sum
          }, 0) || 0

          // Get total expenses
          const { data: expenseData } = await supabase
            .from('shift_expenses')
            .select('amount')
            .eq('shift_session_id', linkingState.activeShiftId)

          const expenses = expenseData?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0

          // Get total cash deposits
          const { data: depositData } = await supabase
            .from('shift_deposits')
            .select('cash_amount')
            .eq('shift_session_id', linkingState.activeShiftId)

          const totalCashDeposits = depositData?.reduce((sum, dep) => sum + Number(dep.cash_amount), 0) || 0

          // ✅ CORRECT CALCULATION: Current Cash = Opening Cash + Revenue - Expenses - Cash Deposits
          const calculatedCurrentCash = openingCash + todayRevenue - expenses - totalCashDeposits

          setHandoverData(prev => ({
            ...prev,
            currentCash: calculatedCurrentCash
          }))

          log.debug('HANDOVER - Auto-filled current cash', {
            openingCash,
            todayRevenue,
            expenses,
            totalCashDeposits,
            currentCash: calculatedCurrentCash
          })
        } catch (error) {
          log.error('Error loading current cash for handover', error)
        }
      }
      loadCurrentCash()
    }
  }, [activeOperation, linkingState.activeShiftId])

  // Reconciliation callbacks
  const handleClosingCashSuggestion = useCallback((suggestedAmount: number) => {
    setEndShiftData(prev => ({
      ...prev,
      endingCash: suggestedAmount
    }))
  }, [])

  const handleDiscrepancyDetected = useCallback((discrepancy: number, isSignificant: boolean) => {
    setDiscrepancyAmount(discrepancy)
    setHasSignificantDiscrepancy(isSignificant)
  }, [])

  // Start new shift
  const handleStartShift = useCallback(async () => {
    if (!startShiftData.operatorName.trim()) {
      toast.error('Operator name is required')
      return
    }

    if (!user?.id) {
      toast.error('User authentication required')
      return
    }

    try {
      setOperationLoading(true)

      // Get the last completed shift's ending cash to use as opening cash suggestion
      const { data: lastShift } = await supabase
        .from('shift_sessions')
        .select('closing_cash_amount')
        .eq('status', 'completed')
        .order('shift_end_time', { ascending: false })
        .limit(1)
        .single()

      const suggestedOpeningCash = lastShift?.closing_cash_amount || 0

      const { data: newShift, error } = await supabase
        .from('shift_sessions')
        .insert({
          employee_id: user?.id, // Use authenticated user's ID
          shift_start_time: new Date().toISOString(),
          status: 'active',
          employee_name: startShiftData.operatorName, // Store the human-readable operator name
          opening_cash_amount: startShiftData.startingCash || suggestedOpeningCash, // Use manual input or suggested from last shift
          shift_notes: startShiftData.notes // Store the notes
        })
        .select()
        .single()

      if (error) throw error

      toast.success(`Shift started successfully for ${startShiftData.operatorName}`)

      // Reset form
      setStartShiftData({
        operatorName: '',
        startingCash: 0,
        notes: ''
      })
      setActiveOperation(null)

      // Refresh data
      await onRefresh()
    } catch (error) {
      log.error('Failed to start shift', error)
      toast.error('Failed to start shift. Please try again.')
    } finally {
      setOperationLoading(false)
    }
  }, [startShiftData, onRefresh, user])

  // End current shift
  const handleEndShift = useCallback(async () => {
    if (!linkingState.activeShiftId) {
      toast.error('No active shift to end')
      return
    }

    // Warn about significant discrepancy
    if (hasSignificantDiscrepancy && !endShiftData.isEmergency) {
      const discrepancyMessage = discrepancyAmount > 0
        ? `Excess cash of ₹${Math.abs(discrepancyAmount).toFixed(2)} detected.`
        : `Cash shortage of ₹${Math.abs(discrepancyAmount).toFixed(2)} detected.`

      const confirmEnd = window.confirm(
        `⚠️ Cash Discrepancy Detected!\n\n${discrepancyMessage}\n\n` +
        `Please verify:\n` +
        `- All transactions are recorded correctly\n` +
        `- Cash count is accurate\n` +
        `- No unreported expenses or deposits\n\n` +
        `Do you want to proceed with ending the shift?`
      )

      if (!confirmEnd) {
        toast.error('Shift end cancelled. Please verify cash and transactions.')
        return
      }
    }

    try {
      setOperationLoading(true)

      const endTime = new Date().toISOString()

      // Include discrepancy note if significant
      const finalNotes = hasSignificantDiscrepancy
        ? `${endShiftData.notes ? endShiftData.notes + ' | ' : ''}Cash discrepancy: ${discrepancyAmount > 0 ? '+' : ''}₹${discrepancyAmount.toFixed(2)}`
        : endShiftData.notes

      const { error } = await supabase
        .from('shift_sessions')
        .update({
          shift_end_time: endTime,
          closing_cash_amount: endShiftData.endingCash,
          status: endShiftData.isEmergency ? 'emergency_ended' : 'completed',
          shift_notes: finalNotes
        })
        .eq('id', linkingState.activeShiftId)

      if (error) throw error

      toast.success(endShiftData.isEmergency ? 'Shift ended (Emergency)' : 'Shift completed successfully')

      // Reset form and state
      setEndShiftData({
        endingCash: 0,
        notes: '',
        isEmergency: false
      })
      setHasSignificantDiscrepancy(false)
      setDiscrepancyAmount(0)
      setActiveOperation(null)

      // Refresh data
      await onRefresh()
    } catch (error) {
      log.error('Failed to end shift', error)
      toast.error('Failed to end shift. Please try again.')
    } finally {
      setOperationLoading(false)
    }
  }, [linkingState.activeShiftId, endShiftData, onRefresh, hasSignificantDiscrepancy, discrepancyAmount])

  // Handover to new operator
  const handleHandover = useCallback(async () => {
    if (!linkingState.activeShiftId) {
      toast.error('No active shift for handover')
      return
    }

    if (!handoverData.newOperatorName.trim()) {
      toast.error('New operator name is required')
      return
    }

    try {
      setOperationLoading(true)

      // End current shift and start new one in a transaction
      const handoverTime = new Date().toISOString()

      // End current shift
      const { error: endError } = await supabase
        .from('shift_sessions')
        .update({
          shift_end_time: handoverTime,
          closing_cash_amount: handoverData.currentCash,
          status: 'completed',
          shift_notes: `Handover to ${handoverData.newOperatorName}${handoverData.notes ? ` - ${handoverData.notes}` : ''}`
        })
        .eq('id', linkingState.activeShiftId)

      if (endError) throw endError

      // Start new shift
      const { data: newShift, error: startError } = await supabase
        .from('shift_sessions')
        .insert({
          employee_id: user?.id, // Use authenticated user's ID
          employee_name: handoverData.newOperatorName, // New operator name
          shift_start_time: handoverTime,
          status: 'active',
          opening_cash_amount: handoverData.currentCash, // Starting cash from previous shift
          shift_notes: `Shift handed over from previous operator${handoverData.notes ? ` - ${handoverData.notes}` : ''}`
        })
        .select()
        .single()

      if (startError) throw startError

      toast.success(`Shift handed over to ${handoverData.newOperatorName}`)

      // Reset form
      setHandoverData({
        newOperatorName: '',
        currentCash: 0,
        notes: ''
      })
      setActiveOperation(null)

      // Refresh data
      await onRefresh()
    } catch (error) {
      log.error('Failed to handover shift', error)
      toast.error('Failed to handover shift. Please try again.')
    } finally{
      setOperationLoading(false)
    }
  }, [linkingState.activeShiftId, handoverData, onRefresh])

  const renderOperationPanel = () => {
    if (!activeOperation) return null

    switch (activeOperation) {
      case 'start':
        return (
          <Card className="mt-6">
            <CardHeader>
              <h3 className="text-xl font-semibold text-gray-900">Start New Shift</h3>
              <p className="text-sm text-gray-600">Initialize a new shift session with operator details</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operator Name *
                </label>
                <input
                  type="text"
                  value={startShiftData.operatorName}
                  onChange={(e) => setStartShiftData(prev => ({ ...prev, operatorName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter operator name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Starting Cash (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={startShiftData.startingCash}
                  onChange={(e) => setStartShiftData(prev => ({ ...prev, startingCash: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={startShiftData.notes}
                  onChange={(e) => setStartShiftData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Additional notes about shift start..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={handleStartShift}
                  disabled={operationLoading || !startShiftData.operatorName.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {operationLoading ? 'Starting...' : 'Start Shift'}
                </Button>
                <Button
                  onClick={() => setActiveOperation(null)}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )

      case 'end':
        return (
          <>
            <Card className="mt-6">
              <CardHeader>
                <h3 className="text-xl font-semibold text-gray-900">End Current Shift</h3>
                <p className="text-sm text-gray-600">Complete the current shift session with cash reconciliation</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ending Cash (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={endShiftData.endingCash}
                    onChange={(e) => setEndShiftData(prev => ({ ...prev, endingCash: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Count and enter closing cash amount"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Count all cash in the drawer and enter the total amount
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Notes (Optional)
                  </label>
                  <textarea
                    value={endShiftData.notes}
                    onChange={(e) => setEndShiftData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Notes about shift end, issues, or discrepancies..."
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="emergency-end"
                    checked={endShiftData.isEmergency}
                    onChange={(e) => setEndShiftData(prev => ({ ...prev, isEmergency: e.target.checked }))}
                    className="mr-2"
                  />
                  <label htmlFor="emergency-end" className="text-sm text-gray-700">
                    Emergency End (unexpected termination)
                  </label>
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button
                    onClick={handleEndShift}
                    disabled={operationLoading}
                    className={`flex-1 ${endShiftData.isEmergency ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {operationLoading ? 'Ending...' : (endShiftData.isEmergency ? 'Emergency End' : 'End Shift')}
                  </Button>
                  <Button
                    onClick={() => setActiveOperation(null)}
                    variant="secondary"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Cash Reconciliation Component */}
            {linkingState.activeShiftId && (
              <ShiftEndReconciliation
                shiftId={linkingState.activeShiftId}
                openingCashAmount={shiftOpeningCash}
                enteredClosingCash={endShiftData.endingCash}
                onClosingCashSuggestion={handleClosingCashSuggestion}
                onDiscrepancyDetected={handleDiscrepancyDetected}
              />
            )}
          </>
        )

      case 'handover':
        return (
          <Card className="mt-6">
            <CardHeader>
              <h3 className="text-xl font-semibold text-gray-900">Shift Handover</h3>
              <p className="text-sm text-gray-600">Transfer shift to a new operator</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Operator Name *
                </label>
                <input
                  type="text"
                  value={handoverData.newOperatorName}
                  onChange={(e) => setHandoverData(prev => ({ ...prev, newOperatorName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter new operator name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Cash Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={handoverData.currentCash}
                  onChange={(e) => setHandoverData(prev => ({ ...prev, currentCash: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Handover Notes (Optional)
                </label>
                <textarea
                  value={handoverData.notes}
                  onChange={(e) => setHandoverData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Notes about the handover..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={handleHandover}
                  disabled={operationLoading || !handoverData.newOperatorName.trim()}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  {operationLoading ? 'Processing...' : 'Complete Handover'}
                </Button>
                <Button
                  onClick={() => setActiveOperation(null)}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )

      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
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
        <h2 className="text-2xl font-bold text-gray-900">Shift Operations</h2>
        <div className="text-sm text-gray-500">
          {linkingState.activeShiftId ? 'Active Shift' : 'No Active Shift'}
        </div>
      </div>

      {/* Operation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Start Shift */}
        <Card className={!linkingState.activeShiftId ? 'border-green-200 bg-green-50' : 'opacity-50'}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Start Shift</h3>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Initialize a new shift session with operator details and starting cash.
            </p>
            <Button
              onClick={() => setActiveOperation('start')}
              disabled={!!linkingState.activeShiftId || activeOperation === 'start'}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300"
            >
              {!!linkingState.activeShiftId ? 'Shift Already Active' : 'Start New Shift'}
            </Button>
          </CardContent>
        </Card>

        {/* End Shift */}
        <Card className={linkingState.activeShiftId ? 'border-red-200 bg-red-50' : 'opacity-50'}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">End Shift</h3>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Complete the current shift session with final cash count and notes.
            </p>
            <Button
              onClick={() => setActiveOperation('end')}
              disabled={!linkingState.activeShiftId || activeOperation === 'end'}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300"
            >
              {!linkingState.activeShiftId ? 'No Active Shift' : 'End Current Shift'}
            </Button>
          </CardContent>
        </Card>

        {/* Handover */}
        <Card className={linkingState.activeShiftId ? 'border-purple-200 bg-purple-50' : 'opacity-50'}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Handover</h3>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Transfer the current shift to a new operator seamlessly.
            </p>
            <Button
              onClick={() => setActiveOperation('handover')}
              disabled={!linkingState.activeShiftId || activeOperation === 'handover'}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300"
            >
              {!linkingState.activeShiftId ? 'No Active Shift' : 'Handover Shift'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Current Shift Info */}
      {linkingState.activeShiftId && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Current Shift Information</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">Shift ID</div>
                <div className="text-lg font-semibold text-blue-900">{linkingState.activeShiftId}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Sessions Linked</div>
                <div className="text-lg font-semibold text-green-900">{linkingMetrics.sessionsLinked}</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-purple-600 font-medium">Payments Linked</div>
                <div className="text-lg font-semibold text-purple-900">{linkingMetrics.paymentsLinked}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Operation Panel */}
      {renderOperationPanel()}
    </div>
  )
}

export default ShiftOperationsTab