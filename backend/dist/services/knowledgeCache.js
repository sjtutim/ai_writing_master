"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeCacheService = void 0;
const redis_1 = require("./redis");
const prisma_1 = require("../lib/prisma");
class KnowledgeCacheService {
    static CACHE_TTL = 86400;
    static MAX_CHUNKS = 50;
    static cacheKey(userId) {
        return `knowledge_cache:${userId}:chunks`;
    }
    static chunkKey(userId, chunkId) {
        return `knowledge_cache:${userId}:chunk:${chunkId}`;
    }
    static async getCachedChunks(userId) {
        const client = (0, redis_1.getRedisClient)();
        if (!client) {
            console.warn('Redis client not available, returning empty cache');
            return [];
        }
        try {
            const chunkIds = await client.zRange(this.cacheKey(userId), 0, -1);
            if (chunkIds.length === 0)
                return [];
            const chunks = [];
            for (const chunkId of chunkIds) {
                const data = await redis_1.CacheService.get(this.chunkKey(userId, chunkId));
                if (data)
                    chunks.push(data);
            }
            return chunks;
        }
        catch (error) {
            console.error('Error getting cached chunks:', error);
            return [];
        }
    }
    static async addChunks(userId, chunkIds) {
        const client = (0, redis_1.getRedisClient)();
        if (!client) {
            console.warn('Redis client not available, skipping cache');
            return;
        }
        const chunks = await prisma_1.prisma.kbChunk.findMany({
            where: {
                id: { in: chunkIds },
                version: {
                    document: {
                        userId,
                        status: 'ready',
                    },
                },
            },
            include: {
                version: {
                    include: {
                        document: {
                            include: {
                                collection: {
                                    select: { name: true },
                                },
                            },
                        },
                    },
                },
            },
        });
        const now = Date.now();
        for (const chunk of chunks) {
            const cachedChunk = {
                id: chunk.id,
                content: chunk.content,
                documentTitle: chunk.version.document.title,
                collectionName: chunk.version.document.collection?.name || null,
                chunkIndex: chunk.chunkIndex,
                addedAt: new Date().toISOString(),
            };
            await client.zAdd(this.cacheKey(userId), {
                score: now,
                value: chunk.id,
            });
            await redis_1.CacheService.set(this.chunkKey(userId, chunk.id), cachedChunk, this.CACHE_TTL);
        }
        await client.zRemRangeByRank(this.cacheKey(userId), 0, -(this.MAX_CHUNKS + 1));
        await client.expire(this.cacheKey(userId), this.CACHE_TTL);
    }
    static async removeChunk(userId, chunkId) {
        const client = (0, redis_1.getRedisClient)();
        if (!client)
            return;
        await client.zRem(this.cacheKey(userId), chunkId);
        await redis_1.CacheService.del(this.chunkKey(userId, chunkId));
    }
    static async clearCache(userId) {
        const client = (0, redis_1.getRedisClient)();
        if (!client)
            return;
        const chunkIds = await client.zRange(this.cacheKey(userId), 0, -1);
        for (const chunkId of chunkIds) {
            await redis_1.CacheService.del(this.chunkKey(userId, chunkId));
        }
        await client.del(this.cacheKey(userId));
    }
    static async getCount(userId) {
        const client = (0, redis_1.getRedisClient)();
        if (!client)
            return 0;
        return await client.zCard(this.cacheKey(userId));
    }
}
exports.KnowledgeCacheService = KnowledgeCacheService;
//# sourceMappingURL=knowledgeCache.js.map