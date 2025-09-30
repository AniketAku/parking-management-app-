// Button Component Tests
// Tests button variants, states, accessibility, and interactions

import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, userEvent } from '../../test/utils'
import { Button } from './Button'

describe('Button Component', () => {
  it('renders with default props', () => {
    renderWithProviders(<Button>Click me</Button>)
    
    const button = screen.getByRole('button', { name: 'Click me' })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('btn', 'btn-primary')
  })

  it('renders different variants correctly', () => {
    const { rerender } = renderWithProviders(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByRole('button')).toHaveClass('btn-secondary')

    rerender(<Button variant="outline">Outline</Button>)
    expect(screen.getByRole('button')).toHaveClass('btn-outline')

    rerender(<Button variant="danger">Danger</Button>)
    expect(screen.getByRole('button')).toHaveClass('btn-danger')
  })

  it('renders different sizes correctly', () => {
    const { rerender } = renderWithProviders(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button')).toHaveClass('px-3', 'py-1.5', 'text-xs')

    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3', 'text-base')
  })

  it('handles loading state', () => {
    renderWithProviders(<Button loading>Loading</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(screen.getByRole('button')).toContainHTML('<span class="loading-spinner mr-2"')
  })

  it('handles disabled state', () => {
    renderWithProviders(<Button disabled>Disabled</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed')
  })

  it('calls onClick handler', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()
    
    renderWithProviders(<Button onClick={handleClick}>Click me</Button>)
    
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()
    
    renderWithProviders(<Button onClick={handleClick} disabled>Disabled</Button>)
    
    await user.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('does not call onClick when loading', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()
    
    renderWithProviders(<Button onClick={handleClick} loading>Loading</Button>)
    
    await user.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('renders with custom className', () => {
    renderWithProviders(<Button className="custom-class">Custom</Button>)
    
    expect(screen.getByRole('button')).toHaveClass('custom-class')
  })

  it('renders with testId', () => {
    renderWithProviders(<Button data-testid="test-button">Test</Button>)
    
    expect(screen.getByTestId('test-button')).toBeInTheDocument()
  })

  it('supports keyboard navigation', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()
    
    renderWithProviders(<Button onClick={handleClick}>Keyboard</Button>)
    
    const button = screen.getByRole('button')
    button.focus()
    
    await user.keyboard('{Enter}')
    expect(handleClick).toHaveBeenCalledTimes(1)
    
    // Note: Space key behavior depends on implementation
    await user.keyboard('{Space}')
    expect(handleClick).toHaveBeenCalledTimes(1) // Space might not trigger click for buttons
  })

  it('has proper accessibility attributes', () => {
    renderWithProviders(<Button disabled>Disabled Button</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('type', 'button')
  })

  it('renders with icons correctly', () => {
    const icon = <span data-testid="icon">🚗</span>
    
    renderWithProviders(<Button>{icon} With Icon</Button>)
    
    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByText('With Icon')).toBeInTheDocument()
  })
})