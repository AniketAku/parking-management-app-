/**
 * DIRECT FIX for timestamp display issues
 * This utility bypasses timezone conversion problems by directly formatting timestamps
 */

/**
 * Get current timestamp for parking operations (fixed for IST)
 */
export const getCurrentParkingTime = (): string => {
  const now = new Date();
  
  // Manually format the current local time as YYYY-MM-DDTHH:mm:ss.sssZ
  // But adjust for IST display
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  
  // Return in ISO format but representing local time
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}Z`;
}

/**
 * Format any timestamp for consistent IST display
 */
export const formatParkingTime = (timestamp: string | Date | null | undefined): string => {
  if (!timestamp) {
    return 'Not available';
  }
  
  try {
    let date: Date;
    
    if (typeof timestamp === 'string') {
      // If it's a string, parse it but treat it as local time
      date = new Date(timestamp);
    } else {
      date = timestamp;
    }
    
    if (isNaN(date.getTime())) {
      return 'Not available';
    }
    
    // Format using local timezone (no conversion)
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleDateString('en-IN', { month: 'short' });
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    
    return `${day} ${month} ${year}, ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  } catch (error) {
    console.warn('Error formatting parking time:', timestamp, error);
    return 'Not available';
  }
}