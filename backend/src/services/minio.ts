import * as Minio from 'minio';
import { config } from '../config';

export const minioClient = new Minio.Client({
  endPoint: config.minio.endPoint,
  port: config.minio.port,
  useSSL: config.minio.useSSL,
  accessKey: config.minio.accessKey,
  secretKey: config.minio.secretKey,
});

export async function testMinioConnection(): Promise<boolean> {
  try {
    const buckets = await minioClient.listBuckets();
    console.log('MinIO connected successfully. Buckets:', buckets.map(b => b.name).join(', '));
    return true;
  } catch (error) {
    console.error('MinIO connection failed:', error);
    return false;
  }
}

export async function ensureBucket(): Promise<boolean> {
  const bucket = config.minio.bucket;
  try {
    const exists = await minioClient.bucketExists(bucket);
    if (!exists) {
      await minioClient.makeBucket(bucket);
      console.log(`Bucket "${bucket}" created`);
    } else {
      console.log(`Bucket "${bucket}" already exists`);
    }

    // Test write permission by uploading a small test file
    const testKey = '.write-test';
    await minioClient.putObject(bucket, testKey, Buffer.from('test'), 4);
    await minioClient.removeObject(bucket, testKey);
    console.log(`Bucket "${bucket}" write permission: OK`);
    return true;
  } catch (error: any) {
    if (error.code === 'AccessDenied') {
      console.error(`MinIO Access Denied for bucket "${bucket}". Please check bucket permissions or use a different bucket.`);
      console.error('Hint: You may need to create a new bucket with write permissions for this access key.');
    } else {
      console.error(`Error with bucket "${bucket}":`, error.message);
    }
    return false;
  }
}

// Helper to get full path with prefix
export function getObjectPath(type: 'raw' | 'md' | 'outputs', path: string): string {
  return `${config.minio.prefixes[type]}/${path}`;
}

export async function uploadFile(
  bucket: string,
  objectName: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  await minioClient.putObject(bucket, objectName, buffer, buffer.length, {
    'Content-Type': contentType,
  });
  return objectName;
}

export async function getPresignedUrl(
  bucket: string,
  objectName: string,
  expiry: number = 3600
): Promise<string> {
  return await minioClient.presignedGetObject(bucket, objectName, expiry);
}

export async function downloadFile(bucket: string, objectName: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    minioClient.getObject(bucket, objectName, (err, stream) => {
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

export async function deleteFile(bucket: string, objectName: string): Promise<void> {
  try {
    await minioClient.removeObject(bucket, objectName);
    console.log(`Deleted file: ${objectName}`);
  } catch (error) {
    console.error(`Failed to delete file ${objectName}:`, error);
    throw error;
  }
}

export async function deleteFolder(bucket: string, prefix: string): Promise<void> {
  try {
    const objectsList: string[] = [];
    const stream = minioClient.listObjects(bucket, prefix, true);

    // Collect all object names
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (obj) => {
        if (obj.name) {
          objectsList.push(obj.name);
        }
      });
      stream.on('end', () => resolve());
      stream.on('error', (err) => reject(err));
    });

    // Delete all objects
    if (objectsList.length > 0) {
      await minioClient.removeObjects(bucket, objectsList);
      console.log(`Deleted ${objectsList.length} files from folder: ${prefix}`);
    }
  } catch (error) {
    console.error(`Failed to delete folder ${prefix}:`, error);
    throw error;
  }
}
