# 🚀 Deploy SSS-API Live Demo - Step by Step

## Quick Start (Get Live in 1 Hour)

### Option 1: Cloudflare Workers (Recommended - Fastest)

#### Step 1: Prepare for Cloudflare
```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Initialize project
cd /Volumes/My\ Passport/SSS-API
wrangler init sss-api-demo
```

#### Step 2: Create Edge-Optimized Version
```typescript
// cloudflare/worker-demo.js
import { Stage1ValidationService } from '../src/stage1/index.js';

export default {
  async fetch(request, env, ctx) {
    // Initialize with KV storage instead of PostgreSQL
    const stage1 = new Stage1ValidationService({
      storage: env.KV_NAMESPACE,
      cache: caches.default
    });

    const url = new URL(request.url);
    
    // Demo endpoints
    if (url.pathname === '/api/v1/nhs/emergency/triage') {
      const body = await request.json();
      const start = Date.now();
      
      // Simulate triage logic
      const result = {
        priority: body.symptoms?.includes('chest pain') ? 'IMMEDIATE' : 'URGENT',
        triageCategory: body.symptoms?.includes('chest pain') ? 1 : 2,
        estimatedWaitMinutes: body.symptoms?.includes('chest pain') ? 0 : 30,
        assignedBay: `Bay ${Math.floor(Math.random() * 10) + 1}`,
        assignedClinician: `Dr. ${['Smith', 'Jones', 'Brown'][Math.floor(Math.random() * 3)]}`,
        responseTime: `${Date.now() - start}ms`
      };
      
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Add more demo endpoints...
    
    return new Response('SSS-API Demo - Visit /api/v1/nhs/emergency/triage', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};
```

#### Step 3: Deploy to Cloudflare
```bash
# Create wrangler.toml
cat > wrangler.toml << EOF
name = "sss-api-demo"
main = "cloudflare/worker-demo.js"
compatibility_date = "2023-10-01"
node_compat = true

[vars]
ENVIRONMENT = "demo"

[[kv_namespaces]]
binding = "KV_NAMESPACE"
id = "your-kv-namespace-id"

[site]
bucket = "./public"
EOF

# Deploy
wrangler publish

# Your API is now live at:
# https://sss-api-demo.{your-subdomain}.workers.dev
```

### Option 2: AWS Quick Deploy

#### Step 1: Use AWS Amplify for Instant Deploy
```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Configure AWS
amplify configure

# Initialize Amplify project
amplify init
# Choose:
# - Name: sss-api-demo
# - Environment: demo
# - Default editor: Visual Studio Code
# - App type: javascript
# - Framework: none
# - Source: src
# - Distribution: dist
# - Build: npm run build
# - Start: npm start

# Add hosting
amplify add hosting
# Choose: Hosting with Amplify Console
# Choose: Continuous deployment (Git)

# Deploy
amplify publish
```

#### Step 2: Quick Lambda Functions
```javascript
// amplify/backend/function/sssApiDemo/src/index.js
const { Stage1ValidationService } = require('./stage1');

exports.handler = async (event) => {
  const stage1 = new Stage1ValidationService();
  
  const path = event.path;
  const body = JSON.parse(event.body || '{}');
  
  if (path === '/api/v1/nhs/emergency/triage') {
    const result = await stage1.processTriage(body);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    };
  }
  
  return {
    statusCode: 404,
    body: JSON.stringify({ error: 'Not found' })
  };
};
```

### Option 3: Heroku One-Click Deploy

#### Step 1: Prepare for Heroku
```bash
# Create app.json for one-click deploy
cat > app.json << EOF
{
  "name": "SSS-API Demo",
  "description": "Revolutionary UK Government API System",
  "repository": "https://github.com/yourusername/sss-api",
  "keywords": ["government", "api", "quantum-resistant"],
  "addons": [
    "heroku-postgresql:hobby-dev",
    "heroku-redis:hobby-dev"
  ],
  "env": {
    "NODE_ENV": {
      "value": "production"
    },
    "DEMO_MODE": {
      "value": "true"
    }
  },
  "formation": {
    "web": {
      "quantity": 1,
      "size": "standard-1x"
    }
  }
}
EOF

# Create Procfile
echo "web: npm start" > Procfile

# Initialize git and Heroku
git init
heroku create sss-api-demo-uk
git add .
git commit -m "Initial demo deployment"
git push heroku main

# Your demo is live at:
# https://sss-api-demo-uk.herokuapp.com
```

---

## 🎯 Production-Grade Demo (1-2 Days)

### Architecture
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Cloudflare    │────▶│   Load Balancer │────▶│   Kubernetes    │
│   Workers (CDN) │     │   (AWS ALB)     │     │   (EKS/GKE)    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                                │
         │                                                │
         ▼                                                ▼
┌─────────────────┐                            ┌─────────────────┐
│                 │                            │                 │
│   KV Storage    │                            │   PostgreSQL    │
│   (Edge Cache)  │                            │   (RDS/Cloud)   │
│                 │                            │                 │
└─────────────────┘                            └─────────────────┘
```

### Step 1: Set Up Kubernetes Cluster

#### Option A: AWS EKS
```bash
# Install eksctl
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin

# Create cluster
eksctl create cluster \
  --name sss-api-demo \
  --region eu-west-2 \
  --nodegroup-name standard-workers \
  --node-type t3.xlarge \
  --nodes 7 \
  --nodes-min 7 \
  --nodes-max 21 \
  --managed

# Update kubeconfig
aws eks update-kubeconfig --name sss-api-demo --region eu-west-2
```

#### Option B: Google GKE
```bash
# Create cluster
gcloud container clusters create sss-api-demo \
  --zone europe-west2-a \
  --num-nodes 7 \
  --machine-type n1-standard-4 \
  --enable-autoscaling \
  --min-nodes 7 \
  --max-nodes 21

# Get credentials
gcloud container clusters get-credentials sss-api-demo --zone europe-west2-a
```

### Step 2: Deploy to Kubernetes
```bash
# Create namespace
kubectl create namespace sss-api-demo

# Create secrets
kubectl create secret generic sss-api-secrets \
  --from-literal=database-url='postgresql://user:pass@host:5432/db' \
  --from-literal=redis-url='redis://host:6379' \
  -n sss-api-demo

# Apply configurations
kubectl apply -f kubernetes/ -n sss-api-demo

# Check deployment
kubectl get pods -n sss-api-demo
kubectl get services -n sss-api-demo
```

### Step 3: Set Up Monitoring
```bash
# Install Prometheus and Grafana
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts

helm install prometheus prometheus-community/kube-prometheus-stack \
  -n sss-api-demo \
  --set grafana.enabled=true \
  --set grafana.adminPassword='StrongPassword123!'

# Get Grafana URL
kubectl get svc -n sss-api-demo prometheus-grafana

# Port forward for access
kubectl port-forward -n sss-api-demo svc/prometheus-grafana 3000:80
```

### Step 4: Set Up Auto-Scaling
```yaml
# kubernetes/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: sss-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: sss-api-deployment
  minReplicas: 7
  maxReplicas: 77
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

---

## 🔥 Quick Performance Optimizations

### 1. Enable Cloudflare Caching
```javascript
// cloudflare/cache-rules.js
export default {
  async fetch(request, env, ctx) {
    const cacheUrl = new URL(request.url);
    const cacheKey = new Request(cacheUrl.toString(), request);
    const cache = caches.default;

    // Check cache first
    let response = await cache.match(cacheKey);
    
    if (!response) {
      // Forward to origin
      response = await fetch(request);
      
      // Cache successful responses
      if (response.status === 200) {
        const headers = new Headers(response.headers);
        headers.set('Cache-Control', 'public, max-age=60');
        
        response = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: headers
        });
        
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
      }
    }
    
    return response;
  }
};
```

### 2. Database Connection Pooling
```typescript
// src/infrastructure/database/optimized-pool.ts
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 100, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  statement_timeout: 5000,
  query_timeout: 5000,
  ssl: {
    rejectUnauthorized: false
  }
});

// Warm up connections
export async function warmUpPool() {
  const clients = await Promise.all(
    Array(20).fill(0).map(() => pool.connect())
  );
  
  // Test each connection
  await Promise.all(
    clients.map(client => 
      client.query('SELECT 1').finally(() => client.release())
    )
  );
}
```

### 3. Redis Optimization
```typescript
// src/infrastructure/cache/redis-cluster.ts
import { createCluster } from 'redis';

const cluster = createCluster({
  rootNodes: [
    { url: 'redis://node1:6379' },
    { url: 'redis://node2:6379' },
    { url: 'redis://node3:6379' }
  ],
  defaults: {
    socket: {
      connectTimeout: 5000,
      keepAlive: 30000
    }
  }
});

cluster.on('error', (err) => console.error('Redis Cluster Error', err));

await cluster.connect();
```

---

## 📊 Demo Dashboard

### Create Live Metrics Page
```html
<!-- public/dashboard.html -->
<!DOCTYPE html>
<html>
<head>
  <title>SSS-API Live Demo Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .metric { 
      display: inline-block; 
      margin: 10px; 
      padding: 20px; 
      background: #f0f0f0; 
      border-radius: 10px;
    }
    .metric h2 { margin: 0; font-size: 48px; color: #2ecc71; }
    .metric p { margin: 0; color: #666; }
  </style>
</head>
<body>
  <h1>SSS-API Live Performance</h1>
  
  <div class="metrics">
    <div class="metric">
      <h2 id="rps">0</h2>
      <p>Requests/Second</p>
    </div>
    <div class="metric">
      <h2 id="latency">0ms</h2>
      <p>Average Latency</p>
    </div>
    <div class="metric">
      <h2 id="uptime">100%</h2>
      <p>Uptime</p>
    </div>
    <div class="metric">
      <h2 id="saved">£0</h2>
      <p>Money Saved Today</p>
    </div>
  </div>
  
  <canvas id="chart" width="800" height="400"></canvas>
  
  <script>
    // Real-time updates
    async function updateMetrics() {
      const response = await fetch('/api/metrics');
      const data = await response.json();
      
      document.getElementById('rps').textContent = data.requestsPerSecond.toLocaleString();
      document.getElementById('latency').textContent = data.averageLatency + 'ms';
      document.getElementById('uptime').textContent = data.uptime + '%';
      document.getElementById('saved').textContent = '£' + data.moneySaved.toLocaleString();
      
      // Update chart
      chart.data.labels.push(new Date().toLocaleTimeString());
      chart.data.datasets[0].data.push(data.requestsPerSecond);
      
      if (chart.data.labels.length > 50) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
      }
      
      chart.update();
    }
    
    // Initialize chart
    const ctx = document.getElementById('chart').getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Requests per Second',
          data: [],
          borderColor: '#2ecc71',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
    
    // Update every second
    setInterval(updateMetrics, 1000);
  </script>
</body>
</html>
```

---

## 🚨 Demo Day Checklist

### Before Demo
- [ ] Test all endpoints
- [ ] Warm up caches
- [ ] Check monitoring
- [ ] Prepare backup demo
- [ ] Test screen sharing
- [ ] Charge laptop
- [ ] Test internet connection

### During Demo
- [ ] Show live dashboard
- [ ] Run stress test live
- [ ] Show code if asked
- [ ] Keep energy high
- [ ] Address concerns immediately

### After Demo
- [ ] Send thank you email
- [ ] Share demo recording
- [ ] Provide access credentials
- [ ] Schedule follow-up

---

## 🔑 Demo URLs

Once deployed, your demo will be available at:

**Cloudflare Workers**:
```
Main API: https://sss-api-demo.{your-subdomain}.workers.dev
Dashboard: https://sss-api-demo.{your-subdomain}.workers.dev/dashboard
Metrics: https://sss-api-demo.{your-subdomain}.workers.dev/metrics
```

**AWS**:
```
Main API: https://sss-api-demo.execute-api.eu-west-2.amazonaws.com
Dashboard: https://sss-api-demo.amplifyapp.com
```

**Custom Domain**:
```
Main API: https://demo.sss-api.gov.uk
Dashboard: https://dashboard.sss-api.gov.uk
Docs: https://docs.sss-api.gov.uk
```

---

## 💡 Pro Tips

1. **Start with Cloudflare Workers** - It's the fastest to deploy and scales automatically
2. **Use mock data for demos** - Don't connect to real government systems
3. **Have a backup** - Record a video demo in case live fails
4. **Monitor everything** - They'll ask about performance under load
5. **Keep it simple** - Don't over-engineer the demo

---

## 🆘 Troubleshooting

### "Connection refused"
```bash
# Check if services are running
kubectl get pods -n sss-api-demo
kubectl logs -n sss-api-demo deployment/sss-api-deployment

# Restart if needed
kubectl rollout restart deployment/sss-api-deployment -n sss-api-demo
```

### "High latency"
```bash
# Scale up immediately
kubectl scale deployment sss-api-deployment --replicas=21 -n sss-api-demo

# Clear caches
kubectl exec -it sss-api-pod -- redis-cli FLUSHALL
```

### "Out of memory"
```bash
# Increase resources
kubectl set resources deployment/sss-api-deployment \
  --requests=memory=2Gi,cpu=1 \
  --limits=memory=4Gi,cpu=2 \
  -n sss-api-demo
```

---

**Remember**: The demo doesn't need to be perfect. It needs to be IMPRESSIVE.

Show them the future. The rest is details.