/**
 * Production-Safe Demo Logging System
 * Replaces unsafe console.log with enhanced logging for demos
 */

// Safe demo logger that respects production environment
export const safeDemoLogger = {
  isEnabled: () => {
    // Only enable in development or when explicitly enabled
    return (import.meta?.env?.DEV || localStorage.getItem('enableDemoLogs') === 'true')
  },
  
  demo(message, data) {
    if (!this.isEnabled()) return
    
    // Use enhanced logger if available, fallback to safe console
    if (window.enhancedLogger) {
      window.enhancedLogger.demo(message, data)
    } else if (import.meta?.env?.DEV) {
      console.log(`🎬 Demo: ${message}`, data || '')
    }
  },
  
  section(title) {
    if (!this.isEnabled()) return
    
    this.demo(`\n📊 ${title}`)
    this.demo('='.repeat(title.length + 4))
  },
  
  step(step) {
    if (!this.isEnabled()) return
    
    this.demo(`📝 ${step}`)
  },
  
  result(test, status, details) {
    if (!this.isEnabled()) return
    
    const emoji = status.includes('passed') || status.includes('success') ? '✅' : 
                  status.includes('warning') ? '⚠️' : 
                  status.includes('failed') || status.includes('error') ? '❌' : 'ℹ️'
    
    this.demo(`${emoji} ${test}: ${status}`, details)
  },
  
  summary(results) {
    if (!this.isEnabled()) return
    
    this.section('Demo Summary')
    results.forEach((result, index) => {
      this.demo(`${index + 1}. ${result.test}: ${result.status}`)
    })
  },
  
  // Enable demo logging (useful for production debugging when needed)
  enable() {
    localStorage.setItem('enableDemoLogs', 'true')
    this.demo('Demo logging enabled')
  },
  
  // Disable demo logging
  disable() {
    this.demo('Demo logging disabled')
    localStorage.removeItem('enableDemoLogs')
  },
  
  // Check current status
  status() {
    const enabled = this.isEnabled()
    const env = import.meta?.env?.DEV ? 'development' : 'production'
    
    if (enabled) {
      console.log('🔒 SAFE: Demo logging status:', { enabled, env })
    }
    
    return { enabled, env }
  }
}

// Make available globally for demo scripts
window.safeDemoLogger = safeDemoLogger

export default safeDemoLogger