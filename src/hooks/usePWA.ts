// PWA React Hooks - Custom hooks for Progressive Web App functionality

import { useState, useEffect, useCallback } from 'react'
import { pwaService, type PWACapabilities } from '../services/pwaService'

// Hook for PWA installation
export const usePWAInstall = () => {
  const [canInstall, setCanInstall] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    // Initial state
    const capabilities = pwaService.getCapabilities()
    setCanInstall(capabilities.isInstallable)
    setIsInstalled(capabilities.isInstalled)

    // Listen for install prompt availability
    const handleInstallPrompt = (available: boolean) => {
      setCanInstall(available)
    }

    const handleInstalled = (installed: boolean) => {
      setIsInstalled(installed)
      setInstalling(false)
    }

    pwaService.on('installPromptAvailable', handleInstallPrompt)
    pwaService.on('installed', handleInstalled)

    return () => {
      pwaService.off('installPromptAvailable', handleInstallPrompt)
      pwaService.off('installed', handleInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!canInstall || installing) return false

    setInstalling(true)
    try {
      const success = await pwaService.installPWA()
      if (!success) setInstalling(false)
      return success
    } catch {
      setInstalling(false)
      return false
    }
  }, [canInstall, installing])

  return {
    canInstall,
    isInstalled,
    installing,
    install
  }
}

// Hook for PWA updates
export const usePWAUpdate = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    const handleUpdateAvailable = (available: boolean) => {
      setUpdateAvailable(available)
    }

    pwaService.on('updateAvailable', handleUpdateAvailable)

    return () => {
      pwaService.off('updateAvailable', handleUpdateAvailable)
    }
  }, [])

  const applyUpdate = useCallback(async () => {
    if (!updateAvailable || updating) return

    setUpdating(true)
    await pwaService.applyUpdate()
    // Update will be applied and page will reload
  }, [updateAvailable, updating])

  const checkForUpdates = useCallback(async () => {
    await pwaService.checkForUpdates()
  }, [])

  return {
    updateAvailable,
    updating,
    applyUpdate,
    checkForUpdates
  }
}

// Hook for online/offline status
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnlineStatusChange = (online: boolean) => {
      setIsOnline(online)
    }

    pwaService.on('onlineStatusChange', handleOnlineStatusChange)

    return () => {
      pwaService.off('onlineStatusChange', handleOnlineStatusChange)
    }
  }, [])

  return { isOnline, isOffline: !isOnline }
}

// Hook for PWA capabilities
export const usePWACapabilities = (): PWACapabilities => {
  const [capabilities, setCapabilities] = useState<PWACapabilities>(
    pwaService.getCapabilities()
  )

  useEffect(() => {
    // Update capabilities when PWA state changes
    const updateCapabilities = () => {
      setCapabilities(pwaService.getCapabilities())
    }

    pwaService.on('installPromptAvailable', updateCapabilities)
    pwaService.on('installed', updateCapabilities)
    pwaService.on('onlineStatusChange', updateCapabilities)

    return () => {
      pwaService.off('installPromptAvailable', updateCapabilities)
      pwaService.off('installed', updateCapabilities)
      pwaService.off('onlineStatusChange', updateCapabilities)
    }
  }, [])

  return capabilities
}

// Hook for PWA notifications
export const usePWANotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  )
  const [requesting, setRequesting] = useState(false)

  const requestPermission = useCallback(async () => {
    if (requesting || permission === 'granted') return permission

    setRequesting(true)
    try {
      const newPermission = await pwaService.requestNotificationPermission()
      setPermission(newPermission)
      return newPermission
    } finally {
      setRequesting(false)
    }
  }, [permission, requesting])

  const showNotification = useCallback(async (
    title: string, 
    options?: NotificationOptions
  ) => {
    if (permission !== 'granted') {
      const newPermission = await requestPermission()
      if (newPermission !== 'granted') return false
    }

    try {
      await pwaService.showNotification(title, options)
      return true
    } catch (error) {
      console.error('Failed to show notification:', error)
      return false
    }
  }, [permission, requestPermission])

  return {
    permission,
    requesting,
    canNotify: permission === 'granted',
    requestPermission,
    showNotification
  }
}

// Hook for PWA cache management
export const usePWACache = () => {
  const [clearing, setClearing] = useState(false)
  const [updating, setUpdating] = useState(false)

  const clearCache = useCallback(async () => {
    if (clearing) return
    
    setClearing(true)
    try {
      await pwaService.clearCaches()
    } finally {
      setClearing(false)
    }
  }, [clearing])

  const updateCache = useCallback(async (url: string) => {
    if (updating) return
    
    setUpdating(true)
    try {
      await pwaService.updateCache(url)
    } finally {
      setUpdating(false)
    }
  }, [updating])

  return {
    clearing,
    updating,
    clearCache,
    updateCache
  }
}

// Combined PWA hook with all functionality
export const usePWA = () => {
  const install = usePWAInstall()
  const update = usePWAUpdate()
  const network = useNetworkStatus()
  const capabilities = usePWACapabilities()
  const notifications = usePWANotifications()
  const cache = usePWACache()

  return {
    ...install,
    ...update,
    ...network,
    capabilities,
    notifications,
    cache,
    
    // Convenience methods
    isSupported: capabilities.isServiceWorkerSupported,
    isPWA: capabilities.isInstalled,
    canUseOffline: capabilities.isServiceWorkerSupported
  }
}