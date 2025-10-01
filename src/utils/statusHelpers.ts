/**
 * Status Helper Utilities
 * Handles status value compatibility during database migration transition
 */

export type ParkingStatus = 'Parked' | 'Active' | 'Exited'

/**
 * Check if a vehicle is currently parked (handles both legacy 'Parked' and new 'Active' status)
 */
export function isCurrentlyParked(status: string): boolean {
  return status === 'Active' || status === 'Parked'
}

/**
 * Check if a vehicle has exited
 */
export function hasExited(status: string): boolean {
  return status === 'Exited'
}

/**
 * Get the display name for a status
 */
export function getStatusDisplayName(status: string): string {
  switch (status) {
    case 'Active':
    case 'Parked':
      return 'Parked'
    case 'Exited':
      return 'Exited'
    default:
      return status
  }
}

/**
 * Get the normalized status for database operations
 * Maps legacy 'Parked' to 'Active' for consistency
 */
export function getNormalizedStatus(status: string): ParkingStatus {
  if (status === 'Parked') {
    return 'Active' // Normalize legacy status
  }
  return status as ParkingStatus
}

/**
 * Filter entries for currently parked vehicles
 */
export function filterCurrentlyParked<T extends { status: string }>(entries: T[]): T[] {
  return entries.filter(entry => isCurrentlyParked(entry.status))
}

/**
 * Filter entries for exited vehicles
 */
export function filterExited<T extends { status: string }>(entries: T[]): T[] {
  return entries.filter(entry => hasExited(entry.status))
}