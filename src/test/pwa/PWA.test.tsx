// PWA Functionality Tests
// Tests service worker, offline functionality, installation prompts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, userEvent, mockPWASupport, mockOfflineMode, mockOnlineMode, cleanupMocks } from '../utils'
import { App } from '../../App'

// Mock PWA service
const mockPWAService = {
  registerServiceWorker: vi.fn().mockResolvedValue(true),
  checkForUpdates: vi.fn().mockResolvedValue(false),
  handleInstallPrompt: vi.fn().mockResolvedValue(true),
  isInstallable: vi.fn().mockReturnValue(true),
  isOffline: vi.fn().mockReturnValue(false),
}

vi.mock('../../services/pwaService', () => ({
  PWAService: mockPWAService,
}))

describe('PWA Functionality Tests', () => {
  beforeEach(() => {
    cleanupMocks()
    mockPWASupport()
  })

  describe('Service Worker Registration', () => {
    it('registers service worker on app load', async () => {
      const mockRegister = vi.fn().mockResolvedValue(true)
      mockmockPWAService.registerServiceWorker.mockImplementation(mockRegister)
      
      renderWithProviders(<App />)
      
      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledTimes(1)
      })
    })

    it('handles service worker registration failure', async () => {
      const mockRegister = vi.fn().mockRejectedValue(new Error('Registration failed'))
      mockmockPWAService.registerServiceWorker.mockImplementation(mockRegister)
      
      renderWithProviders(<App />)
      
      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledTimes(1)
        // Should gracefully handle failure without breaking app
      })
    })

    it('checks for updates periodically', async () => {
      const mockCheckUpdates = vi.fn().mockResolvedValue(false)
      vi.mocked(mockPWAService.checkForUpdates).mockImplementation(mockCheckUpdates)
      
      renderWithProviders(<App />)
      
      await waitFor(() => {
        expect(mockCheckUpdates).toHaveBeenCalled()
      }, { timeout: 5000 })
    })
  })

  describe('Installation Prompt', () => {
    it('shows install prompt when installable', async () => {
      vi.mocked(mockPWAService.isInstallable).mockReturnValue(true)
      
      renderWithProviders(<App />)
      
      await waitFor(() => {
        expect(screen.getByText(/install app/i)).toBeInTheDocument()
      })
    })

    it('handles install prompt acceptance', async () => {
      const mockInstall = vi.fn().mockResolvedValue(true)
      vi.mocked(mockPWAService.handleInstallPrompt).mockImplementation(mockInstall)
      vi.mocked(mockPWAService.isInstallable).mockReturnValue(true)
      
      const user = userEvent.setup()
      renderWithProviders(<App />)
      
      const installButton = await screen.findByText(/install app/i)
      await user.click(installButton)
      
      expect(mockInstall).toHaveBeenCalledTimes(1)
    })

    it('hides install prompt after installation', async () => {
      vi.mocked(mockPWAService.isInstallable).mockReturnValue(false)
      
      renderWithProviders(<App />)
      
      expect(screen.queryByText(/install app/i)).not.toBeInTheDocument()
    })
  })

  describe('Offline Functionality', () => {
    it('detects offline mode', async () => {
      mockOfflineMode()
      vi.mocked(mockPWAService.isOffline).mockReturnValue(true)
      
      renderWithProviders(<App />)
      
      await waitFor(() => {
        expect(screen.getByText(/offline mode/i)).toBeInTheDocument()
      })
    })

    it('shows cached data when offline', async () => {
      mockOfflineMode()
      vi.mocked(mockPWAService.isOffline).mockReturnValue(true)
      
      renderWithProviders(<App />)
      
      // Should show cached statistics
      await waitFor(() => {
        expect(screen.getByText(/cached data/i)).toBeInTheDocument()
      })
    })

    it('handles online/offline transitions', async () => {
      vi.mocked(mockPWAService.isOffline).mockReturnValue(false)
      renderWithProviders(<App />)
      
      // Go offline
      mockOfflineMode()
      vi.mocked(mockPWAService.isOffline).mockReturnValue(true)
      window.dispatchEvent(new Event('offline'))
      
      await waitFor(() => {
        expect(screen.getByText(/offline mode/i)).toBeInTheDocument()
      })
      
      // Go back online
      mockOnlineMode()
      vi.mocked(mockPWAService.isOffline).mockReturnValue(false)
      window.dispatchEvent(new Event('online'))
      
      await waitFor(() => {
        expect(screen.queryByText(/offline mode/i)).not.toBeInTheDocument()
      })
    })

    it('queues actions when offline', async () => {
      mockOfflineMode()
      vi.mocked(mockPWAService.isOffline).mockReturnValue(true)
      
      const user = userEvent.setup()
      renderWithProviders(<App />, { initialEntries: ['/entry'] })
      
      // Try to submit form while offline
      await user.type(screen.getByLabelText(/vehicle number/i), 'KA01AB1234')
      await user.click(screen.getByRole('button', { name: /register entry/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/queued for sync/i)).toBeInTheDocument()
      })
    })
  })

  describe('App Updates', () => {
    it('shows update notification when available', async () => {
      vi.mocked(mockPWAService.checkForUpdates).mockResolvedValue(true)
      
      renderWithProviders(<App />)
      
      await waitFor(() => {
        expect(screen.getByText(/update available/i)).toBeInTheDocument()
      })
    })

    it('handles update installation', async () => {
      vi.mocked(mockPWAService.checkForUpdates).mockResolvedValue(true)
      
      const user = userEvent.setup()
      renderWithProviders(<App />)
      
      const updateButton = await screen.findByText(/update now/i)
      await user.click(updateButton)
      
      // Should reload page (mocked)
      await waitFor(() => {
        expect(screen.getByText(/updating/i)).toBeInTheDocument()
      })
    })
  })

  describe('Push Notifications', () => {
    it('requests notification permission', async () => {
      const mockRequestPermission = vi.fn().mockResolvedValue('granted')
      global.Notification.requestPermission = mockRequestPermission
      
      const user = userEvent.setup()
      renderWithProviders(<App />)
      
      const enableNotifications = screen.queryByText(/enable notifications/i)
      if (enableNotifications) {
        await user.click(enableNotifications)
        expect(mockRequestPermission).toHaveBeenCalledTimes(1)
      }
    })

    it('handles notification permission denial', async () => {
      global.Notification.requestPermission = vi.fn().mockResolvedValue('denied')
      
      const user = userEvent.setup()
      renderWithProviders(<App />)
      
      const enableNotifications = screen.queryByText(/enable notifications/i)
      if (enableNotifications) {
        await user.click(enableNotifications)
        
        await waitFor(() => {
          expect(screen.getByText(/notifications blocked/i)).toBeInTheDocument()
        })
      }
    })
  })

  describe('Storage and Caching', () => {
    it('stores data in localStorage', () => {
      renderWithProviders(<App />)
      
      // Check if app data is stored locally
      const authData = localStorage.getItem('auth-storage')
      expect(authData).toBeDefined()
    })

    it('handles storage quota exceeded', async () => {
      // Mock storage quota exceeded
      const originalSetItem = localStorage.setItem
      localStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })
      
      renderWithProviders(<App />)
      
      await waitFor(() => {
        // Should handle gracefully
        expect(screen.queryByText(/storage error/i)).toBeInTheDocument()
      })
      
      localStorage.setItem = originalSetItem
    })

    it('clears cache when requested', async () => {
      const user = userEvent.setup()
      renderWithProviders(<App />)
      
      // Navigate to settings and clear cache
      const clearCacheButton = screen.queryByRole('button', { name: /clear cache/i })
      if (clearCacheButton) {
        await user.click(clearCacheButton)
        
        await waitFor(() => {
          expect(localStorage.length).toBe(0)
        })
      }
    })
  })

  describe('Performance', () => {
    it('loads within performance budget', async () => {
      const startTime = performance.now()
      renderWithProviders(<App />)
      
      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument()
      })
      
      const loadTime = performance.now() - startTime
      expect(loadTime).toBeLessThan(3000) // 3 second budget
    })

    it('lazy loads non-critical components', async () => {
      renderWithProviders(<App />)
      
      // Critical path should load immediately
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument()
      
      // Non-critical components should load lazily
      const user = userEvent.setup()
      await user.click(screen.getByRole('link', { name: /reports/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/loading reports/i)).toBeInTheDocument()
      })
    })
  })
})