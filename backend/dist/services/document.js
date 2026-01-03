"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertWordToMarkdown = convertWordToMarkdown;
exports.uploadToMinio = uploadToMinio;
exports.downloadFromMinio = downloadFromMinio;
exports.splitTextToChunks = splitTextToChunks;
const mammoth_1 = __importDefault(require("mammoth"));
const minio_1 = require("./minio");
const config_1 = require("../config");
// Word 转纯文本（mammoth 不支持直接转 Markdown）
async function convertWordToMarkdown(buffer) {
    const result = await mammoth_1.default.extractRawText({ buffer });
    return result.value;
}
// 上传文件到 MinIO
async function uploadToMinio(type, userId, docId, version, filename, content, contentType) {
    const objectPath = (0, minio_1.getObjectPath)(type, `${userId}/${docId}/${version}/${filename}`);
    const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
    await minio_1.minioClient.putObject(config_1.config.minio.bucket, objectPath, buffer, buffer.length, { 'Content-Type': contentType });
    return objectPath;
}
// 从 MinIO 下载文件
async function downloadFromMinio(objectPath) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        minio_1.minioClient.getObject(config_1.config.minio.bucket, objectPath, (err, stream) => {
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
function splitTextToChunks(text, chunkSize = 500, overlap = 50) {
    const chunks = [];
    // 按段落分割
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = '';
    for (const paragraph of paragraphs) {
        // 如果当前段落加上已有内容不超过限制，则合并
        if ((currentChunk + '\n\n' + paragraph).length <= chunkSize) {
            currentChunk = currentChunk ? currentChunk + '\n\n' + paragraph : paragraph;
        }
        else {
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
                    }
                    else {
                        if (currentChunk) {
                            chunks.push(currentChunk.trim());
                        }
                        // 如果单个句子也超过限制，强制分割
                        if (sentence.length > chunkSize) {
                            for (let i = 0; i < sentence.length; i += chunkSize - overlap) {
                                chunks.push(sentence.slice(i, i + chunkSize).trim());
                            }
                            currentChunk = '';
                        }
                        else {
                            currentChunk = sentence;
                        }
                    }
                }
            }
            else {
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
//# sourceMappingURL=document.js.map