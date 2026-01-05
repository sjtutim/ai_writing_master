"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWorker = startWorker;
const prisma_1 = require("./prisma");
const document_1 = require("./document");
const embedding_1 = require("./embedding");
const config_1 = require("../config");
const POLL_INTERVAL = 5000; // 5 seconds
const MAX_RETRIES = 3;
// 处理解析任务（Word/PDF/TXT/MD -> Markdown）
async function processParseJob(job) {
    const payload = job.payload;
    const { documentId, versionId, userId, rawPath, filename, mimetype } = payload;
    console.log(`Processing parse job for document ${documentId}, file: ${filename}, mimetype: ${mimetype}`);
    // 下载原始文件
    const fileBuffer = await (0, document_1.downloadFromMinio)(rawPath);
    const originalSize = fileBuffer.length;
    console.log(`Downloaded original file: ${originalSize} bytes`);
    let markdownContent;
    // 统一转换为小写进行比较
    const filenameLower = filename?.toLowerCase() || '';
    const mimetypeLower = mimetype?.toLowerCase() || '';
    console.log(`File type detection: filename="${filename}", mimetype="${mimetype}"`);
    // 根据文件类型转换
    if (mimetypeLower.includes('word') || filenameLower.endsWith('.docx') || filenameLower.endsWith('.doc')) {
        // Word 文档
        console.log('Detected as Word document, using mammoth converter');
        markdownContent = await (0, document_1.convertWordToMarkdown)(fileBuffer);
        console.log(`Word file converted: ${filename}, original: ${originalSize} bytes -> converted: ${markdownContent.length} characters`);
    }
    else if (mimetypeLower === 'application/pdf' || mimetypeLower.includes('pdf') || filenameLower.endsWith('.pdf')) {
        // PDF 文档
        console.log('Detected as PDF document, using pdf-parse converter');
        markdownContent = await (0, document_1.convertPdfToText)(fileBuffer);
        console.log(`PDF file converted: ${filename}, original: ${originalSize} bytes -> converted: ${markdownContent.length} characters`);
    }
    else if (mimetypeLower === 'text/markdown' || filenameLower.endsWith('.md') || filenameLower.endsWith('.markdown')) {
        // Markdown 文件直接读取，保持原格式
        console.log('Detected as Markdown document, reading directly');
        markdownContent = fileBuffer.toString('utf-8');
        console.log(`Markdown file detected: ${filename}, content length: ${markdownContent.length} characters`);
    }
    else {
        // 纯文本文件直接转换
        console.log('Detected as plain text document, reading directly');
        markdownContent = fileBuffer.toString('utf-8');
        console.log(`Text file detected: ${filename}, content length: ${markdownContent.length} characters`);
    }
    // ===== 内容验证 =====
    if (!markdownContent || markdownContent.trim().length === 0) {
        throw new Error(`Converted content is empty for file: ${filename}`);
    }
    // 检查内容是否看起来像二进制数据（PDF 解析失败的标志）
    const binaryPattern = /^%PDF|[\x00-\x08\x0B\x0C\x0E-\x1F]/;
    if (binaryPattern.test(markdownContent.substring(0, 100))) {
        throw new Error(`File appears to contain binary data, conversion may have failed: ${filename}`);
    }
    console.log(`Content validation passed. Total characters: ${markdownContent.length}`);
    console.log(`Content preview (first 200 chars): ${markdownContent.substring(0, 200).replace(/\n/g, ' ')}...`);
    console.log(`Content preview (last 200 chars): ...${markdownContent.substring(markdownContent.length - 200).replace(/\n/g, ' ')}`);
    // 上传 Markdown 到 MinIO
    const mdPath = await (0, document_1.uploadToMinio)('md', userId, documentId, 1, 'document.md', markdownContent, 'text/markdown');
    console.log(`Markdown uploaded to MinIO: ${mdPath}`);
    // 更新版本记录
    await prisma_1.prisma.kbDocumentVersion.update({
        where: { id: versionId },
        data: { mdPath },
    });
    // 创建分块任务
    // 注意：不再通过 payload 传递内容，而是让分块任务从 MinIO 重新下载
    // 这样可以避免大文档导致的 JSON 存储问题
    await prisma_1.prisma.job.create({
        data: {
            type: 'chunk',
            status: 'pending',
            payload: {
                documentId,
                versionId,
                userId,
                mdPath,
                // 不再传递 content，分块任务会从 MinIO 下载
            },
        },
    });
    console.log(`Parse job completed for document ${documentId}. Content size: ${markdownContent.length} characters`);
}
// 处理分块任务
async function processChunkJob(job) {
    const payload = job.payload;
    const { documentId, versionId, userId, mdPath, content } = payload;
    console.log(`Processing chunk job for document ${documentId}`);
    let markdownContent = content;
    // 优先从 MinIO 下载，确保获取完整内容
    // （payload 中的 content 可能因为 JSON 存储限制而被截断）
    if (mdPath) {
        console.log(`Downloading content from MinIO: ${mdPath}`);
        const buffer = await (0, document_1.downloadFromMinio)(mdPath);
        markdownContent = buffer.toString('utf-8');
        console.log(`Downloaded content from MinIO: ${markdownContent.length} characters`);
    }
    if (!markdownContent || markdownContent.trim().length === 0) {
        throw new Error('No content to chunk');
    }
    // 验证内容不是二进制数据
    const binaryPattern = /^%PDF|[\x00-\x08\x0B\x0C\x0E-\x1F]/;
    if (binaryPattern.test(markdownContent.substring(0, 100))) {
        throw new Error('Content appears to be binary data, not text');
    }
    console.log(`Content to chunk: ${markdownContent.length} characters`);
    console.log(`Content preview (first 100 chars): ${markdownContent.substring(0, 100).replace(/\n/g, ' ')}...`);
    // 分块（使用配置中的参数）
    const { chunkSize, overlap } = config_1.config.chunking;
    const chunks = (0, document_1.splitTextToChunks)(markdownContent, chunkSize, overlap);
    // 验证分块覆盖了全部内容
    const totalChunkChars = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    console.log(`Split into ${chunks.length} chunks (chunkSize: ${chunkSize}, overlap: ${overlap})`);
    console.log(`Original content: ${markdownContent.length} chars, Total in chunks: ${totalChunkChars} chars`);
    if (chunks.length === 0) {
        throw new Error('No chunks created from content');
    }
    // 显示每个分块的预览信息
    chunks.forEach((chunk, i) => {
        console.log(`Chunk ${i + 1}/${chunks.length}: ${chunk.length} chars - "${chunk.substring(0, 50).replace(/\n/g, ' ')}..."`);
    });
    // 保存分块到数据库（暂时不含向量）
    console.log(`Saving ${chunks.length} chunks to database...`);
    for (let i = 0; i < chunks.length; i++) {
        await prisma_1.prisma.kbChunk.create({
            data: {
                versionId,
                chunkIndex: i,
                content: chunks[i],
            },
        });
        // 每10个分块输出一次进度
        if ((i + 1) % 10 === 0 || i === chunks.length - 1) {
            console.log(`Saved ${i + 1}/${chunks.length} chunks`);
        }
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
    console.log(`Chunk job completed for document ${documentId}. Created ${chunks.length} chunks.`);
}
// 延迟函数
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// 处理向量化任务
async function processEmbedJob(job) {
    const payload = job.payload;
    const { documentId, versionId } = payload;
    console.log(`Processing embed job for document ${documentId}`);
    // 获取所有需要向量化的分块（只获取尚未向量化的）
    // 使用原生 SQL 查询检查 embedding 是否为空
    const allChunks = await prisma_1.prisma.kbChunk.findMany({
        where: { versionId },
        orderBy: { chunkIndex: 'asc' },
        select: {
            id: true,
            chunkIndex: true,
            content: true,
        },
    });
    if (allChunks.length === 0) {
        throw new Error('No chunks to embed');
    }
    // 检查哪些分块还没有向量化
    const chunksWithEmbedding = await prisma_1.prisma.$queryRaw `
    SELECT id FROM kb_chunks 
    WHERE version_id = ${versionId} 
    AND embedding IS NOT NULL
  `;
    const embeddedIds = new Set(chunksWithEmbedding.map(c => c.id));
    const chunksToEmbed = allChunks.filter(c => !embeddedIds.has(c.id));
    console.log(`Total chunks: ${allChunks.length}, already embedded: ${embeddedIds.size}, to embed: ${chunksToEmbed.length}`);
    if (chunksToEmbed.length === 0) {
        console.log('All chunks already embedded, marking as complete');
        // 更新状态为完成
        await prisma_1.prisma.kbDocumentVersion.update({
            where: { id: versionId },
            data: { status: 'ready' },
        });
        await prisma_1.prisma.kbDocument.update({
            where: { id: documentId },
            data: { status: 'ready' },
        });
        return;
    }
    // 使用配置的批处理参数
    const batchSize = config_1.config.chunking.embeddingBatchSize;
    const batchDelay = config_1.config.chunking.embeddingBatchDelay;
    const totalBatches = Math.ceil(chunksToEmbed.length / batchSize);
    console.log(`Embedding ${chunksToEmbed.length} chunks in ${totalBatches} batches (batchSize: ${batchSize}, delay: ${batchDelay}ms)`);
    let successCount = 0;
    let errorCount = 0;
    for (let i = 0; i < chunksToEmbed.length; i += batchSize) {
        const batchNum = Math.floor(i / batchSize) + 1;
        const batch = chunksToEmbed.slice(i, i + batchSize);
        const texts = batch.map(c => c.content);
        try {
            console.log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} chunks)...`);
            const embeddings = await (0, embedding_1.getEmbeddings)(texts);
            // 更新每个分块的向量
            for (let j = 0; j < batch.length; j++) {
                const embedding = embeddings[j];
                const chunk = batch[j];
                if (!embedding || embedding.length === 0) {
                    console.warn(`Empty embedding for chunk ${chunk.chunkIndex}, skipping`);
                    errorCount++;
                    continue;
                }
                // 使用原生 SQL 更新向量字段
                await prisma_1.prisma.$executeRaw `
          UPDATE kb_chunks
          SET embedding = ${embedding}::vector
          WHERE id = ${chunk.id}
        `;
                successCount++;
            }
            const progress = ((i + batch.length) / chunksToEmbed.length * 100).toFixed(1);
            console.log(`Batch ${batchNum}/${totalBatches} completed. Progress: ${progress}% (${successCount} success, ${errorCount} errors)`);
            // 批次之间添加延迟，防止请求过快导致服务过载
            if (i + batchSize < chunksToEmbed.length) {
                await delay(batchDelay);
            }
        }
        catch (error) {
            console.error(`Error in batch ${batchNum}:`, error);
            errorCount += batch.length;
            // 记录错误但继续处理下一批，实现部分失败恢复
            console.log(`Continuing with next batch despite error...`);
            // 添加较长的延迟后重试
            await delay(batchDelay * 3);
        }
    }
    console.log(`Embedding completed: ${successCount} success, ${errorCount} errors out of ${chunksToEmbed.length} chunks`);
    // 只有当所有分块都成功处理时才标记为完成
    // 重新检查是否所有分块都已向量化
    const remainingChunks = await prisma_1.prisma.$queryRaw `
    SELECT COUNT(*) as count FROM kb_chunks 
    WHERE version_id = ${versionId} 
    AND embedding IS NULL
  `;
    const remainingCount = Number(remainingChunks[0]?.count || 0);
    if (remainingCount === 0) {
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
        console.log(`Embed job completed successfully for document ${documentId}`);
    }
    else {
        console.warn(`Embed job finished with ${remainingCount} unprocessed chunks for document ${documentId}`);
        // 不抛出错误，让任务标记为成功，用户可以手动重试
    }
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