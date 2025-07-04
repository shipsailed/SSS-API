# SSS-API Versioning Strategy

## Overview
This document defines the versioning strategy for the SSS-API to ensure backward compatibility while enabling continuous improvement.

## Versioning Scheme

### URL-Based Versioning
All APIs use URL path versioning:
```
https://api.sss.gov.uk/v1/authenticate
https://api.sss.gov.uk/v2/authenticate
```

### Version Format
- **Major Version**: Breaking changes (v1, v2, v3)
- **Minor Version**: New features, backward compatible
- **Patch Version**: Bug fixes, performance improvements

## Versioning Rules

### 1. Breaking Changes
A new major version is required for:
- Removing endpoints
- Changing required parameters
- Modifying response structure
- Changing authentication methods
- Altering error codes/formats

### 2. Non-Breaking Changes
Can be added to existing version:
- New optional parameters
- Additional response fields
- New endpoints
- Performance improvements
- Bug fixes

## Version Lifecycle

### Support Timeline
```
Active Support:     2 years
Security Updates:   1 year
Deprecation Notice: 6 months
Total Lifetime:     3 years
```

### Deprecation Process
1. **Announcement**: 6 months before deprecation
2. **Warning Headers**: Add deprecation headers
3. **Migration Guide**: Provide detailed migration documentation
4. **Grace Period**: 3 months with both versions active
5. **Sunset**: Old version removed

## Implementation

### Version Management Code
```typescript
// src/middleware/versioning.ts
export const versionMiddleware = (minVersion: string, maxVersion?: string) => {
  return (req: FastifyRequest, reply: FastifyReply, done: Function) => {
    const requestedVersion = req.url.match(/\/v(\d+)\//)?.[1] || '1';
    const version = parseInt(requestedVersion);
    const min = parseInt(minVersion);
    const max = maxVersion ? parseInt(maxVersion) : Infinity;
    
    if (version < min || version > max) {
      reply.code(400).send({
        error: 'Invalid API Version',
        message: `Version ${requestedVersion} is not supported. Use v${min} to v${max}.`,
        supportedVersions: [`v${min}`, max !== Infinity ? `v${max}` : undefined].filter(Boolean)
      });
      return;
    }
    
    // Add version info to request
    req.apiVersion = version;
    
    // Add deprecation warning if needed
    if (version < CURRENT_VERSION) {
      reply.header('Deprecation', 'true');
      reply.header('Sunset', new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toUTCString());
      reply.header('Link', `</v${CURRENT_VERSION}${req.url.substring(3)}>; rel="successor-version"`);
    }
    
    done();
  };
};
```

### Version-Specific Routing
```typescript
// Route registration with versioning
app.register(v1Routes, { prefix: '/v1' });
app.register(v2Routes, { prefix: '/v2' });

// Conditional logic based on version
app.post('/v:version/authenticate', versionMiddleware('1', '2'), async (req, reply) => {
  if (req.apiVersion === 1) {
    // v1 logic
    return handleAuthV1(req, reply);
  } else if (req.apiVersion === 2) {
    // v2 logic with enhanced features
    return handleAuthV2(req, reply);
  }
});
```

## Client Migration

### Migration Headers
```http
Deprecation: true
Sunset: Sat, 31 Dec 2025 23:59:59 GMT
Link: </v2/authenticate>; rel="successor-version"
Warning: 299 - "Version 1 will be deprecated on 2025-12-31"
```

### Client SDK Versioning
```typescript
// Client SDK with version selection
const sssClient = new SSSAPIClient({
  apiKey: 'your-key',
  version: 'v2', // Explicit version
  fallbackVersion: 'v1' // Automatic fallback
});

// SDK handles version negotiation
try {
  const result = await sssClient.authenticate(credentials);
} catch (error) {
  if (error.code === 'VERSION_NOT_SUPPORTED') {
    // Automatic retry with fallback version
  }
}
```

## Version Documentation

### API Documentation Structure
```
/docs
  /v1
    - overview.md
    - authentication.md
    - endpoints/
  /v2
    - overview.md
    - authentication.md
    - endpoints/
    - migration-from-v1.md
```

### OpenAPI Specifications
```yaml
# openapi-v1.yaml
openapi: 3.0.0
info:
  title: SSS-API
  version: 1.0.0
  x-api-lifecycle:
    status: deprecated
    sunset: "2025-12-31"
    successor: "https://api.sss.gov.uk/v2"

# openapi-v2.yaml
openapi: 3.0.0
info:
  title: SSS-API
  version: 2.0.0
  x-api-lifecycle:
    status: active
    released: "2025-01-01"
```

## Testing Strategy

### Version Compatibility Tests
```typescript
describe('API Version Compatibility', () => {
  test('v1 endpoints remain functional', async () => {
    const response = await request('/v1/authenticate', v1Payload);
    expect(response.status).toBe(200);
    expect(response.body).toMatchSchema(v1Schema);
  });
  
  test('v2 accepts v1 payloads', async () => {
    const response = await request('/v2/authenticate', v1Payload);
    expect(response.status).toBe(200);
  });
  
  test('Deprecation headers present for v1', async () => {
    const response = await request('/v1/authenticate', v1Payload);
    expect(response.headers.deprecation).toBe('true');
    expect(response.headers.sunset).toBeDefined();
  });
});
```

## Monitoring

### Version Usage Metrics
- Track API calls by version
- Monitor deprecation warning acknowledgments
- Alert on high usage of deprecated versions
- Report on migration progress

### Dashboards
```
Version Distribution:
- v1: 25% (declining)
- v2: 75% (growing)

Migration Status:
- Total Clients: 1,234
- Migrated: 926 (75%)
- Pending: 308 (25%)
```

## Communication

### Channels
1. **API Status Page**: status.sss-api.gov.uk
2. **Developer Newsletter**: Monthly updates
3. **In-API Notices**: Response headers
4. **SDK Warnings**: Console warnings in SDKs
5. **Direct Outreach**: For major clients

### Timeline Example
```
2025-01-01: v2 Released
2025-07-01: v1 Deprecation Announced
2026-01-01: v1 Enters Security-Only Support
2026-07-01: v1 End-of-Life Warning
2027-01-01: v1 Sunset
```

This versioning strategy ensures smooth transitions while maintaining service reliability and giving clients ample time to migrate.