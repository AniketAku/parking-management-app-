import { useState, useEffect, useCallback } from 'react'
import { apiService } from '../services/api'
import { toast } from 'react-hot-toast'
import type { DependencyList } from 'react'

// Generic API hook for any API call
export function useApi<T>(
  apiCall: () => Promise<T>,
  dependencies: DependencyList = [],
  options: {
    immediate?: boolean
    onSuccess?: (data: T) => void
    onError?: (error: Error) => void
    showErrorToast?: boolean
  } = {}
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const {
    immediate = true,
    onSuccess,
    onError,
    showErrorToast = true
  } = options

  const execute = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await apiCall()
      setData(result)
      
      if (onSuccess) {
        onSuccess(result)
      }
      
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An error occurred')
      setError(error)
      
      if (onError) {
        onError(error)
      } else if (showErrorToast) {
        toast.error(error.message)
      }
      
      throw error
    } finally {
      setLoading(false)
    }
  }, [apiCall, onSuccess, onError, showErrorToast])

  useEffect(() => {
    if (immediate) {
      execute()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, execute, ...dependencies])

  const retry = useCallback(() => {
    execute()
  }, [execute])

  return {
    data,
    loading,
    error,
    execute,
    retry
  }
}

// Mutation hook for create/update/delete operations
export function useMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    onSuccess?: (data: TData, variables: TVariables) => void
    onError?: (error: Error, variables: TVariables) => void
    onSettled?: (data: TData | null, error: Error | null, variables: TVariables) => void
    showSuccessToast?: boolean | string
    showErrorToast?: boolean
  } = {}
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const {
    onSuccess,
    onError,
    onSettled,
    showSuccessToast = false,
    showErrorToast = true
  } = options

  const mutate = useCallback(async (variables: TVariables) => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await mutationFn(variables)
      
      if (onSuccess) {
        onSuccess(data, variables)
      }
      
      if (showSuccessToast) {
        const message = typeof showSuccessToast === 'string' 
          ? showSuccessToast 
          : 'Operation completed successfully'
        toast.success(message)
      }
      
      if (onSettled) {
        onSettled(data, null, variables)
      }
      
      return data
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An error occurred')
      setError(error)
      
      if (onError) {
        onError(error, variables)
      } else if (showErrorToast) {
        toast.error(error.message)
      }
      
      if (onSettled) {
        onSettled(null, error, variables)
      }
      
      throw error
    } finally {
      setLoading(false)
    }
  }, [mutationFn, onSuccess, onError, onSettled, showSuccessToast, showErrorToast])

  return {
    mutate,
    loading,
    error,
    reset: () => setError(null)
  }
}

// Health check hook
export function useApiHealth() {
  const [isApiAvailable, setIsApiAvailable] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)

  const checkHealth = useCallback(async () => {
    setChecking(true)
    try {
      const result = await apiService.healthCheck()
      const isHealthy = result.status === 'healthy'
      setIsApiAvailable(isHealthy)
      return isHealthy
    } catch {
      setIsApiAvailable(false)
      return false
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    checkHealth()
    
    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [checkHealth])

  return {
    isApiAvailable,
    checking,
    checkHealth
  }
}

// Connection status hook
export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const { isApiAvailable } = useApiHealth()

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return {
    isOnline,
    isApiAvailable,
    isFullyConnected: isOnline && isApiAvailable
  }
}