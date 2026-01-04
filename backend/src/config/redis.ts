// Redis Configuration for Production
import Redis from 'ioredis';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { envVars } from './envVars';

// ============================================
// REDIS CLIENT SETUP
// ============================================

/**
 * Redis Client Configuration
 * Production-grade setup with exponential backoff, timeouts, and connection pooling
 */
export const redis = new Redis({
  host: envVars.REDIS.HOST,
  port: envVars.REDIS.PORT,
  password: envVars.REDIS.PASSWORD || undefined,
  
  // Retry strategy with exponential backoff and max retry limit
  retryStrategy: (times: number) => {
    if (times > 10) {
      // Stop retrying after 10 attempts
      console.error(`❌ Redis max retries (${times}) reached - stopping reconnection attempts`);
      return null;
    }
    // Exponential backoff: 50ms, 100ms, 150ms, ... up to 2000ms
    const delay = Math.min(times * 50, 2000);
    console.log(`🔄 Redis reconnection attempt #${times} in ${delay}ms`);
    return delay;
  },
  
  // Request retry settings
  maxRetriesPerRequest: 3, // Retry failed commands up to 3 times
  
  // Connection settings
  connectTimeout: 10000, // 10 seconds timeout for initial connection
  keepAlive: 30000, // Send keepalive packets every 30 seconds
  
  // Command timeout
  commandTimeout: 5000, // 5 seconds timeout per Redis command
  
  // Connection checks
  enableReadyCheck: true, // Wait for Redis READY before accepting connections
  lazyConnect: false, // Connect immediately on startup (fail fast)
  
  // Offline queue management
  enableOfflineQueue: true, // Queue commands when disconnected (auto-retry when reconnected)
  
  // Auto-reconnect on error
  autoResubscribe: true, // Auto-resubscribe to channels after reconnection
  autoResendUnfulfilledCommands: true, // Resend commands that didn't complete
});

// Handle Redis connection events
redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redis.on('ready', () => {
  console.log('✅ Redis is ready to accept commands');
});

redis.on('error', (error) => {
  console.error('❌ Redis connection error:', error.message);
});

redis.on('close', () => {
  console.log('⚠️  Redis connection closed');
});

redis.on('reconnecting', (delay: number) => {
  console.log(`🔄 Redis reconnecting in ${delay}ms...`);
});

redis.on('end', () => {
  console.log('⚠️  Redis connection ended - no more reconnection attempts');
});

// ============================================
// RATE LIMITERS
// ============================================

/**
 * Activity Tracker Rate Limiter
 * Limits lastActiveAt updates to once per 5 minutes per user
 * Algorithm: Sliding Window Counter
 */
export const activityRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'activity',
  points: 1, // 1 update allowed
  duration: 300, // Per 5 minutes (300 seconds)
  blockDuration: 0, // Don't block, just skip silently
  insuranceLimiter: undefined, // No fallback to prevent memory leaks
});

/**
 * API Rate Limiter (Example - for future use)
 * Limits API requests per user/IP
 */
export const apiRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'api',
  points: 100, // 100 requests
  duration: 60, // Per 60 seconds (1 minute)
  blockDuration: 60, // Block for 60 seconds if exceeded
});

/**
 * Login Rate Limiter (Example - for future use)
 * Prevents brute force attacks
 */
export const loginRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'login',
  points: 5, // 5 attempts
  duration: 900, // Per 15 minutes (900 seconds)
  blockDuration: 900, // Block for 15 minutes if exceeded
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if Redis is connected and ready
 */
export const isRedisReady = (): boolean => {
  return redis.status === 'ready';
};

/**
 * Graceful Redis shutdown
 */
export const closeRedis = async (): Promise<void> => {
  try {
    await redis.quit();
    console.log('✅ Redis connection closed gracefully');
  } catch (error) {
    console.error('❌ Error closing Redis:', error);
    redis.disconnect();
  }
};

// ============================================
// EXPORTS
// ============================================

export default {
  redis,
  activityRateLimiter,
  apiRateLimiter,
  loginRateLimiter,
  isRedisReady,
  closeRedis,
};
