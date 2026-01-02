import mammoth from 'mammoth';
import { minioClient, getObjectPath } from './minio';
import { config } from '../config';

// Word 转 Markdown
export async function convertWordToMarkdown(buffer: Buffer): Promise<string> {
  const result = await mammoth.convertToMarkdown({ buffer });
  return result.value;
}

// 上传文件到 MinIO
export async function uploadToMinio(
  type: 'raw' | 'md' | 'outputs',
  userId: string,
  docId: string,
  version: number,
  filename: string,
  content: Buffer | string,
  contentType: string
): Promise<string> {
  const objectPath = getObjectPath(type, `${userId}/${docId}/${version}/${filename}`);
  const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;

  await minioClient.putObject(
    config.minio.bucket,
    objectPath,
    buffer,
    buffer.length,
    { 'Content-Type': contentType }
  );

  return objectPath;
}

// 从 MinIO 下载文件
export async function downloadFromMinio(objectPath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    minioClient.getObject(config.minio.bucket, objectPath, (err, stream) => {
      if (err) {
        reject(err);
        return;
      }
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  });
}

// 文本分块
export function splitTextToChunks(
  text: string,
  chunkSize: number = 500,
  overlap: number = 50
): string[] {
  const chunks: string[] = [];

  // 按段落分割
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    // 如果当前段落加上已有内容不超过限制，则合并
    if ((currentChunk + '\n\n' + paragraph).length <= chunkSize) {
      currentChunk = currentChunk ? currentChunk + '\n\n' + paragraph : paragraph;
    } else {
      // 保存当前块
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }

      // 如果单个段落超过限制，需要按句子分割
      if (paragraph.length > chunkSize) {
        const sentences = paragraph.split(/(?<=[。！？.!?])\s*/);
        currentChunk = '';

        for (const sentence of sentences) {
          if ((currentChunk + sentence).length <= chunkSize) {
            currentChunk += sentence;
          } else {
            if (currentChunk) {
              chunks.push(currentChunk.trim());
            }
            // 如果单个句子也超过限制，强制分割
            if (sentence.length > chunkSize) {
              for (let i = 0; i < sentence.length; i += chunkSize - overlap) {
                chunks.push(sentence.slice(i, i + chunkSize).trim());
              }
              currentChunk = '';
            } else {
              currentChunk = sentence;
            }
          }
        }
      } else {
        currentChunk = paragraph;
      }
    }
  }

  // 保存最后一个块
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(chunk => chunk.length > 0);
}
