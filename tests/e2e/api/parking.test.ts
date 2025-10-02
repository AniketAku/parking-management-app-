/**
 * Parking Management API E2E Tests
 * Tests parking operations, search, filtering, and business logic
 */
import { testUtils, testVehicles, apiClient } from '../setup';

describe('Parking Management API', () => {
  let authToken: string;
  let testVehicleData: any;

  beforeAll(async () => {
    // Login as operator for parking operations
    authToken = await testUtils.auth.loginTestUser('operator');
    testUtils.auth.setAuthHeader(authToken);
  });

  beforeEach(() => {
    // Generate unique test vehicle data
    testVehicleData = {
      ...testVehicles.truck,
      vehicle_number: testUtils.generateVehicleNumber(),
      driver_name: testUtils.generateDriverName(),
      driver_contact: testUtils.generatePhoneNumber()
    };
  });

  describe('POST /parking/entries', () => {
    it('should create new parking entry with valid data', async () => {
      const response = await testUtils.performance.measureOperation(
        'create_entry',
        () => apiClient.post('/parking/entries', testVehicleData)
      );

      expect(response.status).toBe(201);
      expect(response.data).toMatchObject({
        vehicle_number: testVehicleData.vehicle_number.toUpperCase(), // Should be normalized
        vehicle_type: testVehicleData.vehicle_type,
        location: testVehicleData.location,
        driver_name: testVehicleData.driver_name,
        driver_contact: testVehicleData.driver_contact,
        entry_time: expect.any(String),
        exit_time: 'N/A',
        fee: 0,
        payment_status: 'Pending',
        payment_type: 'Cash'
      });

      // Verify entry time is recent
      const entryTime = new Date(response.data.entry_time);
      const now = new Date();
      expect(Math.abs(now.getTime() - entryTime.getTime())).toBeLessThan(5000); // Within 5 seconds
    });

    it('should reject duplicate vehicle entries', async () => {
      // Create first entry
      await apiClient.post('/parking/entries', testVehicleData);

      // Attempt to create duplicate
      await expect(
        apiClient.post('/parking/entries', testVehicleData)
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            detail: expect.stringMatching(/already parked/i)
          }
        }
      });
    });

    it('should validate required fields', async () => {
      const invalidData = { ...testVehicleData };
      delete invalidData.vehicle_number;

      await expect(
        apiClient.post('/parking/entries', invalidData)
      ).rejects.toMatchObject({
        response: {
          status: 422
        }
      });
    });

    it('should normalize vehicle number to uppercase', async () => {
      const lowerCaseData = {
        ...testVehicleData,
        vehicle_number: testVehicleData.vehicle_number.toLowerCase()
      };

      const response = await apiClient.post('/parking/entries', lowerCaseData);

      expect(response.data.vehicle_number).toBe(testVehicleData.vehicle_number.toUpperCase());
    });

    it('should validate vehicle type against allowed types', async () => {
      const invalidData = {
        ...testVehicleData,
        vehicle_type: 'Invalid Type'
      };

      await expect(
        apiClient.post('/parking/entries', invalidData)
      ).rejects.toMatchObject({
        response: {
          status: 422
        }
      });
    });
  });

  describe('GET /parking/entries', () => {
    beforeEach(async () => {
      // Create test entries
      await apiClient.post('/parking/entries', testVehicleData);
      await testUtils.wait(100); // Small delay to ensure different timestamps
      
      const secondVehicle = {
        ...testVehicles.mini_truck,
        vehicle_number: testUtils.generateVehicleNumber()
      };
      await apiClient.post('/parking/entries', secondVehicle);
    });

    it('should return paginated parking entries', async () => {
      const response = await apiClient.get('/parking/entries?limit=10&page=1');

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        data: expect.arrayContaining([
          expect.objectContaining({
            vehicle_number: expect.any(String),
            vehicle_type: expect.any(String),
            entry_time: expect.any(String),
            exit_time: expect.any(String)
          })
        ]),
        pagination: expect.objectContaining({
          total: expect.any(Number),
          page: 1,
          limit: 10,
          pages: expect.any(Number)
        })
      });
    });

    it('should support filtering by vehicle number', async () => {
      const response = await apiClient.get(
        `/parking/entries?vehicle_number=${testVehicleData.vehicle_number}`
      );

      expect(response.status).toBe(200);
      expect(response.data.data.every((entry: any) => 
        entry.vehicle_number.includes(testVehicleData.vehicle_number.toUpperCase())
      )).toBe(true);
    });

    it('should support filtering by vehicle type', async () => {
      const response = await apiClient.get(
        `/parking/entries?vehicle_type=${testVehicleData.vehicle_type}`
      );

      expect(response.status).toBe(200);
      expect(response.data.data.every((entry: any) => 
        entry.vehicle_type === testVehicleData.vehicle_type
      )).toBe(true);
    });

    it('should support date range filtering', async () => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiClient.get(
        `/parking/entries?start_date=${today}&end_date=${today}`
      );

      expect(response.status).toBe(200);
      response.data.data.forEach((entry: any) => {
        const entryDate = new Date(entry.entry_time).toISOString().split('T')[0];
        expect(entryDate).toBe(today);
      });
    });

    it('should support sorting by different fields', async () => {
      const response = await apiClient.get(
        '/parking/entries?sort_by=vehicle_number&sort_order=asc'
      );

      expect(response.status).toBe(200);
      
      const vehicleNumbers = response.data.data.map((entry: any) => entry.vehicle_number);
      const sortedNumbers = [...vehicleNumbers].sort();
      expect(vehicleNumbers).toEqual(sortedNumbers);
    });
  });

  describe('GET /parking/entries/{vehicle_number}/{entry_time}', () => {
    let createdEntry: any;

    beforeEach(async () => {
      const response = await apiClient.post('/parking/entries', testVehicleData);
      createdEntry = response.data;
    });

    it('should retrieve specific parking entry', async () => {
      const response = await apiClient.get(
        `/parking/entries/${createdEntry.vehicle_number}/${encodeURIComponent(createdEntry.entry_time)}`
      );

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject(createdEntry);
    });

    it('should return 404 for non-existent entry', async () => {
      await expect(
        apiClient.get('/parking/entries/NONEXISTENT/2024-01-01T00:00:00')
      ).rejects.toMatchObject({
        response: {
          status: 404
        }
      });
    });
  });

  describe('POST /parking/entries/{vehicle_number}/{entry_time}/exit', () => {
    let createdEntry: any;

    beforeEach(async () => {
      const response = await apiClient.post('/parking/entries', testVehicleData);
      createdEntry = response.data;
    });

    it('should process vehicle exit and calculate fee', async () => {
      const exitData = {
        payment_type: 'Cash',
        payment_status: 'Paid'
      };

      const response = await testUtils.performance.measureOperation(
        'process_exit',
        () => apiClient.post(
          `/parking/entries/${createdEntry.vehicle_number}/${encodeURIComponent(createdEntry.entry_time)}/exit`,
          exitData
        )
      );

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        vehicle_number: createdEntry.vehicle_number,
        exit_time: expect.any(String),
        fee: expect.any(Number),
        payment_status: 'Paid',
        payment_type: 'Cash'
      });

      // Verify exit time is after entry time
      const exitTime = new Date(response.data.exit_time);
      const entryTime = new Date(createdEntry.entry_time);
      expect(exitTime.getTime()).toBeGreaterThan(entryTime.getTime());

      // Verify fee calculation (should be at least the minimum for vehicle type)
      expect(response.data.fee).toBeGreaterThan(0);
    });

    it('should calculate correct fee based on vehicle type and duration', async () => {
      // Wait a few seconds to ensure some parking duration
      await testUtils.wait(2000);

      const response = await apiClient.post(
        `/parking/entries/${createdEntry.vehicle_number}/${encodeURIComponent(createdEntry.entry_time)}/exit`,
        { payment_type: 'Cash', payment_status: 'Paid' }
      );

      // For Trailer type, minimum fee should be 225 (daily rate)
      expect(response.data.fee).toBe(225);
    });

    it('should reject exit for already exited vehicle', async () => {
      // Process exit first time
      await apiClient.post(
        `/parking/entries/${createdEntry.vehicle_number}/${encodeURIComponent(createdEntry.entry_time)}/exit`,
        { payment_type: 'Cash' }
      );

      // Attempt second exit
      await expect(
        apiClient.post(
          `/parking/entries/${createdEntry.vehicle_number}/${encodeURIComponent(createdEntry.entry_time)}/exit`,
          { payment_type: 'Cash' }
        )
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            detail: expect.stringMatching(/already exited/i)
          }
        }
      });
    });

    it('should handle different payment types', async () => {
      const paymentTypes = ['Cash', 'Card', 'UPI'];

      for (const paymentType of paymentTypes) {
        const vehicleData = {
          ...testVehicleData,
          vehicle_number: testUtils.generateVehicleNumber()
        };

        const entryResponse = await apiClient.post('/parking/entries', vehicleData);
        
        const exitResponse = await apiClient.post(
          `/parking/entries/${entryResponse.data.vehicle_number}/${encodeURIComponent(entryResponse.data.entry_time)}/exit`,
          { payment_type: paymentType, payment_status: 'Paid' }
        );

        expect(exitResponse.data.payment_type).toBe(paymentType);
      }
    });
  });

  describe('Advanced Search and Filtering', () => {
    beforeEach(async () => {
      // Create multiple test entries with different characteristics
      const vehicles = [
        { ...testVehicles.truck, vehicle_number: 'SEARCH001' },
        { ...testVehicles.mini_truck, vehicle_number: 'SEARCH002' },
        { 
          ...testVehicles.truck, 
          vehicle_number: 'SEARCH003',
          driver_name: 'Special Driver',
          location: 'North Gate'
        }
      ];

      for (const vehicle of vehicles) {
        await apiClient.post('/parking/entries', vehicle);
        await testUtils.wait(100);
      }
    });

    describe('GET /parking/entries/search', () => {
      it('should support advanced search with multiple criteria', async () => {
        const response = await apiClient.get(
          '/parking/entries/search?vehicle_number=SEARCH&vehicle_type=Trailer&include_stats=true'
        );

        expect(response.status).toBe(200);
        expect(response.data).toMatchObject({
          data: expect.any(Array),
          pagination: expect.any(Object),
          search_criteria: expect.objectContaining({
            vehicle_number: 'SEARCH',
            vehicle_type: 'Trailer'
          }),
          statistics: expect.objectContaining({
            total_entries: expect.any(Number),
            total_revenue: expect.any(Number),
            average_fee: expect.any(Number)
          })
        });
      });

      it('should support fee range filtering', async () => {
        const response = await apiClient.get(
          '/parking/entries/search?min_fee=100&max_fee=300'
        );

        expect(response.status).toBe(200);
        response.data.data.forEach((entry: any) => {
          expect(entry.fee).toBeGreaterThanOrEqual(100);
          expect(entry.fee).toBeLessThanOrEqual(300);
        });
      });

      it('should support general search across multiple fields', async () => {
        const response = await apiClient.get(
          '/parking/entries/search?q=Special'
        );

        expect(response.status).toBe(200);
        expect(response.data.data.some((entry: any) => 
          entry.driver_name.includes('Special')
        )).toBe(true);
      });
    });

    describe('GET /parking/entries/current', () => {
      it('should return currently parked vehicles with duration info', async () => {
        const response = await apiClient.get('/parking/entries/current');

        expect(response.status).toBe(200);
        expect(response.data).toMatchObject({
          data: expect.any(Array),
          summary: expect.objectContaining({
            total_parked: expect.any(Number),
            overstayed_count: expect.any(Number),
            normal_count: expect.any(Number),
            last_updated: expect.any(String)
          })
        });

        // Each entry should have duration information
        response.data.data.forEach((entry: any) => {
          expect(entry).toMatchObject({
            parking_duration_hours: expect.any(Number),
            parking_duration_display: expect.any(String),
            is_overstayed: expect.any(Boolean)
          });
        });
      });

      it('should sort by duration when requested', async () => {
        const response = await apiClient.get('/parking/entries/current?sort_by_duration=true');

        expect(response.status).toBe(200);
        
        const durations = response.data.data.map((entry: any) => entry.parking_duration_hours);
        const sortedDurations = [...durations].sort((a, b) => b - a);
        expect(durations).toEqual(sortedDurations);
      });
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent entry creations', async () => {
      const entryPromises = Array(5).fill(null).map((_, index) => {
        const vehicleData = {
          ...testVehicleData,
          vehicle_number: `CONCURRENT${index + 1}`
        };
        return apiClient.post('/parking/entries', vehicleData);
      });

      const responses = await Promise.all(entryPromises);

      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.data.vehicle_number).toMatch(/CONCURRENT\d/);
      });
    });

    it('should maintain response times under load', async () => {
      const responseTimes: number[] = [];

      for (let i = 0; i < 10; i++) {
        const vehicleData = {
          ...testVehicleData,
          vehicle_number: `PERF${i + 1}`
        };

        const startTime = Date.now();
        await apiClient.post('/parking/entries', vehicleData);
        const duration = Date.now() - startTime;
        
        responseTimes.push(duration);
        await testUtils.wait(50); // Small delay between requests
      }

      const averageTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      expect(averageTime).toBeLessThan(1000); // Average should be under 1 second
      
      const maxTime = Math.max(...responseTimes);
      expect(maxTime).toBeLessThan(2000); // Maximum should be under 2 seconds
    });

    it('should handle large result sets efficiently', async () => {
      const startTime = Date.now();
      const response = await apiClient.get('/parking/entries?limit=100');
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
      expect(response.data.data.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Business Logic Validation', () => {
    it('should enforce exact fee calculation algorithm', async () => {
      const entryResponse = await apiClient.post('/parking/entries', testVehicleData);
      
      // Wait to ensure some time passes (but still less than a day)
      await testUtils.wait(1000);
      
      const exitResponse = await apiClient.post(
        `/parking/entries/${entryResponse.data.vehicle_number}/${encodeURIComponent(entryResponse.data.entry_time)}/exit`,
        { payment_type: 'Cash', payment_status: 'Paid' }
      );

      // According to business logic, any fraction of a day should be charged as a full day
      // Trailer rate is 225 per day
      expect(exitResponse.data.fee).toBe(225);
    });

    it('should handle vehicle number normalization consistently', async () => {
      const lowerCaseNumber = 'test123abc';
      const vehicleData = {
        ...testVehicleData,
        vehicle_number: lowerCaseNumber
      };

      const response = await apiClient.post('/parking/entries', vehicleData);
      expect(response.data.vehicle_number).toBe('TEST123ABC');

      // Verify we can find it with original lowercase
      const searchResponse = await apiClient.get(
        `/parking/entries?vehicle_number=${lowerCaseNumber}`
      );
      expect(searchResponse.data.data.length).toBeGreaterThan(0);
    });
  });
});