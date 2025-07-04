import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (req: FastifyRequest) => string;
}

export class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  
  // Different limits for different API categories
  private limits: Record<string, RateLimitConfig> = {
    // Core APIs - higher limits
    '/api/v1/authenticate': { windowMs: 60000, maxRequests: 1000, keyGenerator: this.getIP },
    '/api/v1/store': { windowMs: 60000, maxRequests: 500, keyGenerator: this.getIP },
    
    // Government APIs - medium limits
    '/api/v1/nhs/': { windowMs: 60000, maxRequests: 300, keyGenerator: this.getApiKey },
    '/api/v1/hmrc/': { windowMs: 60000, maxRequests: 300, keyGenerator: this.getApiKey },
    '/api/v1/dvla/': { windowMs: 60000, maxRequests: 300, keyGenerator: this.getApiKey },
    
    // High-impact APIs - lower limits
    '/api/v1/voting/': { windowMs: 60000, maxRequests: 100, keyGenerator: this.getApiKey },
    '/api/v1/cbdc/': { windowMs: 60000, maxRequests: 100, keyGenerator: this.getApiKey },
    '/api/v1/emergency/': { windowMs: 60000, maxRequests: 500, keyGenerator: this.getApiKey },
    
    // Resource-intensive APIs
    '/api/v1/quantum/': { windowMs: 60000, maxRequests: 50, keyGenerator: this.getApiKey },
    '/api/v1/ai/': { windowMs: 60000, maxRequests: 50, keyGenerator: this.getApiKey },
    
    // Default for all others
    'default': { windowMs: 60000, maxRequests: 200, keyGenerator: this.getIP }
  };
  
  setupRateLimiting(fastify: FastifyInstance) {
    fastify.addHook('onRequest', async (request, reply) => {
      // Skip rate limiting for health checks
      if (request.url === '/health' || request.url === '/metrics') {
        return;
      }
      
      const config = this.getConfigForPath(request.url);
      const key = config.keyGenerator(request);
      const now = Date.now();
      
      // Clean up expired entries
      this.cleanup(now);
      
      // Get or create rate limit entry
      const entry = this.requests.get(key) || { count: 0, resetTime: now + config.windowMs };
      
      // Reset if window expired
      if (now > entry.resetTime) {
        entry.count = 0;
        entry.resetTime = now + config.windowMs;
      }
      
      // Check rate limit
      if (entry.count >= config.maxRequests) {
        reply.code(429);
        reply.header('X-RateLimit-Limit', config.maxRequests.toString());
        reply.header('X-RateLimit-Remaining', '0');
        reply.header('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());
        reply.header('Retry-After', Math.ceil((entry.resetTime - now) / 1000).toString());
        
        return reply.send({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((entry.resetTime - now) / 1000)
        });
      }
      
      // Increment counter
      entry.count++;
      this.requests.set(key, entry);
      
      // Add rate limit headers
      reply.header('X-RateLimit-Limit', config.maxRequests.toString());
      reply.header('X-RateLimit-Remaining', (config.maxRequests - entry.count).toString());
      reply.header('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());
    });
  }
  
  private getConfigForPath(path: string): RateLimitConfig {
    // Find matching config
    for (const [pattern, config] of Object.entries(this.limits)) {
      if (pattern === 'default') continue;
      if (path.startsWith(pattern)) {
        return config;
      }
    }
    return this.limits.default;
  }
  
  private getIP(req: FastifyRequest): string {
    return req.headers['x-forwarded-for'] as string || 
           req.headers['x-real-ip'] as string || 
           req.ip || 
           'unknown';
  }
  
  private getApiKey(req: FastifyRequest): string {
    return req.headers['x-api-key'] as string || this.getIP(req);
  }
  
  private cleanup(now: number) {
    // Remove expired entries to prevent memory leak
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetTime + 60000) { // 1 minute grace period
        this.requests.delete(key);
      }
    }
  }
  
  // Dynamic rate limit adjustment based on system load
  adjustLimits(cpuUsage: number, memoryUsage: number) {
    const loadFactor = Math.max(cpuUsage / 80, memoryUsage / 80); // 80% threshold
    
    if (loadFactor > 1) {
      // Reduce limits when under load
      for (const config of Object.values(this.limits)) {
        config.maxRequests = Math.floor(config.maxRequests / loadFactor);
      }
    }
  }
}

export const rateLimiter = new RateLimiter();