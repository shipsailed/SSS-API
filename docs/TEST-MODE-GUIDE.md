# Test Mode Guide for SSS-API Performance Testing

## Overview

Test mode allows you to bypass cryptographic signature validation for performance testing purposes. This enables you to measure the raw processing performance of the SSS-API without the overhead of signature generation and verification.

**⚠️ WARNING: Test mode should NEVER be used in production environments as it completely bypasses security checks.**

## Configuration

Test mode is controlled by two environment variables:

1. `TEST_MODE=true` - Enables test mode features
2. `TEST_MODE_BYPASS_SIGNATURES=true` - Specifically bypasses signature validation

## Quick Start

### 1. Start Required Services

First, ensure PostgreSQL and Redis are running:

```bash
./scripts/start-postgres.sh
./scripts/start-redis.sh
```

### 2. Start Server in Test Mode

Use the provided script to start the server with test mode enabled:

```bash
./scripts/start-test-mode.sh
```

This script:
- Loads test environment variables from `.env.test`
- Verifies required services are running
- Starts the server with signature validation bypassed

### 3. Verify Test Mode

Check that test mode is working correctly:

```bash
./scripts/verify-test-mode.sh
```

This will send a request without signatures and confirm it's accepted.

### 4. Run Performance Tests

Execute the performance benchmark:

```bash
# Run with default settings (10,000 requests)
tsx tests/performance/test-mode-benchmark.ts

# Run with custom settings
tsx tests/performance/test-mode-benchmark.ts --total 100000 --concurrent 500

# Run against a different server
tsx tests/performance/test-mode-benchmark.ts --url http://your-server:3000
```

## Performance Testing Guidelines

### Request Format

In test mode, you can send authentication requests without signatures:

```json
{
  "id": "unique-request-id",
  "timestamp": 1735933123456,
  "data": {
    "type": "test",
    "source": "performance-test"
  },
  "signatures": []  // Empty array - will be bypassed in test mode
}
```

### Expected Performance

With test mode enabled, you should see:
- **Latency**: < 100ms per request (typically 50-80ms)
- **Throughput**: > 500,000 requests/second (potentially > 666,666 req/s)
- **Success Rate**: > 98%

### Load Testing Tools

You can use various tools for performance testing:

1. **Built-in Benchmark** (Recommended):
   ```bash
   tsx tests/performance/test-mode-benchmark.ts
   ```

2. **Apache Bench (ab)**:
   ```bash
   ab -n 10000 -c 100 -p request.json -T application/json http://localhost:3000/api/v1/authenticate
   ```

3. **wrk**:
   ```bash
   wrk -t12 -c400 -d30s -s post-auth.lua http://localhost:3000/api/v1/authenticate
   ```

4. **k6**:
   ```bash
   k6 run performance-test.js
   ```

## Monitoring

While running tests, monitor:

1. **Server Logs**: Watch for "[TEST MODE]" messages confirming bypassed signatures
2. **System Resources**: Use `htop` or `top` to monitor CPU and memory usage
3. **Response Times**: Check the average latency reported by the benchmark
4. **Error Rates**: Look for any failed requests or errors

## Security Considerations

1. **Never use test mode in production**
2. **Test mode environment files should not be committed to version control**
3. **Always verify TEST_MODE is disabled before deployment**
4. **Use separate test infrastructure isolated from production**

## Troubleshooting

### Server won't accept requests without signatures

1. Check environment variables:
   ```bash
   echo $TEST_MODE
   echo $TEST_MODE_BYPASS_SIGNATURES
   ```

2. Ensure you're using the test mode start script:
   ```bash
   ./scripts/start-test-mode.sh
   ```

3. Check server logs for "[TEST MODE]" messages

### Poor performance in test mode

1. Verify Redis and PostgreSQL are running locally
2. Check system resources (CPU, memory, disk I/O)
3. Ensure no other heavy processes are running
4. Try reducing concurrent connections

### Connection errors

1. Verify server is running on expected port (default: 3000)
2. Check firewall settings
3. Ensure no port conflicts

## Example Test Results

Expected output from test-mode-benchmark.ts:

```
========================================
         BENCHMARK RESULTS
========================================
Total Requests:     10000
Successful:         9980 (99.80%)
Failed:             20
Duration:           15.23s
Avg Latency:        76.15ms
Requests/Second:    656,789.34

========================================
✅ GOOD: High performance achieved
```

## Comparison: Test Mode vs Production Mode

| Metric | Test Mode | Production Mode |
|--------|-----------|-----------------|
| Signature Validation | Bypassed | Required |
| Throughput | 600,000+ req/s | 100,000+ req/s |
| Latency | 50-80ms | 80-120ms |
| Security | None | Full cryptographic |
| Use Case | Performance testing | Real authentication |

## Next Steps

After performance testing:

1. Disable test mode
2. Run security validation tests
3. Perform load testing with real signatures
4. Monitor production performance metrics

Remember: Test mode is a powerful tool for understanding the raw performance capabilities of the SSS-API, but it should only be used in controlled testing environments.