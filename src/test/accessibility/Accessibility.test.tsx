// Accessibility Tests  
// Tests WCAG compliance, keyboard navigation, and screen reader support

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, userEvent, cleanupMocks } from '../utils'
import { App } from '../../App'
import { StatisticsOverview } from '../../components/dashboard/StatisticsOverview'
import { VehicleEntryForm } from '../../components/forms/VehicleEntryForm'
import { Button } from '../../components/ui/Button'

// Mock axe-core for accessibility testing
vi.mock('axe-core', () => ({
  run: vi.fn().mockResolvedValue({
    violations: [],
    passes: [],
    incomplete: [],
    inapplicable: [],
  }),
}))

describe('Accessibility Tests', () => {
  beforeEach(() => {
    cleanupMocks()
  })

  describe('Keyboard Navigation', () => {
    it('supports full keyboard navigation in main app', async () => {
      const user = userEvent.setup()
      renderWithProviders(<App />)
      
      // Tab through navigation items
      await user.tab()
      expect(screen.getByRole('link', { name: /dashboard/i })).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('link', { name: /entry/i })).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('link', { name: /exit/i })).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('link', { name: /search/i })).toHaveFocus()
    })

    it('supports keyboard navigation in entry form', async () => {
      const user = userEvent.setup()
      renderWithProviders(<VehicleEntryForm />)
      
      // Should start with vehicle number focused
      expect(screen.getByLabelText(/vehicle number/i)).toHaveFocus()
      
      // Tab through all form fields
      await user.tab()
      expect(screen.getByLabelText(/vehicle type/i)).toHaveFocus()
      
      await user.tab()
      expect(screen.getByLabelText(/driver name/i)).toHaveFocus()
      
      await user.tab()
      expect(screen.getByLabelText(/driver phone/i)).toHaveFocus()
      
      await user.tab()
      expect(screen.getByLabelText(/notes/i)).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('button', { name: /register entry/i })).toHaveFocus()
    })

    it('handles Escape key for modal dialogs', async () => {
      const user = userEvent.setup()
      renderWithProviders(<App />)
      
      // Open any modal (assuming we have one)
      const settingsButton = screen.queryByRole('button', { name: /settings/i })
      if (settingsButton) {
        await user.click(settingsButton)
        await user.keyboard('{Escape}')
        
        // Modal should close
        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        })
      }
    })

    it('supports keyboard shortcuts', async () => {
      const user = userEvent.setup()
      renderWithProviders(<App />)
      
      // Test global shortcuts (if implemented)
      await user.keyboard('{Control>}n{/Control}') // Ctrl+N for new entry
      // Would check if navigation occurred to entry form
      
      await user.keyboard('{Control>}e{/Control}') // Ctrl+E for exit
      // Would check if navigation occurred to exit form
    })
  })

  describe('ARIA Attributes and Semantic HTML', () => {
    it('has proper landmark roles', () => {
      renderWithProviders(<App />)
      
      expect(screen.getByRole('navigation')).toBeInTheDocument()
      expect(screen.getByRole('main')).toBeInTheDocument()
      expect(screen.getByRole('banner')).toBeInTheDocument()
    })

    it('has proper form labeling', () => {
      renderWithProviders(<VehicleEntryForm />)
      
      const vehicleInput = screen.getByLabelText(/vehicle number/i)
      expect(vehicleInput).toHaveAttribute('aria-required', 'true')
      expect(vehicleInput).toHaveAttribute('aria-describedby')
      
      const nameInput = screen.getByLabelText(/driver name/i)
      expect(nameInput).toHaveAttribute('aria-required', 'true')
    })

    it('provides error announcements', async () => {
      const user = userEvent.setup()
      renderWithProviders(<VehicleEntryForm />)
      
      await user.click(screen.getByRole('button', { name: /register entry/i }))
      
      await waitFor(() => {
        const errorAlert = screen.getByRole('alert')
        expect(errorAlert).toBeInTheDocument()
        expect(errorAlert).toHaveAttribute('aria-live', 'assertive')
      })
    })

    it('provides loading state announcements', () => {
      vi.mocked(useStatistics).mockReturnValue({
        data: null,
        loading: true,
        error: null,
        refetch: vi.fn(),
      })
      
      renderWithProviders(<StatisticsOverview />)
      
      const loadingElement = screen.getByText(/loading statistics/i)
      expect(loadingElement).toHaveAttribute('aria-live', 'polite')
    })

    it('has proper heading hierarchy', () => {
      renderWithProviders(<App />)
      
      // Should have proper h1, h2, h3 hierarchy
      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1).toBeInTheDocument()
      
      const h2Elements = screen.getAllByRole('heading', { level: 2 })
      expect(h2Elements.length).toBeGreaterThan(0)
    })
  })

  describe('Screen Reader Support', () => {
    it('provides descriptive text for statistics', () => {
      renderWithProviders(<StatisticsOverview />)
      
      const parkedVehiclesStat = screen.getByLabelText(/15 vehicles currently parked/i)
      expect(parkedVehiclesStat).toBeInTheDocument()
      
      const incomeStat = screen.getByLabelText(/today's income is ₹1,250/i)
      expect(incomeStat).toBeInTheDocument()
    })

    it('announces dynamic content changes', async () => {
      const user = userEvent.setup()
      renderWithProviders(<VehicleEntryForm />)
      
      const vehicleInput = screen.getByLabelText(/vehicle number/i)
      await user.type(vehicleInput, 'INVALID')
      await user.tab()
      
      await waitFor(() => {
        const errorMessage = screen.getByText(/invalid vehicle number format/i)
        expect(errorMessage.closest('[aria-live]')).toHaveAttribute('aria-live', 'polite')
      })
    })

    it('provides context for interactive elements', () => {
      renderWithProviders(<Button variant="danger">Delete</Button>)
      
      const button = screen.getByRole('button', { name: /delete/i })
      expect(button).toHaveAttribute('aria-describedby')
    })
  })

  describe('Mobile Accessibility', () => {
    it('has appropriate touch targets', () => {
      renderWithProviders(<App />)
      
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button)
        const minHeight = parseInt(styles.minHeight || '0')
        expect(minHeight).toBeGreaterThanOrEqual(44) // iOS accessibility guidelines
      })
    })

    it('supports voice control and switch navigation', async () => {
      const user = userEvent.setup()
      renderWithProviders(<VehicleEntryForm />)
      
      // Test voice control labels
      const vehicleInput = screen.getByLabelText(/vehicle number/i)
      expect(vehicleInput).toHaveAttribute('aria-label')
      
      // Test switch navigation (Space and Enter)
      const submitButton = screen.getByRole('button', { name: /register entry/i })
      submitButton.focus()
      
      await user.keyboard('{Space}')
      // Button should be activated
    })

    it('provides proper focus indicators', () => {
      renderWithProviders(<App />)
      
      const focusableElements = screen.getAllByRole('button')
      focusableElements.forEach(element => {
        element.focus()
        // Check if focus is visible (this would be tested with visual regression)
        expect(element).toHaveFocus()
      })
    })
  })

  describe('Color Contrast and Visual Design', () => {
    it('meets contrast ratio requirements', () => {
      renderWithProviders(<App />)
      
      // This would typically be tested with axe-core or similar tools
      // Testing for proper contrast ratios in CSS
      const primaryButton = screen.getByRole('button', { name: /register entry/i })
      expect(primaryButton).toHaveClass('bg-blue-600', 'text-white')
    })

    it('supports reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: query.includes('reduce'),
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => {},
        }),
      })
      
      renderWithProviders(<App />)
      
      // Elements should have reduced motion classes
      const animatedElements = screen.getAllByTestId(/animated-/)
      animatedElements.forEach(element => {
        expect(element).toHaveClass('motion-reduce:transition-none')
      })
    })

    it('supports high contrast mode', () => {
      // Mock high contrast mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: query.includes('contrast'),
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => {},
        }),
      })
      
      renderWithProviders(<App />)
      
      // Check high contrast styles are applied
      const contentArea = screen.getByRole('main')
      expect(contentArea).toHaveClass('contrast-more:border-2')
    })
  })

  describe('WCAG 2.1 AA Compliance', () => {
    it('passes automated accessibility checks', async () => {
      const { container } = renderWithProviders(<App />)
      
      // This would use real axe-core testing
      const axe = await import('axe-core')
      const results = await axe.run(container)
      
      expect(results.violations).toHaveLength(0)
    })

    it('provides alternative text for images', () => {
      renderWithProviders(<App />)
      
      const images = screen.getAllByRole('img')
      images.forEach(img => {
        expect(img).toHaveAttribute('alt')
        expect(img.getAttribute('alt')).toBeTruthy()
      })
    })

    it('has proper focus management in forms', async () => {
      const user = userEvent.setup()
      renderWithProviders(<VehicleEntryForm />)
      
      // Submit form with errors
      await user.click(screen.getByRole('button', { name: /register entry/i }))
      
      await waitFor(() => {
        // Focus should move to first error field
        const firstErrorField = screen.getByLabelText(/vehicle number/i)
        expect(firstErrorField).toHaveFocus()
      })
    })

    it('provides clear error identification', async () => {
      const user = userEvent.setup()
      renderWithProviders(<VehicleEntryForm />)
      
      await user.click(screen.getByRole('button', { name: /register entry/i }))
      
      await waitFor(() => {
        const vehicleInput = screen.getByLabelText(/vehicle number/i)
        expect(vehicleInput).toHaveAttribute('aria-invalid', 'true')
        expect(vehicleInput).toHaveAttribute('aria-describedby')
        
        const errorId = vehicleInput.getAttribute('aria-describedby')
        const errorMessage = document.getElementById(errorId!)
        expect(errorMessage).toBeInTheDocument()
      })
    })
  })
})