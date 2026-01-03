import * as Minio from 'minio';
export declare const minioClient: Minio.Client;
export declare function testMinioConnection(): Promise<boolean>;
export declare function ensureBucket(): Promise<boolean>;
export declare function getObjectPath(type: 'raw' | 'md' | 'outputs', path: string): string;
export declare function uploadFile(bucket: string, objectName: string, buffer: Buffer, contentType: string): Promise<string>;
export declare function getPresignedUrl(bucket: string, objectName: string, expiry?: number): Promise<string>;
export declare function downloadFile(bucket: string, objectName: string): Promise<Buffer>;
export declare function deleteFile(bucket: string, objectName: string): Promise<void>;
export declare function deleteFolder(bucket: string, prefix: string): Promise<void>;
//# sourceMappingURL=minio.d.ts.map