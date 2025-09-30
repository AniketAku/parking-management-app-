import { useState, useEffect, useCallback } from 'react'
import type { PrinterProfile } from '../types/printerConfig'
import printService from '../services/printService'

export interface PrintSettings {
  autoPrintEntry: boolean
  autoPrintExit: boolean
  showPrintPreview: boolean
  showPrintButton: boolean
  defaultCopies: number
  defaultPrinterId?: string
  confirmBeforePrint: boolean
}

export interface UsePrintSettingsReturn {
  printSettings: PrintSettings
  isLoading: boolean
  error: string | null
  availablePrinters: PrinterProfile[]
  updatePrintSettings: (settings: Partial<PrintSettings>) => Promise<void>
  shouldAutoPrint: (ticketType: 'entry' | 'exit') => boolean
  getDefaultPrinter: () => PrinterProfile | undefined
  refreshPrinters: () => Promise<void>
}

const defaultPrintSettings: PrintSettings = {
  autoPrintEntry: false,
  autoPrintExit: false,
  showPrintPreview: true,
  showPrintButton: true,
  defaultCopies: 1,
  confirmBeforePrint: true
}

export const usePrintSettings = (): UsePrintSettingsReturn => {
  const [printSettings, setPrintSettings] = useState<PrintSettings>(defaultPrintSettings)
  const [availablePrinters, setAvailablePrinters] = useState<PrinterProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load print settings from localStorage or API
  const loadPrintSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Try to load from localStorage first
      const savedSettings = localStorage.getItem('printSettings')
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings)
        setPrintSettings({ ...defaultPrintSettings, ...parsedSettings })
      }

      // TODO: Later, integrate with actual settings service
      // const settingsService = await import('../services/settingsService')
      // const serverSettings = await settingsService.getSettings('printing')
      // setPrintSettings(serverSettings || defaultPrintSettings)

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load print settings'
      setError(message)
      console.error('Failed to load print settings:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load available printers
  const loadAvailablePrinters = useCallback(async () => {
    try {
      const printers = await printService.getAvailablePrinters()
      setAvailablePrinters(printers)
    } catch (err) {
      console.error('Failed to load printers:', err)
    }
  }, [])

  // Update print settings
  const updatePrintSettings = useCallback(async (newSettings: Partial<PrintSettings>) => {
    try {
      const updatedSettings = { ...printSettings, ...newSettings }
      setPrintSettings(updatedSettings)

      // Save to localStorage
      localStorage.setItem('printSettings', JSON.stringify(updatedSettings))

      // TODO: Save to server
      // const settingsService = await import('../services/settingsService')
      // await settingsService.updateSettings('printing', updatedSettings)

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update print settings'
      setError(message)
      console.error('Failed to update print settings:', err)
    }
  }, [printSettings])

  // Check if auto-printing should be enabled for a ticket type
  const shouldAutoPrint = useCallback((ticketType: 'entry' | 'exit'): boolean => {
    if (ticketType === 'entry') {
      return printSettings.autoPrintEntry
    }
    if (ticketType === 'exit') {
      return printSettings.autoPrintExit
    }
    return false
  }, [printSettings])

  // Get the default printer
  const getDefaultPrinter = useCallback((): PrinterProfile | undefined => {
    if (printSettings.defaultPrinterId) {
      return availablePrinters.find(p => p.id === printSettings.defaultPrinterId)
    }
    return availablePrinters.find(p => p.isDefault) || availablePrinters[0]
  }, [availablePrinters, printSettings.defaultPrinterId])

  // Refresh printer list
  const refreshPrinters = useCallback(async () => {
    await loadAvailablePrinters()
  }, [loadAvailablePrinters])

  // Initialize on mount
  useEffect(() => {
    loadPrintSettings()
    loadAvailablePrinters()
  }, [loadPrintSettings, loadAvailablePrinters])

  return {
    printSettings,
    isLoading,
    error,
    availablePrinters,
    updatePrintSettings,
    shouldAutoPrint,
    getDefaultPrinter,
    refreshPrinters
  }
}

// Utility hook for individual print operations
export const usePrintOperation = () => {
  const [isPrinting, setIsPrinting] = useState(false)
  const [lastPrintResult, setLastPrintResult] = useState<any>(null)

  const executePrint = useCallback(async (printFn: () => Promise<any>) => {
    setIsPrinting(true)
    try {
      const result = await printFn()
      setLastPrintResult(result)
      return result
    } finally {
      setIsPrinting(false)
    }
  }, [])

  return {
    isPrinting,
    lastPrintResult,
    executePrint
  }
}