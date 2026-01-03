"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
exports.initRedis = initRedis;
exports.disconnectRedis = disconnectRedis;
exports.getRedisClient = getRedisClient;
const redis_1 = require("redis");
let redisClient = null;
async function initRedis(url) {
    if (!url) {
        console.log('Redis URL not configured, skipping Redis initialization');
        return;
    }
    try {
        redisClient = (0, redis_1.createClient)({
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
    }
    catch (error) {
        console.error('Failed to initialize Redis:', error);
        redisClient = null;
    }
}
async function disconnectRedis() {
    if (redisClient) {
        await redisClient.quit();
        console.log('Redis disconnected');
    }
}
function getRedisClient() {
    return redisClient;
}
// 缓存助手函数
class CacheService {
    static DEFAULT_TTL = 3600; // 1小时
    /**
     * 获取缓存数据
     */
    static async get(key) {
        if (!redisClient)
            return null;
        try {
            const data = await redisClient.get(key);
            if (!data)
                return null;
            return JSON.parse(data);
        }
        catch (error) {
            console.error(`Redis GET error for key ${key}:`, error);
            return null;
        }
    }
    /**
     * 设置缓存数据
     */
    static async set(key, value, ttl = this.DEFAULT_TTL) {
        if (!redisClient)
            return false;
        try {
            await redisClient.setEx(key, ttl, JSON.stringify(value));
            return true;
        }
        catch (error) {
            console.error(`Redis SET error for key ${key}:`, error);
            return false;
        }
    }
    /**
     * 删除缓存
     */
    static async del(key) {
        if (!redisClient)
            return false;
        try {
            await redisClient.del(Array.isArray(key) ? key : [key]);
            return true;
        }
        catch (error) {
            console.error(`Redis DEL error for key ${key}:`, error);
            return false;
        }
    }
    /**
     * 删除匹配模式的所有缓存
     */
    static async delPattern(pattern) {
        if (!redisClient)
            return false;
        try {
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
            return true;
        }
        catch (error) {
            console.error(`Redis DEL pattern error for pattern ${pattern}:`, error);
            return false;
        }
    }
    /**
     * 检查缓存是否存在
     */
    static async exists(key) {
        if (!redisClient)
            return false;
        try {
            const result = await redisClient.exists(key);
            return result === 1;
        }
        catch (error) {
            console.error(`Redis EXISTS error for key ${key}:`, error);
            return false;
        }
    }
    // 缓存键生成器
    static keys = {
        userAuth: (userId) => `user:auth:${userId}`,
        userProfile: (userId) => `user:profile:${userId}`,
        userPermissions: (userId) => `user:permissions:${userId}`,
        knowledgeCache: (userId) => `knowledge_cache:${userId}:chunks`,
        knowledgeCacheChunk: (userId, chunkId) => `knowledge_cache:${userId}:chunk:${chunkId}`,
    };
}
exports.CacheService = CacheService;
//# sourceMappingURL=redis.js.map