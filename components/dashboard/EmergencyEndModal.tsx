// =============================================================================
// EMERGENCY END MODAL COMPONENT
// Event-Driven Shift Management - Emergency Shift Termination
// =============================================================================

import React, { useState } from 'react';
import { ShiftSession } from '../../lib/types/shift';

interface EmergencyEndModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentShift: ShiftSession | null;
  onEmergencyComplete: (result: any) => void;
}

interface EmergencyFormData {
  reason: string;
  supervisorId: string;
  supervisorPassword: string;
  closingCash: number;
  additionalNotes: string;
}

export const EmergencyEndModal: React.FC<EmergencyEndModalProps> = ({
  isOpen,
  onClose,
  currentShift,
  onEmergencyComplete
}) => {
  const [formData, setFormData] = useState<EmergencyFormData>({
    reason: '',
    supervisorId: '',
    supervisorPassword: '',
    closingCash: 0,
    additionalNotes: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // Common emergency reasons
  const emergencyReasons = [
    'Medical Emergency',
    'Family Emergency',
    'System Failure',
    'Security Incident',
    'Equipment Malfunction',
    'Weather Emergency',
    'Power Outage',
    'Other (Specify in notes)'
  ];

  // Mock supervisors - in real app, this would come from API
  const supervisors = [
    { id: 'sup-001', name: 'John Manager', role: 'Supervisor' },
    { id: 'sup-002', name: 'Sarah Director', role: 'Manager' },
    { id: 'sup-003', name: 'Mike Admin', role: 'Admin' }
  ];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.reason.trim()) {
      newErrors.reason = 'Emergency reason is required';
    }

    if (!formData.supervisorId) {
      newErrors.supervisorId = 'Supervisor authorization is required';
    }

    if (!formData.supervisorPassword.trim()) {
      newErrors.supervisorPassword = 'Supervisor password is required';
    }

    if (formData.closingCash < 0) {
      newErrors.closingCash = 'Closing cash cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !currentShift) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/shifts/emergency/${currentShift.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: formData.reason + (formData.additionalNotes ? ` - ${formData.additionalNotes}` : ''),
          supervisor_id: formData.supervisorId,
          closing_cash_amount: formData.closingCash || currentShift.opening_cash_amount
        }),
      });

      const result = await response.json();

      if (result.success) {
        onEmergencyComplete(result.data);
        onClose();
      } else {
        setErrors({ submit: result.error || 'Emergency termination failed' });
      }
    } catch (error: any) {
      setErrors({ submit: error.message || 'Network error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleReasonChange = (reason: string) => {
    setFormData(prev => ({ ...prev, reason }));
    if (reason && !showPasswordConfirm) {
      setShowPasswordConfirm(true);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-red-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        ></div>

        {/* Modal positioning */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal content */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="bg-red-50 px-6 pt-6 pb-4 border-b border-red-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-red-100 rounded-full p-3 mr-4">
                    <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-red-800" id="modal-title">
                      Emergency Shift Termination
                    </h3>
                    <p className="text-sm text-red-600 mt-1">
                      This action requires supervisor authorization
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-red-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg p-1"
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Warning Notice */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mx-6 mt-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>Warning:</strong> Emergency termination will immediately end the current shift and create an audit record.
                    This action cannot be undone and requires supervisor approval.
                  </p>
                </div>
              </div>
            </div>

            {/* Current Shift Info */}
            {currentShift && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mx-6 mt-4">
                <h4 className="font-semibold text-gray-800 mb-2">Current Shift Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 font-medium">Employee:</span> {currentShift.employee_name}
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">Started:</span> {new Date(currentShift.shift_start_time).toLocaleString()}
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">Opening Cash:</span> {formatCurrency(currentShift.opening_cash_amount)}
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">Duration:</span> {
                      Math.round((new Date().getTime() - new Date(currentShift.shift_start_time).getTime()) / (1000 * 60))
                    } minutes
                  </div>
                </div>
              </div>
            )}

            {/* Form Content */}
            <div className="px-6 py-6 space-y-6">
              {/* Emergency Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Reason *
                </label>
                <div className="space-y-2">
                  {emergencyReasons.map((reason) => (
                    <label key={reason} className="flex items-center">
                      <input
                        type="radio"
                        name="emergencyReason"
                        value={reason}
                        checked={formData.reason === reason}
                        onChange={(e) => handleReasonChange(e.target.value)}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                      />
                      <span className="ml-3 text-sm text-gray-700">{reason}</span>
                    </label>
                  ))}
                </div>
                {errors.reason && (
                  <p className="mt-2 text-sm text-red-600">{errors.reason}</p>
                )}
              </div>

              {/* Additional Notes */}
              {(formData.reason === 'Other (Specify in notes)' || formData.reason) && (
                <div>
                  <label htmlFor="additionalNotes" className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes {formData.reason === 'Other (Specify in notes)' ? '*' : ''}
                  </label>
                  <textarea
                    id="additionalNotes"
                    value={formData.additionalNotes}
                    onChange={(e) => setFormData(prev => ({ ...prev, additionalNotes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Provide detailed explanation of the emergency situation..."
                    rows={3}
                    required={formData.reason === 'Other (Specify in notes)'}
                  />
                </div>
              )}

              {/* Supervisor Authorization */}
              {showPasswordConfirm && (
                <div className="space-y-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800">Supervisor Authorization Required</h4>

                  <div>
                    <label htmlFor="supervisorId" className="block text-sm font-medium text-gray-700 mb-2">
                      Authorizing Supervisor *
                    </label>
                    <select
                      id="supervisorId"
                      value={formData.supervisorId}
                      onChange={(e) => setFormData(prev => ({ ...prev, supervisorId: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                        errors.supervisorId ? 'border-red-300' : 'border-gray-300'
                      }`}
                      required
                    >
                      <option value="">Select supervisor</option>
                      {supervisors.map(supervisor => (
                        <option key={supervisor.id} value={supervisor.id}>
                          {supervisor.name} ({supervisor.role})
                        </option>
                      ))}
                    </select>
                    {errors.supervisorId && (
                      <p className="mt-1 text-sm text-red-600">{errors.supervisorId}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="supervisorPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Supervisor Password *
                    </label>
                    <input
                      id="supervisorPassword"
                      type="password"
                      value={formData.supervisorPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, supervisorPassword: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                        errors.supervisorPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter supervisor password"
                      required
                    />
                    {errors.supervisorPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.supervisorPassword}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Closing Cash */}
              {showPasswordConfirm && (
                <div>
                  <label htmlFor="closingCash" className="block text-sm font-medium text-gray-700 mb-2">
                    Closing Cash Count (Optional)
                  </label>
                  <input
                    id="closingCash"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.closingCash}
                    onChange={(e) => setFormData(prev => ({ ...prev, closingCash: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder={`Default: ${formatCurrency(currentShift?.opening_cash_amount || 0)}`}
                  />
                  <p className="mt-1 text-sm text-gray-600">
                    Leave empty to use opening cash amount ({formatCurrency(currentShift?.opening_cash_amount || 0)})
                  </p>
                  {errors.closingCash && (
                    <p className="mt-1 text-sm text-red-600">{errors.closingCash}</p>
                  )}
                </div>
              )}

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

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading || !formData.reason || !formData.supervisorId || !formData.supervisorPassword}
                className="inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Terminating Shift...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Emergency Terminate
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};