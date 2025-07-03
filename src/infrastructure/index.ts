export * from './database/config';
export * from './database/repositories/ValidationRepository';
export * from './database/repositories/ConsensusRepository';
export * from './cache/RedisCache';
export * from './security/OnePasswordKeyManager';
export * from './network/types';
export * from './arweave/ArweaveService';

// Initialize infrastructure connections
import { DatabasePool } from './database/config';
import { RedisCache } from './cache/RedisCache';
import { OnePasswordKeyManager } from './security/OnePasswordKeyManager';
import { ArweaveService } from './arweave/ArweaveService';

export async function initializeInfrastructure() {
  console.log('Initializing infrastructure...');
  
  // Initialize database connection
  console.log('Connecting to database...');
  const db = DatabasePool.getInstance();
  
  // Test database connection
  try {
    console.log('Testing database connection...');
    const result = await db.query('SELECT NOW()');
    console.log('✓ Database connected:', result.rows[0].now);
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    console.error('Make sure PostgreSQL is running on localhost:5432');
    throw error;
  }
  
  // Initialize Redis connection
  const cache = RedisCache.getInstance();
  await cache.connect();
  
  // Initialize 1Password key manager (optional, only if available)
  try {
    const keyManager = OnePasswordKeyManager.getInstance();
    const signedIn = await keyManager.signin();
    
    if (signedIn) {
      console.log('✓ 1Password key manager initialized and connected');
      
      // Test by retrieving a key
      try {
        const signingKey = await keyManager.getSigningKey();
        console.log('✓ Successfully retrieved signing key from 1Password');
      } catch (error) {
        console.warn('Could not retrieve test key from 1Password');
      }
    } else {
      console.log('1Password available but not signed in. Using environment variables.');
      console.log('To use 1Password: eval $(op signin)');
    }
  } catch (error) {
    console.warn('1Password not available, using environment variables');
  }
  
  // Initialize Arweave (optional)
  try {
    const arweave = ArweaveService.getInstance();
    await arweave.loadWalletFromOnePassword();
    console.log('✓ Arweave integration initialized');
  } catch (error) {
    console.warn('Arweave wallet not loaded:', error instanceof Error ? error.message : error);
    console.log('  To use Arweave, run: ./scripts/generate-arweave-wallet.ts');
  }
  
  console.log('Infrastructure initialized successfully');
}

export async function shutdownInfrastructure() {
  console.log('Shutting down infrastructure...');
  
  // Close database connections
  await DatabasePool.close();
  
  // Close Redis connection
  const cache = RedisCache.getInstance();
  await cache.disconnect();
  
  console.log('Infrastructure shutdown complete');
}