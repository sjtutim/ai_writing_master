import { getRedisClient, CacheService } from './redis';
import { prisma } from '../lib/prisma';

export interface CachedChunk {
  id: string;
  content: string;
  documentTitle: string;
  collectionName: string | null;
  chunkIndex: number;
  addedAt: string;
}

export class KnowledgeCacheService {
  private static readonly CACHE_TTL = 86400;
  private static readonly MAX_CHUNKS = 50;

  static cacheKey(userId: string): string {
    return `knowledge_cache:${userId}:chunks`;
  }

  static chunkKey(userId: string, chunkId: string): string {
    return `knowledge_cache:${userId}:chunk:${chunkId}`;
  }

  static async getCachedChunks(userId: string): Promise<CachedChunk[]> {
    const client = getRedisClient();
    if (!client) {
      console.warn('Redis client not available, returning empty cache');
      return [];
    }

    try {
      const chunkIds = await client.zRange(this.cacheKey(userId), 0, -1);

      if (chunkIds.length === 0) return [];

      const chunks: CachedChunk[] = [];
      for (const chunkId of chunkIds) {
        const data = await CacheService.get<CachedChunk>(
          this.chunkKey(userId, chunkId)
        );
        if (data) chunks.push(data);
      }

      return chunks;
    } catch (error) {
      console.error('Error getting cached chunks:', error);
      return [];
    }
  }

  static async addChunks(userId: string, chunkIds: string[]): Promise<void> {
    const client = getRedisClient();
    if (!client) {
      console.warn('Redis client not available, skipping cache');
      return;
    }

    const chunks = await prisma.kbChunk.findMany({
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
      const cachedChunk: CachedChunk = {
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

      await CacheService.set(
        this.chunkKey(userId, chunk.id),
        cachedChunk,
        this.CACHE_TTL
      );
    }

    await client.zRemRangeByRank(
      this.cacheKey(userId),
      0,
      -(this.MAX_CHUNKS + 1)
    );

    await client.expire(this.cacheKey(userId), this.CACHE_TTL);
  }

  static async removeChunk(userId: string, chunkId: string): Promise<void> {
    const client = getRedisClient();
    if (!client) return;

    await client.zRem(this.cacheKey(userId), chunkId);
    await CacheService.del(this.chunkKey(userId, chunkId));
  }

  static async clearCache(userId: string): Promise<void> {
    const client = getRedisClient();
    if (!client) return;

    const chunkIds = await client.zRange(this.cacheKey(userId), 0, -1);

    for (const chunkId of chunkIds) {
      await CacheService.del(this.chunkKey(userId, chunkId));
    }

    await client.del(this.cacheKey(userId));
  }

  static async getCount(userId: string): Promise<number> {
    const client = getRedisClient();
    if (!client) return 0;

    return await client.zCard(this.cacheKey(userId));
  }
}
