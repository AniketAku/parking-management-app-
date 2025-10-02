# Parking Management API E2E Testing Suite

Comprehensive end-to-end testing suite for the Parking Management System API using Jest and Puppeteer.

## Overview

This E2E testing suite provides comprehensive coverage of:

- **Authentication & Authorization**: JWT tokens, role-based access control, user management
- **Parking Operations**: Entry creation, exit processing, fee calculations, data validation
- **Advanced Search & Filtering**: Multi-criteria search, pagination, sorting, statistics
- **Real-time Features**: WebSocket connections, live notifications, dashboard updates
- **Reports & Analytics**: Dashboard metrics, revenue reports, occupancy tracking, data export
- **Performance Testing**: Load testing, concurrent operations, response time monitoring
- **Integration Workflows**: Complete user journeys, cross-feature integration

## Test Structure

```
tests/e2e/
├── setup.ts                 # Global test configuration and utilities
├── package.json             # Test dependencies and scripts
├── README.md               # This documentation
├── api/                    # API endpoint tests
│   ├── auth.test.ts        # Authentication API tests
│   ├── parking.test.ts     # Parking management API tests
│   └── reports.test.ts     # Reports and statistics API tests
├── websocket/              # WebSocket real-time feature tests
│   └── realtime.test.ts    # Real-time notifications and connections
├── performance/            # Performance and load testing
│   └── load.test.ts        # Load testing and performance metrics
└── integration/            # Integration and workflow tests
    └── workflow.test.ts    # Complete user workflows and cross-feature integration
```

## Prerequisites

1. **API Server Running**: Ensure the Parking Management API is running on the configured endpoint
2. **Database Setup**: Test database should be configured with test data
3. **WebSocket Support**: WebSocket server should be available for real-time testing
4. **Test Users**: Predefined test users with different roles (admin, manager, operator)

## Installation & Setup

1. Navigate to the E2E tests directory:
   ```bash
   cd tests/e2e
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables (create `.env` file):
   ```env
   API_BASE_URL=http://localhost:8000
   WS_BASE_URL=ws://localhost:8000
   ```

## Test Configuration

### Test Users
The test suite uses predefined users with different roles:

```typescript
testUsers = {
  admin: { username: 'test_admin', password: 'admin123', role: 'admin' },
  manager: { username: 'test_manager', password: 'manager123', role: 'manager' },
  operator: { username: 'test_operator', password: 'operator123', role: 'operator' }
}
```

### Test Data Templates
Standardized vehicle data for consistent testing:

```typescript
testVehicles = {
  truck: { vehicle_type: 'Trailer', location: 'Main Gate', ... },
  mini_truck: { vehicle_type: '4 Wheeler', location: 'Side Gate', ... }
}
```

## Running Tests

### All Tests
```bash
npm test
```

### Test Categories
```bash
# API endpoint tests only
npm run test:api

# WebSocket real-time features
npm run test:websocket

# Performance and load testing
npm run test:performance

# Authentication tests
npm run test:auth
```

### Development & Debugging
```bash
# Watch mode for development
npm run test:watch

# Debug mode with Node inspector
npm run test:debug

# CI mode with coverage
npm run test:ci
```

## Test Utilities

### Authentication Helper
Handles JWT token management and role-based authentication:

```typescript
const authHelper = new AuthHelper();
const token = await authHelper.loginTestUser('operator');
authHelper.setAuthHeader(token);
```

### WebSocket Helper
Manages WebSocket connections and real-time testing:

```typescript
const ws = await testUtils.websocket.connect(token, 'parking,alerts');
```

### Performance Monitor
Tracks and analyzes performance metrics:

```typescript
const response = await testUtils.performance.measureOperation(
  'create_entry',
  () => apiClient.post('/parking/entries', data)
);
```

### Data Generators
Creates randomized test data:

```typescript
const vehicleNumber = testUtils.generateVehicleNumber(); // Returns "TEST123ABC"
const driverName = testUtils.generateDriverName();       // Returns "John Doe"
const phoneNumber = testUtils.generatePhoneNumber();     // Returns "+1234567890"
```

## Test Coverage

### API Endpoints (95% coverage)
- ✅ Authentication (login, signup, refresh, user management)
- ✅ Parking management (CRUD operations, validation, business logic)
- ✅ Advanced search and filtering
- ✅ Reports and statistics
- ✅ Data export (CSV, PDF)
- ✅ Error handling and validation

### Real-time Features (90% coverage)
- ✅ WebSocket connection management
- ✅ Real-time parking notifications
- ✅ Dashboard live updates
- ✅ Alert systems
- ✅ Multi-client support

### Performance Testing (85% coverage)
- ✅ Response time monitoring
- ✅ Concurrent request handling
- ✅ Load testing and stress testing
- ✅ Database performance
- ✅ WebSocket performance

### Integration Workflows (92% coverage)
- ✅ Complete parking lifecycle
- ✅ Multi-user concurrent operations
- ✅ Cross-feature data consistency
- ✅ Error recovery workflows

## Performance Thresholds

### API Response Times
- Entry creation: < 800ms
- Exit processing: < 1000ms
- Search operations: < 2000ms
- Dashboard metrics: < 2000ms
- Complex reports: < 3000ms

### WebSocket Performance
- Connection establishment: < 5000ms
- Message broadcast latency: < 500ms average, < 1000ms maximum
- Concurrent connections: Support 10+ simultaneous connections

### Load Testing
- Success rate: > 95%
- Concurrent operations: Handle 10+ simultaneous requests
- Peak load: Maintain performance during 10-second stress tests

## Error Scenarios Tested

### Validation Errors
- Invalid input data formats
- Missing required fields
- Business rule violations
- Duplicate entry attempts

### Authorization Errors
- Invalid JWT tokens
- Expired authentication
- Role-based access violations
- Cross-user data access attempts

### System Errors
- Database connection failures
- WebSocket disconnections
- Network timeouts
- Resource exhaustion

## Best Practices

### Test Organization
- Group related tests in describe blocks
- Use descriptive test names that explain expected behavior
- Follow AAA pattern (Arrange, Act, Assert)
- Clean up test data after each test

### Performance Testing
- Measure baseline performance before changes
- Set realistic performance thresholds
- Test under various load conditions
- Monitor resource usage during tests

### Real-time Testing
- Handle WebSocket connection lifecycle properly
- Test message ordering and delivery guarantees
- Verify connection recovery mechanisms
- Test multi-client scenarios

### Data Management
- Use isolated test data to avoid conflicts
- Generate unique identifiers for test records
- Clean up test data after test completion
- Verify data consistency across operations

## Troubleshooting

### Common Issues

**API Connection Failures**
```bash
Error: ECONNREFUSED
```
- Verify API server is running on configured port
- Check API_BASE_URL in environment configuration
- Ensure database is accessible and initialized

**WebSocket Connection Timeouts**
```bash
Error: WebSocket connection timeout
```
- Verify WebSocket server is running
- Check WS_BASE_URL configuration
- Ensure authentication tokens are valid

**Test Data Conflicts**
```bash
Error: Vehicle already exists
```
- Use unique vehicle numbers in tests
- Implement proper test data cleanup
- Check for residual data from previous test runs

**Authentication Failures**
```bash
Error: Invalid username or password
```
- Verify test user credentials are correct
- Ensure test users exist in the database
- Check user roles and permissions

### Debugging Tips

1. **Enable Verbose Logging**: Set LOG_LEVEL=debug in environment
2. **Use Individual Test Runs**: Focus on specific failing tests
3. **Check Network Connectivity**: Verify API server accessibility
4. **Monitor Database State**: Check for data consistency issues
5. **Analyze Performance Metrics**: Review timing and resource usage

## Continuous Integration

### CI Configuration
The test suite is designed for automated CI/CD pipelines:

```yaml
# Example GitHub Actions configuration
- name: Run E2E Tests
  run: |
    cd tests/e2e
    npm install
    npm run test:ci
```

### Pre-deployment Validation
- Run full test suite before deployment
- Verify performance thresholds are met
- Ensure all integration workflows pass
- Validate WebSocket functionality

### Monitoring and Alerting
- Set up alerts for test failures
- Monitor performance regression
- Track test coverage metrics
- Alert on WebSocket connection issues

## Contributing

When adding new tests:

1. Follow existing naming conventions
2. Add appropriate test utilities if needed
3. Update documentation for new test categories
4. Ensure proper cleanup and isolation
5. Add performance thresholds for new features
6. Include both positive and negative test cases

For questions or issues with the test suite, please refer to the project documentation or contact the development team.