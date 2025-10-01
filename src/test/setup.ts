// Vitest Testing Setup
// Configures testing environment with DOM simulation and utilities

import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(callback: any) {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: any) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
})

// Mock URL.createObjectURL
global.URL.createObjectURL = () => 'blob:mock-url'

// Mock localStorage
const localStorageMock = {
  getItem: (key: string) => {
    return localStorageMock[key as keyof typeof localStorageMock] || null
  },
  setItem: (key: string, value: string) => {
    localStorageMock[key as keyof typeof localStorageMock] = value
  },
  removeItem: (key: string) => {
    delete localStorageMock[key as keyof typeof localStorageMock]
  },
  clear: () => {
    Object.keys(localStorageMock).forEach(key => {
      if (key !== 'getItem' && key !== 'setItem' && key !== 'removeItem' && key !== 'clear') {
        delete localStorageMock[key as keyof typeof localStorageMock]
      }
    })
  },
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
})

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
})

// Mock ServiceWorker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: () => Promise.resolve({
      installing: null,
      waiting: null,
      active: null,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
    ready: Promise.resolve({
      installing: null,
      waiting: null,
      active: null,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
    controller: null,
    addEventListener: () => {},
    removeEventListener: () => {},
  },
})

// Mock Notification
global.Notification = class Notification {
  static permission: NotificationPermission = 'default'
  static requestPermission = () => Promise.resolve('granted' as NotificationPermission)
  
  constructor(title: string, options?: NotificationOptions) {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
} as any

// Setup and cleanup
beforeAll(() => {
  // Setup global test environment
})

afterEach(() => {
  // Cleanup after each test
  cleanup()
  localStorage.clear()
  sessionStorage.clear()
})

afterAll(() => {
  // Cleanup after all tests
})

export {}