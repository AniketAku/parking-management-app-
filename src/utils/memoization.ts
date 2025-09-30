/**
 * Memoization Utilities - Performance Enhancement Helpers
 * Provides utilities for React.memo, useMemo, useCallback optimizations
 */

import { useCallback, useMemo, useRef, useEffect } from 'react'

/**
 * Deep comparison function for React.memo
 */
export const deepEqual = (prevProps: any, nextProps: any): boolean => {
  if (prevProps === nextProps) return true
  
  if (typeof prevProps !== 'object' || typeof nextProps !== 'object' || 
      prevProps === null || nextProps === null) {
    return prevProps === nextProps
  }

  const prevKeys = Object.keys(prevProps)
  const nextKeys = Object.keys(nextProps)

  if (prevKeys.length !== nextKeys.length) return false

  for (const key of prevKeys) {
    if (!nextKeys.includes(key)) return false
    if (!deepEqual(prevProps[key], nextProps[key])) return false
  }

  return true
}

/**
 * Shallow comparison function for React.memo (more performant)
 */
export const shallowEqual = (prevProps: any, nextProps: any): boolean => {
  if (prevProps === nextProps) return true
  
  if (typeof prevProps !== 'object' || typeof nextProps !== 'object' || 
      prevProps === null || nextProps === null) {
    return prevProps === nextProps
  }

  const prevKeys = Object.keys(prevProps)
  const nextKeys = Object.keys(nextProps)

  if (prevKeys.length !== nextKeys.length) return false

  for (const key of prevKeys) {
    if (!nextKeys.includes(key) || prevProps[key] !== nextProps[key]) {
      return false
    }
  }

  return true
}

/**
 * Optimized comparison for arrays
 */
export const arrayEqual = (a: any[], b: any[]): boolean => {
  if (a === b) return true
  if (a.length !== b.length) return false
  
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  
  return true
}

/**
 * Memoization hook with custom comparison
 */
export const useDeepMemo = <T>(
  factory: () => T,
  deps: React.DependencyList,
  compare: (prev: React.DependencyList, next: React.DependencyList) => boolean = arrayEqual
): T => {
  const ref = useRef<{ deps: React.DependencyList; value: T }>()

  if (!ref.current || !compare(ref.current.deps, deps)) {
    ref.current = { deps, value: factory() }
  }

  return ref.current.value
}

/**
 * Stable callback hook with performance tracking
 */
export const useStableCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  const callbackRef = useRef<T>(callback)
  const depsRef = useRef<React.DependencyList>(deps)

  // Update callback if dependencies changed
  if (!arrayEqual(depsRef.current, deps)) {
    callbackRef.current = callback
    depsRef.current = deps
  }

  return useCallback((...args: any[]) => {
    return callbackRef.current(...args)
  }, []) as T
}

/**
 * Memoized object creator to prevent unnecessary re-renders
 */
export const useStableObject = <T extends object>(obj: T): T => {
  return useMemo(() => obj, Object.values(obj))
}

/**
 * Debounced value hook for expensive calculations
 */
export const useDebouncedValue = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Throttled callback hook
 */
export const useThrottledCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastRan = useRef<number>(Date.now())

  return useCallback((...args: any[]) => {
    if (Date.now() - lastRan.current >= delay) {
      callback(...args)
      lastRan.current = Date.now()
    }
  }, [callback, delay]) as T
}

/**
 * Memoized expensive calculation hook
 */
export const useExpensiveCalculation = <T, K>(
  calculation: (input: K) => T,
  input: K,
  dependencies: React.DependencyList = []
): T => {
  return useMemo(() => {
    const result = calculation(input)
    // Performance logging only in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`🧮 Expensive calculation triggered`)
    }
    return result
  }, [input, ...dependencies])
}

/**
 * Component props memoization helper
 */
export const memoizeProps = <T extends Record<string, any>>(
  props: T,
  keys?: (keyof T)[]
): T => {
  const keysToMemo = keys || Object.keys(props) as (keyof T)[]
  
  return useMemo(() => {
    const memoized = {} as T
    keysToMemo.forEach(key => {
      memoized[key] = props[key]
    })
    return memoized
  }, keysToMemo.map(key => props[key]))
}

/**
 * Render count hook for performance debugging
 */
export const useRenderCount = (componentName: string) => {
  const renderCount = useRef(0)
  
  useEffect(() => {
    renderCount.current += 1
    console.log(`🔄 ${componentName} rendered ${renderCount.current} times`)
  })

  return renderCount.current
}

/**
 * Previous value hook for comparison
 */
export const usePrevious = <T>(value: T): T | undefined => {
  const ref = useRef<T>()
  
  useEffect(() => {
    ref.current = value
  }, [value])
  
  return ref.current
}

/**
 * Changed props detector for debugging
 */
export const useWhyDidYouUpdate = (name: string, props: Record<string, any>) => {
  const previous = useRef<Record<string, any>>()
  
  useEffect(() => {
    if (previous.current) {
      const allKeys = Object.keys({ ...previous.current, ...props })
      const changedProps: Record<string, any> = {}
      
      allKeys.forEach(key => {
        if (previous.current![key] !== props[key]) {
          changedProps[key] = {
            from: previous.current![key],
            to: props[key]
          }
        }
      })
      
      if (Object.keys(changedProps).length) {
        console.log(`🔍 [${name}] Props changed:`, changedProps)
      }
    }
    
    previous.current = props
  })
}

/**
 * Stable ref hook for callbacks
 */
export const useStableRef = <T>(value: T) => {
  const ref = useRef<T>(value)
  ref.current = value
  return ref
}

/**
 * Memoization cache for function results
 */
class MemoCache<K, V> {
  private cache = new Map<string, V>()
  private maxSize: number

  constructor(maxSize = 100) {
    this.maxSize = maxSize
  }

  get(key: K): V | undefined {
    const stringKey = JSON.stringify(key)
    return this.cache.get(stringKey)
  }

  set(key: K, value: V): void {
    const stringKey = JSON.stringify(key)
    
    // LRU eviction
    if (this.cache.size >= this.maxSize && !this.cache.has(stringKey)) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    
    this.cache.set(stringKey, value)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

/**
 * Global memoization cache instance
 */
export const globalMemoCache = new MemoCache(500)

/**
 * Function memoization utility
 */
export const memoize = <Args extends any[], Return>(
  fn: (...args: Args) => Return,
  cache: MemoCache<Args, Return> = globalMemoCache
) => {
  return (...args: Args): Return => {
    const cached = cache.get(args)
    if (cached !== undefined) {
      return cached
    }
    
    const result = fn(...args)
    cache.set(args, result)
    return result
  }
}

// Import useState for useDebouncedValue
import { useState } from 'react'