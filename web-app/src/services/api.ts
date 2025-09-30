import axios from 'axios'
import type { AxiosInstance, AxiosResponse, AxiosError } from 'axios'
import { toast } from 'react-hot-toast'
import { securityService } from './securityService'
import type { 
  ParkingEntry, 
  ParkingStatistics, 
  SearchFilters,
  AuthUser,
  LoginCredentials,
  ReportData
} from '../types'

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message?: string
  errors?: string[]
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// API Configuration
const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  timeout: 10000,
  retries: 3,
  retryDelay: 1000,
}

class ApiService {
  private client: AxiosInstance
  private retryAttempts: Map<string, number> = new Map()

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor for auth token and security headers
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }

        // Add security headers to all requests
        const securityHeaders = securityService.getSecurityHeaders()
        Object.entries(securityHeaders).forEach(([key, value]) => {
          config.headers[key] = value
        })

        // Add CSRF token for state-changing operations
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method?.toUpperCase() || '')) {
          const csrfToken = securityService.getCSRFToken()
          config.headers['X-CSRF-Token'] = csrfToken.token
        }

        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor for error handling and retries
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Reset retry count on successful response
        this.retryAttempts.delete(response.config.url || '')
        return response
      },
      async (error: AxiosError) => {
        const originalRequest = error.config
        
        if (!originalRequest) {
          return Promise.reject(error)
        }

        // Handle 401 Unauthorized (token expired)
        if (error.response?.status === 401) {
          this.handleUnauthorized()
          return Promise.reject(error)
        }

        // Handle retry logic for network errors and 5xx errors
        if (this.shouldRetry(error) && originalRequest) {
          const url = originalRequest.url || ''
          const attempts = this.retryAttempts.get(url) || 0
          
          if (attempts < API_CONFIG.retries) {
            this.retryAttempts.set(url, attempts + 1)
            
            // Exponential backoff
            const delay = API_CONFIG.retryDelay * Math.pow(2, attempts)
            await this.delay(delay)
            
            console.log(`🔄 Retrying API request to ${url} (attempt ${attempts + 1}/${API_CONFIG.retries})`)
            return this.client.request(originalRequest)
          }
        }

        // Handle API errors
        this.handleApiError(error)
        return Promise.reject(error)
      }
    )
  }

  private shouldRetry(error: AxiosError): boolean {
    // Retry on network errors or 5xx server errors
    return (
      !error.response ||
      error.code === 'NETWORK_ERROR' ||
      error.code === 'ECONNABORTED' ||
      (error.response.status >= 500 && error.response.status < 600)
    )
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private handleUnauthorized() {
    // Clear auth token and redirect to login
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    
    toast.error('Session expired. Please login again.')
    
    // Redirect to login (handled by auth store)
    window.location.href = '/login'
  }

  private handleApiError(error: AxiosError) {
    if (error.response) {
      // Server responded with error status
      const data = error.response.data as any
      const message = data?.message || `Server error: ${error.response.status}`
      
      console.error('API Error:', {
        status: error.response.status,
        message,
        url: error.config?.url
      })
      
      // Don't show toast for 401 errors (handled separately)
      if (error.response.status !== 401) {
        toast.error(message)
      }
    } else if (error.request) {
      // Network error
      console.error('Network Error:', error.message)
      toast.error('Network error. Please check your connection.')
    } else {
      // Other error
      console.error('Request Error:', error.message)
      toast.error('Request failed. Please try again.')
    }
  }

  // Helper method to handle API responses
  private handleResponse<T>(response: AxiosResponse<ApiResponse<T>>): T {
    const { data } = response
    
    if (!data.success && data.message) {
      throw new Error(data.message)
    }
    
    return data.data
  }

  // Authentication API - Secure backend calls only
  async login(credentials: LoginCredentials): Promise<{ user: AuthUser; token: string }> {
    const response = await this.client.post<ApiResponse<{ user: AuthUser; token: string }>>(
      '/auth/login',
      credentials
    )
    return this.handleResponse(response)
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout')
    } catch (error) {
      console.warn('Logout API call failed:', error)
      // Continue with local logout even if API call fails
    }
  }

  async refreshToken(): Promise<{ token: string }> {
    const response = await this.client.post<ApiResponse<{ token: string }>>('/auth/refresh')
    return this.handleResponse(response)
  }

  // Parking Entry API
  async getEntries(filters?: SearchFilters): Promise<PaginatedResponse<ParkingEntry>> {
    try {
      const response = await this.client.get<ApiResponse<PaginatedResponse<ParkingEntry>>>(
        '/entries',
        { params: filters }
      )
      return this.handleResponse(response)
    } catch (error) {
      // Return mock data if API is not available
      if (axios.isAxiosError(error) && !error.response) {
        return this.getMockEntries(filters)
      }
      throw error
    }
  }

  async getEntry(id: string): Promise<ParkingEntry> {
    try {
      const response = await this.client.get<ApiResponse<ParkingEntry>>(`/entries/${id}`)
      return this.handleResponse(response)
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        return this.getMockEntry(id)
      }
      throw error
    }
  }

  async createEntry(entry: Omit<ParkingEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<ParkingEntry> {
    try {
      const response = await this.client.post<ApiResponse<ParkingEntry>>('/entries', entry)
      return this.handleResponse(response)
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        return this.createMockEntry(entry)
      }
      throw error
    }
  }

  async updateEntry(id: string, updates: Partial<ParkingEntry>): Promise<ParkingEntry> {
    try {
      const response = await this.client.patch<ApiResponse<ParkingEntry>>(`/entries/${id}`, updates)
      return this.handleResponse(response)
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        return this.updateMockEntry(id, updates)
      }
      throw error
    }
  }

  async deleteEntry(id: string): Promise<void> {
    try {
      await this.client.delete(`/entries/${id}`)
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        console.log('🧪 Mock: Entry deleted')
        return
      }
      throw error
    }
  }

  async processExit(
    id: string, 
    exitData: { exitTime: Date; paymentType?: string; amountPaid?: number }
  ): Promise<ParkingEntry> {
    try {
      const response = await this.client.post<ApiResponse<ParkingEntry>>(
        `/entries/${id}/exit`,
        exitData
      )
      return this.handleResponse(response)
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        return this.processMockExit(id, exitData)
      }
      throw error
    }
  }

  // Statistics API
  async getStatistics(): Promise<ParkingStatistics> {
    try {
      const response = await this.client.get<ApiResponse<ParkingStatistics>>('/statistics')
      return this.handleResponse(response)
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        return this.getMockStatistics()
      }
      throw error
    }
  }

  // Reports API
  async getReports(
    type: 'daily' | 'weekly' | 'monthly',
    startDate?: Date,
    endDate?: Date
  ): Promise<ReportData> {
    try {
      const params = {
        type,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString()
      }
      
      const response = await this.client.get<ApiResponse<ReportData>>('/reports', { params })
      return this.handleResponse(response)
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        return this.getMockReportData(type, startDate, endDate)
      }
      throw error
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; version: string }> {
    try {
      const response = await this.client.get<ApiResponse<{ status: string; version: string }>>(
        '/health'
      )
      return this.handleResponse(response)
    } catch (error) {
      return { status: 'unhealthy', version: 'unknown' }
    }
  }

  // Mock data methods (for development when API is not available)
  private getMockEntries(filters?: SearchFilters): PaginatedResponse<ParkingEntry> {
    const mockEntries: ParkingEntry[] = [
      {
        id: 'mock_1',
        vehicleNumber: 'KA01MN1234',
        vehicleType: '4 Wheeler',
        transportName: 'ABC Transport',
        driverName: 'Rajesh Kumar',
        entryTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: 'Parked',
        paymentStatus: 'Unpaid',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        updatedAt: new Date()
      },
      {
        id: 'mock_2',
        vehicleNumber: 'KA02MN5678',
        vehicleType: 'Trailer',
        transportName: 'XYZ Logistics',
        driverName: 'Suresh Patel',
        entryTime: new Date(Date.now() - 6 * 60 * 60 * 1000),
        exitTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
        status: 'Exited',
        paymentStatus: 'Paid',
        paymentType: 'Cash',
        amountPaid: 200,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
      }
    ]

    return {
      data: mockEntries,
      pagination: {
        page: 1,
        limit: 10,
        total: mockEntries.length,
        totalPages: 1
      }
    }
  }

  private getMockEntry(id: string): ParkingEntry {
    return {
      id,
      vehicleNumber: 'KA01MN1234',
      vehicleType: '4 Wheeler',
      transportName: 'ABC Transport',
      driverName: 'Rajesh Kumar',
      entryTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: 'Parked',
      paymentStatus: 'Unpaid',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      updatedAt: new Date()
    }
  }

  private createMockEntry(entry: Omit<ParkingEntry, 'id' | 'createdAt' | 'updatedAt'>): ParkingEntry {
    return {
      ...entry,
      id: `mock_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  private updateMockEntry(id: string, updates: Partial<ParkingEntry>): ParkingEntry {
    return {
      ...this.getMockEntry(id),
      ...updates,
      updatedAt: new Date()
    }
  }

  private processMockExit(
    id: string,
    exitData: { exitTime: Date; paymentType?: string; amountPaid?: number }
  ): ParkingEntry {
    return {
      ...this.getMockEntry(id),
      exitTime: exitData.exitTime,
      status: 'Exited',
      paymentStatus: 'Paid',
      paymentType: exitData.paymentType,
      amountPaid: exitData.amountPaid,
      updatedAt: new Date()
    }
  }

  private getMockStatistics(): ParkingStatistics {
    return {
      parkedVehicles: 15,
      todayEntries: 42,
      todayExits: 27,
      todayIncome: 8500,
      unpaidVehicles: 5,
      overstayingVehicles: 2,
      averageStayDuration: 6.5,
      occupancyRate: 75
    }
  }

  private getMockReportData(
    type: 'daily' | 'weekly' | 'monthly',
    startDate?: Date,
    endDate?: Date
  ): ReportData {
    return {
      period: type,
      startDate: startDate || new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: endDate || new Date(),
      totalEntries: 156,
      totalExits: 142,
      totalIncome: 28500,
      averageStayDuration: 7.2,
      occupancyRate: 68,
      peakHours: [
        { hour: 9, count: 12 },
        { hour: 14, count: 15 },
        { hour: 18, count: 18 }
      ],
      vehicleTypeBreakdown: [
        { type: '4 Wheeler', count: 85, percentage: 54.5 },
        { type: 'Trailer', count: 45, percentage: 28.8 },
        { type: '6 Wheeler', count: 20, percentage: 12.8 },
        { type: '2 Wheeler', count: 6, percentage: 3.8 }
      ]
    }
  }

  // Connection status
  isApiAvailable(): Promise<boolean> {
    return this.healthCheck()
      .then(result => result.status === 'healthy')
      .catch(() => false)
  }
}

// Singleton instance
export const apiService = new ApiService()

export default apiService