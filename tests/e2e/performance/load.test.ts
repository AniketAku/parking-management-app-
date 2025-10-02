/**
 * Performance and Load Testing E2E Tests
 * Tests system performance, scalability, and load handling capabilities
 */
import { testUtils, testVehicles, apiClient } from '../setup';

describe('Performance and Load Testing', () => {
  let authToken: string;

  beforeAll(async () => {
    authToken = await testUtils.auth.loginTestUser('operator');
    testUtils.auth.setAuthHeader(authToken);
  });

  describe('API Response Time Performance', () => {
    it('should maintain response times under normal load', async () => {
      const endpoints = [
        { method: 'get', url: '/parking/entries', threshold: 1000 },
        { method: 'get', url: '/reports/dashboard', threshold: 2000 },
        { method: 'get', url: '/parking/entries/current', threshold: 1500 },
        { method: 'get', url: '/reports/occupancy', threshold: 1000 }
      ];

      for (const endpoint of endpoints) {
        const measurements = [];
        
        // Take 10 measurements
        for (let i = 0; i < 10; i++) {
          const startTime = Date.now();
          const response = await apiClient[endpoint.method](endpoint.url);
          const duration = Date.now() - startTime;
          
          expect(response.status).toBe(200);
          measurements.push(duration);
          
          await testUtils.wait(100); // Small delay between requests
        }

        const avgResponseTime = measurements.reduce((sum, time) => sum + time, 0) / measurements.length;
        const maxResponseTime = Math.max(...measurements);

        console.log(`${endpoint.url}: Avg ${avgResponseTime}ms, Max ${maxResponseTime}ms`);
        
        expect(avgResponseTime).toBeLessThan(endpoint.threshold);
        expect(maxResponseTime).toBeLessThan(endpoint.threshold * 1.5);
      }
    });

    it('should handle peak response time requirements', async () => {
      const criticalEndpoints = [
        { url: '/parking/entries', method: 'post', threshold: 800 },
        { url: '/parking/entries/TEST123/2024-01-01T10:00:00/exit', method: 'post', threshold: 1000 }
      ];

      // Create test entry for exit testing
      const testVehicleData = {
        ...testVehicles.truck,
        vehicle_number: 'TEST123'
      };
      
      const entryResponse = await apiClient.post('/parking/entries', testVehicleData);
      
      // Test entry creation performance
      const entryMeasurements = [];
      for (let i = 0; i < 5; i++) {
        const vehicleData = {
          ...testVehicles.mini_truck,
          vehicle_number: `PERF${i + 1}`
        };
        
        const startTime = Date.now();
        const response = await apiClient.post('/parking/entries', vehicleData);
        const duration = Date.now() - startTime;
        
        expect(response.status).toBe(201);
        entryMeasurements.push(duration);
        
        await testUtils.wait(50);
      }

      const avgEntryTime = entryMeasurements.reduce((sum, time) => sum + time, 0) / entryMeasurements.length;
      expect(avgEntryTime).toBeLessThan(800);

      // Test exit processing performance
      const exitStartTime = Date.now();
      const exitResponse = await apiClient.post(
        `/parking/entries/${entryResponse.data.vehicle_number}/${encodeURIComponent(entryResponse.data.entry_time)}/exit`,
        { payment_type: 'Cash', payment_status: 'Paid' }
      );
      const exitDuration = Date.now() - exitStartTime;

      expect(exitResponse.status).toBe(200);
      expect(exitDuration).toBeLessThan(1000);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple concurrent entry creations', async () => {
      const concurrentRequests = 10;
      const entryPromises = [];

      const startTime = Date.now();

      for (let i = 0; i < concurrentRequests; i++) {
        const vehicleData = {
          ...testVehicles.truck,
          vehicle_number: `CONCURRENT${String(i + 1).padStart(3, '0')}`,
          driver_name: `Driver ${i + 1}`,
          driver_contact: `+1${String(i + 1000000000).padStart(10, '0')}`
        };

        entryPromises.push(
          testUtils.performance.measureOperation(
            `concurrent_entry_${i}`,
            () => apiClient.post('/parking/entries', vehicleData)
          )
        );
      }

      const responses = await Promise.all(entryPromises);
      const totalDuration = Date.now() - startTime;

      // Verify all requests succeeded
      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.data.vehicle_number).toBe(`CONCURRENT${String(index + 1).padStart(3, '0')}`);
      });

      // Total time should be much less than sequential execution
      console.log(`Concurrent execution: ${totalDuration}ms for ${concurrentRequests} requests`);
      expect(totalDuration).toBeLessThan(concurrentRequests * 500); // Much faster than sequential

      // Verify no data corruption occurred
      const verificationResponse = await apiClient.get('/parking/entries?vehicle_number=CONCURRENT');
      expect(verificationResponse.data.data.length).toBe(concurrentRequests);
    });

    it('should handle concurrent mixed operations', async () => {
      // Create some entries first
      const setupPromises = [];
      for (let i = 0; i < 5; i++) {
        const vehicleData = {
          ...testVehicles.truck,
          vehicle_number: `MIXED${i + 1}`,
          driver_name: `Mixed Driver ${i + 1}`
        };
        setupPromises.push(apiClient.post('/parking/entries', vehicleData));
      }

      const setupResponses = await Promise.all(setupPromises);

      // Now perform mixed concurrent operations
      const mixedPromises = [
        // New entries
        apiClient.post('/parking/entries', {
          ...testVehicles.mini_truck,
          vehicle_number: 'MIXEDNEW1'
        }),
        apiClient.post('/parking/entries', {
          ...testVehicles.mini_truck,
          vehicle_number: 'MIXEDNEW2'
        }),
        
        // Exits
        apiClient.post(
          `/parking/entries/${setupResponses[0].data.vehicle_number}/${encodeURIComponent(setupResponses[0].data.entry_time)}/exit`,
          { payment_type: 'Cash', payment_status: 'Paid' }
        ),
        
        // Searches
        apiClient.get('/parking/entries?limit=20'),
        apiClient.get('/parking/entries/current'),
        apiClient.get('/reports/dashboard')
      ];

      const mixedResponses = await Promise.all(mixedPromises);

      // Verify all operations succeeded
      expect(mixedResponses[0].status).toBe(201); // New entry 1
      expect(mixedResponses[1].status).toBe(201); // New entry 2
      expect(mixedResponses[2].status).toBe(200); // Exit
      expect(mixedResponses[3].status).toBe(200); // Search
      expect(mixedResponses[4].status).toBe(200); // Current entries
      expect(mixedResponses[5].status).toBe(200); // Dashboard
    });

    it('should maintain data consistency under concurrent load', async () => {
      // Create entries concurrently and verify count accuracy
      const vehicleCount = 20;
      const entryPromises = [];

      for (let i = 0; i < vehicleCount; i++) {
        const vehicleData = {
          ...testVehicles.truck,
          vehicle_number: `CONSIST${String(i + 1).padStart(3, '0')}`
        };
        entryPromises.push(apiClient.post('/parking/entries', vehicleData));
      }

      await Promise.all(entryPromises);

      // Verify count consistency
      const countResponse = await apiClient.get('/parking/entries?vehicle_number=CONSIST');
      expect(countResponse.data.pagination.total).toBe(vehicleCount);

      // Verify dashboard metrics are consistent
      const dashboardResponse = await apiClient.get('/reports/dashboard');
      expect(dashboardResponse.data.summary.total_entries).toBeGreaterThanOrEqual(vehicleCount);
    });
  });

  describe('Search Performance', () => {
    beforeEach(async () => {
      // Create a larger dataset for search testing
      const promises = [];
      for (let i = 0; i < 25; i++) {
        const vehicleData = {
          vehicle_number: `SEARCH${String(i + 1).padStart(3, '0')}`,
          vehicle_type: i % 2 === 0 ? 'Trailer' : '4 Wheeler',
          location: i % 3 === 0 ? 'Main Gate' : (i % 3 === 1 ? 'Side Gate' : 'North Gate'),
          driver_name: `Search Driver ${i + 1}`,
          driver_contact: `+1${String(9000000000 + i)}`
        };
        promises.push(apiClient.post('/parking/entries', vehicleData));
      }
      await Promise.all(promises);
    });

    it('should maintain fast search response times', async () => {
      const searchQueries = [
        '/parking/entries/search?q=SEARCH',
        '/parking/entries/search?vehicle_type=Trailer',
        '/parking/entries/search?location=Main Gate',
        '/parking/entries/search?vehicle_number=SEARCH001',
        '/parking/entries/search?driver_name=Search Driver'
      ];

      for (const query of searchQueries) {
        const measurements = [];
        
        for (let i = 0; i < 5; i++) {
          const startTime = Date.now();
          const response = await apiClient.get(query);
          const duration = Date.now() - startTime;
          
          expect(response.status).toBe(200);
          measurements.push(duration);
          
          await testUtils.wait(50);
        }

        const avgSearchTime = measurements.reduce((sum, time) => sum + time, 0) / measurements.length;
        console.log(`Search query '${query}': ${avgSearchTime}ms average`);
        
        expect(avgSearchTime).toBeLessThan(2000); // Search should complete within 2 seconds
      }
    });

    it('should handle complex search queries efficiently', async () => {
      const complexQuery = '/parking/entries/search?q=Search&vehicle_type=Trailer&location=Main Gate&include_stats=true&sort_by=entry_time&sort_order=desc&limit=10';
      
      const startTime = Date.now();
      const response = await apiClient.get(complexQuery);
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(response.data.data).toBeInstanceOf(Array);
      expect(response.data.statistics).toBeDefined();
      expect(duration).toBeLessThan(3000); // Complex search within 3 seconds
    });
  });

  describe('Database Performance', () => {
    it('should maintain performance with large result sets', async () => {
      // Test pagination performance with large datasets
      const pageSizes = [10, 50, 100, 200];

      for (const pageSize of pageSizes) {
        const startTime = Date.now();
        const response = await apiClient.get(`/parking/entries?limit=${pageSize}&page=1`);
        const duration = Date.now() - startTime;

        expect(response.status).toBe(200);
        expect(response.data.data.length).toBeLessThanOrEqual(pageSize);
        
        // Larger page sizes should still be reasonable
        expect(duration).toBeLessThan(pageSize * 10); // Roughly 10ms per record max
        console.log(`Page size ${pageSize}: ${duration}ms`);
      }
    });

    it('should handle database connection pooling efficiently', async () => {
      // Create multiple concurrent database-intensive operations
      const dbIntensivePromises = [];

      for (let i = 0; i < 15; i++) {
        dbIntensivePromises.push(
          apiClient.get('/parking/entries?limit=50'),
          apiClient.get('/reports/dashboard'),
          apiClient.get('/parking/entries/current')
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(dbIntensivePromises);
      const totalDuration = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      console.log(`${responses.length} concurrent DB operations: ${totalDuration}ms`);
      
      // Should complete within reasonable time (connection pooling working)
      expect(totalDuration).toBeLessThan(30000); // 30 seconds for 45 operations
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should handle resource cleanup properly', async () => {
      // Create and process many entries to test memory management
      const batchSize = 50;
      const batches = 3;

      for (let batch = 0; batch < batches; batch++) {
        const batchPromises = [];
        
        for (let i = 0; i < batchSize; i++) {
          const vehicleData = {
            ...testVehicles.truck,
            vehicle_number: `BATCH${batch}_${String(i + 1).padStart(3, '0')}`,
            driver_name: `Batch ${batch} Driver ${i + 1}`
          };
          batchPromises.push(apiClient.post('/parking/entries', vehicleData));
        }

        await Promise.all(batchPromises);
        console.log(`Completed batch ${batch + 1}/${batches}`);
        
        // Small delay between batches to allow cleanup
        await testUtils.wait(1000);
      }

      // Verify system is still responsive
      const healthCheck = await apiClient.get('/health');
      expect(healthCheck.status).toBe(200);

      const dashboardCheck = await apiClient.get('/reports/dashboard');
      expect(dashboardCheck.status).toBe(200);
    });
  });

  describe('WebSocket Performance', () => {
    it('should handle multiple WebSocket connections efficiently', async () => {
      const connectionCount = 5;
      const connections: WebSocket[] = [];

      try {
        // Create multiple WebSocket connections
        const connectPromises = [];
        for (let i = 0; i < connectionCount; i++) {
          connectPromises.push(testUtils.websocket.connect(authToken, 'parking'));
        }

        const startTime = Date.now();
        const wsConnections = await Promise.all(connectPromises);
        const connectionTime = Date.now() - startTime;

        connections.push(...wsConnections);

        console.log(`${connectionCount} WebSocket connections established in ${connectionTime}ms`);
        expect(connectionTime).toBeLessThan(5000); // Should connect within 5 seconds

        // Verify all connections are active
        connections.forEach(conn => {
          expect(conn.readyState).toBe(WebSocket.OPEN);
        });

        // Test message broadcasting performance
        const messagePromises = connections.map(conn =>
          new Promise((resolve) => {
            conn.onmessage = (event) => {
              const data = JSON.parse(event.data);
              if (data.type === 'parking.new_entry') {
                resolve(Date.now());
              }
            };
          })
        );

        // Create an entry to trigger notifications
        const broadcastStartTime = Date.now();
        await apiClient.post('/parking/entries', {
          ...testVehicles.truck,
          vehicle_number: 'WSPERF001'
        });

        // Wait for all connections to receive the message
        const receiveTimes = await Promise.all(
          messagePromises.map(promise =>
            Promise.race([
              promise,
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('WebSocket message timeout')), 3000)
              )
            ])
          )
        );

        // Calculate broadcast latencies
        const latencies = receiveTimes.map(time => time - broadcastStartTime);
        const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
        const maxLatency = Math.max(...latencies);

        console.log(`WebSocket broadcast - Avg: ${avgLatency}ms, Max: ${maxLatency}ms`);
        
        expect(avgLatency).toBeLessThan(500); // Average latency under 500ms
        expect(maxLatency).toBeLessThan(1000); // Max latency under 1 second

      } finally {
        // Clean up connections
        connections.forEach(conn => {
          if (conn.readyState === WebSocket.OPEN) {
            conn.close();
          }
        });
      }
    });
  });

  describe('Stress Testing', () => {
    it('should handle peak load scenarios gracefully', async () => {
      const peakLoadDuration = 10000; // 10 seconds
      const requestInterval = 100; // Request every 100ms
      const expectedRequests = peakLoadDuration / requestInterval;

      const results = {
        successful: 0,
        failed: 0,
        responseTimes: []
      };

      const startTime = Date.now();
      let requestCounter = 0;

      const loadTest = setInterval(async () => {
        if (Date.now() - startTime >= peakLoadDuration) {
          clearInterval(loadTest);
          return;
        }

        try {
          const reqStartTime = Date.now();
          const response = await apiClient.get('/parking/entries?limit=10');
          const responseTime = Date.now() - reqStartTime;

          if (response.status === 200) {
            results.successful++;
            results.responseTimes.push(responseTime);
          } else {
            results.failed++;
          }
        } catch (error) {
          results.failed++;
        }

        requestCounter++;
      }, requestInterval);

      // Wait for test completion
      await new Promise(resolve => {
        const checkComplete = setInterval(() => {
          if (Date.now() - startTime >= peakLoadDuration + 1000) {
            clearInterval(checkComplete);
            resolve(true);
          }
        }, 100);
      });

      const successRate = (results.successful / (results.successful + results.failed)) * 100;
      const avgResponseTime = results.responseTimes.reduce((sum, time) => sum + time, 0) / results.responseTimes.length;

      console.log(`Stress Test Results:
        - Duration: ${peakLoadDuration}ms
        - Successful: ${results.successful}
        - Failed: ${results.failed}  
        - Success Rate: ${successRate}%
        - Average Response Time: ${avgResponseTime}ms`);

      expect(successRate).toBeGreaterThan(95); // 95% success rate minimum
      expect(avgResponseTime).toBeLessThan(2000); // Average response under 2 seconds
    });
  });
});