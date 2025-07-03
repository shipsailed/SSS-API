#!/usr/bin/env tsx

import cluster from 'cluster';
import { cpus } from 'os';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const numCPUs = cpus().length;

if (cluster.isPrimary) {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║             SSS-API CLUSTER MODE                          ║
║                                                           ║
║  Primary ${process.pid} is starting ${numCPUs} workers              ║
║  Target: 666,666 ops/sec                                  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork();
    console.log(`🚀 Starting worker ${i + 1}/${numCPUs} (PID: ${worker.process.pid})`);
  }

  let activeWorkers = numCPUs;

  cluster.on('exit', (worker, code, signal) => {
    console.log(`⚠️  Worker ${worker.process.pid} died (${signal || code})`);
    activeWorkers--;
    
    // Restart worker after 1 second
    setTimeout(() => {
      console.log('🔄 Restarting worker...');
      cluster.fork();
      activeWorkers++;
    }, 1000);
  });

  // Performance monitoring
  setInterval(() => {
    const workers = Object.values(cluster.workers || {});
    console.log(`\n📊 Cluster Status: ${workers.length} active workers`);
    
    // Calculate theoretical max ops/sec
    const singleWorkerOps = 3338; // Based on your test
    const theoreticalOps = singleWorkerOps * workers.length;
    console.log(`💪 Theoretical capacity: ${theoreticalOps.toLocaleString()} ops/sec`);
    console.log(`🎯 Target: 666,666 ops/sec (${Math.round(theoreticalOps / 666666 * 100)}%)`);
  }, 30000); // Every 30 seconds

} else {
  // Workers will execute the main server
  console.log(`Worker ${process.pid} started`);
  
  // Set production optimizations
  process.env.NODE_ENV = 'production';
  process.env.CLUSTER_WORKER_ID = cluster.worker?.id.toString();
  
  // Import and start the server
  import('./index.js');
}