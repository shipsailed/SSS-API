#!/usr/bin/env node

/**
 * Real-time Performance Monitoring Dashboard
 * Tracks SSS-API performance against patent claims
 */

import blessed from 'blessed';
import contrib from 'blessed-contrib';
import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const PATENT_TARGETS = {
  stage1: 100,      // <100ms
  stage2: 400,      // <400ms
  endToEnd: 500,    // <500ms
  throughput: 666666 // 666,666+ ops/sec
};

// Create dashboard
const screen = blessed.screen({
  smartCSR: true,
  title: 'SSS-API Performance Monitor'
});

const grid = new contrib.grid({ rows: 12, cols: 12, screen });

// Widgets
const latencyLine = grid.set(0, 0, 4, 8, contrib.line, {
  style: { line: "yellow", text: "green", baseline: "black" },
  label: 'Latency vs Patent Targets (ms)',
  showLegend: true,
  legend: { width: 20 }
});

const throughputGauge = grid.set(0, 8, 2, 4, contrib.gauge, {
  label: 'Throughput (ops/sec)',
  percent: 0,
  stroke: 'green',
  fill: 'white'
});

const successRate = grid.set(2, 8, 2, 4, contrib.gauge, {
  label: 'Success Rate',
  percent: 0,
  stroke: 'green',
  fill: 'white'
});

const log = grid.set(8, 0, 4, 12, contrib.log, {
  fg: "green",
  selectedFg: "green",
  label: 'Performance Alerts'
});

const statsTable = grid.set(4, 0, 4, 6, contrib.table, {
  keys: true,
  fg: 'white',
  selectedFg: 'white',
  selectedBg: 'blue',
  interactive: false,
  label: 'Current Metrics',
  width: '50%',
  height: '30%',
  columnSpacing: 3,
  columnWidth: [20, 15, 15]
});

const heatmap = grid.set(4, 6, 4, 6, contrib.table, {
  keys: true,
  fg: 'white',
  label: 'Geographic Performance',
  columnSpacing: 3,
  columnWidth: [15, 10, 10]
});

// Data storage
const performanceData = {
  stage1: [],
  stage2: [],
  endToEnd: [],
  timestamps: []
};

// Update functions
async function fetchMetrics() {
  try {
    const response = await fetch(`${API_URL}/api/v1/metrics`);
    const data = await response.json();
    return data;
  } catch (error) {
    log.log(`Error fetching metrics: ${error.message}`);
    return null;
  }
}

async function testLatency() {
  const start = Date.now();
  
  try {
    // Test Stage 1
    const authStart = Date.now();
    const authResponse = await fetch(`${API_URL}/api/v1/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        data: { test: true }
      })
    });
    const authTime = Date.now() - authStart;
    
    if (!authResponse.ok) {
      throw new Error('Authentication failed');
    }
    
    const { token } = await authResponse.json();
    
    // Test Stage 2
    const storeStart = Date.now();
    await fetch(`${API_URL}/api/v1/store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        data: { timestamp: Date.now() }
      })
    });
    const storeTime = Date.now() - storeStart;
    
    const totalTime = Date.now() - start;
    
    return {
      stage1: authTime,
      stage2: storeTime,
      total: totalTime,
      success: true
    };
  } catch (error) {
    return {
      stage1: 0,
      stage2: 0,
      total: Date.now() - start,
      success: false,
      error: error.message
    };
  }
}

function updateLatencyChart() {
  const data = {
    title: 'Latency',
    x: performanceData.timestamps.slice(-60),
    y: [
      performanceData.stage1.slice(-60),
      performanceData.stage2.slice(-60),
      performanceData.endToEnd.slice(-60),
      Array(60).fill(PATENT_TARGETS.stage1),
      Array(60).fill(PATENT_TARGETS.stage2),
      Array(60).fill(PATENT_TARGETS.endToEnd)
    ]
  };
  
  latencyLine.setData([
    { title: 'Stage 1', x: data.x, y: data.y[0], style: { line: 'green' } },
    { title: 'Stage 2', x: data.x, y: data.y[1], style: { line: 'yellow' } },
    { title: 'End-to-End', x: data.x, y: data.y[2], style: { line: 'cyan' } },
    { title: 'Target S1', x: data.x, y: data.y[3], style: { line: 'red' } },
    { title: 'Target S2', x: data.x, y: data.y[4], style: { line: 'red' } },
    { title: 'Target E2E', x: data.x, y: data.y[5], style: { line: 'red' } }
  ]);
}

function updateStats(metrics, latency) {
  const tableData = [
    ['Metric', 'Current', 'Target'],
    ['Stage 1 Latency', `${latency.stage1}ms`, `<${PATENT_TARGETS.stage1}ms`],
    ['Stage 2 Latency', `${latency.stage2}ms`, `<${PATENT_TARGETS.stage2}ms`],
    ['Total Latency', `${latency.total}ms`, `<${PATENT_TARGETS.endToEnd}ms`],
    ['Throughput', `${metrics?.stage1?.validatorMetrics?.throughput || 0}/s`, `>${PATENT_TARGETS.throughput}/s`],
    ['Success Rate', `${metrics?.stage1?.validatorMetrics?.successRate || 0}%`, '>99.9%']
  ];
  
  statsTable.setData({
    headers: tableData[0],
    data: tableData.slice(1)
  });
  
  // Update gauges
  const currentThroughput = metrics?.stage1?.validatorMetrics?.throughput || 0;
  throughputGauge.setPercent(Math.min(100, (currentThroughput / PATENT_TARGETS.throughput) * 100));
  
  const currentSuccess = metrics?.stage1?.validatorMetrics?.successRate || 0;
  successRate.setPercent(currentSuccess);
  
  // Check for alerts
  if (latency.stage1 > PATENT_TARGETS.stage1) {
    log.log(`⚠️  Stage 1 latency ${latency.stage1}ms exceeds target ${PATENT_TARGETS.stage1}ms`);
  }
  if (latency.stage2 > PATENT_TARGETS.stage2) {
    log.log(`⚠️  Stage 2 latency ${latency.stage2}ms exceeds target ${PATENT_TARGETS.stage2}ms`);
  }
  if (latency.total > PATENT_TARGETS.endToEnd) {
    log.log(`⚠️  Total latency ${latency.total}ms exceeds target ${PATENT_TARGETS.endToEnd}ms`);
  }
  if (currentThroughput < PATENT_TARGETS.throughput * 0.9) {
    log.log(`⚠️  Throughput ${currentThroughput}/s below target ${PATENT_TARGETS.throughput}/s`);
  }
}

async function testGeographicLatency() {
  const regions = [
    { name: 'UK Local', delay: 5 },
    { name: 'EU', delay: 20 },
    { name: 'US East', delay: 80 },
    { name: 'US West', delay: 120 },
    { name: 'Asia', delay: 150 },
    { name: 'Australia', delay: 200 }
  ];
  
  const results = [];
  
  for (const region of regions) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, region.delay));
    const latency = await testLatency();
    
    results.push([
      region.name,
      `${latency.total + region.delay}ms`,
      latency.total + region.delay < 356 ? '✓' : '✗'
    ]);
  }
  
  heatmap.setData({
    headers: ['Region', 'Latency', 'Pass'],
    data: results
  });
}

// Main monitoring loop
async function monitor() {
  // Test latency
  const latency = await testLatency();
  
  if (latency.success) {
    // Store data
    performanceData.stage1.push(latency.stage1);
    performanceData.stage2.push(latency.stage2);
    performanceData.endToEnd.push(latency.total);
    performanceData.timestamps.push(new Date().toLocaleTimeString());
    
    // Keep only last 60 points
    if (performanceData.stage1.length > 60) {
      performanceData.stage1.shift();
      performanceData.stage2.shift();
      performanceData.endToEnd.shift();
      performanceData.timestamps.shift();
    }
  }
  
  // Fetch system metrics
  const metrics = await fetchMetrics();
  
  // Update displays
  updateLatencyChart();
  updateStats(metrics, latency);
  
  screen.render();
}

// Test geographic latency every minute
setInterval(testGeographicLatency, 60000);
testGeographicLatency();

// Main monitoring loop every second
setInterval(monitor, 1000);
monitor();

// Keyboard shortcuts
screen.key(['escape', 'q', 'C-c'], () => {
  return process.exit(0);
});

screen.key(['r'], () => {
  log.log('Refreshing metrics...');
  monitor();
});

screen.key(['g'], () => {
  log.log('Testing geographic latency...');
  testGeographicLatency();
});

// Initial setup
log.log('SSS-API Performance Monitor Started');
log.log('Press "q" to quit, "r" to refresh, "g" to test geographic latency');
log.log(`Monitoring: ${API_URL}`);
log.log('Patent targets loaded:');
log.log(`- Stage 1: <${PATENT_TARGETS.stage1}ms`);
log.log(`- Stage 2: <${PATENT_TARGETS.stage2}ms`);
log.log(`- End-to-End: <${PATENT_TARGETS.endToEnd}ms`);
log.log(`- Throughput: >${PATENT_TARGETS.throughput} ops/sec`);

screen.render();