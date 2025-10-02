/**
 * E2E Test Setup Configuration
 * Global test setup and utilities
 */
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test configuration
export const config = {
  baseURL: process.env.API_BASE_URL || 'http://localhost:8000',
  wsURL: process.env.WS_BASE_URL || 'ws://localhost:8000',
  timeout: 30000,
  retries: 3
};

// Global test user credentials
export const testUsers = {
  admin: {
    username: 'test_admin',
    password: 'admin123',
    email: 'admin@test.com',
    role: 'admin'
  },
  manager: {
    username: 'test_manager', 
    password: 'manager123',
    email: 'manager@test.com',
    role: 'manager'
  },
  operator: {
    username: 'test_operator',
    password: 'operator123', 
    email: 'operator@test.com',
    role: 'operator'
  }
};

// Test data templates
export const testVehicles = {
  truck: {
    vehicle_number: 'TEST001',
    vehicle_type: 'Trailer',
    location: 'Main Gate',
    driver_name: 'John Doe',
    driver_contact: '+1234567890'
  },
  mini_truck: {
    vehicle_number: 'TEST002',
    vehicle_type: '4 Wheeler', 
    location: 'Side Gate',
    driver_name: 'Jane Smith',
    driver_contact: '+1987654321'
  }
};

// HTTP client with default configuration
export const apiClient = axios.create({
  baseURL: config.baseURL + '/api/v1',
  timeout: config.timeout,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Authentication helper
export class AuthHelper {
  private tokens: Map<string, string> = new Map();

  async login(username: string, password: string): Promise<string> {
    const response = await apiClient.post('/auth/login', {
      username,
      password
    });

    const token = response.data.token.access_token;
    this.tokens.set(username, token);
    return token;
  }

  async loginTestUser(role: 'admin' | 'manager' | 'operator'): Promise<string> {
    const user = testUsers[role];
    return await this.login(user.username, user.password);
  }

  getToken(username: string): string | undefined {
    return this.tokens.get(username);
  }

  setAuthHeader(token: string) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  clearAuth() {
    delete apiClient.defaults.headers.common['Authorization'];
    this.tokens.clear();
  }
}

// WebSocket helper
export class WebSocketHelper {
  private connections: Map<string, WebSocket> = new Map();

  async connect(token: string, channels: string = 'all'): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const wsUrl = `${config.wsURL}/ws/realtime?token=${token}&channels=${channels}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        this.connections.set(token, ws);
        resolve(ws);
      };

      ws.onerror = (error) => {
        reject(error);
      };

      setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          reject(new Error('WebSocket connection timeout'));
        }
      }, 5000);
    });
  }

  disconnect(token: string) {
    const ws = this.connections.get(token);
    if (ws) {
      ws.close();
      this.connections.delete(token);
    }
  }

  disconnectAll() {
    this.connections.forEach(ws => ws.close());
    this.connections.clear();
  }
}

// Test data cleanup helper
export class DataCleanup {
  constructor(private auth: AuthHelper) {}

  async cleanupTestVehicles() {
    try {
      const response = await apiClient.get('/parking/entries?vehicle_number=TEST');
      const entries = response.data.data || [];
      
      for (const entry of entries) {
        await apiClient.delete(`/parking/entries/${entry.vehicle_number}/${entry.entry_time}`);
      }
    } catch (error) {
      console.warn('Cleanup error:', error);
    }
  }

  async cleanupTestUsers() {
    try {
      // This would require admin privileges to clean up test users
      // Implementation depends on user management endpoints
    } catch (error) {
      console.warn('User cleanup error:', error);
    }
  }
}

// Performance monitoring helper
export class PerformanceMonitor {
  private metrics: Array<{ operation: string; duration: number; timestamp: Date }> = [];

  async measureOperation<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.metrics.push({ operation, duration, timestamp: new Date() });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.metrics.push({ operation: operation + '_failed', duration, timestamp: new Date() });
      throw error;
    }
  }

  getMetrics() {
    return [...this.metrics];
  }

  getAverageTime(operation: string): number {
    const operationMetrics = this.metrics.filter(m => m.operation === operation);
    if (operationMetrics.length === 0) return 0;
    
    const total = operationMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / operationMetrics.length;
  }

  clearMetrics() {
    this.metrics = [];
  }
}

// Global test utilities
export const testUtils = {
  auth: new AuthHelper(),
  websocket: new WebSocketHelper(),
  performance: new PerformanceMonitor(),
  
  // Wait helper
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Retry helper  
  async retry<T>(fn: () => Promise<T>, attempts: number = 3, delay: number = 1000): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (attempts <= 1) throw error;
      await this.wait(delay);
      return this.retry(fn, attempts - 1, delay);
    }
  },

  // Random test data generators
  generateVehicleNumber(): string {
    return 'TEST' + Math.random().toString(36).substr(2, 6).toUpperCase();
  },

  generateDriverName(): string {
    const names = ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown'];
    return names[Math.floor(Math.random() * names.length)];
  },

  generatePhoneNumber(): string {
    return '+1' + Math.floor(Math.random() * 9000000000 + 1000000000);
  }
};

// Global setup and teardown
beforeAll(async () => {
  console.log('Setting up E2E tests...');
  
  // Wait for API to be ready
  await testUtils.retry(async () => {
    const response = await axios.get(config.baseURL + '/api/v1/health');
    if (response.status !== 200) {
      throw new Error('API not ready');
    }
  });

  console.log('API is ready for testing');
});

afterAll(async () => {
  console.log('Cleaning up E2E tests...');
  
  // Cleanup WebSocket connections
  testUtils.websocket.disconnectAll();
  
  // Clear authentication
  testUtils.auth.clearAuth();
  
  console.log('E2E tests cleanup completed');
});

// Export for use in tests
export { apiClient, config };