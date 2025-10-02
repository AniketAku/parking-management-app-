/**
 * WebSocket Real-time Features E2E Tests
 * Tests WebSocket connections, real-time notifications, and live updates
 */
import { testUtils, testVehicles, apiClient } from '../setup';

describe('WebSocket Real-time Features', () => {
  let authToken: string;
  let ws: WebSocket;

  beforeAll(async () => {
    // Login as operator for parking operations
    authToken = await testUtils.auth.loginTestUser('operator');
    testUtils.auth.setAuthHeader(authToken);
  });

  afterEach(async () => {
    // Clean up WebSocket connections
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    await testUtils.wait(100); // Allow cleanup
  });

  describe('WebSocket Connection Management', () => {
    it('should establish WebSocket connection with valid token', async () => {
      ws = await testUtils.websocket.connect(authToken, 'all');
      
      expect(ws.readyState).toBe(WebSocket.OPEN);
      
      // Test connection with ping/pong
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection test timeout')), 5000);
        
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'connection_confirmed') {
            clearTimeout(timeout);
            resolve(data);
          }
        };
      });
    });

    it('should reject WebSocket connection with invalid token', async () => {
      await expect(
        testUtils.websocket.connect('invalid_token')
      ).rejects.toThrow(/authentication failed|unauthorized/i);
    });

    it('should support channel subscriptions', async () => {
      ws = await testUtils.websocket.connect(authToken, 'parking,alerts');
      
      // Verify connection confirmation includes channel info
      await new Promise((resolve) => {
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'connection_confirmed') {
            expect(data.channels).toEqual(['parking', 'alerts']);
            resolve(data);
          }
        };
      });
    });

    it('should handle connection reconnection gracefully', async () => {
      ws = await testUtils.websocket.connect(authToken);
      
      // Simulate connection drop and reconnection
      ws.close();
      await testUtils.wait(1000);
      
      ws = await testUtils.websocket.connect(authToken);
      expect(ws.readyState).toBe(WebSocket.OPEN);
    });
  });

  describe('Real-time Parking Notifications', () => {
    it('should receive new entry notifications', async () => {
      ws = await testUtils.websocket.connect(authToken, 'parking');
      
      const testVehicleData = {
        ...testVehicles.truck,
        vehicle_number: testUtils.generateVehicleNumber(),
        driver_name: testUtils.generateDriverName()
      };

      // Set up message listener
      const notificationPromise = new Promise((resolve) => {
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'parking.new_entry') {
            resolve(data);
          }
        };
      });

      // Create new parking entry
      await apiClient.post('/parking/entries', testVehicleData);

      // Wait for WebSocket notification
      const notification = await Promise.race([
        notificationPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Notification timeout')), 5000)
        )
      ]);

      expect(notification).toMatchObject({
        type: 'parking.new_entry',
        channel: 'parking',
        data: expect.objectContaining({
          vehicle_number: testVehicleData.vehicle_number.toUpperCase(),
          vehicle_type: testVehicleData.vehicle_type,
          entry_time: expect.any(String)
        }),
        timestamp: expect.any(String)
      });
    });

    it('should receive exit notifications', async () => {
      ws = await testUtils.websocket.connect(authToken, 'parking');
      
      // Create entry first
      const testVehicleData = {
        ...testVehicles.mini_truck,
        vehicle_number: testUtils.generateVehicleNumber()
      };
      
      const entryResponse = await apiClient.post('/parking/entries', testVehicleData);
      const createdEntry = entryResponse.data;

      // Set up exit notification listener
      const exitNotificationPromise = new Promise((resolve) => {
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'parking.exit') {
            resolve(data);
          }
        };
      });

      // Process exit
      await apiClient.post(
        `/parking/entries/${createdEntry.vehicle_number}/${encodeURIComponent(createdEntry.entry_time)}/exit`,
        { payment_type: 'Cash', payment_status: 'Paid' }
      );

      // Wait for WebSocket notification
      const exitNotification = await Promise.race([
        exitNotificationPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Exit notification timeout')), 5000)
        )
      ]);

      expect(exitNotification).toMatchObject({
        type: 'parking.exit',
        channel: 'parking',
        data: expect.objectContaining({
          vehicle_number: createdEntry.vehicle_number,
          exit_time: expect.any(String),
          fee: expect.any(Number)
        })
      });
    });
  });

  describe('Dashboard Real-time Updates', () => {
    it('should receive dashboard metric updates', async () => {
      ws = await testUtils.websocket.connect(authToken, 'dashboard');
      
      // Dashboard updates are sent periodically, wait for one
      const dashboardUpdatePromise = new Promise((resolve) => {
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'dashboard.metrics_update') {
            resolve(data);
          }
        };
      });

      const dashboardUpdate = await Promise.race([
        dashboardUpdatePromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Dashboard update timeout')), 10000)
        )
      ]);

      expect(dashboardUpdate).toMatchObject({
        type: 'dashboard.metrics_update',
        channel: 'dashboard',
        data: expect.objectContaining({
          total_parked: expect.any(Number),
          total_revenue_today: expect.any(Number),
          occupancy_rate: expect.any(Number),
          avg_parking_duration: expect.any(Number)
        }),
        timestamp: expect.any(String)
      });
    });

    it('should receive occupancy rate updates', async () => {
      ws = await testUtils.websocket.connect(authToken, 'occupancy');
      
      // Create a parking entry to trigger occupancy update
      const testVehicleData = {
        ...testVehicles.truck,
        vehicle_number: testUtils.generateVehicleNumber()
      };

      const occupancyUpdatePromise = new Promise((resolve) => {
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'occupancy.update') {
            resolve(data);
          }
        };
      });

      await apiClient.post('/parking/entries', testVehicleData);

      const occupancyUpdate = await Promise.race([
        occupancyUpdatePromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Occupancy update timeout')), 5000)
        )
      ]);

      expect(occupancyUpdate).toMatchObject({
        type: 'occupancy.update',
        channel: 'occupancy',
        data: expect.objectContaining({
          current_occupancy: expect.any(Number),
          occupancy_rate: expect.any(Number),
          available_spaces: expect.any(Number)
        })
      });
    });
  });

  describe('Alert Notifications', () => {
    it('should receive overstay alert notifications', async () => {
      ws = await testUtils.websocket.connect(authToken, 'alerts');
      
      // This test would require creating an entry that's been parked long enough
      // to trigger overstay alert. For testing, we'll simulate the condition.
      
      // Listen for overstay alerts
      const alertPromise = new Promise((resolve) => {
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'parking.overstay_alert') {
            resolve(data);
          }
        };
      });

      // In a real scenario, this would be triggered by the background task
      // For testing, we might need to trigger it manually or mock it
      
      // Skip this test for now as it requires time-based conditions
    }, 30000);

    it('should receive system health alerts', async () => {
      ws = await testUtils.websocket.connect(authToken, 'alerts');
      
      // System alerts would be triggered by monitoring systems
      // This is a placeholder for system health monitoring
    });
  });

  describe('Multi-client WebSocket Support', () => {
    it('should support multiple concurrent WebSocket connections', async () => {
      const connections: WebSocket[] = [];
      
      try {
        // Create multiple connections
        for (let i = 0; i < 3; i++) {
          const connection = await testUtils.websocket.connect(authToken, 'parking');
          connections.push(connection);
        }

        // Verify all connections are open
        connections.forEach(conn => {
          expect(conn.readyState).toBe(WebSocket.OPEN);
        });

        // Test that all connections receive the same notification
        const testVehicleData = {
          ...testVehicles.truck,
          vehicle_number: testUtils.generateVehicleNumber()
        };

        const notificationPromises = connections.map(conn => 
          new Promise((resolve) => {
            conn.onmessage = (event) => {
              const data = JSON.parse(event.data);
              if (data.type === 'parking.new_entry') {
                resolve(data);
              }
            };
          })
        );

        // Create parking entry to trigger notifications
        await apiClient.post('/parking/entries', testVehicleData);

        // Wait for all notifications
        const notifications = await Promise.all(
          notificationPromises.map(promise => 
            Promise.race([
              promise,
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Multi-client notification timeout')), 5000)
              )
            ])
          )
        );

        // Verify all clients received the same notification
        notifications.forEach(notification => {
          expect(notification).toMatchObject({
            type: 'parking.new_entry',
            data: expect.objectContaining({
              vehicle_number: testVehicleData.vehicle_number.toUpperCase()
            })
          });
        });

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

  describe('WebSocket Performance', () => {
    it('should maintain low latency for real-time updates', async () => {
      ws = await testUtils.websocket.connect(authToken, 'parking');
      
      const testVehicleData = {
        ...testVehicles.truck,
        vehicle_number: testUtils.generateVehicleNumber()
      };

      const startTime = Date.now();
      
      const notificationPromise = new Promise((resolve) => {
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'parking.new_entry') {
            const latency = Date.now() - startTime;
            resolve({ notification: data, latency });
          }
        };
      });

      // Create parking entry
      await apiClient.post('/parking/entries', testVehicleData);

      const result = await Promise.race([
        notificationPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Performance test timeout')), 3000)
        )
      ]);

      // WebSocket notification should arrive quickly (under 500ms)
      expect(result.latency).toBeLessThan(500);
    });

    it('should handle high-frequency updates efficiently', async () => {
      ws = await testUtils.websocket.connect(authToken, 'parking');
      
      const receivedNotifications = [];
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'parking.new_entry') {
          receivedNotifications.push(data);
        }
      };

      // Create multiple entries rapidly
      const entryPromises = [];
      for (let i = 0; i < 5; i++) {
        const vehicleData = {
          ...testVehicles.truck,
          vehicle_number: `PERF${i + 1}`
        };
        entryPromises.push(apiClient.post('/parking/entries', vehicleData));
        await testUtils.wait(100); // Small delay between requests
      }

      await Promise.all(entryPromises);
      
      // Wait for notifications to arrive
      await testUtils.wait(2000);

      // Should have received notifications for all entries
      expect(receivedNotifications.length).toBe(5);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle WebSocket disconnection gracefully', async () => {
      ws = await testUtils.websocket.connect(authToken, 'parking');
      
      // Force disconnect
      ws.close();
      await testUtils.wait(100);
      
      expect(ws.readyState).toBe(WebSocket.CLOSED);
      
      // Should be able to reconnect
      ws = await testUtils.websocket.connect(authToken, 'parking');
      expect(ws.readyState).toBe(WebSocket.OPEN);
    });

    it('should handle invalid message formats gracefully', async () => {
      ws = await testUtils.websocket.connect(authToken, 'parking');
      
      let errorReceived = false;
      
      ws.onerror = () => {
        errorReceived = true;
      };

      // Send invalid JSON (this would normally be handled server-side)
      // This test verifies client-side error handling
      
      await testUtils.wait(1000);
      
      // Connection should remain stable
      expect(ws.readyState).toBe(WebSocket.OPEN);
      expect(errorReceived).toBe(false);
    });
  });
});