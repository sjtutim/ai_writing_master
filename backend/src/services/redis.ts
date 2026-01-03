import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

export async function initRedis(url?: string): Promise<void> {
  if (!url) {
    console.log('Redis URL not configured, skipping Redis initialization');
    return;
  }

  try {
    redisClient = createClient({
      url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('Redis reconnection failed after 10 attempts');
            return new Error('Redis reconnection failed');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis connected');
    });

    redisClient.on('ready', () => {
      console.log('Redis ready to use');
    });

    await redisClient.connect();
    console.log('Redis initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Redis:', error);
    redisClient = null;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    console.log('Redis disconnected');
  }
}

export function getRedisClient(): RedisClientType | null {
  return redisClient;
}

// 缓存助手函数
export class CacheService {
  private static DEFAULT_TTL = 3600; // 1小时

  /**
   * 获取缓存数据
   */
  static async get<T>(key: string): Promise<T | null> {
    if (!redisClient) return null;

    try {
      const data = await redisClient.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * 设置缓存数据
   */
  static async set(key: string, value: any, ttl: number = this.DEFAULT_TTL): Promise<boolean> {
    if (!redisClient) return false;

    try {
      await redisClient.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * 删除缓存
   */
  static async del(key: string | string[]): Promise<boolean> {
    if (!redisClient) return false;

    try {
      await redisClient.del(Array.isArray(key) ? key : [key]);
      return true;
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * 删除匹配模式的所有缓存
   */
  static async delPattern(pattern: string): Promise<boolean> {
    if (!redisClient) return false;

    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return true;
    } catch (error) {
      console.error(`Redis DEL pattern error for pattern ${pattern}:`, error);
      return false;
    }
  }

  /**
   * 检查缓存是否存在
   */
  static async exists(key: string): Promise<boolean> {
    if (!redisClient) return false;

    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  // 缓存键生成器
  static keys = {
    userAuth: (userId: string) => `user:auth:${userId}`,
    userProfile: (userId: string) => `user:profile:${userId}`,
    userPermissions: (userId: string) => `user:permissions:${userId}`,
  };
}
