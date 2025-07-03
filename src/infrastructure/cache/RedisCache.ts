import { createClient, RedisClientType } from 'redis';

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
}

export class RedisCache {
  private static instance: RedisCache | null = null;
  private client: RedisClientType;
  private connected: boolean = false;
  private config: CacheConfig;

  private constructor(config: CacheConfig) {
    this.config = config;
    this.client = createClient({
      socket: {
        host: config.host,
        port: config.port,
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            console.error('Redis: Max reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          return Math.min(retries * 100, 3000);
        }
      },
      password: config.password,
      database: config.db
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
      this.connected = true;
    });
  }

  static getInstance(): RedisCache {
    if (!this.instance) {
      const config: CacheConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        keyPrefix: process.env.REDIS_KEY_PREFIX || 'sss:'
      };
      this.instance = new RedisCache(config);
    }
    return this.instance;
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      try {
        console.log('Connecting to Redis...');
        await this.client.connect();
        console.log('✓ Redis connected successfully');
      } catch (error) {
        console.error('✗ Redis connection failed:', error);
        throw error;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.quit();
      this.connected = false;
    }
  }

  private getKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(this.getKey(key));
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setEx(this.getKey(key), ttlSeconds, serialized);
      } else {
        await this.client.set(this.getKey(key), serialized);
      }
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(this.getKey(key));
    } catch (error) {
      console.error('Redis delete error:', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(this.getKey(key));
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      return await this.client.incrBy(this.getKey(key), amount);
    } catch (error) {
      console.error('Redis increment error:', error);
      return 0;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client.expire(this.getKey(key), ttlSeconds);
    } catch (error) {
      console.error('Redis expire error:', error);
    }
  }

  // Cache patterns for SSS-API
  async cacheValidationResult(
    requestId: string, 
    result: any, 
    ttl: number = 300
  ): Promise<void> {
    await this.set(`validation:${requestId}`, result, ttl);
  }

  async getCachedValidation(requestId: string): Promise<any | null> {
    return await this.get(`validation:${requestId}`);
  }

  async cacheToken(
    tokenId: string, 
    tokenData: any, 
    ttl: number = 300
  ): Promise<void> {
    await this.set(`token:${tokenId}`, tokenData, ttl);
  }

  async getCachedToken(tokenId: string): Promise<any | null> {
    return await this.get(`token:${tokenId}`);
  }

  async invalidateToken(tokenId: string): Promise<void> {
    await this.delete(`token:${tokenId}`);
  }

  // Rate limiting
  async checkRateLimit(
    identifier: string, 
    limit: number, 
    windowSeconds: number
  ): Promise<boolean> {
    const key = `ratelimit:${identifier}`;
    const current = await this.increment(key, 1);
    
    if (current === 1) {
      await this.expire(key, windowSeconds);
    }
    
    return current <= limit;
  }

  // Session management
  async setSession(
    sessionId: string, 
    data: any, 
    ttl: number = 3600
  ): Promise<void> {
    await this.set(`session:${sessionId}`, data, ttl);
  }

  async getSession(sessionId: string): Promise<any | null> {
    return await this.get(`session:${sessionId}`);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.delete(`session:${sessionId}`);
  }
}