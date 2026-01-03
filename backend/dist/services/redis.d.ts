import { RedisClientType } from 'redis';
export declare function initRedis(url?: string): Promise<void>;
export declare function disconnectRedis(): Promise<void>;
export declare function getRedisClient(): RedisClientType | null;
export declare class CacheService {
    private static DEFAULT_TTL;
    /**
     * 获取缓存数据
     */
    static get<T>(key: string): Promise<T | null>;
    /**
     * 设置缓存数据
     */
    static set(key: string, value: any, ttl?: number): Promise<boolean>;
    /**
     * 删除缓存
     */
    static del(key: string | string[]): Promise<boolean>;
    /**
     * 删除匹配模式的所有缓存
     */
    static delPattern(pattern: string): Promise<boolean>;
    /**
     * 检查缓存是否存在
     */
    static exists(key: string): Promise<boolean>;
    static keys: {
        userAuth: (userId: string) => string;
        userProfile: (userId: string) => string;
        userPermissions: (userId: string) => string;
        knowledgeCache: (userId: string) => string;
        knowledgeCacheChunk: (userId: string, chunkId: string) => string;
    };
}
//# sourceMappingURL=redis.d.ts.map