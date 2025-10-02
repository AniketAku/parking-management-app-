/**
 * Reports and Statistics API E2E Tests
 * Tests dashboard metrics, revenue reports, and data export functionality
 */
import { testUtils, testVehicles, apiClient } from '../setup';

describe('Reports and Statistics API', () => {
  let authToken: string;
  let testEntries: any[] = [];

  beforeAll(async () => {
    // Login as manager for reports access
    authToken = await testUtils.auth.loginTestUser('manager');
    testUtils.auth.setAuthHeader(authToken);
  });

  beforeEach(async () => {
    // Create test data for reports
    const vehicles = [
      { ...testVehicles.truck, vehicle_number: 'RPT001', driver_name: 'Test Driver 1' },
      { ...testVehicles.mini_truck, vehicle_number: 'RPT002', driver_name: 'Test Driver 2' },
      { ...testVehicles.truck, vehicle_number: 'RPT003', driver_name: 'Test Driver 3' }
    ];

    testEntries = [];
    for (const vehicle of vehicles) {
      const response = await apiClient.post('/parking/entries', vehicle);
      testEntries.push(response.data);
      await testUtils.wait(100); // Ensure different timestamps
    }

    // Process one exit for revenue testing
    await apiClient.post(
      `/parking/entries/${testEntries[0].vehicle_number}/${encodeURIComponent(testEntries[0].entry_time)}/exit`,
      { payment_type: 'Cash', payment_status: 'Paid' }
    );
  });

  describe('GET /reports/dashboard', () => {
    it('should return comprehensive dashboard metrics', async () => {
      const response = await testUtils.performance.measureOperation(
        'dashboard_metrics',
        () => apiClient.get('/reports/dashboard')
      );

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        date_filter: 'today',
        summary: expect.objectContaining({
          total_entries: expect.any(Number),
          currently_parked: expect.any(Number),
          total_exits: expect.any(Number),
          total_revenue: expect.any(Number),
          avg_parking_duration: expect.any(Number),
          occupancy_rate: expect.any(Number)
        }),
        revenue_breakdown: expect.objectContaining({
          cash_revenue: expect.any(Number),
          card_revenue: expect.any(Number),
          upi_revenue: expect.any(Number),
          pending_revenue: expect.any(Number)
        }),
        vehicle_type_breakdown: expect.any(Object),
        trends: expect.objectContaining({
          entries_trend: expect.any(Number),
          revenue_trend: expect.any(Number),
          duration_trend: expect.any(Number)
        }),
        recent_activities: expect.any(Array),
        timestamp: expect.any(String)
      });

      // Verify numerical constraints
      expect(response.data.summary.occupancy_rate).toBeGreaterThanOrEqual(0);
      expect(response.data.summary.occupancy_rate).toBeLessThanOrEqual(100);
      expect(response.data.summary.total_revenue).toBeGreaterThanOrEqual(0);
    });

    it('should support different date filters', async () => {
      const dateFilters = ['today', 'week', 'month', 'year'];

      for (const filter of dateFilters) {
        const response = await apiClient.get(`/reports/dashboard?date_filter=${filter}`);
        
        expect(response.status).toBe(200);
        expect(response.data.date_filter).toBe(filter);
        expect(response.data.summary).toBeDefined();
      }
    });

    it('should include trend calculations when requested', async () => {
      const response = await apiClient.get('/reports/dashboard?include_trends=true');

      expect(response.status).toBe(200);
      expect(response.data.trends).toMatchObject({
        entries_trend: expect.any(Number),
        revenue_trend: expect.any(Number),
        duration_trend: expect.any(Number),
        comparison_period: expect.any(String)
      });
    });

    it('should complete within performance threshold', async () => {
      const startTime = Date.now();
      const response = await apiClient.get('/reports/dashboard');
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('GET /reports/revenue', () => {
    it('should return revenue report with date filtering', async () => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiClient.get(
        `/reports/revenue?start_date=${today}&end_date=${today}`
      );

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        date_range: expect.objectContaining({
          start_date: today,
          end_date: today
        }),
        summary: expect.objectContaining({
          total_revenue: expect.any(Number),
          total_transactions: expect.any(Number),
          avg_transaction_value: expect.any(Number),
          peak_hour: expect.any(String)
        }),
        payment_method_breakdown: expect.objectContaining({
          cash: expect.any(Number),
          card: expect.any(Number),
          upi: expect.any(Number)
        }),
        vehicle_type_breakdown: expect.any(Object),
        hourly_breakdown: expect.any(Array),
        daily_breakdown: expect.any(Array)
      });
    });

    it('should support grouping by different periods', async () => {
      const response = await apiClient.get('/reports/revenue?group_by=hour');

      expect(response.status).toBe(200);
      expect(response.data.hourly_breakdown).toBeInstanceOf(Array);
      
      if (response.data.hourly_breakdown.length > 0) {
        expect(response.data.hourly_breakdown[0]).toMatchObject({
          period: expect.any(String),
          revenue: expect.any(Number),
          transactions: expect.any(Number)
        });
      }
    });

    it('should handle empty date ranges gracefully', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString().split('T')[0]; // Tomorrow
      const response = await apiClient.get(
        `/reports/revenue?start_date=${futureDate}&end_date=${futureDate}`
      );

      expect(response.status).toBe(200);
      expect(response.data.summary.total_revenue).toBe(0);
      expect(response.data.summary.total_transactions).toBe(0);
    });
  });

  describe('GET /reports/occupancy', () => {
    it('should return real-time occupancy data', async () => {
      const response = await apiClient.get('/reports/occupancy');

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        current_status: expect.objectContaining({
          total_spaces: expect.any(Number),
          occupied_spaces: expect.any(Number),
          available_spaces: expect.any(Number),
          occupancy_rate: expect.any(Number)
        }),
        by_vehicle_type: expect.any(Object),
        by_location: expect.any(Object),
        historical_data: expect.any(Array),
        peak_occupancy: expect.objectContaining({
          rate: expect.any(Number),
          time: expect.any(String)
        }),
        timestamp: expect.any(String)
      });

      // Verify occupancy calculations
      const currentStatus = response.data.current_status;
      expect(currentStatus.occupied_spaces + currentStatus.available_spaces)
        .toBe(currentStatus.total_spaces);
      expect(currentStatus.occupancy_rate).toBeGreaterThanOrEqual(0);
      expect(currentStatus.occupancy_rate).toBeLessThanOrEqual(100);
    });

    it('should support historical occupancy trends', async () => {
      const response = await apiClient.get('/reports/occupancy?include_history=true&period=24h');

      expect(response.status).toBe(200);
      expect(response.data.historical_data).toBeInstanceOf(Array);
      
      if (response.data.historical_data.length > 0) {
        expect(response.data.historical_data[0]).toMatchObject({
          timestamp: expect.any(String),
          occupancy_rate: expect.any(Number),
          occupied_spaces: expect.any(Number)
        });
      }
    });
  });

  describe('GET /reports/performance', () => {
    it('should return system performance metrics', async () => {
      const response = await apiClient.get('/reports/performance');

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        api_performance: expect.objectContaining({
          avg_response_time: expect.any(Number),
          success_rate: expect.any(Number),
          error_rate: expect.any(Number),
          requests_per_minute: expect.any(Number)
        }),
        database_performance: expect.objectContaining({
          avg_query_time: expect.any(Number),
          connection_pool_usage: expect.any(Number)
        }),
        business_metrics: expect.objectContaining({
          avg_entry_processing_time: expect.any(Number),
          avg_exit_processing_time: expect.any(Number),
          avg_search_response_time: expect.any(Number)
        }),
        system_health: expect.objectContaining({
          uptime: expect.any(Number),
          memory_usage: expect.any(Number),
          cpu_usage: expect.any(Number)
        })
      });

      // Verify performance thresholds
      expect(response.data.api_performance.success_rate).toBeGreaterThan(95);
      expect(response.data.api_performance.avg_response_time).toBeLessThan(1000);
    });
  });

  describe('Data Export Endpoints', () => {
    describe('GET /reports/export/csv', () => {
      it('should export parking data as CSV', async () => {
        const today = new Date().toISOString().split('T')[0];
        const response = await apiClient.get(
          `/reports/export/csv?start_date=${today}&end_date=${today}`,
          { responseType: 'arraybuffer' }
        );

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/text\/csv/);
        expect(response.headers['content-disposition']).toMatch(/attachment; filename=/);

        // Verify CSV content structure
        const csvContent = new TextDecoder().decode(response.data);
        const lines = csvContent.split('\n');
        
        // Should have header row
        expect(lines[0]).toMatch(/vehicle_number.*vehicle_type.*entry_time/);
        expect(lines.length).toBeGreaterThan(1); // Header + data rows
      });

      it('should support filtered CSV export', async () => {
        const response = await apiClient.get(
          '/reports/export/csv?vehicle_type=Trailer',
          { responseType: 'arraybuffer' }
        );

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/text\/csv/);
      });
    });

    describe('GET /reports/export/pdf', () => {
      it('should export report as PDF', async () => {
        const response = await apiClient.get(
          '/reports/export/pdf?report_type=revenue',
          { responseType: 'arraybuffer' }
        );

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/application\/pdf/);
        expect(response.headers['content-disposition']).toMatch(/attachment; filename=.*\.pdf/);

        // Verify PDF file signature
        const pdfContent = new Uint8Array(response.data);
        const pdfSignature = Array.from(pdfContent.slice(0, 4))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        expect(pdfSignature).toBe('25504446'); // %PDF in hex
      });

      it('should generate dashboard PDF report', async () => {
        const response = await apiClient.get(
          '/reports/export/pdf?report_type=dashboard&include_charts=true',
          { responseType: 'arraybuffer' }
        );

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/application\/pdf/);
      });
    });
  });

  describe('Real-time Reports', () => {
    it('should return live dashboard data', async () => {
      const response = await apiClient.get('/reports/live/dashboard');

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        live_metrics: expect.objectContaining({
          current_entries: expect.any(Number),
          revenue_today: expect.any(Number),
          avg_parking_time: expect.any(Number),
          occupancy_rate: expect.any(Number)
        }),
        recent_activities: expect.any(Array),
        alerts: expect.any(Array),
        last_updated: expect.any(String)
      });

      // Verify timestamp is recent (within last minute)
      const lastUpdated = new Date(response.data.last_updated);
      const now = new Date();
      expect(now.getTime() - lastUpdated.getTime()).toBeLessThan(60000);
    });

    it('should handle real-time alerts', async () => {
      const response = await apiClient.get('/reports/live/alerts');

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        alerts: expect.any(Array),
        alert_counts: expect.objectContaining({
          critical: expect.any(Number),
          warning: expect.any(Number),
          info: expect.any(Number)
        }),
        last_updated: expect.any(String)
      });

      // Each alert should have proper structure
      response.data.alerts.forEach((alert: any) => {
        expect(alert).toMatchObject({
          id: expect.any(String),
          type: expect.any(String),
          severity: expect.stringMatching(/critical|warning|info/),
          message: expect.any(String),
          timestamp: expect.any(String)
        });
      });
    });
  });

  describe('Custom Report Generation', () => {
    it('should create custom report with specific criteria', async () => {
      const reportRequest = {
        name: 'Test Custom Report',
        criteria: {
          date_range: { days: 7 },
          vehicle_types: ['Trailer', '4 Wheeler'],
          include_revenue: true,
          include_duration: true,
          group_by: 'vehicle_type'
        },
        format: 'json'
      };

      const response = await apiClient.post('/reports/custom', reportRequest);

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        report_id: expect.any(String),
        name: reportRequest.name,
        status: 'completed',
        data: expect.any(Object),
        generated_at: expect.any(String)
      });
    });

    it('should handle async report generation for large datasets', async () => {
      const reportRequest = {
        name: 'Large Dataset Report',
        criteria: {
          date_range: { days: 30 },
          include_all_fields: true
        },
        format: 'csv',
        async: true
      };

      const response = await apiClient.post('/reports/custom', reportRequest);

      expect(response.status).toBe(202);
      expect(response.data).toMatchObject({
        report_id: expect.any(String),
        status: 'processing',
        estimated_completion: expect.any(String)
      });
    });
  });

  describe('Reports Performance', () => {
    it('should maintain performance under concurrent report requests', async () => {
      const reportPromises = Array(3).fill(null).map(() =>
        apiClient.get('/reports/dashboard')
      );

      const responses = await Promise.all(reportPromises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data.summary).toBeDefined();
      });
    });

    it('should cache frequent report requests', async () => {
      // First request
      const start1 = Date.now();
      await apiClient.get('/reports/dashboard');
      const duration1 = Date.now() - start1;

      await testUtils.wait(100);

      // Second request (should be faster due to caching)
      const start2 = Date.now();
      await apiClient.get('/reports/dashboard');
      const duration2 = Date.now() - start2;

      // Second request should be significantly faster (cached)
      expect(duration2).toBeLessThan(duration1 * 0.8);
    });
  });

  describe('Access Control', () => {
    it('should restrict sensitive reports to authorized users', async () => {
      // Login as operator (limited access)
      const operatorToken = await testUtils.auth.loginTestUser('operator');
      testUtils.auth.setAuthHeader(operatorToken);

      await expect(
        apiClient.get('/reports/revenue')
      ).rejects.toMatchObject({
        response: {
          status: 403,
          data: {
            detail: expect.stringMatching(/permission|access/i)
          }
        }
      });
    });

    it('should allow managers to access all reports', async () => {
      const managerToken = await testUtils.auth.loginTestUser('manager');
      testUtils.auth.setAuthHeader(managerToken);

      const endpoints = [
        '/reports/dashboard',
        '/reports/revenue',
        '/reports/occupancy',
        '/reports/performance'
      ];

      for (const endpoint of endpoints) {
        const response = await apiClient.get(endpoint);
        expect(response.status).toBe(200);
      }
    });
  });
});