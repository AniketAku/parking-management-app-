// VehicleExitForm Component Tests
// Tests vehicle exit processing, fee calculation, and payment handling

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, userEvent, createMockParkingEntry, cleanupMocks } from '../../test/utils'
import { VehicleExitForm } from '../forms/VehicleExitForm'

// Mock the hooks
vi.mock('../../hooks/useProcessExit', () => ({
  useProcessExit: () => ({
    mutate: vi.fn(),
    loading: false,
    error: null,
  }),
}))

vi.mock('../../hooks/useSearchVehicle', () => ({
  useSearchVehicle: () => ({
    mutate: vi.fn(),
    loading: false,
    error: null,
    data: null,
  }),
}))

describe('VehicleExitForm Component', () => {
  beforeEach(() => {
    cleanupMocks()
  })

  it('renders vehicle search form', () => {
    renderWithProviders(<VehicleExitForm />)
    
    expect(screen.getByLabelText(/vehicle number/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /search vehicle/i })).toBeInTheDocument()
  })

  it('searches for vehicle by number', async () => {
    const mockSearch = vi.fn()
    vi.mocked(useSearchVehicle).mockReturnValue({
      mutate: mockSearch,
      loading: false,
      error: null,
      data: null,
    })
    
    const user = userEvent.setup()
    renderWithProviders(<VehicleExitForm />)
    
    const vehicleInput = screen.getByLabelText(/vehicle number/i)
    await user.type(vehicleInput, 'KA01AB1234')
    await user.click(screen.getByRole('button', { name: /search vehicle/i }))
    
    expect(mockSearch).toHaveBeenCalledWith({ vehicleNumber: 'KA01AB1234' })
  })

  it('displays found vehicle details', () => {
    const mockEntry = createMockParkingEntry({
      vehicleNumber: 'KA01AB1234',
      driverName: 'John Doe',
      vehicleType: 'car',
      entryTime: new Date().toISOString(),
    })
    
    vi.mocked(useSearchVehicle).mockReturnValue({
      mutate: vi.fn(),
      loading: false,
      error: null,
      data: mockEntry,
    })
    
    renderWithProviders(<VehicleExitForm />)
    
    expect(screen.getByText('KA01AB1234')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Car')).toBeInTheDocument()
  })

  it('calculates parking fee correctly', () => {
    const entryTime = new Date(Date.now() - 5 * 60 * 60 * 1000) // 5 hours ago
    const mockEntry = createMockParkingEntry({
      vehicleType: 'car',
      entryTime: entryTime.toISOString(),
    })
    
    vi.mocked(useSearchVehicle).mockReturnValue({
      mutate: vi.fn(),
      loading: false,
      error: null,
      data: mockEntry,
    })
    
    renderWithProviders(<VehicleExitForm />)
    
    // Assuming car rate is ₹50/day, 5 hours should be ₹11 (rounded up)
    expect(screen.getByText(/₹\d+/)).toBeInTheDocument()
    expect(screen.getByText(/parking duration/i)).toBeInTheDocument()
  })

  it('handles payment type selection', async () => {
    const mockEntry = createMockParkingEntry()
    vi.mocked(useSearchVehicle).mockReturnValue({
      mutate: vi.fn(),
      loading: false,
      error: null,
      data: mockEntry,
    })
    
    const user = userEvent.setup()
    renderWithProviders(<VehicleExitForm />)
    
    const paymentSelect = screen.getByLabelText(/payment type/i)
    await user.click(paymentSelect)
    
    expect(screen.getByText('Cash')).toBeInTheDocument()
    expect(screen.getByText('Card')).toBeInTheDocument()
    expect(screen.getByText('Digital')).toBeInTheDocument()
  })

  it('processes vehicle exit successfully', async () => {
    const mockEntry = createMockParkingEntry({ parkingFee: 50 })
    const mockProcessExit = vi.fn()
    
    vi.mocked(useSearchVehicle).mockReturnValue({
      mutate: vi.fn(),
      loading: false,
      error: null,
      data: mockEntry,
    })
    
    vi.mocked(useProcessExit).mockReturnValue({
      mutate: mockProcessExit,
      loading: false,
      error: null,
    })
    
    const user = userEvent.setup()
    renderWithProviders(<VehicleExitForm />)
    
    // Select payment type
    const paymentSelect = screen.getByLabelText(/payment type/i)
    await user.click(paymentSelect)
    await user.click(screen.getByText('Cash'))
    
    await user.click(screen.getByRole('button', { name: /process exit/i }))
    
    await waitFor(() => {
      expect(mockProcessExit).toHaveBeenCalledWith({
        entryId: mockEntry.id,
        paymentType: 'cash',
        parkingFee: 50,
      })
    })
  })

  it('handles vehicle not found error', () => {
    vi.mocked(useSearchVehicle).mockReturnValue({
      mutate: vi.fn(),
      loading: false,
      error: { message: 'Vehicle not found' },
      data: null,
    })
    
    renderWithProviders(<VehicleExitForm />)
    
    expect(screen.getByText(/vehicle not found/i)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('shows loading state during search', () => {
    vi.mocked(useSearchVehicle).mockReturnValue({
      mutate: vi.fn(),
      loading: true,
      error: null,
      data: null,
    })
    
    renderWithProviders(<VehicleExitForm />)
    
    expect(screen.getByText(/searching/i)).toBeInTheDocument()
    expect(screen.getByTestId('search-loading')).toBeInTheDocument()
  })

  it('shows loading state during exit processing', () => {
    const mockEntry = createMockParkingEntry()
    vi.mocked(useSearchVehicle).mockReturnValue({
      mutate: vi.fn(),
      loading: false,
      error: null,
      data: mockEntry,
    })
    
    vi.mocked(useProcessExit).mockReturnValue({
      mutate: vi.fn(),
      loading: true,
      error: null,
    })
    
    renderWithProviders(<VehicleExitForm />)
    
    const exitButton = screen.getByRole('button', { name: /processing/i })
    expect(exitButton).toBeDisabled()
  })

  it('validates payment type is selected', async () => {
    const mockEntry = createMockParkingEntry()
    vi.mocked(useSearchVehicle).mockReturnValue({
      mutate: vi.fn(),
      loading: false,
      error: null,
      data: mockEntry,
    })
    
    const user = userEvent.setup()
    renderWithProviders(<VehicleExitForm />)
    
    await user.click(screen.getByRole('button', { name: /process exit/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/payment type is required/i)).toBeInTheDocument()
    })
  })

  it('displays overstay warning for long-parked vehicles', () => {
    const entryTime = new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
    const mockEntry = createMockParkingEntry({
      entryTime: entryTime.toISOString(),
    })
    
    vi.mocked(useSearchVehicle).mockReturnValue({
      mutate: vi.fn(),
      loading: false,
      error: null,
      data: mockEntry,
    })
    
    renderWithProviders(<VehicleExitForm />)
    
    expect(screen.getByText(/overstay warning/i)).toBeInTheDocument()
    expect(screen.getByTestId('overstay-warning')).toBeInTheDocument()
  })

  it('handles Enter key for search', async () => {
    const mockSearch = vi.fn()
    vi.mocked(useSearchVehicle).mockReturnValue({
      mutate: mockSearch,
      loading: false,
      error: null,
      data: null,
    })
    
    const user = userEvent.setup()
    renderWithProviders(<VehicleExitForm />)
    
    const vehicleInput = screen.getByLabelText(/vehicle number/i)
    await user.type(vehicleInput, 'KA01AB1234')
    await user.keyboard('{Enter}')
    
    expect(mockSearch).toHaveBeenCalledTimes(1)
  })

  it('resets search form after processing exit', async () => {
    const mockEntry = createMockParkingEntry()
    const mockProcessExit = vi.fn()
    
    vi.mocked(useSearchVehicle).mockReturnValue({
      mutate: vi.fn(),
      loading: false,
      error: null,
      data: mockEntry,
    })
    
    vi.mocked(useProcessExit).mockReturnValue({
      mutate: mockProcessExit,
      loading: false,
      error: null,
    })
    
    const user = userEvent.setup()
    renderWithProviders(<VehicleExitForm />)
    
    // Process exit
    const paymentSelect = screen.getByLabelText(/payment type/i)
    await user.click(paymentSelect)
    await user.click(screen.getByText('Cash'))
    await user.click(screen.getByRole('button', { name: /process exit/i }))
    
    // Form should reset
    await waitFor(() => {
      expect(screen.getByLabelText(/vehicle number/i)).toHaveValue('')
      expect(screen.getByRole('button', { name: /search vehicle/i })).toBeInTheDocument()
    })
  })
})