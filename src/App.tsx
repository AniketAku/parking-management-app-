import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useCurrentUser } from './hooks/useAuth'
import { useSecureAuthStore } from './stores/secureAuthStore'
import { securityService } from './services/securityService'
import { PWAInstallBanner, PWAOfflineIndicator } from './components/pwa'
import { ThemeManager } from './components/ThemeManager'
import { ThemeProvider } from './contexts/ThemeContext'
import { UserService } from './services/userService'
import { log } from './utils/secureLogger'
import { DemoModeIndicator } from './components/demo/DemoModeIndicator'
// import { PerformanceProvider } from './contexts/PerformanceContext'
import './App.css'

// Import layout and auth components
import { AppLayout } from './components/layout/AppLayout'
import { ProtectedRoute } from './components/auth'
import { LoginPage } from './pages/LoginPage'

// Import page components
import { DashboardPage } from './pages/DashboardPage'
import { EntryPage } from './pages/EntryPage'
import { ExitPage } from './pages/ExitPage'
import { SearchPage } from './pages/SearchPage'
import { ReportsPage } from './pages/ReportsPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { ShiftManagementPage } from './pages/ShiftManagementPage'
import HealthCheckPage from './pages/HealthCheckPage'
import { UserApprovalPage } from './pages/UserApprovalPage'
import { SettingsPage } from './pages/SettingsPage'
import { ProfilePage } from './pages/ProfilePage'
// import PerformancePage from './pages/PerformancePage'

// Public route wrapper (redirect to dashboard if already authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useCurrentUser()
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }
  
  return <>{children}</>
}

// App loading component
const AppLoading: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-surface-light">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
      <h2 className="text-xl font-semibold text-text-primary mb-2">
        Parking Management System
      </h2>
      <p className="text-text-muted">Loading application...</p>
    </div>
  </div>
)

const App: React.FC = () => {
  const { isLoading } = useCurrentUser()
  const [initializing, setInitializing] = useState(true)
  const [showInstallBanner, setShowInstallBanner] = useState(true)
  // Removed debug info to prevent information disclosure

  // Initialize authentication and admin user on app startup
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        log.debug('Starting application initialization')
        
        // Check if Supabase environment variables are available
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
        
        if (!supabaseUrl || !supabaseAnonKey) {
          log.info('🔒 SAFE: Running in demo mode - Supabase not configured')
          setInitializing(false)
          return
        }

        // Initialize security service
        log.debug('Initializing security service')
        securityService.initialize()
        
        // Initialize secure authentication
        log.debug('Initializing authentication')
        const { initializeAuth } = useSecureAuthStore.getState()
        await initializeAuth()
        
        // Initialize admin user if needed
        log.debug('Initializing admin user')
        await UserService.initializeAdminUser()
        
        log.success('Application initialized successfully')
      } catch (error) {
        log.error('Failed to initialize application', error)
        // Don't block the app if authentication fails
      } finally {
        setInitializing(false)
      }
    }

    initializeAuth()
  }, [])

  // Show loading screen during initialization
  if (initializing || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-light">
        <div className="text-center max-w-2xl mx-auto p-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Parking Management System
          </h2>
          <p className="text-text-muted mb-6">Loading application...</p>
          
        </div>
      </div>
    )
  }

  return (
    <ThemeProvider>
      {/* Demo Mode Indicator */}
      <DemoModeIndicator />
      
      {/* Global Theme Manager */}
      <ThemeManager />
      
      {/* PWA Install Banner */}
      {showInstallBanner && (
        <PWAInstallBanner
          onInstall={(success) => {
            if (success) setShowInstallBanner(false)
          }}
          onDismiss={() => setShowInstallBanner(false)}
        />
      )}
      
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--color-background)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            fontSize: '14px',
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: 'var(--color-success, #10b981)',
              secondary: 'var(--color-background)',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--color-danger, #ef4444)',
              secondary: 'var(--color-background)',
            },
          },
        }}
      />

      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } 
        />
        
        
        {/* Protected routes wrapped in AppLayout */}
        <Route 
          path="/*" 
          element={
            <ProtectedRoute>
              <AppLayout>
                {/* PWA Offline Indicator */}
                <PWAOfflineIndicator />
                
                <Routes>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/entry" element={<EntryPage />} />
                  <Route path="/exit" element={<ExitPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/shifts" element={<ShiftManagementPage />} />
                  <Route path="/users" element={<UserApprovalPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/health" element={<HealthCheckPage />} />
                  {/* <Route path="/performance" element={<PerformancePage />} /> */}
                  {/* Fallback route */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </AppLayout>
            </ProtectedRoute>
          } 
        />
      </Routes>
    </ThemeProvider>
  )
}

export default App
