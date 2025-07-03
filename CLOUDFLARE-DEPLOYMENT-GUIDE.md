# Cloudflare Deployment Guide for 1M+ ops/sec

## Quick Start

### 1. Install Wrangler CLI
```bash
npm install -g wrangler
wrangler login
```

### 2. Create KV Namespace
```bash
wrangler kv:namespace create "SSS_AUTH_CACHE"
wrangler kv:namespace create "SSS_AUTH_CACHE" --preview
```

### 3. Deploy Worker
```bash
cd cloudflare
wrangler publish
```

### 4. Test Performance
```bash
node performance-test.js
```

## Architecture for 1M+ ops/sec

### Edge Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare Global Network                │
│                                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │ London  │  │Manchester│  │Edinburgh│  │ Dublin  │  ...   │
│  │ 3 DCs   │  │  2 DCs   │  │  1 DC   │  │  2 DCs  │       │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘       │
│       │            │            │            │              │
│       └────────────┴────────────┴────────────┘              │
│                         │                                    │
│                    Workers KV                                │
│                  (Global Cache)                              │
│                         │                                    │
└─────────────────────────┼────────────────────────────────────┘
                          │
                     Origin Servers
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
   Equinix LD8                        Equinix MA3
   (London)                          (Manchester)
```

### Cloudflare Configuration

#### 1. Page Rules for Performance
```
# Cache Everything for GET requests
URL: sss.gov.uk/api/v1/health*
- Cache Level: Cache Everything
- Edge Cache TTL: 1 hour

# Bypass Cache for POST
URL: sss.gov.uk/api/v1/*
- Cache Level: Bypass
- Origin Cache Control: On
```

#### 2. Transform Rules
```javascript
// Add security headers
Response Headers:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Strict-Transport-Security: max-age=31536000

// Remove sensitive headers
- Remove: X-Powered-By
- Remove: Server
```

#### 3. Rate Limiting Rules
```yaml
Expression: (http.request.uri.path contains "/api/v1/authenticate")
Action: Block
Threshold: 10000 requests per 10 seconds per IP
```

#### 4. Workers Configuration
```javascript
// wrangler.toml updates for production
[env.production]
workers_dev = false
route = { pattern = "sss.gov.uk/api/*", zone_name = "sss.gov.uk" }

# Increase limits
compatibility_flags = ["nodejs_compat"]

# KV namespaces
kv_namespaces = [
  { binding = "AUTH_CACHE", id = "xxx", preview_id = "yyy" },
  { binding = "TOKEN_CACHE", id = "aaa", preview_id = "bbb" },
  { binding = "THREAT_CACHE", id = "ccc", preview_id = "ddd" }
]

# Durable Objects
[[durable_objects.bindings]]
name = "RATE_LIMITER"
class_name = "RateLimiter"
script_name = "rate-limiter"

[[durable_objects.bindings]]
name = "SESSION_STATE"
class_name = "SessionState"
script_name = "session-state"
```

## Performance Optimizations

### 1. Smart Caching Strategy
```javascript
// Implement cache hierarchy
async function getFromCache(key, env) {
  // L1: In-memory cache (0ms)
  const memory = MEMORY_CACHE.get(key);
  if (memory) return { data: memory, cache: 'L1' };
  
  // L2: Workers KV (1-5ms)
  const kv = await env.AUTH_CACHE.get(key);
  if (kv) {
    MEMORY_CACHE.set(key, kv);
    return { data: kv, cache: 'L2' };
  }
  
  // L3: Origin (10-50ms)
  const origin = await fetchFromOrigin(key);
  if (origin) {
    // Populate all cache levels
    MEMORY_CACHE.set(key, origin);
    await env.AUTH_CACHE.put(key, origin, { expirationTtl: 300 });
    return { data: origin, cache: 'L3' };
  }
  
  return null;
}
```

### 2. Request Coalescing
```javascript
// Prevent cache stampede
const inFlight = new Map();

async function coalesceRequests(key, fetchFn) {
  // Check if request already in flight
  if (inFlight.has(key)) {
    return inFlight.get(key);
  }
  
  // Create new request
  const promise = fetchFn();
  inFlight.set(key, promise);
  
  try {
    const result = await promise;
    return result;
  } finally {
    inFlight.delete(key);
  }
}
```

### 3. Geographic Load Distribution
```javascript
// Route to nearest origin
function selectOrigin(colo) {
  const origins = {
    'LHR': 'https://london.sss.gov.uk',     // London
    'MAN': 'https://manchester.sss.gov.uk', // Manchester
    'EDI': 'https://edinburgh.sss.gov.uk',  // Edinburgh
    'DUB': 'https://dublin.sss.gov.uk'      // Dublin
  };
  
  // Cloudflare colo to origin mapping
  const coloMap = {
    'LHR': 'LHR',
    'LON': 'LHR',
    'MAN': 'MAN',
    'EDI': 'EDI',
    'DUB': 'DUB',
    // Default fallback
    'default': 'LHR'
  };
  
  const region = coloMap[colo] || coloMap.default;
  return origins[region];
}
```

## Monitoring & Analytics

### 1. Real-time Metrics
```javascript
// Track performance metrics
async function trackMetrics(env, metrics) {
  const data = {
    timestamp: Date.now(),
    colo: metrics.colo,
    latency: metrics.latency,
    cache: metrics.cacheHit ? 'HIT' : 'MISS',
    status: metrics.status
  };
  
  // Write to Analytics Engine
  env.METRICS.writeDataPoint(data);
  
  // Aggregate for dashboard
  if (Date.now() % 1000 === 0) {
    const stats = await aggregateStats(env);
    await env.DASHBOARD.put('stats:latest', JSON.stringify(stats));
  }
}
```

### 2. Custom Dashboard
```html
<!-- Real-time dashboard -->
<!DOCTYPE html>
<html>
<head>
  <title>SSS-API Performance Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <h1>SSS-API Global Performance</h1>
  
  <div class="metrics">
    <div class="metric">
      <h2>Current ops/sec</h2>
      <div id="ops-per-sec">0</div>
    </div>
    
    <div class="metric">
      <h2>Global Latency</h2>
      <div id="latency">0ms</div>
    </div>
    
    <div class="metric">
      <h2>Cache Hit Rate</h2>
      <div id="cache-hit">0%</div>
    </div>
  </div>
  
  <canvas id="performance-chart"></canvas>
  
  <script>
    // WebSocket connection to Workers
    const ws = new WebSocket('wss://sss.gov.uk/metrics');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      updateMetrics(data);
    };
    
    function updateMetrics(data) {
      document.getElementById('ops-per-sec').textContent = 
        data.opsPerSec.toLocaleString();
      document.getElementById('latency').textContent = 
        `${data.avgLatency}ms`;
      document.getElementById('cache-hit').textContent = 
        `${data.cacheHitRate}%`;
    }
  </script>
</body>
</html>
```

## Cost Optimization

### 1. Tiered Pricing Strategy
```yaml
Workers Requests:
  First 10M: $0.50/million
  Next 90M: $0.40/million  
  Over 100M: $0.30/million
  
At 1M ops/sec (2.6B/month):
  - First 10M: $5
  - Next 90M: $36
  - Remaining 2.5B: $750
  - Total: ~$791/month

Workers KV:
  Storage: $0.50/GB-month
  Reads: $0.50/million
  Writes: $5.00/million
  
Optimization:
  - Use 5-minute TTL
  - 90% cache hit rate
  - Cost: ~$1,300/month
```

### 2. Free Tier Maximization
```javascript
// Use free tiers effectively
const config = {
  // Workers: 100k requests/day free
  freeWorkerRequests: 100000,
  
  // KV: 100k reads/day free
  freeKVReads: 100000,
  
  // Implement request budgeting
  async handleRequest(request) {
    const today = new Date().toDateString();
    const count = await env.COUNTERS.get(`requests:${today}`) || 0;
    
    if (count < this.freeWorkerRequests) {
      // Use free tier
      return handleNormally(request);
    } else {
      // Switch to paid tier optimizations
      return handleOptimized(request);
    }
  }
};
```

## Security Considerations

### 1. DDoS Protection
```javascript
// Automatic DDoS mitigation
addEventListener('fetch', event => {
  // Cloudflare automatically handles:
  // - Layer 3/4 DDoS attacks
  // - Layer 7 HTTP floods
  // - Amplification attacks
  
  // Add custom rules
  const ip = event.request.headers.get('CF-Connecting-IP');
  if (isBlacklisted(ip)) {
    event.respondWith(new Response('Forbidden', { status: 403 }));
    return;
  }
  
  event.respondWith(handleRequest(event.request));
});
```

### 2. API Authentication
```javascript
// Validate API keys at edge
async function validateAPIKey(request, env) {
  const apiKey = request.headers.get('X-API-Key');
  if (!apiKey) return false;
  
  // Check against KV store
  const keyData = await env.API_KEYS.get(apiKey);
  if (!keyData) return false;
  
  const key = JSON.parse(keyData);
  
  // Check rate limits
  const rateLimitKey = `rate:${apiKey}:${Math.floor(Date.now() / 60000)}`;
  const count = await env.RATE_LIMITS.get(rateLimitKey) || 0;
  
  if (count > key.rateLimit) {
    throw new Error('Rate limit exceeded');
  }
  
  // Increment counter
  await env.RATE_LIMITS.put(rateLimitKey, count + 1, {
    expirationTtl: 60
  });
  
  return true;
}
```

## Deployment Checklist

### Pre-deployment
- [ ] KV namespaces created
- [ ] Environment variables set
- [ ] SSL certificates configured
- [ ] Rate limiting rules defined
- [ ] Monitoring dashboard ready

### Deployment
- [ ] Deploy to staging first
- [ ] Run performance tests
- [ ] Verify cache behavior
- [ ] Check error rates
- [ ] Monitor for 24 hours

### Post-deployment
- [ ] Enable Argo Smart Routing
- [ ] Configure Web Analytics
- [ ] Set up alerts
- [ ] Document runbooks
- [ ] Train operations team

## Support & Resources

### Cloudflare Enterprise Support
- 24/7 phone support
- Dedicated account team
- Architecture reviews
- Performance optimization

### Useful Links
- [Workers Documentation](https://developers.cloudflare.com/workers/)
- [KV Documentation](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [Performance Best Practices](https://developers.cloudflare.com/workers/platform/limits/)
- [UK Region Details](https://www.cloudflare.com/network/uk/)

### Contact
- Enterprise Support: enterprise@cloudflare.com
- UK Team: uk-sales@cloudflare.com
- Technical Issues: support@cloudflare.com