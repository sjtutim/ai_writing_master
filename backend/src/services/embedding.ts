import { config } from '../config';

interface EmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch(config.embedding.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.embedding.model,
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as unknown as EmbeddingResponse;
  return data.data[0].embedding;
}

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await fetch(config.embedding.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.embedding.model,
      input: texts,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as unknown as EmbeddingResponse;
  return data.data.map((d) => d.embedding);
}

export async function testEmbeddingConnection(): Promise<boolean> {
  try {
    const embedding = await getEmbedding('test connection');
    console.log('Embedding API connected successfully. Vector dimension:', embedding.length);
    return true;
  } catch (error) {
    console.error('Embedding API connection failed:', error);
    return false;
  }
}
