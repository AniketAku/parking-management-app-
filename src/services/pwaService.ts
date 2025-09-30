// PWA Service - Manages Progressive Web App functionality
// Service Worker registration, update handling, and PWA features

import { toast } from 'react-hot-toast'

export interface PWAInstallPrompt extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface PWACapabilities {
  isServiceWorkerSupported: boolean
  isPushSupported: boolean
  isNotificationSupported: boolean
  isInstallable: boolean
  isInstalled: boolean
  isOffline: boolean
}

class PWAService {
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null
  private installPrompt: PWAInstallPrompt | null = null
  private updateAvailable = false
  private callbacks: Map<string, Function[]> = new Map()

  constructor() {
    this.initializeEventListeners()
  }

  // Initialize PWA event listeners
  private initializeEventListeners() {
    // Listen for app install prompt
    window.addEventListener('beforeinstallprompt', (event) => {
      // Prevent the default mini-infobar from appearing
      event.preventDefault()
      this.installPrompt = event as PWAInstallPrompt
      this.emit('installPromptAvailable', true)
      console.log('📱 PWA install prompt is available')
    })

    // Listen for app installation
    window.addEventListener('appinstalled', () => {
      this.installPrompt = null
      this.emit('installed', true)
      toast.success('🎉 App installed successfully!')
      console.log('📱 PWA has been installed')
    })

    // Listen for online/offline status
    window.addEventListener('online', () => {
      this.emit('onlineStatusChange', true)
      toast.success('🌐 Back online')
      console.log('🌐 App is back online')
    })

    window.addEventListener('offline', () => {
      this.emit('onlineStatusChange', false)
      toast.error('📡 You are offline', { duration: 4000 })
      console.log('📡 App is offline')
    })

    // Listen for visibility changes (app focus)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkForUpdates()
      }
    })
  }

  // Register service worker
  async registerServiceWorker(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported')
      return false
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      })

      this.serviceWorkerRegistration = registration

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            this.updateAvailable = true
            this.emit('updateAvailable', true)
            this.showUpdateNotification()
          }
        })
      })

      // Handle controller change (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (this.updateAvailable) {
          window.location.reload()
        }
      })

      // Send message to SW on initial load
      if (registration.active) {
        this.sendMessageToSW({ type: 'CLIENT_READY' })
      }

      console.log('✅ Service Worker registered successfully')
      return true

    } catch (error) {
      console.error('❌ Service Worker registration failed:', error)
      return false
    }
  }

  // Show update notification
  private showUpdateNotification() {
    toast.custom((t) => (
      `<div class="bg-white shadow-lg rounded-lg p-4 border border-blue-200">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <svg class="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3 flex-1">
            <h3 class="text-sm font-medium text-gray-900">
              App Update Available
            </h3>
            <p class="text-sm text-gray-500">
              A new version is ready to install
            </p>
          </div>
          <div class="ml-4 flex space-x-2">
            <button
              onclick="window.pwaService.applyUpdate()"
              class="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            >
              Update
            </button>
            <button
              onclick="toast.dismiss('${t.id}')"
              class="text-sm text-gray-500 hover:text-gray-700"
            >
              Later
            </button>
          </div>
        </div>
      </div>`
    ), {
      id: 'update-available',
      duration: Infinity
    })
  }

  // Apply available update
  async applyUpdate(): Promise<void> {
    if (!this.serviceWorkerRegistration) return

    const waiting = this.serviceWorkerRegistration.waiting
    if (waiting) {
      this.sendMessageToSW({ type: 'SKIP_WAITING' })
      toast.dismiss('update-available')
      toast.loading('Updating app...', { duration: 2000 })
    }
  }

  // Check for updates manually
  async checkForUpdates(): Promise<void> {
    if (!this.serviceWorkerRegistration) return

    try {
      await this.serviceWorkerRegistration.update()
    } catch (error) {
      console.log('Update check failed:', error)
    }
  }

  // Install PWA
  async installPWA(): Promise<boolean> {
    if (!this.installPrompt) {
      console.log('Install prompt not available')
      return false
    }

    try {
      await this.installPrompt.prompt()
      const choice = await this.installPrompt.userChoice
      
      if (choice.outcome === 'accepted') {
        console.log('✅ User accepted PWA installation')
        return true
      } else {
        console.log('❌ User dismissed PWA installation')
        return false
      }
    } catch (error) {
      console.error('PWA installation failed:', error)
      return false
    }
  }

  // Get PWA capabilities
  getCapabilities(): PWACapabilities {
    return {
      isServiceWorkerSupported: 'serviceWorker' in navigator,
      isPushSupported: 'PushManager' in window,
      isNotificationSupported: 'Notification' in window,
      isInstallable: !!this.installPrompt,
      isInstalled: this.isInstalled(),
      isOffline: !navigator.onLine
    }
  }

  // Check if PWA is installed
  private isInstalled(): boolean {
    // Check if running in standalone mode (iOS Safari/Android Chrome)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true
    }

    // Check if running as installed PWA (Android Chrome)
    if ((window as any).navigator.standalone === true) {
      return true
    }

    return false
  }

  // Request notification permission
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported')
      return 'denied'
    }

    const permission = await Notification.requestPermission()
    
    if (permission === 'granted') {
      toast.success('📱 Notifications enabled')
    } else {
      toast.error('📱 Notifications blocked')
    }

    return permission
  }

  // Show local notification
  async showNotification(title: string, options: NotificationOptions = {}): Promise<void> {
    if (!this.serviceWorkerRegistration) {
      console.warn('Service worker not available for notifications')
      return
    }

    if (Notification.permission !== 'granted') {
      const permission = await this.requestNotificationPermission()
      if (permission !== 'granted') return
    }

    const defaultOptions: NotificationOptions = {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'parking-notification',
      renotify: true,
      ...options
    }

    await this.serviceWorkerRegistration.showNotification(title, defaultOptions)
  }

  // Send message to service worker
  private sendMessageToSW(message: any): void {
    if (!navigator.serviceWorker.controller) return

    navigator.serviceWorker.controller.postMessage(message)
  }

  // Clear all caches
  async clearCaches(): Promise<void> {
    this.sendMessageToSW({ type: 'CLEAR_CACHE' })
    toast.success('🗑️ Cache cleared')
  }

  // Force cache update for URL
  async updateCache(url: string): Promise<void> {
    this.sendMessageToSW({ type: 'CACHE_UPDATE', url })
  }

  // Event system for PWA state changes
  on(event: string, callback: Function): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, [])
    }
    this.callbacks.get(event)!.push(callback)
  }

  off(event: string, callback: Function): void {
    const callbacks = this.callbacks.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.callbacks.get(event)
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }
  }

  // Get offline status
  isOnline(): boolean {
    return navigator.onLine
  }

  // Get installation status
  canInstall(): boolean {
    return !!this.installPrompt
  }

  // Get update status
  hasUpdate(): boolean {
    return this.updateAvailable
  }

  // Unregister service worker (for development)
  async unregister(): Promise<boolean> {
    if (!this.serviceWorkerRegistration) return false

    try {
      await this.serviceWorkerRegistration.unregister()
      console.log('Service worker unregistered')
      return true
    } catch (error) {
      console.error('Failed to unregister service worker:', error)
      return false
    }
  }
}

// Create singleton instance
export const pwaService = new PWAService()

// Make available globally for debugging and toast actions
if (typeof window !== 'undefined') {
  (window as any).pwaService = pwaService
}

export default pwaService