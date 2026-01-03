"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWorker = startWorker;
const prisma_1 = require("./prisma");
const document_1 = require("./document");
const embedding_1 = require("./embedding");
const POLL_INTERVAL = 5000; // 5 seconds
const MAX_RETRIES = 3;
// 处理解析任务（Word -> Markdown）
async function processParseJob(job) {
    const payload = job.payload;
    const { documentId, versionId, userId, rawPath, filename, mimetype } = payload;
    console.log(`Processing parse job for document ${documentId}`);
    // 下载原始文件
    const fileBuffer = await (0, document_1.downloadFromMinio)(rawPath);
    let markdownContent;
    // 根据文件类型转换
    if (mimetype?.includes('word') || filename?.endsWith('.docx') || filename?.endsWith('.doc')) {
        markdownContent = await (0, document_1.convertWordToMarkdown)(fileBuffer);
    }
    else {
        // 纯文本文件直接转换
        markdownContent = fileBuffer.toString('utf-8');
    }
    // 上传 Markdown 到 MinIO
    const mdPath = await (0, document_1.uploadToMinio)('md', userId, documentId, 1, 'document.md', markdownContent, 'text/markdown');
    // 更新版本记录
    await prisma_1.prisma.kbDocumentVersion.update({
        where: { id: versionId },
        data: { mdPath },
    });
    // 创建分块任务
    await prisma_1.prisma.job.create({
        data: {
            type: 'chunk',
            status: 'pending',
            payload: {
                documentId,
                versionId,
                userId,
                mdPath,
                content: markdownContent,
            },
        },
    });
    console.log(`Parse job completed for document ${documentId}`);
}
// 处理分块任务
async function processChunkJob(job) {
    const payload = job.payload;
    const { documentId, versionId, userId, mdPath, content } = payload;
    console.log(`Processing chunk job for document ${documentId}`);
    let markdownContent = content;
    // 如果没有内容，从 MinIO 下载
    if (!markdownContent && mdPath) {
        const buffer = await (0, document_1.downloadFromMinio)(mdPath);
        markdownContent = buffer.toString('utf-8');
    }
    if (!markdownContent) {
        throw new Error('No content to chunk');
    }
    // 分块
    const chunks = (0, document_1.splitTextToChunks)(markdownContent, 500, 50);
    console.log(`Split into ${chunks.length} chunks`);
    // 保存分块到数据库（暂时不含向量）
    for (let i = 0; i < chunks.length; i++) {
        await prisma_1.prisma.kbChunk.create({
            data: {
                versionId,
                chunkIndex: i,
                content: chunks[i],
            },
        });
    }
    // 创建向量化任务
    await prisma_1.prisma.job.create({
        data: {
            type: 'embed',
            status: 'pending',
            payload: {
                documentId,
                versionId,
                userId,
            },
        },
    });
    console.log(`Chunk job completed for document ${documentId}`);
}
// 处理向量化任务
async function processEmbedJob(job) {
    const payload = job.payload;
    const { documentId, versionId } = payload;
    console.log(`Processing embed job for document ${documentId}`);
    // 获取所有分块
    const chunks = await prisma_1.prisma.kbChunk.findMany({
        where: { versionId },
        orderBy: { chunkIndex: 'asc' },
    });
    if (chunks.length === 0) {
        throw new Error('No chunks to embed');
    }
    // 批量获取向量
    const batchSize = 10;
    for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const texts = batch.map(c => c.content);
        try {
            const embeddings = await (0, embedding_1.getEmbeddings)(texts);
            // 更新每个分块的向量
            for (let j = 0; j < batch.length; j++) {
                const embedding = embeddings[j];
                const chunk = batch[j];
                // 使用原生 SQL 更新向量字段
                await prisma_1.prisma.$executeRaw `
          UPDATE kb_chunks
          SET embedding = ${embedding}::vector
          WHERE id = ${chunk.id}
        `;
            }
            console.log(`Embedded chunks ${i + 1} to ${Math.min(i + batchSize, chunks.length)}`);
        }
        catch (error) {
            console.error(`Error embedding batch ${i}:`, error);
            throw error;
        }
    }
    // 更新版本状态为完成
    await prisma_1.prisma.kbDocumentVersion.update({
        where: { id: versionId },
        data: { status: 'ready' },
    });
    // 更新文档状态为完成
    await prisma_1.prisma.kbDocument.update({
        where: { id: documentId },
        data: { status: 'ready' },
    });
    console.log(`Embed job completed for document ${documentId}`);
}
// 处理单个任务
async function processJob(job) {
    const { type } = job;
    switch (type) {
        case 'parse':
            await processParseJob(job);
            break;
        case 'chunk':
            await processChunkJob(job);
            break;
        case 'embed':
            await processEmbedJob(job);
            break;
        default:
            throw new Error(`Unknown job type: ${type}`);
    }
}
// Worker 主循环
async function startWorker() {
    console.log('Starting job worker...');
    const processNextJob = async () => {
        try {
            // 获取下一个待处理的任务
            const job = await prisma_1.prisma.job.findFirst({
                where: {
                    status: 'pending',
                    retries: { lt: MAX_RETRIES },
                },
                orderBy: { createdAt: 'asc' },
            });
            if (job) {
                console.log(`Processing job ${job.id} (${job.type})`);
                // 标记为运行中
                await prisma_1.prisma.job.update({
                    where: { id: job.id },
                    data: { status: 'running' },
                });
                try {
                    await processJob(job);
                    // 标记为成功
                    await prisma_1.prisma.job.update({
                        where: { id: job.id },
                        data: { status: 'succeeded' },
                    });
                }
                catch (error) {
                    console.error(`Job ${job.id} failed:`, error);
                    const payload = job.payload;
                    // 更新任务状态
                    await prisma_1.prisma.job.update({
                        where: { id: job.id },
                        data: {
                            status: job.retries + 1 >= MAX_RETRIES ? 'failed' : 'pending',
                            retries: job.retries + 1,
                            error: error.message,
                        },
                    });
                    // 如果任务最终失败，更新文档状态
                    if (job.retries + 1 >= MAX_RETRIES && payload.documentId) {
                        await prisma_1.prisma.kbDocument.update({
                            where: { id: payload.documentId },
                            data: { status: 'failed' },
                        });
                        if (payload.versionId) {
                            await prisma_1.prisma.kbDocumentVersion.update({
                                where: { id: payload.versionId },
                                data: { status: 'failed', error: error.message },
                            });
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error('Worker error:', error);
        }
        // 继续处理下一个任务
        setTimeout(processNextJob, POLL_INTERVAL);
    };
    // 开始处理
    processNextJob();
}
//# sourceMappingURL=worker.js.map