"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.minioClient = void 0;
exports.testMinioConnection = testMinioConnection;
exports.ensureBucket = ensureBucket;
exports.getObjectPath = getObjectPath;
exports.uploadFile = uploadFile;
exports.getPresignedUrl = getPresignedUrl;
exports.downloadFile = downloadFile;
exports.deleteFile = deleteFile;
exports.deleteFolder = deleteFolder;
const Minio = __importStar(require("minio"));
const config_1 = require("../config");
exports.minioClient = new Minio.Client({
    endPoint: config_1.config.minio.endPoint,
    port: config_1.config.minio.port,
    useSSL: config_1.config.minio.useSSL,
    accessKey: config_1.config.minio.accessKey,
    secretKey: config_1.config.minio.secretKey,
});
async function testMinioConnection() {
    try {
        const buckets = await exports.minioClient.listBuckets();
        console.log('MinIO connected successfully. Buckets:', buckets.map(b => b.name).join(', '));
        return true;
    }
    catch (error) {
        console.error('MinIO connection failed:', error);
        return false;
    }
}
async function ensureBucket() {
    const bucket = config_1.config.minio.bucket;
    try {
        const exists = await exports.minioClient.bucketExists(bucket);
        if (!exists) {
            await exports.minioClient.makeBucket(bucket);
            console.log(`Bucket "${bucket}" created`);
        }
        else {
            console.log(`Bucket "${bucket}" already exists`);
        }
        // Test write permission by uploading a small test file
        const testKey = '.write-test';
        await exports.minioClient.putObject(bucket, testKey, Buffer.from('test'), 4);
        await exports.minioClient.removeObject(bucket, testKey);
        console.log(`Bucket "${bucket}" write permission: OK`);
        return true;
    }
    catch (error) {
        if (error.code === 'AccessDenied') {
            console.error(`MinIO Access Denied for bucket "${bucket}". Please check bucket permissions or use a different bucket.`);
            console.error('Hint: You may need to create a new bucket with write permissions for this access key.');
        }
        else {
            console.error(`Error with bucket "${bucket}":`, error.message);
        }
        return false;
    }
}
// Helper to get full path with prefix
function getObjectPath(type, path) {
    return `${config_1.config.minio.prefixes[type]}/${path}`;
}
async function uploadFile(bucket, objectName, buffer, contentType) {
    await exports.minioClient.putObject(bucket, objectName, buffer, buffer.length, {
        'Content-Type': contentType,
    });
    return objectName;
}
async function getPresignedUrl(bucket, objectName, expiry = 3600) {
    return await exports.minioClient.presignedGetObject(bucket, objectName, expiry);
}
async function downloadFile(bucket, objectName) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        exports.minioClient.getObject(bucket, objectName, (err, stream) => {
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
async function deleteFile(bucket, objectName) {
    try {
        await exports.minioClient.removeObject(bucket, objectName);
        console.log(`Deleted file: ${objectName}`);
    }
    catch (error) {
        console.error(`Failed to delete file ${objectName}:`, error);
        throw error;
    }
}
async function deleteFolder(bucket, prefix) {
    try {
        const objectsList = [];
        const stream = exports.minioClient.listObjects(bucket, prefix, true);
        // Collect all object names
        await new Promise((resolve, reject) => {
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
            await exports.minioClient.removeObjects(bucket, objectsList);
            console.log(`Deleted ${objectsList.length} files from folder: ${prefix}`);
        }
    }
    catch (error) {
        console.error(`Failed to delete folder ${prefix}:`, error);
        throw error;
    }
}
//# sourceMappingURL=minio.js.map