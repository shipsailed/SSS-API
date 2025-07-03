# SSS-API Deployment Guide

## Prerequisites

- Docker & Docker Compose
- Node.js 20+
- 1Password CLI (optional, for secure key management)
- PostgreSQL client tools (optional)
- Redis CLI (optional)

## Quick Start

### 1. Start Infrastructure

```bash
# Start PostgreSQL and Redis
npm run docker:up

# Or using scripts directly
./scripts/start-all.sh
```

### 2. Set Up Environment

```bash
# Copy environment template
cp .env.docker .env

# Edit with your values
nano .env
```

### 3. Initialize Database

```bash
# Database will auto-initialize on first run
# Or manually run schema:
npm run db:setup
```

### 4. Run Application

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

## Docker Commands

### Start Services

```bash
# Start all services
docker compose up -d

# Start specific services
docker compose up -d postgres redis

# Start with logs
docker compose up
```

### Check Status

```bash
# View running containers
docker ps

# Check logs
docker compose logs -f postgres
docker compose logs -f redis

# Health checks
docker exec sss-api-postgres pg_isready
docker exec sss-api-redis redis-cli ping
```

### Database Access

```bash
# PostgreSQL CLI
docker exec -it sss-api-postgres psql -U postgres -d sss_api

# Common queries
SELECT COUNT(*) FROM validation_records;
SELECT * FROM authentication_stats;
SELECT * FROM system_health;
```

### Redis Access

```bash
# Redis CLI (using script)
./scripts/redis-cli.sh

# Or directly
docker exec -it sss-api-redis redis-cli -a redis-secure-password

# Common commands
KEYS sss:*
GET sss:validation:request-123
INFO stats
```

## Production Deployment

### Using Docker Compose

```bash
# Build images
docker compose build

# Deploy with production config
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Using Kubernetes

```bash
# Apply configurations
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/sss-api.yaml
```

## Key Management with 1Password

### Setup

```bash
# Sign in to 1Password
op signin

# Create vault for SSS-API
op vault create SSS-API
```

### Create Keys

```bash
# Generate signing key
op item create --category="API Credential" \
  --title="sss-api-signing-key" \
  --vault="SSS-API" \
  password[password]=$(openssl rand -hex 32)

# Generate encryption key  
op item create --category="API Credential" \
  --title="sss-api-encryption-key" \
  --vault="SSS-API" \
  password[password]=$(openssl rand -base64 32)
```

### Use in Application

The application will automatically use 1Password if available:

```typescript
// Automatic key retrieval
const keyManager = OnePasswordKeyManager.getInstance();
const signingKey = await keyManager.getSigningKey();
```

## Environment Variables

### Required

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sss_api
DB_USER=postgres
DB_PASSWORD=your-secure-password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

### Optional

```bash
# 1Password
OP_VAULT=SSS-API
OP_SERVICE_ACCOUNT_TOKEN=your-token

# Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Consensus
CONSENSUS_NODES=node-1:7001,node-2:7002,node-3:7003
```

## Monitoring

### Metrics Endpoint

```bash
curl http://localhost:3000/api/v1/metrics
```

### Database Stats

```sql
-- View authentication statistics
SELECT * FROM authentication_stats;

-- Check system health
SELECT * FROM system_health;

-- Recent validations
SELECT * FROM validation_records 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Redis Monitoring

```bash
# Memory usage
./scripts/redis-cli.sh INFO memory

# Connected clients
./scripts/redis-cli.sh CLIENT LIST

# Monitor commands
./scripts/redis-cli.sh MONITOR
```

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Test connection
docker exec sss-api-postgres pg_isready

# View logs
docker logs sss-api-postgres
```

### Redis Connection Issues

```bash
# Check if Redis is running
docker ps | grep redis

# Test connection with password
docker exec sss-api-redis redis-cli -a redis-secure-password ping

# View logs
docker logs sss-api-redis
```

### Application Issues

```bash
# Check application logs
npm run dev

# Run with debug logging
LOG_LEVEL=debug npm run dev

# Check TypeScript compilation
npm run typecheck
```

## Security

### Production Checklist

- [ ] Change all default passwords
- [ ] Enable TLS for PostgreSQL
- [ ] Enable TLS for Redis
- [ ] Set up 1Password integration
- [ ] Configure firewall rules
- [ ] Enable audit logging
- [ ] Set up backup procedures
- [ ] Configure monitoring alerts

### Backup

```bash
# Backup PostgreSQL
docker exec sss-api-postgres pg_dump -U postgres sss_api > backup.sql

# Backup Redis
docker exec sss-api-redis redis-cli -a redis-secure-password SAVE
docker cp sss-api-redis:/data/dump.rdb ./redis-backup.rdb
```

## Load Testing

```bash
# Run performance benchmarks
npm run test:performance

# Stress test with Apache Bench
ab -n 10000 -c 100 -p request.json -T application/json \
  http://localhost:3000/api/v1/authenticate
```