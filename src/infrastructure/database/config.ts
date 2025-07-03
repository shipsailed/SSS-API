import { Pool, PoolConfig } from 'pg';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

export const getDatabaseConfig = (): DatabaseConfig => {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'sss_api',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: parseInt(process.env.DB_POOL_SIZE || '20'),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
  
  console.log('Database config:', {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    passwordSet: !!config.password
  });
  
  return config;
};

export class DatabasePool {
  private static instance: Pool | null = null;

  static getInstance(): Pool {
    if (!this.instance) {
      const config = getDatabaseConfig();
      this.instance = new Pool(config as PoolConfig);
      
      this.instance.on('error', (err, client) => {
        console.error('Unexpected error on idle client', err);
      });
    }
    return this.instance;
  }

  static async close(): Promise<void> {
    if (this.instance) {
      await this.instance.end();
      this.instance = null;
    }
  }
}