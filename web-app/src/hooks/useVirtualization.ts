/**
 * Virtual Scrolling Hook - Performance Enhancement for Large Lists
 * Implements virtual scrolling with intersection observer and performance monitoring
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRenderPerformance } from './usePerformance'

export interface VirtualizationConfig {
  itemHeight: number
  containerHeight: number
  overscan?: number
  threshold?: number
  enableDynamicHeight?: boolean
  estimatedItemHeight?: number
}

export interface VirtualItem {
  index: number
  start: number
  end: number
  size: number
}

export interface VirtualizationResult {
  virtualItems: VirtualItem[]
  totalSize: number
  scrollOffset: number
  visibleStartIndex: number
  visibleEndIndex: number
  isScrolling: boolean
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void
  scrollToOffset: (offset: number) => void
  measureElement: (index: number, element: HTMLElement) => void
}

/**
 * Hook for virtual scrolling large lists with performance optimization
 */
export const useVirtualization = (
  itemCount: number,
  config: VirtualizationConfig
): VirtualizationResult => {
  useRenderPerformance('useVirtualization')

  const {
    itemHeight,
    containerHeight,
    overscan = 5,
    threshold = itemCount > 100 ? 100 : 0,
    enableDynamicHeight = false,
    estimatedItemHeight = itemHeight
  } = config

  const [scrollOffset, setScrollOffset] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollingTimeoutRef = useRef<NodeJS.Timeout>()
  const itemSizeCache = useRef<Map<number, number>>(new Map())
  const measurementsCache = useRef<Map<number, { height: number; offset: number }>>(new Map())

  // Reset caches when item count changes
  useEffect(() => {
    itemSizeCache.current.clear()
    measurementsCache.current.clear()
  }, [itemCount])

  // Calculate item positions with dynamic height support
  const itemPositions = useMemo(() => {
    const positions: Array<{ start: number; end: number; size: number }> = []
    let offset = 0

    for (let i = 0; i < itemCount; i++) {
      const cached = measurementsCache.current.get(i)
      const size = cached?.height ?? 
                  itemSizeCache.current.get(i) ?? 
                  estimatedItemHeight

      positions[i] = {
        start: offset,
        end: offset + size,
        size
      }

      offset += size
    }

    return positions
  }, [itemCount, estimatedItemHeight])

  // Calculate total size
  const totalSize = useMemo(() => {
    if (itemPositions.length === 0) return 0
    return itemPositions[itemPositions.length - 1].end
  }, [itemPositions])

  // Find visible range with binary search
  const visibleRange = useMemo(() => {
    if (itemCount === 0 || itemPositions.length === 0) {
      return { start: 0, end: 0 }
    }

    const start = scrollOffset
    const end = scrollOffset + containerHeight

    // Binary search for start index
    let startIndex = 0
    let endIndex = itemCount - 1

    while (startIndex <= endIndex) {
      const mid = Math.floor((startIndex + endIndex) / 2)
      const position = itemPositions[mid]

      if (position.end <= start) {
        startIndex = mid + 1
      } else if (position.start >= start) {
        endIndex = mid - 1
      } else {
        startIndex = mid
        break
      }
    }

    // Binary search for end index
    let endSearchStart = startIndex
    let endSearchEnd = itemCount - 1

    while (endSearchStart <= endSearchEnd) {
      const mid = Math.floor((endSearchStart + endSearchEnd) / 2)
      const position = itemPositions[mid]

      if (position.start >= end) {
        endSearchEnd = mid - 1
      } else if (position.end <= end) {
        endSearchStart = mid + 1
      } else {
        endSearchEnd = mid
        break
      }
    }

    return {
      start: Math.max(0, startIndex - overscan),
      end: Math.min(itemCount - 1, endSearchEnd + overscan)
    }
  }, [scrollOffset, containerHeight, itemCount, itemPositions, overscan])

  // Generate virtual items
  const virtualItems = useMemo((): VirtualItem[] => {
    const items: VirtualItem[] = []
    
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      const position = itemPositions[i]
      if (position) {
        items.push({
          index: i,
          start: position.start,
          end: position.end,
          size: position.size
        })
      }
    }

    return items
  }, [visibleRange, itemPositions])

  // Scroll to index
  const scrollToIndex = useCallback((
    index: number, 
    align: 'start' | 'center' | 'end' = 'start'
  ) => {
    if (index < 0 || index >= itemCount) return

    const position = itemPositions[index]
    if (!position) return

    let targetOffset = position.start

    switch (align) {
      case 'center':
        targetOffset = position.start - (containerHeight - position.size) / 2
        break
      case 'end':
        targetOffset = position.end - containerHeight
        break
    }

    setScrollOffset(Math.max(0, Math.min(totalSize - containerHeight, targetOffset)))
  }, [itemCount, itemPositions, containerHeight, totalSize])

  // Scroll to offset
  const scrollToOffset = useCallback((offset: number) => {
    setScrollOffset(Math.max(0, Math.min(totalSize - containerHeight, offset)))
  }, [totalSize, containerHeight])

  // Measure element for dynamic height
  const measureElement = useCallback((index: number, element: HTMLElement) => {
    if (!enableDynamicHeight) return

    const height = element.getBoundingClientRect().height
    const currentHeight = itemSizeCache.current.get(index)

    if (currentHeight !== height) {
      itemSizeCache.current.set(index, height)
      
      // Force recalculation by updating measurements cache
      measurementsCache.current.set(index, { 
        height, 
        offset: itemPositions[index]?.start ?? 0 
      })
    }
  }, [enableDynamicHeight, itemPositions])

  // Handle scrolling state
  const handleScroll = useCallback((newScrollOffset: number) => {
    setScrollOffset(newScrollOffset)
    setIsScrolling(true)

    if (scrollingTimeoutRef.current) {
      clearTimeout(scrollingTimeoutRef.current)
    }

    scrollingTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false)
    }, 150)
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollingTimeoutRef.current) {
        clearTimeout(scrollingTimeoutRef.current)
      }
    }
  }, [])

  return {
    virtualItems,
    totalSize,
    scrollOffset,
    visibleStartIndex: visibleRange.start,
    visibleEndIndex: visibleRange.end,
    isScrolling,
    scrollToIndex,
    scrollToOffset,
    measureElement
  }
}

/**
 * Hook for intersection-based lazy loading
 */
export const useIntersectionVirtualization = (
  itemCount: number,
  threshold: number = 100
) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: Math.min(threshold, itemCount) })
  const observerRef = useRef<IntersectionObserver>()
  const sentinelRefs = useRef<Map<string, HTMLElement>>(new Map())

  const registerSentinel = useCallback((key: string, element: HTMLElement | null) => {
    if (!element) {
      sentinelRefs.current.delete(key)
      return
    }

    sentinelRefs.current.set(key, element)

    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const key = entry.target.getAttribute('data-sentinel-key')
              if (key === 'end' && visibleRange.end < itemCount) {
                setVisibleRange(prev => ({
                  ...prev,
                  end: Math.min(prev.end + threshold, itemCount)
                }))
              } else if (key === 'start' && visibleRange.start > 0) {
                setVisibleRange(prev => ({
                  ...prev,
                  start: Math.max(0, prev.start - threshold)
                }))
              }
            }
          })
        },
        { rootMargin: '100px' }
      )
    }

    element.setAttribute('data-sentinel-key', key)
    observerRef.current.observe(element)
  }, [itemCount, threshold, visibleRange.end, visibleRange.start])

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect()
    }
  }, [])

  return {
    visibleRange,
    registerSentinel,
    hasMore: visibleRange.end < itemCount
  }
}

/**
 * Hook for window-based virtualization (for extremely large datasets)
 */
export const useWindowVirtualization = (
  itemCount: number,
  itemHeight: number,
  windowSize: number = 10
) => {
  const [currentWindow, setCurrentWindow] = useState(0)
  const windowCount = Math.ceil(itemCount / windowSize)
  
  const visibleItems = useMemo(() => {
    const startIndex = currentWindow * windowSize
    const endIndex = Math.min(startIndex + windowSize, itemCount)
    return { start: startIndex, end: endIndex }
  }, [currentWindow, windowSize, itemCount])

  const scrollToWindow = useCallback((windowIndex: number) => {
    setCurrentWindow(Math.max(0, Math.min(windowCount - 1, windowIndex)))
  }, [windowCount])

  const nextWindow = useCallback(() => {
    setCurrentWindow(prev => Math.min(prev + 1, windowCount - 1))
  }, [windowCount])

  const previousWindow = useCallback(() => {
    setCurrentWindow(prev => Math.max(prev - 1, 0))
  }, [])

  return {
    visibleItems,
    currentWindow,
    windowCount,
    scrollToWindow,
    nextWindow,
    previousWindow,
    hasNext: currentWindow < windowCount - 1,
    hasPrevious: currentWindow > 0
  }
}