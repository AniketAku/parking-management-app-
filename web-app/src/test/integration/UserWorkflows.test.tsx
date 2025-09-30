// Integration Tests - User Workflow Testing
// Tests complete user journeys from authentication to parking operations

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, userEvent, mockApiResponses, fillForm, cleanupMocks } from '../utils'
import { App } from '../../App'

// Mock all hooks
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockApiResponses.auth.me,
    loading: false,
    isAuthenticated: true,
  }),
  useLogin: () => ({
    mutate: vi.fn(),
    loading: false,
    error: null,
  }),
}))

vi.mock('../../hooks/useStatistics', () => ({
  useStatistics: () => ({
    data: mockApiResponses.parking.statistics,
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}))

vi.mock('../../hooks/useEntries', () => ({
  useEntries: () => ({
    data: { entries: mockApiResponses.parking.entries, total: 3 },
    loading: false,
    error: null,
  }),
}))

vi.mock('../../hooks/useCreateEntry', () => ({
  useCreateEntry: () => ({
    mutate: vi.fn().mockImplementation((data, { onSuccess }) => {
      setTimeout(() => onSuccess({ id: 'new-entry-123', ...data }), 100)
    }),
    loading: false,
    error: null,
  }),
}))

vi.mock('../../hooks/useSearchVehicle', () => ({
  useSearchVehicle: () => ({
    mutate: vi.fn().mockImplementation((data, { onSuccess }) => {
      if (data.vehicleNumber === 'KA01AB1234') {
        setTimeout(() => onSuccess(mockApiResponses.parking.entries[0]), 100)
      }
    }),
    loading: false,
    error: null,
    data: null,
  }),
}))

vi.mock('../../hooks/useProcessExit', () => ({
  useProcessExit: () => ({
    mutate: vi.fn().mockImplementation((data, { onSuccess }) => {
      setTimeout(() => onSuccess({ ...data, exitTime: new Date().toISOString() }), 100)
    }),
    loading: false,
    error: null,
  }),
}))

describe('User Workflow Integration Tests', () => {
  beforeEach(() => {
    cleanupMocks()
  })

  it('completes full vehicle entry workflow', async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />, { initialEntries: ['/entry'] })
    
    // Fill entry form
    await fillForm(user, {
      'vehicle number': 'KA05XY9876',
      'driver name': 'Jane Smith', 
      'driver phone': '+91-9123456789',
      'notes': 'VIP customer'
    })
    
    // Select vehicle type
    const vehicleTypeSelect = screen.getByLabelText(/vehicle type/i)
    await user.click(vehicleTypeSelect)
    await user.click(screen.getByText('Car'))
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /register entry/i }))
    
    // Verify success
    await waitFor(() => {
      expect(screen.getByText(/entry registered successfully/i)).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('completes full vehicle exit workflow', async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />, { initialEntries: ['/exit'] })
    
    // Search for vehicle
    const vehicleInput = screen.getByLabelText(/vehicle number/i)
    await user.type(vehicleInput, 'KA01AB1234')
    await user.click(screen.getByRole('button', { name: /search vehicle/i }))
    
    // Wait for vehicle details to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
    
    // Select payment type
    const paymentSelect = screen.getByLabelText(/payment type/i)
    await user.click(paymentSelect)
    await user.click(screen.getByText('Cash'))
    
    // Process exit
    await user.click(screen.getByRole('button', { name: /process exit/i }))
    
    // Verify success
    await waitFor(() => {
      expect(screen.getByText(/exit processed successfully/i)).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('navigates through main application flow', async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />)
    
    // Start on dashboard
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument() // parked vehicles
    
    // Navigate to entry form
    await user.click(screen.getByRole('link', { name: /new entry/i }))
    expect(screen.getByText(/vehicle entry/i)).toBeInTheDocument()
    
    // Navigate to exit form
    await user.click(screen.getByRole('link', { name: /exit/i }))
    expect(screen.getByText(/vehicle exit/i)).toBeInTheDocument()
    
    // Navigate to search
    await user.click(screen.getByRole('link', { name: /search/i }))
    expect(screen.getByText(/search vehicles/i)).toBeInTheDocument()
    
    // Return to dashboard
    await user.click(screen.getByRole('link', { name: /dashboard/i }))
    expect(screen.getByText('15')).toBeInTheDocument()
  })

  it('handles authentication flow', async () => {
    // Mock unauthenticated state
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
    })
    
    const mockLogin = vi.fn().mockImplementation((data, { onSuccess }) => {
      setTimeout(() => {
        // Simulate successful login
        vi.mocked(useAuth).mockReturnValue({
          user: mockApiResponses.auth.me,
          loading: false,
          isAuthenticated: true,
        })
        onSuccess(mockApiResponses.auth.login)
      }, 100)
    })
    
    vi.mocked(useLogin).mockReturnValue({
      mutate: mockLogin,
      loading: false,
      error: null,
    })
    
    const user = userEvent.setup()
    renderWithProviders(<App />)
    
    // Should show login form
    expect(screen.getByText(/sign in/i)).toBeInTheDocument()
    
    // Fill login form
    await user.type(screen.getByLabelText(/username/i), 'testuser')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    // Should redirect to dashboard after login
    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('handles search and filter workflow', async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />, { initialEntries: ['/search'] })
    
    // Search by vehicle number
    const searchInput = screen.getByLabelText(/search/i)
    await user.type(searchInput, 'KA01')
    
    await waitFor(() => {
      expect(screen.getByText('KA01AB1234')).toBeInTheDocument()
    })
    
    // Filter by vehicle type
    const filterSelect = screen.getByLabelText(/filter by type/i)
    await user.click(filterSelect)
    await user.click(screen.getByText('Car'))
    
    await waitFor(() => {
      // Should show only car entries
      expect(screen.getByText('KA01AB1234')).toBeInTheDocument()
      expect(screen.queryByText('KA03EF9012')).not.toBeInTheDocument() // truck
    })
  })

  it('displays real-time statistics updates', async () => {
    const mockRefetch = vi.fn()
    vi.mocked(useStatistics).mockReturnValue({
      data: { ...mockApiResponses.parking.statistics, parkedVehicles: 16 },
      loading: false,
      error: null,
      refetch: mockRefetch,
    })
    
    renderWithProviders(<App />)
    
    // Initial state
    expect(screen.getByText('16')).toBeInTheDocument()
    
    // Simulate real-time update
    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalled()
    })
  })

  it('handles offline mode gracefully', async () => {
    // Mock offline mode
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    })
    
    vi.mocked(useStatistics).mockReturnValue({
      data: null,
      loading: false,
      error: { message: 'Network error' },
      refetch: vi.fn(),
    })
    
    renderWithProviders(<App />)
    
    expect(screen.getByText(/offline mode/i)).toBeInTheDocument()
    expect(screen.getByText(/limited functionality/i)).toBeInTheDocument()
  })

  it('maintains form state during validation errors', async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />, { initialEntries: ['/entry'] })
    
    // Fill partial form
    await user.type(screen.getByLabelText(/vehicle number/i), 'KA01AB1234')
    await user.type(screen.getByLabelText(/driver name/i), 'John Doe')
    
    // Submit without required phone
    await user.click(screen.getByRole('button', { name: /register entry/i }))
    
    // Check validation error appears
    await waitFor(() => {
      expect(screen.getByText(/driver phone is required/i)).toBeInTheDocument()
    })
    
    // Verify form state is preserved
    expect(screen.getByLabelText(/vehicle number/i)).toHaveValue('KA01AB1234')
    expect(screen.getByLabelText(/driver name/i)).toHaveValue('John Doe')
  })

  it('handles concurrent user actions correctly', async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />)
    
    // Simulate rapid navigation
    await user.click(screen.getByRole('link', { name: /entry/i }))
    await user.click(screen.getByRole('link', { name: /exit/i }))
    await user.click(screen.getByRole('link', { name: /dashboard/i }))
    
    // Should end up on dashboard
    await waitFor(() => {
      expect(screen.getByText('15')).toBeInTheDocument() // parked vehicles
    })
  })

  it('maintains responsive behavior across workflows', async () => {
    // Test mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })
    
    const user = userEvent.setup()
    renderWithProviders(<App />)
    
    // Check mobile navigation is active
    expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument()
    
    // Test navigation on mobile
    await user.click(screen.getByTestId('mobile-nav-entry'))
    
    await waitFor(() => {
      expect(screen.getByText(/vehicle entry/i)).toBeInTheDocument()
    })
  })
})