// Debug utility to check timezone handling
// Add this to any component to debug timestamp issues

export const debugTimestamps = (entry: any) => {
  console.group('🕐 Timestamp Debug');
  
  console.log('Raw entry data:', entry);
  
  if (entry.entryTime) {
    console.log('Entry Time (raw):', entry.entryTime);
    console.log('Entry Time (toString):', entry.entryTime.toString());
    console.log('Entry Time (toISOString):', entry.entryTime.toISOString());
    console.log('Entry Time (toLocaleString IST):', entry.entryTime.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }));
  }
  
  if (entry.createdAt) {
    console.log('Created At (raw):', entry.createdAt);
    console.log('Created At (toString):', entry.createdAt.toString());
    console.log('Created At (toISOString):', entry.createdAt.toISOString());
    console.log('Created At (toLocaleString IST):', entry.createdAt.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }));
  }
  
  console.log('Current local time:', new Date().toString());
  console.log('Current UTC time:', new Date().toISOString());
  console.log('Current IST time:', new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }));
  
  console.groupEnd();
}

// Quick test function
export const testTimezoneConversion = () => {
  const now = new Date();
  const oldMethod = now.toISOString(); // Old method (UTC)
  
  // New method (IST-aware)
  const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}))
  const newMethod = istTime.toISOString();
  
  console.group('🧪 Timezone Conversion Test');
  console.log('Current actual time:', now.toString());
  console.log('OLD method (UTC):', oldMethod);
  console.log('NEW method (IST-aware):', newMethod);
  console.log('OLD displayed as IST:', new Date(oldMethod).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: true
  }));
  console.log('NEW displayed as IST:', new Date(newMethod).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: true
  }));
  console.log('NEW should match current time!');
  console.groupEnd();
}