# Cloudflare Workers Setup & Deployment Guide

## Overview
This guide walks you through setting up and deploying the SSS-API to Cloudflare Workers for 1M+ ops/sec performance.

## Prerequisites
- Node.js and npm installed
- 1Password CLI configured
- Cloudflare account (Free tier works for testing)

## Step 1: Check 1Password Setup

First, verify that 1Password is configured and contains the necessary secrets:

```bash
# Check if signed in to 1Password
op account list

# List all items in SSS-API vault
op item list --vault="SSS-API" --format=json | jq -r '.[].title' | sort
```

## Step 2: Add Cloudflare Credentials

Run the setup script to add Cloudflare credentials to 1Password:

```bash
./scripts/setup-cloudflare.sh
```

You'll need:
1. **Cloudflare API Token**: Create at https://dash.cloudflare.com/profile/api-tokens
   - Required permissions:
     - Account: Cloudflare Workers Scripts:Edit
     - Account: Workers KV Storage:Edit
     - Account: Workers R2 Storage:Edit
     - Zone: Zone:Read
     - Zone: DNS:Read

2. **Account ID**: Found in the Cloudflare dashboard under any domain
3. **Zone ID**: Found in the domain overview page (only needed for custom domains)

## Step 3: Deploy to Cloudflare

Run the deployment script:

```bash
./scripts/deploy-cloudflare.sh
```

This will:
1. Load credentials from 1Password
2. Create KV namespaces for caching
3. Update wrangler.toml with namespace IDs
4. Deploy the worker to development environment

## Step 4: Test the Deployment

Once deployed, test the worker:

```bash
# Get your worker URL from the deployment output
# Format: https://sss-api-edge.{your-subdomain}.workers.dev

# Run performance tests
./scripts/test-cloudflare-performance.sh https://sss-api-edge.{your-subdomain}.workers.dev
```

## Step 5: Monitor Performance

### Real-time Monitoring
1. Go to Cloudflare Dashboard > Workers & Pages
2. Click on your worker (sss-api-edge)
3. View real-time metrics and logs

### Custom Performance Test
```bash
cd cloudflare
node performance-test.js
```

## Step 6: Deploy to Production

After testing in development:

```bash
cd cloudflare

# Deploy to staging
wrangler deploy --env staging

# Deploy to production
wrangler deploy --env production
```

## Step 7: Add Worker Secrets

Add sensitive data as encrypted environment variables:

```bash
# Add secrets from 1Password
cd cloudflare

# Get signing key from 1Password
SIGNING_KEY=$(op read "op://SSS-API/sss-api-signing-key/password")
wrangler secret put SIGNING_KEY --env production
# Paste the key when prompted

# Get JWT secret
JWT_SECRET=$(op read "op://SSS-API/sss-api-jwt-secret/password")
wrangler secret put JWT_SECRET --env production
# Paste the secret when prompted
```

## Performance Optimization Tips

### 1. Cache Configuration
- KV read latency: 1-5ms globally
- Set appropriate TTLs (5-15 minutes for auth tokens)
- Use cache coalescing to prevent stampedes

### 2. Geographic Distribution
- Workers run in 300+ cities globally
- Automatic routing to nearest data center
- Sub-3ms latency for most users

### 3. Cost Management
- Monitor usage in Analytics
- Implement request budgeting
- Use tiered caching strategy

## Troubleshooting

### Common Issues

1. **KV Namespace Creation Fails**
   ```bash
   # List existing namespaces
   wrangler kv:namespace list
   
   # Delete and recreate if needed
   wrangler kv:namespace delete --namespace-id <id>
   ```

2. **Deployment Fails**
   ```bash
   # Check wrangler version
   wrangler --version
   
   # Update if needed
   npm install -g wrangler@latest
   ```

3. **Performance Issues**
   - Check cache hit rates in Analytics
   - Verify KV namespace bindings
   - Review Worker CPU time limits

### Debug Commands
```bash
# View worker logs
wrangler tail --env production

# Check KV contents
wrangler kv:key list --namespace-id <your-namespace-id>

# Test specific endpoints
curl -X POST https://your-worker.workers.dev/api/v1/authenticate \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","credentials":"test","biometric":"test","deviceFingerprint":"test_device"}'
```

## Security Checklist

- [ ] API token has minimal required permissions
- [ ] Secrets stored in Wrangler secrets, not code
- [ ] Rate limiting configured
- [ ] CORS headers properly set
- [ ] Input validation on all endpoints
- [ ] Audit logging enabled

## Next Steps

1. **Custom Domain Setup**
   - Add custom domain in Cloudflare
   - Update routes in wrangler.toml
   - Configure SSL/TLS settings

2. **Advanced Features**
   - Enable Argo Smart Routing
   - Set up Workers Analytics Engine
   - Configure Durable Objects for state
   - Implement WebSocket support

3. **Production Readiness**
   - Set up monitoring alerts
   - Create runbooks
   - Plan for disaster recovery
   - Document SLAs

## Support Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [KV Storage Guide](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [Performance Best Practices](https://developers.cloudflare.com/workers/platform/performance/)

## Contact
For issues or questions:
- Cloudflare Support: support@cloudflare.com
- Enterprise Support: enterprise@cloudflare.com