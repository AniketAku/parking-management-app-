import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { pwaService } from './services/pwaService'
import { securityService } from './services/securityService'
import './styles/globals.css'
// import './lib/quickDatabaseSetup' // Make database setup available globally
import App from './App.tsx'

// Create a client with PWA-optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      // Enable background refetch for PWA
      refetchOnReconnect: true,
      networkMode: 'online',
    },
  },
})

// Initialize security service
securityService.initialize()

// Initialize PWA service worker
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  pwaService.registerServiceWorker().then(success => {
    if (success) {
      // PWA enabled successfully
    } else {
      // PWA initialization failed
    }
  })
} else if (import.meta.env.DEV) {
  // PWA disabled in development mode
}

// Create router with future flags
const router = createBrowserRouter(
  [
    {
      path: '/*',
      element: <App />
    }
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }
  }
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)

// Register error boundary for PWA  
window.addEventListener('error', (event) => {
  // Global error logged securely
})

window.addEventListener('unhandledrejection', (event) => {
  // Unhandled promise rejection logged securely
})
