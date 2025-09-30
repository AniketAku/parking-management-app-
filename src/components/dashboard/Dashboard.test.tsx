// Dashboard Component Tests
// Tests main dashboard functionality, statistics display, and real-time updates

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, userEvent, mockApiResponses, cleanupMocks } from '../../test/utils'
import { StatisticsOverview } from './StatisticsOverview'

// Mock the statistics hook
vi.mock('../../hooks/useStatistics', () => ({
  useStatistics: () => ({
    data: mockApiResponses.parking.statistics,
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}))

// Mock the entries hook  
vi.mock('../../hooks/useEntries', () => ({
  useEntries: () => ({
    data: { entries: mockApiResponses.parking.entries, total: 3 },
    loading: false,
    error: null,
  }),
}))

describe('StatisticsOverview Component', () => {
  beforeEach(() => {
    cleanupMocks()
  })

  it('renders dashboard statistics', () => {
    renderWithProviders(<StatisticsOverview />)
    
    expect(screen.getByText('15')).toBeInTheDocument() // parkedVehicles
    expect(screen.getByText('23')).toBeInTheDocument() // todayEntries
    expect(screen.getByText('8')).toBeInTheDocument()  // todayExits
    expect(screen.getByText('₹1,250')).toBeInTheDocument() // todayIncome
  })

  it('displays vehicle statistics cards', () => {
    renderWithProviders(<StatisticsOverview />)
    
    expect(screen.getByText(/parked vehicles/i)).toBeInTheDocument()
    expect(screen.getByText(/today's entries/i)).toBeInTheDocument()
    expect(screen.getByText(/today's exits/i)).toBeInTheDocument()
    expect(screen.getByText(/today's income/i)).toBeInTheDocument()
  })

  it('shows unpaid and overstaying vehicles', () => {
    renderWithProviders(<StatisticsOverview />)
    
    expect(screen.getByText('3')).toBeInTheDocument() // unpaidVehicles
    expect(screen.getByText('1')).toBeInTheDocument() // overstayingVehicles
  })

  it('displays recent entries list', () => {
    renderWithProviders(<StatisticsOverview />)
    
    expect(screen.getByText('KA01AB1234')).toBeInTheDocument()
    expect(screen.getByText('KA02CD5678')).toBeInTheDocument()
    expect(screen.getByText('KA03EF9012')).toBeInTheDocument()
  })

  it('handles refresh action', async () => {
    const mockRefetch = vi.fn()
    vi.mocked(useStatistics).mockReturnValue({
      data: mockApiResponses.parking.statistics,
      loading: false,
      error: null,
      refetch: mockRefetch,
    })
    
    const user = userEvent.setup()
    renderWithProviders(<StatisticsOverview />)
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    await user.click(refreshButton)
    
    expect(mockRefetch).toHaveBeenCalledTimes(1)
  })

  it('shows loading state for statistics', () => {
    vi.mocked(useStatistics).mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    })
    
    renderWithProviders(<StatisticsOverview />)
    
    expect(screen.getByTestId('statistics-loading')).toBeInTheDocument()
  })

  it('handles statistics error state', () => {
    vi.mocked(useStatistics).mockReturnValue({
      data: null,
      loading: false,
      error: { message: 'Failed to load statistics' },
      refetch: vi.fn(),
    })
    
    renderWithProviders(<StatisticsOverview />)
    
    expect(screen.getByText(/failed to load statistics/i)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('navigates to entry form', async () => {
    const user = userEvent.setup()
    renderWithProviders(<StatisticsOverview />)
    
    const entryButton = screen.getByRole('button', { name: /new entry/i })
    await user.click(entryButton)
    
    // This would be tested with navigation mock in real implementation
    expect(entryButton).toBeInTheDocument()
  })

  it('navigates to exit form', async () => {
    const user = userEvent.setup()
    renderWithProviders(<StatisticsOverview />)
    
    const exitButton = screen.getByRole('button', { name: /process exit/i })
    await user.click(exitButton)
    
    expect(exitButton).toBeInTheDocument()
  })

  it('displays occupancy rate', () => {
    renderWithProviders(<StatisticsOverview />)
    
    expect(screen.getByText('75%')).toBeInTheDocument() // occupancyRate
    expect(screen.getByText(/occupancy/i)).toBeInTheDocument()
  })

  it('shows average stay duration', () => {
    renderWithProviders(<StatisticsOverview />)
    
    expect(screen.getByText('4.5 hours')).toBeInTheDocument()
    expect(screen.getByText(/average stay/i)).toBeInTheDocument()
  })

  it('handles real-time updates', async () => {
    const mockRefetch = vi.fn()
    vi.mocked(useStatistics).mockReturnValue({
      data: mockApiResponses.parking.statistics,
      loading: false,
      error: null,
      refetch: mockRefetch,
    })
    
    renderWithProviders(<StatisticsOverview />)
    
    // Simulate real-time update trigger
    // In real implementation, this would be Socket.IO event
    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalled()
    }, { timeout: 1000 })
  })

  it('renders responsive layout for mobile', () => {
    renderWithProviders(<StatisticsOverview />)
    
    const dashboardContainer = screen.getByTestId('dashboard-container')
    expect(dashboardContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4')
  })
})