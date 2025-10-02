// =============================================================================
// SHIFT START FORM COMPONENT
// Event-Driven Shift Management - New Shift Initiation
// =============================================================================

import React, { useState, useEffect } from 'react';

interface Employee {
  id: string;
  name: string;
  employee_id: string;
  is_active: boolean;
}

interface ShiftStartFormProps {
  onShiftStarted: () => void;
  className?: string;
}

interface FormData {
  employeeId: string;
  employeeName: string;
  openingCash: number;
  notes: string;
}

interface FormErrors {
  employeeId?: string;
  employeeName?: string;
  openingCash?: string;
  notes?: string;
}

export const ShiftStartForm: React.FC<ShiftStartFormProps> = ({
  onShiftStarted,
  className = ''
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    employeeId: '',
    employeeName: '',
    openingCash: 0,
    notes: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Load available employees
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const response = await fetch('/api/employees?status=active');
        if (response.ok) {
          const data = await response.json();
          setEmployees(data.employees || []);
        } else {
          console.error('Failed to load employees');
        }
      } catch (error) {
        console.error('Error loading employees:', error);
      } finally {
        setLoadingEmployees(false);
      }
    };

    loadEmployees();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.employeeId.trim()) {
      newErrors.employeeId = 'Employee selection is required';
    }

    if (!formData.employeeName.trim()) {
      newErrors.employeeName = 'Employee name is required';
    }

    if (formData.openingCash < 0) {
      newErrors.openingCash = 'Opening cash amount cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmployeeSelect = (employeeId: string) => {
    const selectedEmployee = employees.find(emp => emp.id === employeeId);
    setFormData(prev => ({
      ...prev,
      employeeId,
      employeeName: selectedEmployee ? selectedEmployee.name : ''
    }));

    // Clear employee-related errors
    setErrors(prev => ({
      ...prev,
      employeeId: undefined,
      employeeName: undefined
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await fetch('/api/shifts/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_id: formData.employeeId,
          employee_name: formData.employeeName,
          opening_cash_amount: formData.openingCash,
          shift_notes: formData.notes || null
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Shift started successfully:', result);
        onShiftStarted();

        // Reset form
        setFormData({
          employeeId: '',
          employeeName: '',
          openingCash: 0,
          notes: ''
        });
      } else {
        const errorData = await response.json();
        console.error('Failed to start shift:', errorData);

        if (errorData.details) {
          setErrors({ employeeId: errorData.details });
        }
      }
    } catch (error) {
      console.error('Error starting shift:', error);
      setErrors({ employeeId: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 ${className}`}>
      <div className="p-6">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Start New Shift</h2>
          <p className="text-gray-600 mt-2">Begin a new parking management shift</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Employee Selection */}
          <div>
            <label htmlFor="employee-select" className="block text-sm font-medium text-gray-700 mb-2">
              Select Employee *
            </label>
            {loadingEmployees ? (
              <div className="animate-pulse h-10 bg-gray-200 rounded-lg"></div>
            ) : (
              <select
                id="employee-select"
                value={formData.employeeId}
                onChange={(e) => handleEmployeeSelect(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.employeeId ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={loading}
                aria-describedby={errors.employeeId ? 'employee-error' : undefined}
              >
                <option value="">Choose an employee...</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} ({employee.employee_id})
                  </option>
                ))}
              </select>
            )}
            {errors.employeeId && (
              <p id="employee-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.employeeId}
              </p>
            )}
          </div>

          {/* Employee Name Display */}
          {formData.employeeName && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee Name
              </label>
              <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                {formData.employeeName}
              </div>
            </div>
          )}

          {/* Opening Cash Amount */}
          <div>
            <label htmlFor="opening-cash" className="block text-sm font-medium text-gray-700 mb-2">
              Opening Cash Amount *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">₹</span>
              </div>
              <input
                id="opening-cash"
                type="number"
                min="0"
                step="1"
                value={formData.openingCash}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  openingCash: Math.max(0, parseFloat(e.target.value) || 0)
                }))}
                className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.openingCash ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0"
                disabled={loading}
                aria-describedby={errors.openingCash ? 'cash-error' : undefined}
              />
            </div>
            {errors.openingCash && (
              <p id="cash-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.openingCash}
              </p>
            )}
          </div>

          {/* Shift Notes */}
          <div>
            <label htmlFor="shift-notes" className="block text-sm font-medium text-gray-700 mb-2">
              Shift Notes (Optional)
            </label>
            <textarea
              id="shift-notes"
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                notes: e.target.value
              }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional notes for this shift..."
              disabled={loading}
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || loadingEmployees}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Starting Shift...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Start Shift
                </>
              )}
            </button>
          </div>
        </form>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Starting a New Shift
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Select the employee who will manage this shift</li>
                  <li>Enter the starting cash amount in the register</li>
                  <li>Add any relevant notes for the shift</li>
                  <li>Click "Start Shift" to begin parking operations</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};