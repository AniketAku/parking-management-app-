// =============================================================================
// SHIFT HANDOVER MODAL COMPONENT
// Event-Driven Shift Management - Complete Handover Workflow
// =============================================================================

import React, { useState, useEffect } from 'react';
import { ShiftSession } from '../../lib/types/shift';

interface HandoverFormData {
  closingCash: number;
  incomingEmployeeId: string;
  incomingEmployeeName: string;
  incomingEmployeePhone: string;
  handoverNotes: string;
  pendingIssues: string;
  urgentMatters: string;
}

interface Employee {
  id: string;
  name: string;
  phone?: string;
  role: string;
}

interface ShiftHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentShift: ShiftSession | null;
  onHandoverComplete: (result: any) => void;
}

export const ShiftHandoverModal: React.FC<ShiftHandoverModalProps> = ({
  isOpen,
  onClose,
  currentShift,
  onHandoverComplete
}) => {
  const [formData, setFormData] = useState<HandoverFormData>({
    closingCash: 0,
    incomingEmployeeId: '',
    incomingEmployeeName: '',
    incomingEmployeePhone: '',
    handoverNotes: '',
    pendingIssues: '',
    urgentMatters: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [employees] = useState<Employee[]>([
    { id: 'emp-002', name: 'Jane Smith', phone: '+1234567891', role: 'Operator' },
    { id: 'emp-003', name: 'Mike Johnson', phone: '+1234567892', role: 'Supervisor' },
    { id: 'emp-004', name: 'Sarah Wilson', phone: '+1234567893', role: 'Operator' },
    { id: 'emp-005', name: 'David Brown', phone: '+1234567894', role: 'Manager' }
  ]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && currentShift) {
      setFormData({
        closingCash: currentShift.opening_cash_amount,
        incomingEmployeeId: '',
        incomingEmployeeName: '',
        incomingEmployeePhone: '',
        handoverNotes: '',
        pendingIssues: '',
        urgentMatters: ''
      });
      setErrors({});
    }
  }, [isOpen, currentShift]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.closingCash < 0) {
      newErrors.closingCash = 'Closing cash cannot be negative';
    }

    if (!formData.incomingEmployeeId) {
      newErrors.incomingEmployeeId = 'Please select an incoming employee';
    }

    if (!formData.incomingEmployeeName.trim()) {
      newErrors.incomingEmployeeName = 'Employee name is required';
    }

    if (!formData.handoverNotes.trim()) {
      newErrors.handoverNotes = 'Handover notes are required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmployeeSelect = (employeeId: string) => {
    const selectedEmployee = employees.find(emp => emp.id === employeeId);
    if (selectedEmployee) {
      setFormData(prev => ({
        ...prev,
        incomingEmployeeId: employeeId,
        incomingEmployeeName: selectedEmployee.name,
        incomingEmployeePhone: selectedEmployee.phone || ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !currentShift) return;

    setLoading(true);
    try {
      const response = await fetch('/api/shifts/handover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          closing_cash_amount: formData.closingCash,
          handover_notes: formData.handoverNotes,
          pending_issues: formData.pendingIssues || undefined,
          incoming_employee_id: formData.incomingEmployeeId,
          incoming_employee_name: formData.incomingEmployeeName,
          incoming_employee_phone: formData.incomingEmployeePhone || undefined,
          change_type: 'normal'
        }),
      });

      const result = await response.json();

      if (result.success) {
        onHandoverComplete(result.data);
        onClose();
      } else {
        setErrors({ submit: result.error || 'Handover failed' });
      }
    } catch (error: any) {
      setErrors({ submit: error.message || 'Network error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const cashDifference = formData.closingCash - (currentShift?.opening_cash_amount || 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        ></div>

        {/* Modal positioning */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal content */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900" id="modal-title">
                  Shift Handover
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1"
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {currentShift && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Current Shift Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700 font-medium">Employee:</span> {currentShift.employee_name}
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Started:</span> {new Date(currentShift.shift_start_time).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {/* Cash Reconciliation */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-3">Cash Reconciliation</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Opening Cash
                      </label>
                      <div className="text-lg font-mono bg-gray-100 px-3 py-2 rounded border">
                        {formatCurrency(currentShift?.opening_cash_amount || 0)}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="closingCash" className="block text-sm font-medium text-gray-700 mb-1">
                        Closing Cash Count *
                      </label>
                      <input
                        id="closingCash"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.closingCash}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          closingCash: parseFloat(e.target.value) || 0
                        }))}
                        className={`w-full text-lg font-mono px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.closingCash ? 'border-red-300' : 'border-gray-300'
                        }`}
                        required
                      />
                      {errors.closingCash && (
                        <p className="mt-1 text-sm text-red-600">{errors.closingCash}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Difference
                      </label>
                      <div className={`text-lg font-mono px-3 py-2 rounded border ${
                        cashDifference === 0
                          ? 'bg-green-100 border-green-300 text-green-800'
                          : cashDifference > 0
                            ? 'bg-blue-100 border-blue-300 text-blue-800'
                            : 'bg-red-100 border-red-300 text-red-800'
                      }`}>
                        {cashDifference >= 0 ? '+' : ''}{formatCurrency(cashDifference)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Employee Selection */}
                <div>
                  <label htmlFor="incomingEmployee" className="block text-sm font-medium text-gray-700 mb-2">
                    Incoming Employee *
                  </label>
                  <select
                    id="incomingEmployee"
                    value={formData.incomingEmployeeId}
                    onChange={(e) => handleEmployeeSelect(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.incomingEmployeeId ? 'border-red-300' : 'border-gray-300'
                    }`}
                    required
                  >
                    <option value="">Select incoming employee</option>
                    {employees
                      .filter(emp => emp.id !== currentShift?.employee_id)
                      .map(employee => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name} ({employee.role})
                        </option>
                      ))}
                  </select>
                  {errors.incomingEmployeeId && (
                    <p className="mt-1 text-sm text-red-600">{errors.incomingEmployeeId}</p>
                  )}
                </div>

                {/* Manual Employee Entry */}
                {formData.incomingEmployeeId === '' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="incomingEmployeeName" className="block text-sm font-medium text-gray-700 mb-1">
                        Employee Name (Manual Entry)
                      </label>
                      <input
                        id="incomingEmployeeName"
                        type="text"
                        value={formData.incomingEmployeeName}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          incomingEmployeeName: e.target.value
                        }))}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.incomingEmployeeName ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Enter employee name"
                      />
                      {errors.incomingEmployeeName && (
                        <p className="mt-1 text-sm text-red-600">{errors.incomingEmployeeName}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="incomingEmployeePhone" className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        id="incomingEmployeePhone"
                        type="tel"
                        value={formData.incomingEmployeePhone}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          incomingEmployeePhone: e.target.value
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="+91 XXXXX XXXXX"
                      />
                    </div>
                  </div>
                )}

                {/* Handover Notes */}
                <div>
                  <label htmlFor="handoverNotes" className="block text-sm font-medium text-gray-700 mb-2">
                    Handover Notes *
                  </label>
                  <textarea
                    id="handoverNotes"
                    value={formData.handoverNotes}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      handoverNotes: e.target.value
                    }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.handoverNotes ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Important information for the next shift..."
                    rows={4}
                    required
                  />
                  {errors.handoverNotes && (
                    <p className="mt-1 text-sm text-red-600">{errors.handoverNotes}</p>
                  )}
                </div>

                {/* Pending Issues */}
                <div>
                  <label htmlFor="pendingIssues" className="block text-sm font-medium text-gray-700 mb-2">
                    Pending Issues
                  </label>
                  <textarea
                    id="pendingIssues"
                    value={formData.pendingIssues}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      pendingIssues: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Any unresolved issues or follow-ups needed..."
                    rows={3}
                  />
                </div>

                {/* Urgent Matters */}
                <div>
                  <label htmlFor="urgentMatters" className="block text-sm font-medium text-gray-700 mb-2">
                    Urgent Matters
                  </label>
                  <textarea
                    id="urgentMatters"
                    value={formData.urgentMatters}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      urgentMatters: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Urgent matters requiring immediate attention..."
                    rows={2}
                  />
                </div>

                {/* Error display */}
                {errors.submit && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex">
                      <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <p className="text-red-800">{errors.submit}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing Handover...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                    </svg>
                    Complete Handover
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};