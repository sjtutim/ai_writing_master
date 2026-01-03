export interface CachedChunk {
    id: string;
    content: string;
    documentTitle: string;
    collectionName: string | null;
    chunkIndex: number;
    addedAt: string;
}
export declare class KnowledgeCacheService {
    private static readonly CACHE_TTL;
    private static readonly MAX_CHUNKS;
    static cacheKey(userId: string): string;
    static chunkKey(userId: string, chunkId: string): string;
    static getCachedChunks(userId: string): Promise<CachedChunk[]>;
    static addChunks(userId: string, chunkIds: string[]): Promise<void>;
    static removeChunk(userId: string, chunkId: string): Promise<void>;
    static clearCache(userId: string): Promise<void>;
    static getCount(userId: string): Promise<number>;
}
//# sourceMappingURL=knowledgeCache.d.ts.map