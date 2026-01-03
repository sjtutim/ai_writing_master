export interface SearchResult {
    id: string;
    content: string;
    chunkIndex: number;
    documentTitle: string;
    collectionName: string | null;
    similarity: number;
}
export interface SearchOptions {
    collectionId?: string;
    limit?: number;
    threshold?: number;
}
export declare function searchSimilarChunks(query: string, userId: string, options?: SearchOptions): Promise<SearchResult[]>;
//# sourceMappingURL=vectorSearch.d.ts.map