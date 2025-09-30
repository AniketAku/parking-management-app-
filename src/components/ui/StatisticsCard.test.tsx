// StatisticsCard Component Tests
// Tests statistics display, formatting, and interactive elements

import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, userEvent } from '../../test/utils'
import { StatsCard } from './StatsCard'

describe('StatsCard Component', () => {
  it('renders basic statistics', () => {
    renderWithProviders(
      <StatsCard
        title="Parked Vehicles"
        value={15}
        icon="🚗"
        color="blue"
      />
    )
    
    expect(screen.getByText('Parked Vehicles')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('🚗')).toBeInTheDocument()
  })

  it('formats currency values correctly', () => {
    renderWithProviders(
      <StatsCard
        title="Today's Income"
        value={1250}
        icon="💰"
        color="green"
        format="currency"
      />
    )
    
    expect(screen.getByText('₹1,250')).toBeInTheDocument()
  })

  it('formats percentage values correctly', () => {
    renderWithProviders(
      <StatsCard
        title="Occupancy Rate"
        value={75}
        icon="📊"
        color="purple"
        format="percentage"
      />
    )
    
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('formats duration values correctly', () => {
    renderWithProviders(
      <StatsCard
        title="Average Stay"
        value={4.5}
        icon="⏱️"
        color="orange"
        format="hours"
      />
    )
    
    expect(screen.getByText('4.5 hours')).toBeInTheDocument()
  })

  it('applies correct color variants', () => {
    const { rerender } = renderWithProviders(
      <StatsCard title="Test" value={10} icon="🔵" color="blue" />
    )
    expect(screen.getByTestId('statistics-card')).toHaveClass('border-blue-200')
    
    rerender(<StatisticsCard title="Test" value={10} icon="🟢" color="green" />)
    expect(screen.getByTestId('statistics-card')).toHaveClass('border-green-200')
    
    rerender(<StatisticsCard title="Test" value={10} icon="🔴" color="red" />)
    expect(screen.getByTestId('statistics-card')).toHaveClass('border-red-200')
  })

  it('shows loading state', () => {
    renderWithProviders(
      <StatsCard
        title="Loading Data"
        value={0}
        icon="⏳"
        color="gray"
        loading
      />
    )
    
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
    expect(screen.getByText('Loading Data')).toBeInTheDocument()
  })

  it('handles click interactions', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()
    
    renderWithProviders(
      <StatsCard
        title="Clickable Card"
        value={25}
        icon="👆"
        color="blue"
        onClick={handleClick}
      />
    )
    
    await user.click(screen.getByTestId('statistics-card'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('handles keyboard interactions when clickable', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()
    
    renderWithProviders(
      <StatsCard
        title="Keyboard Accessible"
        value={25}
        icon="⌨️"
        color="blue"
        onClick={handleClick}
      />
    )
    
    const card = screen.getByTestId('statistics-card')
    card.focus()
    
    await user.keyboard('{Enter}')
    expect(handleClick).toHaveBeenCalledTimes(1)
    
    await user.keyboard('{Space}')
    expect(handleClick).toHaveBeenCalledTimes(2)
  })

  it('shows trend indicators', () => {
    renderWithProviders(
      <StatsCard
        title="Trending Up"
        value={100}
        icon="📈"
        color="green"
        trend={{ value: 12, direction: 'up' }}
      />
    )
    
    expect(screen.getByText('+12%')).toBeInTheDocument()
    expect(screen.getByTestId('trend-up')).toBeInTheDocument()
  })

  it('shows declining trend indicators', () => {
    renderWithProviders(
      <StatsCard
        title="Trending Down"
        value={80}
        icon="📉"
        color="red"
        trend={{ value: 8, direction: 'down' }}
      />
    )
    
    expect(screen.getByText('-8%')).toBeInTheDocument()
    expect(screen.getByTestId('trend-down')).toBeInTheDocument()
  })

  it('displays subtitle information', () => {
    renderWithProviders(
      <StatsCard
        title="Complex Stat"
        value={150}
        icon="📊"
        color="blue"
        subtitle="Since last month"
      />
    )
    
    expect(screen.getByText('Complex Stat')).toBeInTheDocument()
    expect(screen.getByText('Since last month')).toBeInTheDocument()
  })

  it('handles large numbers with appropriate formatting', () => {
    renderWithProviders(
      <StatsCard
        title="Large Value"
        value={1234567}
        icon="🎯"
        color="purple"
        format="currency"
      />
    )
    
    expect(screen.getByText('₹12,34,567')).toBeInTheDocument()
  })

  it('handles zero values correctly', () => {
    renderWithProviders(
      <StatsCard
        title="Empty Stat"
        value={0}
        icon="⚪"
        color="gray"
      />
    )
    
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    renderWithProviders(
      <StatsCard
        title="Accessible Card"
        value={42}
        icon="♿"
        color="blue"
        onClick={() => {}}
      />
    )
    
    const card = screen.getByTestId('statistics-card')
    expect(card).toHaveAttribute('role', 'button')
    expect(card).toHaveAttribute('tabIndex', '0')
    expect(card).toHaveAttribute('aria-label', 'Accessible Card: 42')
  })

  it('renders in compact mode', () => {
    renderWithProviders(
      <StatsCard
        title="Compact"
        value={5}
        icon="📱"
        color="blue"
        compact
      />
    )
    
    const card = screen.getByTestId('statistics-card')
    expect(card).toHaveClass('p-3') // Smaller padding in compact mode
  })
})