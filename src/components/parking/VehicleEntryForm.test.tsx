// VehicleEntryForm Component Tests  
// Tests vehicle entry form validation, submission, and vehicle type handling

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, userEvent, mockFetch, cleanupMocks, fillForm } from '../../test/utils'
import { VehicleEntryForm } from '../forms/VehicleEntryForm'

// Mock the create entry hook
vi.mock('../../hooks/useCreateEntry', () => ({
  useCreateEntry: () => ({
    mutate: vi.fn(),
    loading: false,
    error: null,
  }),
}))

describe('VehicleEntryForm Component', () => {
  beforeEach(() => {
    cleanupMocks()
  })

  it('renders all form fields', () => {
    renderWithProviders(<VehicleEntryForm />)
    
    expect(screen.getByLabelText(/vehicle number/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/vehicle type/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/driver name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/driver phone/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /register entry/i })).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VehicleEntryForm />)
    
    await user.click(screen.getByRole('button', { name: /register entry/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/vehicle number is required/i)).toBeInTheDocument()
      expect(screen.getByText(/driver name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/driver phone is required/i)).toBeInTheDocument()
    })
  })

  it('validates vehicle number format', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VehicleEntryForm />)
    
    const vehicleInput = screen.getByLabelText(/vehicle number/i)
    await user.type(vehicleInput, 'INVALID')
    await user.tab()
    
    await waitFor(() => {
      expect(screen.getByText(/invalid vehicle number format/i)).toBeInTheDocument()
    })
  })

  it('validates phone number format', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VehicleEntryForm />)
    
    const phoneInput = screen.getByLabelText(/driver phone/i)
    await user.type(phoneInput, '123')
    await user.tab()
    
    await waitFor(() => {
      expect(screen.getByText(/invalid phone number format/i)).toBeInTheDocument()
    })
  })

  it('submits valid form data', async () => {
    const mockCreateEntry = vi.fn()
    vi.mocked(useCreateEntry).mockReturnValue({
      mutate: mockCreateEntry,
      loading: false,
      error: null,
    })
    
    const user = userEvent.setup()
    renderWithProviders(<VehicleEntryForm />)
    
    await fillForm(user, {
      'vehicle number': 'KA01AB1234',
      'driver name': 'John Doe',
      'driver phone': '+91-9876543210',
      'notes': 'Regular customer'
    })
    
    // Select vehicle type
    const vehicleTypeSelect = screen.getByLabelText(/vehicle type/i)
    await user.click(vehicleTypeSelect)
    await user.click(screen.getByText('Car'))
    
    await user.click(screen.getByRole('button', { name: /register entry/i }))
    
    await waitFor(() => {
      expect(mockCreateEntry).toHaveBeenCalledWith({
        vehicleNumber: 'KA01AB1234',
        vehicleType: 'car',
        driverName: 'John Doe',
        driverPhone: '+91-9876543210',
        notes: 'Regular customer',
      })
    })
  })

  it('handles different vehicle types', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VehicleEntryForm />)
    
    const vehicleTypeSelect = screen.getByLabelText(/vehicle type/i)
    await user.click(vehicleTypeSelect)
    
    expect(screen.getByText('Car')).toBeInTheDocument()
    expect(screen.getByText('Truck')).toBeInTheDocument()
    expect(screen.getByText('Bus')).toBeInTheDocument()
    expect(screen.getByText('Bike')).toBeInTheDocument()
  })

  it('shows loading state during submission', () => {
    vi.mocked(useCreateEntry).mockReturnValue({
      mutate: vi.fn(),
      loading: true,
      error: null,
    })
    
    renderWithProviders(<VehicleEntryForm />)
    
    const submitButton = screen.getByRole('button', { name: /registering/i })
    expect(submitButton).toBeDisabled()
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('displays submission errors', () => {
    vi.mocked(useCreateEntry).mockReturnValue({
      mutate: vi.fn(),
      loading: false,
      error: { message: 'Vehicle already parked' },
    })
    
    renderWithProviders(<VehicleEntryForm />)
    
    expect(screen.getByText(/vehicle already parked/i)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('resets form after successful submission', async () => {
    const mockCreateEntry = vi.fn()
    const mockReset = vi.fn()
    
    vi.mocked(useCreateEntry).mockReturnValue({
      mutate: mockCreateEntry,
      loading: false,
      error: null,
    })
    
    const user = userEvent.setup()
    renderWithProviders(<VehicleEntryForm />)
    
    await fillForm(user, {
      'vehicle number': 'KA01AB1234',
      'driver name': 'John Doe',
      'driver phone': '+91-9876543210'
    })
    
    await user.click(screen.getByRole('button', { name: /register entry/i }))
    
    // Form should reset after successful submission
    await waitFor(() => {
      expect(screen.getByLabelText(/vehicle number/i)).toHaveValue('')
      expect(screen.getByLabelText(/driver name/i)).toHaveValue('')
      expect(screen.getByLabelText(/driver phone/i)).toHaveValue('')
    })
  })

  it('auto-formats vehicle number input', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VehicleEntryForm />)
    
    const vehicleInput = screen.getByLabelText(/vehicle number/i)
    await user.type(vehicleInput, 'ka01ab1234')
    
    await waitFor(() => {
      expect(vehicleInput).toHaveValue('KA01AB1234')
    })
  })

  it('auto-formats phone number input', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VehicleEntryForm />)
    
    const phoneInput = screen.getByLabelText(/driver phone/i)
    await user.type(phoneInput, '9876543210')
    
    await waitFor(() => {
      expect(phoneInput).toHaveValue('+91-9876543210')
    })
  })

  it('handles Enter key submission', async () => {
    const mockCreateEntry = vi.fn()
    vi.mocked(useCreateEntry).mockReturnValue({
      mutate: mockCreateEntry,
      loading: false,
      error: null,
    })
    
    const user = userEvent.setup()
    renderWithProviders(<VehicleEntryForm />)
    
    await fillForm(user, {
      'vehicle number': 'KA01AB1234',
      'driver name': 'John Doe',
      'driver phone': '+91-9876543210'
    })
    
    await user.keyboard('{Enter}')
    
    await waitFor(() => {
      expect(mockCreateEntry).toHaveBeenCalledTimes(1)
    })
  })

  it('maintains form state during validation', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VehicleEntryForm />)
    
    const vehicleInput = screen.getByLabelText(/vehicle number/i)
    const nameInput = screen.getByLabelText(/driver name/i)
    
    await user.type(vehicleInput, 'KA01AB1234')
    await user.type(nameInput, 'John')
    
    // Trigger validation by leaving required field empty
    await user.click(screen.getByRole('button', { name: /register entry/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/driver phone is required/i)).toBeInTheDocument()
    })
    
    // Form values should be preserved
    expect(vehicleInput).toHaveValue('KA01AB1234')
    expect(nameInput).toHaveValue('John')
  })

  it('focuses vehicle number input on mount', () => {
    renderWithProviders(<VehicleEntryForm />)
    
    const vehicleInput = screen.getByLabelText(/vehicle number/i)
    expect(vehicleInput).toHaveFocus()
  })

  it('has proper ARIA labels and descriptions', () => {
    renderWithProviders(<VehicleEntryForm />)
    
    const form = screen.getByRole('form')
    expect(form).toHaveAttribute('aria-label', 'Vehicle entry registration form')
    
    const vehicleInput = screen.getByLabelText(/vehicle number/i)
    expect(vehicleInput).toHaveAttribute('aria-describedby')
    expect(vehicleInput).toHaveAttribute('required')
  })
})