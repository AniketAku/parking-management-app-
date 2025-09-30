// Test Utilities - Helper functions and providers for testing
// Provides consistent test setup with all necessary providers

import React from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import type { ParkingEntry, AuthUser } from '../types'

// Create test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: Infinity,
    },
    mutations: {
      retry: false,
    },
  },
})

// Test providers wrapper
interface TestProvidersProps {
  children: React.ReactNode
  initialEntries?: string[]
  queryClient?: QueryClient
}

export const TestProviders: React.FC<TestProvidersProps> = ({
  children,
  initialEntries = ['/'],
  queryClient = createTestQueryClient(),
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[]
  queryClient?: QueryClient
}

export const renderWithProviders = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { initialEntries, queryClient, ...renderOptions } = options
  
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestProviders 
      initialEntries={initialEntries}
      queryClient={queryClient}
    >
      {children}
    </TestProviders>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Mock data generators
export const createMockParkingEntry = (overrides: Partial<ParkingEntry> = {}): ParkingEntry => ({
  id: 'entry-123',
  vehicleNumber: 'KA01AB1234',
  vehicleType: 'car',
  driverName: 'John Doe',
  driverPhone: '+91-9876543210',
  entryTime: new Date().toISOString(),
  exitTime: null,
  parkingFee: 0,
  status: 'parked',
  paymentStatus: 'pending',
  paymentType: null,
  notes: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

export const createMockAuthUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: 'user-123',
  username: 'testuser',
  role: 'user',
  permissions: ['read', 'write'],
  ...overrides,
})

// Mock API responses
export const mockApiResponses = {
  auth: {
    login: {
      user: createMockAuthUser(),
      tokens: {
        access: 'mock-access-token',
        refresh: 'mock-refresh-token',
        expiresIn: 3600,
      },
    },
    me: createMockAuthUser(),
  },
  parking: {
    statistics: {
      parkedVehicles: 15,
      todayEntries: 23,
      todayExits: 8,
      todayIncome: 1250,
      unpaidVehicles: 3,
      overstayingVehicles: 1,
      averageStayDuration: 4.5,
      occupancyRate: 75,
      exitedVehicles: 156,
      totalIncome: 45680,
    },
    entries: [
      createMockParkingEntry({ id: '1', vehicleNumber: 'KA01AB1234' }),
      createMockParkingEntry({ id: '2', vehicleNumber: 'KA02CD5678', status: 'exited' }),
      createMockParkingEntry({ id: '3', vehicleNumber: 'KA03EF9012', vehicleType: 'truck' }),
    ],
  },
}

// Test helpers
export const waitForLoadingToFinish = () => 
  new Promise(resolve => setTimeout(resolve, 0))

export const mockLocalStorage = {
  getItem: (key: string) => {
    return window.localStorage.getItem(key)
  },
  setItem: (key: string, value: string) => {
    window.localStorage.setItem(key, value)
  },
  removeItem: (key: string) => {
    window.localStorage.removeItem(key)
  },
  clear: () => {
    window.localStorage.clear()
  },
}

// Network status helpers
export const mockOfflineMode = () => {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: false,
  })
  window.dispatchEvent(new Event('offline'))
}

export const mockOnlineMode = () => {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: true,
  })
  window.dispatchEvent(new Event('online'))
}

// PWA testing helpers
export const mockPWASupport = () => {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: {
      register: vi.fn().mockResolvedValue({
        installing: null,
        waiting: null,
        active: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
      ready: Promise.resolve({
        installing: null,
        waiting: null,
        active: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
      controller: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  })
}

// Form validation helpers
export const fillForm = async (user: any, fields: Record<string, string>) => {
  for (const [label, value] of Object.entries(fields)) {
    const input = await user.findByLabelText(new RegExp(label, 'i'))
    await user.clear(input)
    await user.type(input, value)
  }
}

// Mock fetch for API testing
export const mockFetch = (responses: Record<string, any>) => {
  global.fetch = vi.fn().mockImplementation((url: string, options: any) => {
    const urlString = url.toString()
    
    for (const [pattern, response] of Object.entries(responses)) {
      if (urlString.includes(pattern)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(response),
          text: () => Promise.resolve(JSON.stringify(response)),
        })
      }
    }
    
    return Promise.reject(new Error(`Unmocked fetch: ${urlString}`))
  })
}

// Cleanup function for tests
export const cleanupMocks = () => {
  vi.restoreAllMocks()
  mockOnlineMode()
  localStorage.clear()
  sessionStorage.clear()
}

// Re-export testing library utilities
export * from '@testing-library/react'
export { userEvent } from '@testing-library/user-event'