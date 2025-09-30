// LoadingSpinner Component Tests
// Tests loading states, overlays, and skeleton components

import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/utils'
import { LoadingSpinner, LoadingOverlay, Skeleton, SkeletonCard } from './LoadingSpinner'

describe('LoadingSpinner Component', () => {
  it('renders basic spinner', () => {
    renderWithProviders(<LoadingSpinner data-testid="test-spinner" />)
    
    const spinner = screen.getByTestId('test-spinner')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('loading-spinner')
  })

  it('renders different sizes', () => {
    const { rerender } = renderWithProviders(<LoadingSpinner size="sm" data-testid="spinner" />)
    expect(screen.getByTestId('spinner')).toHaveClass('h-4', 'w-4')
    
    rerender(<LoadingSpinner size="lg" data-testid="spinner" />)
    expect(screen.getByTestId('spinner')).toHaveClass('h-8', 'w-8')
  })

  it('renders with text', () => {
    renderWithProviders(<LoadingSpinner text="Loading data..." data-testid="spinner-with-text" />)
    
    expect(screen.getByText('Loading data...')).toBeInTheDocument()
    expect(screen.getByTestId('spinner-with-text')).toBeInTheDocument()
  })

  it('applies color variants', () => {
    const { rerender } = renderWithProviders(<LoadingSpinner color="white" data-testid="spinner" />)
    expect(screen.getByTestId('spinner')).toHaveClass('border-white')
    
    rerender(<LoadingSpinner color="gray" data-testid="spinner" />)
    expect(screen.getByTestId('spinner')).toHaveClass('border-gray-500')
  })
})

describe('LoadingOverlay Component', () => {
  it('renders overlay with default text', () => {
    renderWithProviders(<LoadingOverlay />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders with custom text', () => {
    renderWithProviders(<LoadingOverlay text="Saving changes..." />)
    
    expect(screen.getByText('Saving changes...')).toBeInTheDocument()
  })

  it('applies transparent background', () => {
    const { container } = renderWithProviders(<LoadingOverlay transparent />)
    
    const overlay = container.firstChild as HTMLElement
    expect(overlay).toHaveClass('bg-white', 'bg-opacity-75')
  })
})

describe('Skeleton Component', () => {
  it('renders basic skeleton', () => {
    const { container } = renderWithProviders(<Skeleton />)
    
    const skeleton = container.firstChild as HTMLElement
    expect(skeleton).toHaveClass('loading-skeleton')
  })

  it('renders circle skeleton', () => {
    const { container } = renderWithProviders(<Skeleton circle />)
    
    const skeleton = container.firstChild as HTMLElement
    expect(skeleton).toHaveClass('rounded-full')
  })

  it('renders multiple lines', () => {
    const { container } = renderWithProviders(<Skeleton lines={3} />)
    
    const skeletons = container.querySelectorAll('.loading-skeleton')
    expect(skeletons).toHaveLength(3)
  })
})

describe('SkeletonCard Component', () => {
  it('renders skeleton card', () => {
    const { container } = renderWithProviders(<SkeletonCard />)
    
    expect(container.firstChild).toHaveClass('bg-white', 'rounded-lg', 'shadow-card')
  })

  it('renders with avatar', () => {
    const { container } = renderWithProviders(<SkeletonCard showAvatar />)
    
    const avatar = container.querySelector('.rounded-full')
    expect(avatar).toBeInTheDocument()
  })
})