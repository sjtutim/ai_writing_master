import { prisma } from './prisma';
import { Prisma } from '../generated/prisma';
import { getEmbedding } from './embedding';

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

export async function searchSimilarChunks(
  query: string,
  userId: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const {
    collectionId,
    limit = 30,
    threshold = 0.3,
  } = options;

  try {
    // Step 1: 获取查询文本的embedding
    let queryEmbedding: number[];
    try {
      queryEmbedding = await getEmbedding(query);
    } catch (embeddingError: any) {
      console.error('Embedding API error:', embeddingError);
      throw new Error(`Embedding服务不可用: ${embeddingError.message || '请检查EMBEDDING_API_URL配置'}`);
    }

    // Step 2: 执行向量搜索
    const collectionFilter = collectionId
      ? Prisma.sql`AND kd.collection_id = ${collectionId}`
      : Prisma.empty;

    const embeddingVector = `[${queryEmbedding.join(',')}]`;

    const results = await prisma.$queryRaw<SearchResult[]>`
      SELECT
        kc.id,
        kc.content,
        kc.chunk_index AS "chunkIndex",
        kd.title AS "documentTitle",
        kco.name AS "collectionName",
        1 - (kc.embedding <=> ${Prisma.sql`${embeddingVector}::vector`}) AS similarity
      FROM kb_chunks kc
      INNER JOIN kb_document_versions kdv ON kc.version_id = kdv.id
      INNER JOIN kb_documents kd ON kdv.document_id = kd.id
      LEFT JOIN kb_collections kco ON kd.collection_id = kco.id
      WHERE kd.user_id = ${userId}
        AND kd.status = 'ready'
        AND kc.embedding IS NOT NULL
        AND (1 - (kc.embedding <=> ${Prisma.sql`${embeddingVector}::vector`})) > ${threshold}
        ${collectionFilter}
      ORDER BY kc.embedding <=> ${Prisma.sql`${embeddingVector}::vector`}
      LIMIT ${limit}
    `;

    return results;
  } catch (error: any) {
    console.error('Error in vector search:', error);
    // 如果已经是我们自定义的错误，直接抛出
    if (error.message?.includes('Embedding服务')) {
      throw error;
    }
    throw new Error('向量搜索失败，请检查数据库连接');
  }
}
