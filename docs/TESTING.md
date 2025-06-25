# Testing Documentation

## Overview

This document describes the comprehensive testing strategy for the Airport DB application, with a focus on the Redis cache layer implementation.

## Test Structure

```
src/server/services/__tests__/
├── airportCacheFallback.test.ts    # Fallback mechanism tests
├── airportCacheIntegration.test.ts # Integration tests with real Redis
├── cachePerformance.test.ts        # Load and performance tests
├── cacheSecurity.test.ts           # Security and compliance tests
├── circuitBreaker.test.ts          # Circuit breaker pattern tests
├── inMemoryCache.test.ts           # In-memory cache tests
├── redis-security.test.ts          # Redis security configuration tests
└── testRunner.ts                   # Test suite orchestrator
```

## Running Tests

### Local Development

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage

# Run specific test suites
pnpm test:unit
pnpm test:integration
pnpm test:performance
pnpm test:security
```

### Using Docker Compose

```bash
# Run all tests in containers
docker compose -f docker-compose.test.yml up

# Run performance tests
docker compose -f docker-compose.test.yml --profile performance up

# Run security tests
docker compose -f docker-compose.test.yml --profile security up
```

### Using Test Containers

Integration tests automatically spin up Redis containers using `@testcontainers/redis`. No manual setup required.

## Test Categories

### 1. Unit Tests

Tests individual components in isolation with mocked dependencies.

**Coverage:**
- Cache operations (get, set, invalidate)
- Circuit breaker state transitions
- In-memory cache LRU eviction
- Concurrency control mechanisms
- Secrets management

**Example:**
```typescript
describe('AirportCache', () => {
  it('should return cached data on second call', async () => {
    await airportCache.set('LAX', mockAirport, 3600)
    const result = await airportCache.get('LAX')
    expect(result?.source).toBe('cache')
  })
})
```

### 2. Integration Tests

Tests the cache layer with real Redis instances using test containers.

**Coverage:**
- End-to-end cache operations
- TTL expiration
- Concurrent operations
- Two-level caching
- Fallback scenarios
- Data integrity

**Key Features:**
- Automatic Redis container provisioning
- Isolated test environments
- Real network conditions

### 3. Performance Tests

Validates performance requirements using autocannon for load testing.

**Metrics:**
- Throughput (requests/second)
- Latency (p50, p95, p99)
- Error rates
- Resource utilization

**Thresholds:**
- Minimum 1000 req/s throughput
- P99 latency < 50ms for cache hits
- Zero errors under normal load

### 4. Security Tests

Ensures the cache layer meets security requirements.

**Coverage:**
- Authentication and ACLs
- TLS/SSL configuration
- Secrets management
- Rate limiting
- Data sanitization
- Audit logging

## CI/CD Integration

### GitHub Actions Workflows

1. **Cache Tests Workflow** (`.github/workflows/cache-tests.yml`)
   - Runs on every PR and push
   - Matrix testing across Node.js and Redis versions
   - Automated coverage reporting
   - Security scanning with Trivy

2. **Main CI/CD Pipeline** (`.github/workflows/ci.yml`)
   - Code quality checks (ESLint, Prettier, TypeScript)
   - Full test suite execution
   - Docker image building
   - Staging deployment
   - Performance checks with Lighthouse
   - Production deployment (with approval)

### Test Reports

Test results are automatically uploaded as artifacts:
- JUnit XML reports for test results
- LCOV coverage reports
- Load test JSON results
- Security scan SARIF reports

## Coverage Requirements

Minimum coverage thresholds:
- Lines: 80%
- Functions: 80%
- Branches: 75%
- Statements: 80%

## Performance Benchmarks

### Cache vs No-Cache Performance

| Metric | Without Cache | With Cache | Improvement |
|--------|--------------|------------|-------------|
| Avg Latency | 100ms | <10ms | 10x+ |
| Throughput | 100 req/s | 1000+ req/s | 10x+ |
| P99 Latency | 200ms | <20ms | 10x+ |

### Load Test Results

Standard load test configuration:
- Connections: 50
- Duration: 30 seconds
- Pipeline: 10

Expected results:
- Average throughput: >1000 req/s
- Average latency: <20ms
- P99 latency: <50ms
- Error rate: <0.1%

## Best Practices

### Writing Tests

1. **Use descriptive test names**
   ```typescript
   it('should handle Redis connection errors gracefully', async () => {})
   ```

2. **Follow AAA pattern**
   - Arrange: Set up test data
   - Act: Execute the operation
   - Assert: Verify the result

3. **Clean up after tests**
   ```typescript
   afterEach(async () => {
     await redisClient.flushall()
   })
   ```

4. **Use test containers for integration tests**
   ```typescript
   const container = await new RedisContainer().start()
   ```

### Debugging Tests

1. **Run single test file**
   ```bash
   pnpm test src/server/services/__tests__/specific.test.ts
   ```

2. **Enable verbose logging**
   ```bash
   DEBUG=* pnpm test
   ```

3. **Use VS Code debugger**
   - Set breakpoints in test files
   - Run "Debug: JavaScript Debug Terminal"
   - Execute test command

## Troubleshooting

### Common Issues

1. **Test containers timeout**
   - Increase startup timeout in test
   - Check Docker daemon is running
   - Ensure sufficient system resources

2. **Coverage not generated**
   - Run `pnpm test:coverage`
   - Check vitest.config.ts coverage settings
   - Ensure c8 is installed

3. **Redis connection errors**
   - Verify Redis is running
   - Check connection string
   - Confirm firewall settings

### Environment Variables

Required for tests:
```env
NODE_ENV=test
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=testpassword (if using auth)
```

## Maintenance

### Adding New Tests

1. Create test file in `__tests__` directory
2. Follow existing naming conventions
3. Update this documentation
4. Ensure CI/CD workflow includes new tests

### Updating Dependencies

```bash
# Update test dependencies
pnpm update @testcontainers/redis vitest @testing-library/react

# Run tests to verify
pnpm test
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testcontainers Documentation](https://testcontainers.com/)
- [Autocannon Documentation](https://github.com/mcollina/autocannon)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)