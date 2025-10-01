/**
 * Desktop API Hook - React Integration with Electron
 * Provides React hooks for accessing desktop-specific functionality
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ParkingEntry, Statistics, VehicleEntryForm, SearchFilters, ReportData } from '../types'

// Desktop API types
interface BackupInfo {
  id: string
  name: string
  path: string
  size: number
  createdAt: Date
}

interface PrinterInfo {
  id: string
  name: string
  status: 'available' | 'offline' | 'error'
  isDefault: boolean
}

interface PrintOptions {
  printer?: string
  copies?: number
  orientation?: 'portrait' | 'landscape'
  paperSize?: 'A4' | 'Letter' | 'Receipt'
}

interface PrintContent {
  title: string
  content: string
  type: 'html' | 'text'
}

interface WindowState {
  isMaximized: boolean
  isMinimized: boolean
  isFullScreen: boolean
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
}

interface SystemInfo {
  platform: string
  version: string
  arch: string
  totalMemory: number
  freeMemory: number
  cpuUsage: number
}

interface MessageOptions {
  type: 'info' | 'warning' | 'error' | 'question'
  title: string
  message: string
  buttons?: string[]
  defaultId?: number
  cancelId?: number
}

interface MessageResponse {
  response: number
  checkboxChecked?: boolean
}

interface SystemPaths {
  home: string
  documents: string
  downloads: string
  desktop: string
  temp: string
  userData: string
}

interface NotificationOptions {
  title: string
  body: string
  icon?: string
  silent?: boolean
  urgency?: 'low' | 'normal' | 'critical'
}

type EventCallback = (...args: unknown[]) => void
interface DesktopAPI {
  data: {
    getEntries(): Promise<ParkingEntry[]>
    addEntry(entry: VehicleEntryForm): Promise<ParkingEntry>
    updateEntry(id: string, updates: Partial<ParkingEntry>): Promise<ParkingEntry>
    deleteEntry(id: string): Promise<boolean>
    searchEntries(criteria: SearchFilters): Promise<ParkingEntry[]>
    getStatistics(): Promise<Statistics>
    getSettings(): Promise<Record<string, unknown>>
    updateSettings(settings: Record<string, unknown>): Promise<Record<string, unknown>>
  }
  files: {
    showExportDialog(): Promise<{ canceled: boolean; filePath?: string }>
    showImportDialog(): Promise<{ canceled: boolean; filePaths: string[] }>
    exportData(filePath: string, format: 'csv' | 'json'): Promise<boolean>
    importData(filePath: string): Promise<ParkingEntry[]>
    openExternal(path: string): Promise<string>
  }
  backup: {
    create(): Promise<string>
    list(): Promise<BackupInfo[]>
    showRestoreDialog(): Promise<{ canceled: boolean; filePaths: string[] }>
    restore(backupPath: string): Promise<boolean>
  }
  printer: {
    getPrinters(): Promise<PrinterInfo[]>
    printReceipt(entry: ParkingEntry, options?: PrintOptions): Promise<boolean>
    printReport(data: ReportData, options?: PrintOptions): Promise<boolean>
    showPreview(content: PrintContent): Promise<boolean>
  }
  window: {
    minimize(): Promise<void>
    maximize(): Promise<void>
    close(): Promise<void>
    getState(): Promise<WindowState>
    setAlwaysOnTop(flag: boolean): Promise<void>
  }
  system: {
    getInfo(): Promise<SystemInfo>
    openUrl(url: string): Promise<boolean>
    showMessage(options: MessageOptions): Promise<MessageResponse>
    showError(title: string, content: string): Promise<void>
    getPaths(): Promise<SystemPaths>
    showNotification(options: NotificationOptions): Promise<boolean>
  }
  events: {
    on(channel: string, callback: EventCallback): void
    off(channel: string, callback: EventCallback): void
    once(channel: string, callback: EventCallback): void
  }
  isDesktop: boolean
  version: string
}

declare global {
  interface Window {
    desktopAPI?: DesktopAPI
    isDesktopApp?: boolean
  }
}

// Hook for detecting desktop environment
export const useIsDesktop = (): boolean => {
  return typeof window !== 'undefined' && Boolean(window.isDesktopApp)
}

// Hook for accessing desktop API
export const useDesktopAPI = () => {
  const isDesktop = useIsDesktop()
  const api = isDesktop ? window.desktopAPI : null

  return {
    isDesktop,
    api
  }
}

// Hook for desktop data operations
export const useDesktopData = () => {
  const { isDesktop, api } = useDesktopAPI()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const executeOperation = useCallback(async <T>(
    operation: () => Promise<T>
  ): Promise<T | null> => {
    if (!isDesktop || !api) {
      setError('Desktop API not available')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const result = await operation()
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [isDesktop, api])

  const getEntries = useCallback(() => {
    return executeOperation(() => api!.data.getEntries())
  }, [executeOperation, api])

  const addEntry = useCallback((entry: VehicleEntryForm) => {
    return executeOperation(() => api!.data.addEntry(entry))
  }, [executeOperation, api])

  const updateEntry = useCallback((id: string, updates: Partial<ParkingEntry>) => {
    return executeOperation(() => api!.data.updateEntry(id, updates))
  }, [executeOperation, api])

  const deleteEntry = useCallback((id: string) => {
    return executeOperation(() => api!.data.deleteEntry(id))
  }, [executeOperation, api])

  const searchEntries = useCallback((criteria: SearchFilters) => {
    return executeOperation(() => api!.data.searchEntries(criteria))
  }, [executeOperation, api])

  const getStatistics = useCallback(() => {
    return executeOperation(() => api!.data.getStatistics())
  }, [executeOperation, api])

  const getSettings = useCallback(() => {
    return executeOperation(() => api!.data.getSettings())
  }, [executeOperation, api])

  const updateSettings = useCallback((settings: Record<string, unknown>) => {
    return executeOperation(() => api!.data.updateSettings(settings))
  }, [executeOperation, api])

  return {
    loading,
    error,
    getEntries,
    addEntry,
    updateEntry,
    deleteEntry,
    searchEntries,
    getStatistics,
    getSettings,
    updateSettings
  }
}

// Hook for desktop file operations
export const useDesktopFiles = () => {
  const { isDesktop, api } = useDesktopAPI()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const executeFileOperation = useCallback(async <T>(
    operation: () => Promise<T>
  ): Promise<T | null> => {
    if (!isDesktop || !api) {
      setError('Desktop API not available')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const result = await operation()
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'File operation failed'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [isDesktop, api])

  const showExportDialog = useCallback(() => {
    return executeFileOperation(() => api!.files.showExportDialog())
  }, [executeFileOperation, api])

  const showImportDialog = useCallback(() => {
    return executeFileOperation(() => api!.files.showImportDialog())
  }, [executeFileOperation, api])

  const exportData = useCallback((filePath: string, format: 'csv' | 'json') => {
    return executeFileOperation(() => api!.files.exportData(filePath, format))
  }, [executeFileOperation, api])

  const importData = useCallback((filePath: string) => {
    return executeFileOperation(() => api!.files.importData(filePath))
  }, [executeFileOperation, api])

  const openExternal = useCallback((path: string) => {
    return executeFileOperation(() => api!.files.openExternal(path))
  }, [executeFileOperation, api])

  return {
    loading,
    error,
    showExportDialog,
    showImportDialog,
    exportData,
    importData,
    openExternal
  }
}

// Hook for desktop printing
export const useDesktopPrinter = () => {
  const { isDesktop, api } = useDesktopAPI()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [printers, setPrinters] = useState<PrinterInfo[]>([])

  const executePrintOperation = useCallback(async <T>(
    operation: () => Promise<T>
  ): Promise<T | null> => {
    if (!isDesktop || !api) {
      setError('Desktop API not available')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const result = await operation()
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Print operation failed'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [isDesktop, api])

  const getPrinters = useCallback(async () => {
    const result = await executePrintOperation(() => api!.printer.getPrinters())
    if (result) {
      setPrinters(result)
    }
    return result
  }, [executePrintOperation, api])

  const printReceipt = useCallback((entry: ParkingEntry, options?: PrintOptions) => {
    return executePrintOperation(() => api!.printer.printReceipt(entry, options))
  }, [executePrintOperation, api])

  const printReport = useCallback((data: ReportData, options?: PrintOptions) => {
    return executePrintOperation(() => api!.printer.printReport(data, options))
  }, [executePrintOperation, api])

  const showPreview = useCallback((content: PrintContent) => {
    return executePrintOperation(() => api!.printer.showPreview(content))
  }, [executePrintOperation, api])

  // Load printers on mount
  useEffect(() => {
    if (isDesktop && api) {
      getPrinters()
    }
  }, [isDesktop, api, getPrinters])

  return {
    loading,
    error,
    printers,
    getPrinters,
    printReceipt,
    printReport,
    showPreview
  }
}

// Hook for desktop window controls
export const useDesktopWindow = () => {
  const { isDesktop, api } = useDesktopAPI()
  const [windowState, setWindowState] = useState<WindowState | null>(null)

  const minimize = useCallback(async () => {
    if (isDesktop && api) {
      await api.window.minimize()
    }
  }, [isDesktop, api])

  const maximize = useCallback(async () => {
    if (isDesktop && api) {
      await api.window.maximize()
    }
  }, [isDesktop, api])

  const close = useCallback(async () => {
    if (isDesktop && api) {
      await api.window.close()
    }
  }, [isDesktop, api])

  const getState = useCallback(async () => {
    if (isDesktop && api) {
      const state = await api.window.getState()
      setWindowState(state)
      return state
    }
    return null
  }, [isDesktop, api])

  const setAlwaysOnTop = useCallback(async (flag: boolean) => {
    if (isDesktop && api) {
      await api.window.setAlwaysOnTop(flag)
    }
  }, [isDesktop, api])

  return {
    windowState,
    minimize,
    maximize,
    close,
    getState,
    setAlwaysOnTop
  }
}

// Hook for desktop events
export const useDesktopEvents = () => {
  const { isDesktop, api } = useDesktopAPI()
  const listeners = useRef<Map<string, EventCallback[]>>(new Map())

  const addEventListener = useCallback((channel: string, callback: EventCallback) => {
    if (!isDesktop || !api) return

    // Store callback reference
    if (!listeners.current.has(channel)) {
      listeners.current.set(channel, [])
    }
    listeners.current.get(channel)!.push(callback)

    // Add event listener
    api.events.on(channel, callback)
  }, [isDesktop, api])

  const removeEventListener = useCallback((channel: string, callback?: EventCallback) => {
    if (!isDesktop || !api) return

    if (callback) {
      // Remove specific callback
      api.events.off(channel, callback)
      const channelListeners = listeners.current.get(channel)
      if (channelListeners) {
        const index = channelListeners.indexOf(callback)
        if (index > -1) {
          channelListeners.splice(index, 1)
        }
      }
    } else {
      // Remove all callbacks for channel
      const channelListeners = listeners.current.get(channel) || []
      channelListeners.forEach(cb => api.events.off(channel, cb))
      listeners.current.delete(channel)
    }
  }, [isDesktop, api])

  const addEventListenerOnce = useCallback((channel: string, callback: EventCallback) => {
    if (!isDesktop || !api) return

    api.events.once(channel, callback)
  }, [isDesktop, api])

  // Cleanup on unmount
  useEffect(() => {
    const currentListeners = listeners.current
    return () => {
      // Remove all listeners when component unmounts
      currentListeners.forEach((callbacks, channel) => {
        callbacks.forEach(callback => {
          if (isDesktop && api) {
            api.events.off(channel, callback)
          }
        })
      })
      currentListeners.clear()
    }
  }, [isDesktop, api])

  return {
    addEventListener,
    removeEventListener,
    addEventListenerOnce
  }
}

// Hook for system information
export const useDesktopSystem = () => {
  const { isDesktop, api } = useDesktopAPI()
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)

  const getInfo = useCallback(async () => {
    if (isDesktop && api) {
      const info = await api.system.getInfo()
      setSystemInfo(info)
      return info
    }
    return null
  }, [isDesktop, api])

  const openUrl = useCallback(async (url: string) => {
    if (isDesktop && api) {
      return await api.system.openUrl(url)
    }
    return false
  }, [isDesktop, api])

  const showMessage = useCallback(async (options: MessageOptions) => {
    if (isDesktop && api) {
      return await api.system.showMessage(options)
    }
    return null
  }, [isDesktop, api])

  const showError = useCallback(async (title: string, content: string) => {
    if (isDesktop && api) {
      await api.system.showError(title, content)
    }
  }, [isDesktop, api])

  const showNotification = useCallback(async (options: NotificationOptions) => {
    if (isDesktop && api) {
      return await api.system.showNotification(options)
    }
    return false
  }, [isDesktop, api])

  // Load system info on mount
  useEffect(() => {
    if (isDesktop && api) {
      getInfo()
    }
  }, [isDesktop, api, getInfo])

  return {
    systemInfo,
    getInfo,
    openUrl,
    showMessage,
    showError,
    showNotification
  }
}