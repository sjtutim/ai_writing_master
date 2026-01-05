"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertWordToMarkdown = convertWordToMarkdown;
exports.convertPdfToText = convertPdfToText;
exports.uploadToMinio = uploadToMinio;
exports.downloadFromMinio = downloadFromMinio;
exports.splitTextToChunks = splitTextToChunks;
const mammoth_1 = __importDefault(require("mammoth"));
const minio_1 = require("./minio");
const config_1 = require("../config");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');
// Word 转纯文本（mammoth 不支持直接转 Markdown）
async function convertWordToMarkdown(buffer) {
    const result = await mammoth_1.default.extractRawText({ buffer });
    return result.value;
}
// PDF 转纯文本
async function convertPdfToText(buffer) {
    console.log(`Starting PDF parsing, buffer size: ${buffer.length} bytes`);
    try {
        // pdf-parse 直接接受 Buffer
        const data = await pdfParse(buffer);
        console.log(`PDF parse result:`, {
            numpages: data.numpages,
            numrender: data.numrender,
            info: data.info,
            textLength: data.text?.length || 0,
        });
        // 检查是否成功提取了文本
        if (!data.text || data.text.length === 0) {
            console.warn('PDF parsed but no text content extracted. This might be a scanned PDF or image-based PDF.');
            return '(PDF 文件未能提取文本内容，可能是扫描版或图片格式的 PDF)';
        }
        // data.text 包含 PDF 中的所有文本内容
        // 清理多余的空白行
        const lines = data.text.split('\n');
        const cleanedText = lines
            .map((line) => line.trim())
            .filter((line, index, arr) => {
            // 移除连续的空行，但保留段落分隔
            if (line === '' && index > 0 && arr[index - 1] === '') {
                return false;
            }
            return true;
        })
            .join('\n');
        console.log(`PDF parsed successfully: ${data.numpages} pages, ${cleanedText.length} characters`);
        return cleanedText;
    }
    catch (error) {
        console.error('PDF parsing error:', error);
        // 返回更详细的错误信息
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to parse PDF: ${errorMessage}`);
    }
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
// 文本分块 - 使用滑动窗口算法确保不丢失内容
function splitTextToChunks(text, chunkSize = 1500, overlap = 150) {
    // 输入验证
    if (!text || text.trim().length === 0) {
        console.warn('splitTextToChunks: Empty input text');
        return [];
    }
    const cleanedText = text.trim();
    const textLength = cleanedText.length;
    console.log(`splitTextToChunks: Input length=${textLength}, chunkSize=${chunkSize}, overlap=${overlap}`);
    // 如果文本长度小于等于块大小，直接返回整个文本
    if (textLength <= chunkSize) {
        console.log(`splitTextToChunks: Text fits in single chunk`);
        return [cleanedText];
    }
    const chunks = [];
    let startIndex = 0;
    let chunkCount = 0;
    const maxChunks = 10000; // 防止无限循环
    while (startIndex < textLength && chunkCount < maxChunks) {
        chunkCount++;
        // 计算本次块的结束位置
        let endIndex = Math.min(startIndex + chunkSize, textLength);
        // 如果不是最后一块，尝试在句子边界断开
        if (endIndex < textLength) {
            // 在 endIndex 往前找一个合适的断点
            const searchStart = Math.max(startIndex + Math.floor(chunkSize * 0.7), startIndex);
            const searchText = cleanedText.substring(searchStart, endIndex);
            // 优先在句号、问号、感叹号处断开
            const sentenceBreaks = [
                searchText.lastIndexOf('。'),
                searchText.lastIndexOf('！'),
                searchText.lastIndexOf('？'),
                searchText.lastIndexOf('. '),
                searchText.lastIndexOf('! '),
                searchText.lastIndexOf('? '),
                searchText.lastIndexOf('\n\n'),
                searchText.lastIndexOf('\n'),
            ];
            // 找最后一个有效断点
            const bestBreak = Math.max(...sentenceBreaks);
            if (bestBreak > 0) {
                endIndex = searchStart + bestBreak + 1; // +1 包含断点字符
            }
        }
        // 提取块内容
        const chunk = cleanedText.substring(startIndex, endIndex).trim();
        if (chunk.length > 0) {
            chunks.push(chunk);
        }
        // 移动起始位置，考虑重叠
        if (endIndex >= textLength) {
            break; // 已到达文本末尾
        }
        // 下一块的起始位置 = 当前结束位置 - 重叠
        startIndex = Math.max(endIndex - overlap, startIndex + 1); // 确保至少前进1个字符
    }
    // 验证分块覆盖了全部内容
    const firstChunkStart = 0;
    const lastChunkEnd = textLength;
    console.log(`splitTextToChunks: Created ${chunks.length} chunks from ${textLength} characters`);
    // 输出每个块的长度统计
    if (chunks.length > 0) {
        const lengths = chunks.map(c => c.length);
        console.log(`splitTextToChunks: Chunk lengths - min: ${Math.min(...lengths)}, max: ${Math.max(...lengths)}, avg: ${Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)}`);
    }
    return chunks;
}
//# sourceMappingURL=document.js.map