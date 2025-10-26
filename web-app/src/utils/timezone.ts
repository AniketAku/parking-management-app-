/**
 * Timezone utilities for proper date/time handling
 */

import { log } from './secureLogger'

/**
 * Get current local time as ISO string that preserves local timezone
 */
export const getCurrentLocalTimestamp = (): string => {
  const now = new Date()
  // Get timezone offset in minutes and convert to milliseconds
  const timezoneOffset = now.getTimezoneOffset() * 60000
  // Create a new date that represents local time as if it were UTC
  const localAsUTC = new Date(now.getTime() - timezoneOffset)
  return localAsUTC.toISOString()
}

/**
 * Convert a timestamp to local time for display
 */
export const formatLocalTime = (timestamp: string | Date): Date => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  
  // If the date is invalid, return current time
  if (isNaN(date.getTime())) {
    return new Date()
  }
  
  return date
}

/**
 * Get current time in Indian timezone (IST)
 */
export const getCurrentISTTime = (): string => {
  const now = new Date()
  
  // Convert to IST (UTC+5:30)
  const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}))
  
  return istTime.toISOString()
}

/**
 * Format timestamp for database storage (always use local timezone)
 */
export const formatForDatabase = (date?: Date): string => {
  const targetDate = date || new Date()
  
  // Store the actual local time
  return targetDate.toISOString()
}

/**
 * Parse database timestamp and ensure it's treated as local time
 */
export const parseFromDatabase = (timestamp: string | null | undefined): Date => {
  if (!timestamp) {
    return new Date()
  }
  
  try {
    const parsed = new Date(timestamp)
    if (isNaN(parsed.getTime())) {
      return new Date()
    }
    return parsed
  } catch (error) {
    log.warn('Error parsing timestamp', { timestamp, error })
    return new Date()
  }
}

/**
 * Get current time with proper timezone handling for parking system
 */
export const getParkingTimestamp = (): string => {
  // Simple fix: Just use the current local time
  // The display function will handle timezone formatting
  return new Date().toISOString()
}

/**
 * Format timestamp consistently for display
 */
export const formatTimestampForDisplay = (timestamp: string | Date | null | undefined): string => {
  if (!timestamp) {
    return 'Not available'
  }
  
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
    
    if (isNaN(date.getTime())) {
      return 'Not available'
    }
    
    // Always format to IST regardless of how it was stored
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch (error) {
    log.warn('Error formatting timestamp', { timestamp, error })
    return 'Not available'
  }
}