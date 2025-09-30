// Performance Tests
// Tests component rendering performance and optimization

import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../utils'
import { App } from '../../App'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'

describe('Performance Tests', () => {
  it('renders App component within performance budget', async () => {
    const startTime = performance.now()
    
    renderWithProviders(<App />)
    
    await screen.findByText(/dashboard/i, {}, { timeout: 3000 })
    
    const renderTime = performance.now() - startTime
    expect(renderTime).toBeLessThan(1000) // Should render within 1 second
  })

  it('Button component renders quickly', () => {
    const startTime = performance.now()
    
    renderWithProviders(<Button>Test Button</Button>)
    
    const renderTime = performance.now() - startTime
    expect(renderTime).toBeLessThan(50) // Should render within 50ms
  })

  it('LoadingSpinner renders efficiently', () => {
    const startTime = performance.now()
    
    renderWithProviders(<LoadingSpinner />)
    
    const renderTime = performance.now() - startTime
    expect(renderTime).toBeLessThan(20) // Should render within 20ms
  })

  it('handles large lists efficiently', () => {
    const items = Array.from({ length: 100 }, (_, i) => `Item ${i}`)
    
    const startTime = performance.now()
    
    renderWithProviders(
      <div>
        {items.map(item => (
          <div key={item}>{item}</div>
        ))}
      </div>
    )
    
    const renderTime = performance.now() - startTime
    expect(renderTime).toBeLessThan(100) // Should handle 100 items within 100ms
  })

  it('memory usage stays within bounds', () => {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0
    
    // Render multiple components
    Array.from({ length: 10 }).forEach((_, i) => {
      renderWithProviders(<Button key={i}>Button {i}</Button>)
    })
    
    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
    const memoryIncrease = finalMemory - initialMemory
    
    // Memory increase should be reasonable (less than 10MB for 10 buttons)
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
  })
})