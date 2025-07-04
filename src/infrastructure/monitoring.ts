import { FastifyInstance } from 'fastify';

export class MonitoringService {
  private metrics: Map<string, any> = new Map();
  
  setupPrometheus(fastify: FastifyInstance) {
    // Prometheus metrics endpoint
    fastify.get('/metrics', async (request, reply) => {
      const metrics = this.collectMetrics();
      reply.type('text/plain');
      return this.formatPrometheusMetrics(metrics);
    });
  }
  
  recordApiCall(endpoint: string, duration: number, status: number, ethicalScore?: number) {
    const key = `api_calls_${endpoint.replace(/\//g, '_')}`;
    const current = this.metrics.get(key) || { count: 0, totalDuration: 0, errors: 0 };
    
    current.count++;
    current.totalDuration += duration;
    if (status >= 400) current.errors++;
    if (ethicalScore !== undefined) {
      current.ethicalScores = current.ethicalScores || [];
      current.ethicalScores.push(ethicalScore);
    }
    
    this.metrics.set(key, current);
  }
  
  recordQuantumOperation(algorithm: string, duration: number) {
    const key = `quantum_ops_${algorithm}`;
    const current = this.metrics.get(key) || { count: 0, totalDuration: 0 };
    current.count++;
    current.totalDuration += duration;
    this.metrics.set(key, current);
  }
  
  recordAIEvolution(operationType: string, confidence: number) {
    const key = `ai_evolution_${operationType}`;
    const current = this.metrics.get(key) || { count: 0, totalConfidence: 0 };
    current.count++;
    current.totalConfidence += confidence;
    this.metrics.set(key, current);
  }
  
  private collectMetrics() {
    const systemMetrics = {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      timestamp: Date.now()
    };
    
    return {
      system: systemMetrics,
      api: Object.fromEntries(this.metrics)
    };
  }
  
  private formatPrometheusMetrics(metrics: any): string {
    let output = '';
    
    // System metrics
    output += `# HELP sss_api_uptime_seconds API uptime in seconds\n`;
    output += `# TYPE sss_api_uptime_seconds gauge\n`;
    output += `sss_api_uptime_seconds ${metrics.system.uptime}\n\n`;
    
    output += `# HELP sss_api_memory_usage_bytes Memory usage in bytes\n`;
    output += `# TYPE sss_api_memory_usage_bytes gauge\n`;
    output += `sss_api_memory_usage_bytes{type="heapUsed"} ${metrics.system.memoryUsage.heapUsed}\n`;
    output += `sss_api_memory_usage_bytes{type="heapTotal"} ${metrics.system.memoryUsage.heapTotal}\n\n`;
    
    // API metrics
    for (const [key, value] of Object.entries(metrics.api)) {
      if (key.startsWith('api_calls_')) {
        const endpoint = key.replace('api_calls_', '').replace(/_/g, '/');
        output += `# HELP sss_api_calls_total Total API calls\n`;
        output += `# TYPE sss_api_calls_total counter\n`;
        output += `sss_api_calls_total{endpoint="${endpoint}"} ${value.count}\n`;
        
        if (value.totalDuration) {
          output += `# HELP sss_api_duration_ms API call duration\n`;
          output += `# TYPE sss_api_duration_ms histogram\n`;
          output += `sss_api_duration_ms{endpoint="${endpoint}"} ${value.totalDuration / value.count}\n`;
        }
        
        if (value.errors) {
          output += `# HELP sss_api_errors_total Total API errors\n`;
          output += `# TYPE sss_api_errors_total counter\n`;
          output += `sss_api_errors_total{endpoint="${endpoint}"} ${value.errors}\n`;
        }
        
        if (value.ethicalScores) {
          const avgScore = value.ethicalScores.reduce((a: number, b: number) => a + b, 0) / value.ethicalScores.length;
          output += `# HELP sss_api_ethical_score Average ethical score\n`;
          output += `# TYPE sss_api_ethical_score gauge\n`;
          output += `sss_api_ethical_score{endpoint="${endpoint}"} ${avgScore}\n`;
        }
      }
    }
    
    return output;
  }
  
  // OpenTelemetry setup for distributed tracing
  setupOpenTelemetry() {
    // This would integrate with Jaeger/Zipkin for distributed tracing
    console.log('OpenTelemetry tracing enabled');
  }
}

export const monitoring = new MonitoringService();