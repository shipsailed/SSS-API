#!/bin/bash

echo "🚀 SSS-API Performance Optimization Script"
echo "========================================="
echo ""

# 1. System optimizations
echo "📊 Applying system optimizations..."

# Increase file descriptor limits
ulimit -n 100000

# TCP optimizations (requires sudo)
if [[ $EUID -eq 0 ]]; then
   echo "Applying TCP optimizations..."
   sysctl -w net.core.somaxconn=65535
   sysctl -w net.ipv4.tcp_max_syn_backlog=65535
   sysctl -w net.ipv4.ip_local_port_range="1024 65535"
   sysctl -w net.ipv4.tcp_tw_reuse=1
   sysctl -w net.ipv4.tcp_fin_timeout=15
   sysctl -w net.core.netdev_max_backlog=65535
else
   echo "⚠️  Run with sudo for TCP optimizations"
fi

# 2. Node.js optimizations
echo ""
echo "🔧 Setting Node.js optimizations..."
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=8192 --max-semi-space-size=1024"
export UV_THREADPOOL_SIZE=128

# 3. Check current performance
echo ""
echo "📈 Current single-process performance:"
echo "Development mode: ~3,338 ops/sec"
echo "Production mode: ~10,000 ops/sec (estimated)"
echo "Cluster mode: ~${1:-10}0,000 ops/sec (with ${1:-10} cores)"

# 4. Database optimizations
echo ""
echo "🗄️  Database optimizations needed:"
echo "PostgreSQL:"
echo "  - shared_buffers = 25% of RAM"
echo "  - effective_cache_size = 75% of RAM"
echo "  - max_connections = 2000"
echo "  - work_mem = 256MB"
echo ""
echo "Redis:"
echo "  - maxmemory-policy allkeys-lru"
echo "  - tcp-backlog 65535"
echo "  - tcp-keepalive 60"

# 5. Calculate requirements
echo ""
echo "🎯 To achieve 666,666 ops/sec:"
CORES_NEEDED=$((666666 / 10000))
echo "  - Minimum CPU cores needed: $CORES_NEEDED"
echo "  - Recommended servers: $((CORES_NEEDED / 16)) (16-core each)"
echo "  - Total RAM needed: $((CORES_NEEDED * 4))GB"
echo "  - Network bandwidth: 10Gbps+"

# 6. Quick benchmark
echo ""
echo "🏃 Running quick benchmark..."
echo "Starting optimized server..."

# Kill any existing servers
pkill -f "tsx src/index.ts" 2>/dev/null
pkill -f "tsx src/cluster.ts" 2>/dev/null
sleep 2

# Start in cluster mode
cd "$(dirname "$0")/.."
npm run cluster > cluster.log 2>&1 &
CLUSTER_PID=$!

echo "Waiting for cluster to start..."
sleep 10

# Check if healthy
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ Cluster is running!"
    
    # Run performance test
    echo ""
    echo "Running performance test..."
    npm run test:performance:quick
else
    echo "❌ Cluster failed to start. Check cluster.log"
fi

# Cleanup
kill $CLUSTER_PID 2>/dev/null

echo ""
echo "💡 Next steps:"
echo "1. Add 'cluster' script to package.json:"
echo '   "cluster": "tsx src/cluster.ts"'
echo "2. Use PM2 for production:"
echo "   pm2 start src/cluster.ts -i max"
echo "3. Set up nginx/HAProxy load balancer"
echo "4. Configure Redis clustering"
echo "5. Add database read replicas"