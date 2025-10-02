/**
 * Integration Workflow E2E Tests
 * Tests complete user workflows and cross-feature integration
 */
import { testUtils, testVehicles, apiClient } from '../setup';

describe('Integration Workflow Tests', () => {
  let adminToken: string;
  let managerToken: string;
  let operatorToken: string;

  beforeAll(async () => {
    // Set up tokens for different roles
    adminToken = await testUtils.auth.loginTestUser('admin');
    managerToken = await testUtils.auth.loginTestUser('manager');
    operatorToken = await testUtils.auth.loginTestUser('operator');
  });

  describe('Complete Parking Lifecycle', () => {
    it('should handle complete vehicle parking workflow', async () => {
      // Use operator token for parking operations
      testUtils.auth.setAuthHeader(operatorToken);

      const testVehicleData = {
        ...testVehicles.truck,
        vehicle_number: testUtils.generateVehicleNumber(),
        driver_name: testUtils.generateDriverName(),
        driver_contact: testUtils.generatePhoneNumber()
      };

      // Step 1: Create parking entry
      const entryResponse = await testUtils.performance.measureOperation(
        'full_workflow_entry',
        () => apiClient.post('/parking/entries', testVehicleData)
      );

      expect(entryResponse.status).toBe(201);
      const createdEntry = entryResponse.data;

      // Step 2: Verify entry exists in current parking
      const currentResponse = await apiClient.get('/parking/entries/current');
      expect(currentResponse.status).toBe(200);
      
      const currentEntry = currentResponse.data.data.find(
        entry => entry.vehicle_number === createdEntry.vehicle_number
      );
      expect(currentEntry).toBeDefined();
      expect(currentEntry.parking_duration_hours).toBeGreaterThanOrEqual(0);

      // Step 3: Search for the entry
      const searchResponse = await apiClient.get(
        `/parking/entries/search?vehicle_number=${createdEntry.vehicle_number}`
      );
      expect(searchResponse.status).toBe(200);
      expect(searchResponse.data.data).toHaveLength(1);
      expect(searchResponse.data.data[0].vehicle_number).toBe(createdEntry.vehicle_number);

      // Step 4: Get specific entry details
      const detailResponse = await apiClient.get(
        `/parking/entries/${createdEntry.vehicle_number}/${encodeURIComponent(createdEntry.entry_time)}`
      );
      expect(detailResponse.status).toBe(200);
      expect(detailResponse.data).toMatchObject(createdEntry);

      // Step 5: Process exit
      await testUtils.wait(1000); // Ensure some parking duration

      const exitResponse = await testUtils.performance.measureOperation(
        'full_workflow_exit',
        () => apiClient.post(
          `/parking/entries/${createdEntry.vehicle_number}/${encodeURIComponent(createdEntry.entry_time)}/exit`,
          {
            payment_type: 'Cash',
            payment_status: 'Paid'
          }
        )
      );

      expect(exitResponse.status).toBe(200);
      const completedEntry = exitResponse.data;
      expect(completedEntry.exit_time).not.toBe('N/A');
      expect(completedEntry.fee).toBeGreaterThan(0);
      expect(completedEntry.payment_status).toBe('Paid');

      // Step 6: Verify entry is no longer in current parking
      const updatedCurrentResponse = await apiClient.get('/parking/entries/current');
      const noLongerCurrent = updatedCurrentResponse.data.data.find(
        entry => entry.vehicle_number === createdEntry.vehicle_number
      );
      expect(noLongerCurrent).toBeUndefined();

      // Step 7: Verify entry appears in completed entries
      const completedResponse = await apiClient.get(
        `/parking/entries?vehicle_number=${createdEntry.vehicle_number}`
      );
      expect(completedResponse.status).toBe(200);
      const completedEntryInList = completedResponse.data.data[0];
      expect(completedEntryInList.exit_time).not.toBe('N/A');
      expect(completedEntryInList.payment_status).toBe('Paid');
    });

    it('should handle multiple vehicle lifecycle with different payment methods', async () => {
      testUtils.auth.setAuthHeader(operatorToken);

      const vehicles = [
        {
          ...testVehicles.truck,
          vehicle_number: testUtils.generateVehicleNumber(),
          paymentMethod: 'Cash'
        },
        {
          ...testVehicles.mini_truck,
          vehicle_number: testUtils.generateVehicleNumber(),
          paymentMethod: 'Card'
        },
        {
          ...testVehicles.truck,
          vehicle_number: testUtils.generateVehicleNumber(),
          paymentMethod: 'UPI'
        }
      ];

      const entries = [];

      // Create all entries
      for (const vehicle of vehicles) {
        const { paymentMethod, ...vehicleData } = vehicle;
        const response = await apiClient.post('/parking/entries', vehicleData);
        entries.push({ ...response.data, paymentMethod });
        await testUtils.wait(100);
      }

      // Process exits with different payment methods
      for (const entry of entries) {
        await apiClient.post(
          `/parking/entries/${entry.vehicle_number}/${encodeURIComponent(entry.entry_time)}/exit`,
          {
            payment_type: entry.paymentMethod,
            payment_status: 'Paid'
          }
        );
      }

      // Verify revenue is tracked correctly by payment method
      testUtils.auth.setAuthHeader(managerToken);
      const revenueResponse = await apiClient.get('/reports/revenue');
      expect(revenueResponse.status).toBe(200);
      
      const revenueBreakdown = revenueResponse.data.payment_method_breakdown;
      expect(revenueBreakdown.cash).toBeGreaterThan(0);
      expect(revenueBreakdown.card).toBeGreaterThan(0);
      expect(revenueBreakdown.upi).toBeGreaterThan(0);
    });
  });

  describe('Dashboard Integration Workflow', () => {
    it('should reflect real-time changes across dashboard metrics', async () => {
      // Use manager token for dashboard access
      testUtils.auth.setAuthHeader(managerToken);

      // Get baseline dashboard metrics
      const baselineResponse = await apiClient.get('/reports/dashboard');
      const baseline = baselineResponse.data.summary;

      // Switch to operator for parking operations
      testUtils.auth.setAuthHeader(operatorToken);

      // Create new entries
      const newEntries = [];
      for (let i = 0; i < 3; i++) {
        const vehicleData = {
          ...testVehicles.truck,
          vehicle_number: `DASH${i + 1}${Date.now().toString().slice(-4)}`
        };
        const response = await apiClient.post('/parking/entries', vehicleData);
        newEntries.push(response.data);
        await testUtils.wait(100);
      }

      // Check dashboard reflects new entries
      testUtils.auth.setAuthHeader(managerToken);
      const afterEntryResponse = await apiClient.get('/reports/dashboard');
      const afterEntry = afterEntryResponse.data.summary;

      expect(afterEntry.total_entries).toBe(baseline.total_entries + 3);
      expect(afterEntry.currently_parked).toBe(baseline.currently_parked + 3);

      // Process one exit
      testUtils.auth.setAuthHeader(operatorToken);
      await apiClient.post(
        `/parking/entries/${newEntries[0].vehicle_number}/${encodeURIComponent(newEntries[0].entry_time)}/exit`,
        { payment_type: 'Cash', payment_status: 'Paid' }
      );

      // Check dashboard reflects exit
      testUtils.auth.setAuthHeader(managerToken);
      const afterExitResponse = await apiClient.get('/reports/dashboard');
      const afterExit = afterExitResponse.data.summary;

      expect(afterExit.currently_parked).toBe(baseline.currently_parked + 2);
      expect(afterExit.total_exits).toBe(baseline.total_exits + 1);
      expect(afterExit.total_revenue).toBeGreaterThan(baseline.total_revenue);
    });

    it('should maintain consistency between different dashboard views', async () => {
      testUtils.auth.setAuthHeader(managerToken);

      // Get data from multiple dashboard endpoints
      const [dashboardResponse, occupancyResponse, revenueResponse] = await Promise.all([
        apiClient.get('/reports/dashboard'),
        apiClient.get('/reports/occupancy'),
        apiClient.get('/reports/revenue')
      ]);

      // Verify consistency across endpoints
      const dashboardMetrics = dashboardResponse.data.summary;
      const occupancyMetrics = occupancyResponse.data.current_status;
      const revenueMetrics = revenueResponse.data.summary;

      // Occupancy should match between dashboard and occupancy endpoint
      expect(dashboardMetrics.currently_parked).toBe(occupancyMetrics.occupied_spaces);
      expect(Math.round(dashboardMetrics.occupancy_rate)).toBe(Math.round(occupancyMetrics.occupancy_rate));

      // Revenue should be consistent
      expect(dashboardMetrics.total_revenue).toBeCloseTo(revenueMetrics.total_revenue, 2);
    });
  });

  describe('Search and Filter Integration', () => {
    beforeEach(async () => {
      testUtils.auth.setAuthHeader(operatorToken);

      // Create diverse test data
      const testData = [
        {
          vehicle_number: 'FILTER001',
          vehicle_type: 'Trailer',
          location: 'Main Gate',
          driver_name: 'John Smith',
          driver_contact: '+1234567890'
        },
        {
          vehicle_number: 'FILTER002',
          vehicle_type: '4 Wheeler',
          location: 'Side Gate',
          driver_name: 'Jane Doe',
          driver_contact: '+1987654321'
        },
        {
          vehicle_number: 'FILTER003',
          vehicle_type: 'Trailer',
          location: 'Main Gate',
          driver_name: 'Bob Johnson',
          driver_contact: '+1122334455'
        }
      ];

      for (const data of testData) {
        await apiClient.post('/parking/entries', data);
        await testUtils.wait(100);
      }

      // Process exit for one entry to test mixed status filtering
      const exitResponse = await apiClient.get('/parking/entries?vehicle_number=FILTER001');
      const entryToExit = exitResponse.data.data[0];
      
      await apiClient.post(
        `/parking/entries/${entryToExit.vehicle_number}/${encodeURIComponent(entryToExit.entry_time)}/exit`,
        { payment_type: 'Card', payment_status: 'Paid' }
      );
    });

    it('should provide consistent results across different search methods', async () => {
      testUtils.auth.setAuthHeader(operatorToken);

      // Search using different methods for the same criteria
      const [generalSearch, specificSearch, advancedSearch] = await Promise.all([
        apiClient.get('/parking/entries?vehicle_number=FILTER'),
        apiClient.get('/parking/entries/search?q=FILTER'),
        apiClient.get('/parking/entries/search?vehicle_number=FILTER&include_stats=true')
      ]);

      // All should return the same entries (3 created)
      expect(generalSearch.data.data).toHaveLength(3);
      expect(specificSearch.data.data).toHaveLength(3);
      expect(advancedSearch.data.data).toHaveLength(3);

      // Vehicle numbers should match across all searches
      const generalNumbers = generalSearch.data.data.map(e => e.vehicle_number).sort();
      const specificNumbers = specificSearch.data.data.map(e => e.vehicle_number).sort();
      const advancedNumbers = advancedSearch.data.data.map(e => e.vehicle_number).sort();

      expect(generalNumbers).toEqual(['FILTER001', 'FILTER002', 'FILTER003']);
      expect(specificNumbers).toEqual(['FILTER001', 'FILTER002', 'FILTER003']);
      expect(advancedNumbers).toEqual(['FILTER001', 'FILTER002', 'FILTER003']);
    });

    it('should handle complex combined filters correctly', async () => {
      testUtils.auth.setAuthHeader(operatorToken);

      // Test combining multiple filter criteria
      const complexFilterResponse = await apiClient.get(
        '/parking/entries/search?vehicle_type=Trailer&location=Main Gate&q=FILTER'
      );

      expect(complexFilterResponse.status).toBe(200);
      expect(complexFilterResponse.data.data).toHaveLength(2); // FILTER001 and FILTER003

      // Verify both entries match all criteria
      complexFilterResponse.data.data.forEach(entry => {
        expect(entry.vehicle_type).toBe('Trailer');
        expect(entry.location).toBe('Main Gate');
        expect(entry.vehicle_number).toMatch(/FILTER/);
      });
    });
  });

  describe('Multi-User Concurrent Operations', () => {
    it('should handle operations from different user roles simultaneously', async () => {
      // Set up concurrent operations from different users
      const operations = [
        // Operator creating entry
        async () => {
          testUtils.auth.setAuthHeader(operatorToken);
          return apiClient.post('/parking/entries', {
            ...testVehicles.truck,
            vehicle_number: 'MULTI001'
          });
        },

        // Manager viewing dashboard
        async () => {
          testUtils.auth.setAuthHeader(managerToken);
          return apiClient.get('/reports/dashboard');
        },

        // Admin viewing users
        async () => {
          testUtils.auth.setAuthHeader(adminToken);
          return apiClient.get('/auth/users');
        },

        // Operator searching entries
        async () => {
          testUtils.auth.setAuthHeader(operatorToken);
          return apiClient.get('/parking/entries/current');
        }
      ];

      const startTime = Date.now();
      const responses = await Promise.all(operations);
      const duration = Date.now() - startTime;

      // All operations should succeed
      expect(responses[0].status).toBe(201); // Entry created
      expect(responses[1].status).toBe(200); // Dashboard accessed
      expect(responses[2].status).toBe(200); // Users listed
      expect(responses[3].status).toBe(200); // Current entries retrieved

      console.log(`Multi-user operations completed in ${duration}ms`);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should maintain proper authorization boundaries under concurrent load', async () => {
      const unauthorizedOperations = [
        // Operator trying to access admin endpoints
        async () => {
          testUtils.auth.setAuthHeader(operatorToken);
          try {
            await apiClient.get('/auth/users');
            return { status: 'unexpected_success' };
          } catch (error) {
            return { status: error.response?.status || 500 };
          }
        },

        // Manager trying to access admin-only endpoints
        async () => {
          testUtils.auth.setAuthHeader(managerToken);
          try {
            await apiClient.delete('/auth/users/test_operator');
            return { status: 'unexpected_success' };
          } catch (error) {
            return { status: error.response?.status || 500 };
          }
        }
      ];

      const authorizedOperations = [
        // Manager accessing allowed reports
        async () => {
          testUtils.auth.setAuthHeader(managerToken);
          return apiClient.get('/reports/revenue');
        },

        // Operator performing parking operations
        async () => {
          testUtils.auth.setAuthHeader(operatorToken);
          return apiClient.get('/parking/entries/current');
        }
      ];

      const [unauthorizedResults, authorizedResults] = await Promise.all([
        Promise.all(unauthorizedOperations),
        Promise.all(authorizedOperations)
      ]);

      // Unauthorized operations should fail with 403
      expect(unauthorizedResults[0].status).toBe(403);
      expect(unauthorizedResults[1].status).toBe(403);

      // Authorized operations should succeed
      expect(authorizedResults[0].status).toBe(200);
      expect(authorizedResults[1].status).toBe(200);
    });
  });

  describe('Error Handling Integration', () => {
    it('should provide consistent error responses across all endpoints', async () => {
      testUtils.auth.setAuthHeader(operatorToken);

      // Test various error scenarios
      const errorTests = [
        {
          name: 'Invalid vehicle number format',
          operation: () => apiClient.post('/parking/entries', {
            ...testVehicles.truck,
            vehicle_number: ''
          }),
          expectedStatus: 422
        },
        {
          name: 'Non-existent entry lookup',
          operation: () => apiClient.get('/parking/entries/NONEXISTENT/2024-01-01T00:00:00'),
          expectedStatus: 404
        },
        {
          name: 'Duplicate entry creation',
          operation: async () => {
            const vehicleData = { ...testVehicles.truck, vehicle_number: 'DUPLICATE001' };
            await apiClient.post('/parking/entries', vehicleData);
            return apiClient.post('/parking/entries', vehicleData);
          },
          expectedStatus: 400
        }
      ];

      for (const test of errorTests) {
        try {
          await test.operation();
          fail(`Expected ${test.name} to throw an error`);
        } catch (error) {
          expect(error.response.status).toBe(test.expectedStatus);
          expect(error.response.data).toMatchObject({
            detail: expect.any(String)
          });
          console.log(`✓ ${test.name}: ${error.response.status} - ${error.response.data.detail}`);
        }
      }
    });

    it('should handle system recovery after errors gracefully', async () => {
      testUtils.auth.setAuthHeader(operatorToken);

      // Cause an error
      try {
        await apiClient.post('/parking/entries', {
          vehicle_number: 'ERROR001',
          vehicle_type: 'Invalid Type'
        });
      } catch (error) {
        expect(error.response.status).toBe(422);
      }

      // System should recover and handle valid requests
      const validResponse = await apiClient.post('/parking/entries', {
        ...testVehicles.truck,
        vehicle_number: 'RECOVERY001'
      });

      expect(validResponse.status).toBe(201);
      expect(validResponse.data.vehicle_number).toBe('RECOVERY001');

      // Verify system state is consistent
      const dashboardResponse = await apiClient.get('/reports/dashboard');
      expect(dashboardResponse.status).toBe(200);
    });
  });

  describe('Data Export Integration', () => {
    it('should maintain data consistency across different export formats', async () => {
      testUtils.auth.setAuthHeader(managerToken);

      // Create test data for export
      testUtils.auth.setAuthHeader(operatorToken);
      const exportTestVehicles = [
        { ...testVehicles.truck, vehicle_number: 'EXPORT001' },
        { ...testVehicles.mini_truck, vehicle_number: 'EXPORT002' }
      ];

      for (const vehicle of exportTestVehicles) {
        await apiClient.post('/parking/entries', vehicle);
      }

      // Process one exit for complete data
      const entryResponse = await apiClient.get('/parking/entries?vehicle_number=EXPORT001');
      const entryToExit = entryResponse.data.data[0];
      
      await apiClient.post(
        `/parking/entries/${entryToExit.vehicle_number}/${encodeURIComponent(entryToExit.entry_time)}/exit`,
        { payment_type: 'Cash', payment_status: 'Paid' }
      );

      // Switch back to manager for exports
      testUtils.auth.setAuthHeader(managerToken);

      const today = new Date().toISOString().split('T')[0];
      
      // Get data via API
      const apiDataResponse = await apiClient.get(
        `/parking/entries?start_date=${today}&end_date=${today}&vehicle_number=EXPORT`
      );

      // Get same data via CSV export
      const csvResponse = await apiClient.get(
        `/reports/export/csv?start_date=${today}&end_date=${today}&vehicle_number=EXPORT`,
        { responseType: 'arraybuffer' }
      );

      expect(csvResponse.status).toBe(200);
      expect(csvResponse.headers['content-type']).toMatch(/csv/);

      // Parse CSV and verify data matches
      const csvContent = new TextDecoder().decode(csvResponse.data);
      const csvLines = csvContent.trim().split('\n');
      
      // Should have header + data rows
      expect(csvLines.length).toBeGreaterThan(1);
      
      // Verify record count matches
      const apiRecordCount = apiDataResponse.data.data.length;
      const csvRecordCount = csvLines.length - 1; // Subtract header
      
      expect(csvRecordCount).toBe(apiRecordCount);
    });
  });
});