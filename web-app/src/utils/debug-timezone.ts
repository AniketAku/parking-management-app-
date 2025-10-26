// Debug utility to check timezone handling
// Add this to any component to debug timestamp issues

import { log } from './secureLogger'

export const debugTimestamps = (entry: any) => {
  const debugData: any = {
    rawEntry: entry,
    currentLocalTime: new Date().toString(),
    currentUTCTime: new Date().toISOString(),
    currentISTTime: new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  if (entry.entryTime) {
    debugData.entryTime = {
      raw: entry.entryTime,
      toString: entry.entryTime.toString(),
      toISOString: entry.entryTime.toISOString(),
      toLocaleStringIST: entry.entryTime.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    }
  }

  if (entry.createdAt) {
    debugData.createdAt = {
      raw: entry.createdAt,
      toString: entry.createdAt.toString(),
      toISOString: entry.createdAt.toISOString(),
      toLocaleStringIST: entry.createdAt.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    }
  }

  log.debug('Timestamp Debug', debugData)
}

// Quick test function
export const testTimezoneConversion = () => {
  const now = new Date();
  const oldMethod = now.toISOString(); // Old method (UTC)

  // New method (IST-aware)
  const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}))
  const newMethod = istTime.toISOString();

  log.debug('Timezone Conversion Test', {
    currentActualTime: now.toString(),
    oldMethodUTC: oldMethod,
    newMethodISTAware: newMethod,
    oldDisplayedAsIST: new Date(oldMethod).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: true
    }),
    newDisplayedAsIST: new Date(newMethod).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: true
    }),
    note: 'NEW should match current time'
  })
}