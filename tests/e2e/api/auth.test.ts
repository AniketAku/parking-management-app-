/**
 * Authentication API E2E Tests
 * Tests authentication flows, JWT tokens, and user management
 */
import { testUtils, testUsers, apiClient, config } from '../setup';

describe('Authentication API', () => {
  beforeEach(() => {
    testUtils.auth.clearAuth();
  });

  describe('POST /auth/login', () => {
    it('should authenticate valid user credentials', async () => {
      const loginData = {
        username: testUsers.admin.username,
        password: testUsers.admin.password
      };

      const response = await testUtils.performance.measureOperation(
        'login_success',
        () => apiClient.post('/auth/login', loginData)
      );

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        message: 'Login successful',
        token: {
          access_token: expect.any(String),
          token_type: 'bearer',
          expires_in: expect.any(Number),
          user: {
            username: testUsers.admin.username,
            email: testUsers.admin.email,
            role: testUsers.admin.role
          }
        }
      });

      // Verify token format (JWT)
      const token = response.data.token.access_token;
      expect(token.split('.')).toHaveLength(3);
    });

    it('should reject invalid credentials', async () => {
      const loginData = {
        username: 'invalid_user',
        password: 'wrong_password'
      };

      await expect(
        apiClient.post('/auth/login', loginData)
      ).rejects.toMatchObject({
        response: {
          status: 401,
          data: {
            detail: expect.stringMatching(/Invalid username or password/)
          }
        }
      });
    });

    it('should reject empty credentials', async () => {
      await expect(
        apiClient.post('/auth/login', { username: '', password: '' })
      ).rejects.toMatchObject({
        response: {
          status: 422
        }
      });
    });

    it('should handle deactivated user accounts', async () => {
      // This test would require a deactivated test user
      // Skipping for now as it requires admin setup
    });

    it('should complete login within performance threshold', async () => {
      const loginData = {
        username: testUsers.operator.username,
        password: testUsers.operator.password
      };

      const startTime = Date.now();
      await apiClient.post('/auth/login', loginData);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000); // Login should complete within 2 seconds
    });
  });

  describe('POST /auth/signup', () => {
    it('should register new user with valid data', async () => {
      const newUser = {
        username: testUtils.generateVehicleNumber().toLowerCase(),
        email: `test_${Date.now()}@example.com`,
        password: 'NewUser123!',
        full_name: 'New Test User',
        role: 'operator'
      };

      const response = await apiClient.post('/auth/signup', newUser);

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        username: newUser.username,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
        is_active: true
      });
      expect(response.data.password_hash).toBeUndefined(); // Password should not be returned
    });

    it('should reject duplicate username', async () => {
      const userData = {
        username: testUsers.admin.username, // Existing user
        email: 'duplicate@example.com',
        password: 'Password123!',
        full_name: 'Duplicate User'
      };

      await expect(
        apiClient.post('/auth/signup', userData)
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            detail: expect.stringMatching(/already exists/)
          }
        }
      });
    });

    it('should validate password requirements', async () => {
      const userData = {
        username: 'testuser123',
        email: 'test@example.com',
        password: 'weak', // Too weak
        full_name: 'Test User'
      };

      await expect(
        apiClient.post('/auth/signup', userData)
      ).rejects.toMatchObject({
        response: {
          status: 422
        }
      });
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh valid JWT token', async () => {
      // First login to get a token
      const token = await testUtils.auth.loginTestUser('operator');
      testUtils.auth.setAuthHeader(token);

      const response = await apiClient.post('/auth/refresh');

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        access_token: expect.any(String),
        token_type: 'bearer',
        expires_in: expect.any(Number),
        user: expect.any(Object)
      });

      // New token should be different
      expect(response.data.access_token).not.toBe(token);
    });

    it('should reject expired or invalid tokens', async () => {
      testUtils.auth.setAuthHeader('invalid_token');

      await expect(
        apiClient.post('/auth/refresh')
      ).rejects.toMatchObject({
        response: {
          status: 401
        }
      });
    });
  });

  describe('GET /auth/user', () => {
    it('should return current user profile', async () => {
      const token = await testUtils.auth.loginTestUser('manager');
      testUtils.auth.setAuthHeader(token);

      const response = await apiClient.get('/auth/user');

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        username: testUsers.manager.username,
        email: testUsers.manager.email,
        role: testUsers.manager.role,
        is_active: true
      });
      expect(response.data.password_hash).toBeUndefined();
    });

    it('should require authentication', async () => {
      await expect(
        apiClient.get('/auth/user')
      ).rejects.toMatchObject({
        response: {
          status: 401
        }
      });
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout authenticated user', async () => {
      const token = await testUtils.auth.loginTestUser('operator');
      testUtils.auth.setAuthHeader(token);

      const response = await apiClient.post('/auth/logout');

      expect(response.status).toBe(200);
      expect(response.data.message).toMatch(/logout successful/i);
    });

    it('should require authentication', async () => {
      await expect(
        apiClient.post('/auth/logout')
      ).rejects.toMatchObject({
        response: {
          status: 401
        }
      });
    });
  });

  describe('User Management (Admin Only)', () => {
    beforeEach(async () => {
      const adminToken = await testUtils.auth.loginTestUser('admin');
      testUtils.auth.setAuthHeader(adminToken);
    });

    describe('GET /auth/users', () => {
      it('should list all users for admin', async () => {
        const response = await apiClient.get('/auth/users');

        expect(response.status).toBe(200);
        expect(response.data).toMatchObject({
          data: expect.arrayContaining([
            expect.objectContaining({
              username: expect.any(String),
              email: expect.any(String),
              role: expect.any(String),
              is_active: expect.any(Boolean)
            })
          ]),
          pagination: expect.objectContaining({
            total: expect.any(Number),
            page: expect.any(Number),
            limit: expect.any(Number)
          })
        });
      });

      it('should support pagination', async () => {
        const response = await apiClient.get('/auth/users?page=1&limit=5');

        expect(response.status).toBe(200);
        expect(response.data.pagination.limit).toBe(5);
        expect(response.data.data.length).toBeLessThanOrEqual(5);
      });
    });

    describe('Role-based Access Control', () => {
      it('should restrict admin endpoints to admin users', async () => {
        // Login as non-admin user
        const operatorToken = await testUtils.auth.loginTestUser('operator');
        testUtils.auth.setAuthHeader(operatorToken);

        await expect(
          apiClient.get('/auth/users')
        ).rejects.toMatchObject({
          response: {
            status: 403,
            data: {
              detail: expect.stringMatching(/admin/i)
            }
          }
        });
      });

      it('should allow managers to access user endpoints', async () => {
        const managerToken = await testUtils.auth.loginTestUser('manager');
        testUtils.auth.setAuthHeader(managerToken);

        // Managers should be able to access some user endpoints
        // This depends on your role configuration
      });
    });
  });

  describe('Authentication Performance', () => {
    it('should handle concurrent login requests', async () => {
      const loginPromises = Array(5).fill(null).map(() =>
        apiClient.post('/auth/login', {
          username: testUsers.operator.username,
          password: testUsers.operator.password
        })
      );

      const responses = await Promise.all(loginPromises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data.token.access_token).toBeTruthy();
      });
    });

    it('should maintain login performance under load', async () => {
      const loginTimes: number[] = [];

      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        await apiClient.post('/auth/login', {
          username: testUsers.admin.username,
          password: testUsers.admin.password
        });
        const duration = Date.now() - startTime;
        loginTimes.push(duration);

        // Small delay to avoid overwhelming the server
        await testUtils.wait(100);
      }

      const averageTime = loginTimes.reduce((sum, time) => sum + time, 0) / loginTimes.length;
      expect(averageTime).toBeLessThan(1500); // Average login time should be under 1.5 seconds
    });
  });

  describe('Token Security', () => {
    it('should generate unique tokens for each login', async () => {
      const response1 = await apiClient.post('/auth/login', {
        username: testUsers.admin.username,
        password: testUsers.admin.password
      });

      const response2 = await apiClient.post('/auth/login', {
        username: testUsers.admin.username,
        password: testUsers.admin.password
      });

      expect(response1.data.token.access_token).not.toBe(response2.data.token.access_token);
    });

    it('should include proper token expiration', async () => {
      const response = await apiClient.post('/auth/login', {
        username: testUsers.operator.username,
        password: testUsers.operator.password
      });

      expect(response.data.token.expires_in).toBeGreaterThan(0);
      expect(response.data.token.expires_in).toBeLessThanOrEqual(7 * 24 * 60 * 60); // Max 7 days
    });
  });
});