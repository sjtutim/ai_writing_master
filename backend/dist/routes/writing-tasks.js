"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../services/prisma");
const auth_1 = require("../middleware/auth");
const llm_1 = require("../services/llm");
const vectorSearch_1 = require("../services/vectorSearch");
const knowledgeCache_1 = require("../services/knowledgeCache");
const router = (0, express_1.Router)();
// 简单的模板渲染，用于把提示词模板中的 {{query}} / {{context}} 占位符替换成实际值
function renderPromptTemplate(template, params) {
    return template
        .replace(/{{\s*query\s*}}/gi, params.query || '')
        .replace(/{{\s*context\s*}}/gi, params.context || '');
}
// 检索相关知识块
async function retrieveRelevantChunks(query, kbScope, userId, limit = 30) {
    try {
        const cachedChunks = await knowledgeCache_1.KnowledgeCacheService.getCachedChunks(userId);
        if (cachedChunks.length > 0) {
            console.log(`Using ${cachedChunks.length} cached knowledge chunks`);
            return cachedChunks.map(chunk => `[来源: ${chunk.documentTitle}]\n${chunk.content}`);
        }
        console.log('Cache empty, performing vector search');
        const searchResults = await (0, vectorSearch_1.searchSimilarChunks)(query, userId, {
            collectionId: kbScope?.collectionIds?.[0],
            limit,
            threshold: 0.3,
        });
        return searchResults.map(chunk => `[来源: ${chunk.documentTitle}]\n${chunk.content}`);
    }
    catch (error) {
        console.error('Error retrieving chunks:', error);
        return [];
    }
}
// 获取用户的写作任务历史
router.get('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { limit = 20, offset = 0, keyword } = req.query;
        const where = { userId };
        if (keyword) {
            const kw = String(keyword);
            where.OR = [
                { query: { contains: kw } },
                { outputs: { some: { content: { contains: kw } } } },
            ];
        }
        const tasks = await prisma_1.prisma.writingTask.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: Number(limit),
            skip: Number(offset),
            include: {
                style: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                prompt: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                outputs: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });
        const total = await prisma_1.prisma.writingTask.count({
            where,
        });
        res.json({ tasks, total });
    }
    catch (error) {
        console.error('Get writing tasks error:', error);
        res.status(500).json({ error: 'Failed to get writing tasks' });
    }
});
// 创建新的写作任务并流式生成内容 (SSE)
router.post('/generate/stream', auth_1.authMiddleware, async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    try {
        const userId = req.user.userId;
        const { query, styleId, promptId, kbScope, collectionIds, cachedChunkIds, // 新增：高级跨知识库模式使用的缓存chunk IDs
         } = req.body;
        if (!query) {
            res.write(`data: ${JSON.stringify({ error: 'Query is required' })}\n\n`);
            res.end();
            return;
        }
        const finalKbScope = kbScope || (collectionIds ? { collectionIds } : null);
        const task = await prisma_1.prisma.writingTask.create({
            data: {
                userId,
                query,
                styleId: styleId || null,
                promptId: promptId || null,
                kbScope: finalKbScope,
                status: 'running',
            },
        });
        res.write(`data: ${JSON.stringify({ type: 'task', taskId: task.id })}\n\n`);
        try {
            let styleContent = '';
            if (styleId) {
                const style = await prisma_1.prisma.writingStyle.findFirst({
                    where: {
                        id: styleId,
                        OR: [{ userId }, { isPublic: true }],
                    },
                });
                if (style)
                    styleContent = style.content;
            }
            let promptContent = '';
            if (promptId) {
                const prompt = await prisma_1.prisma.promptTemplate.findFirst({
                    where: {
                        id: promptId,
                        OR: [{ userId }, { isPublic: true }],
                    },
                });
                if (prompt)
                    promptContent = prompt.content;
            }
            // 根据是否有缓存chunk IDs决定使用哪种方式获取知识内容
            let relevantChunks = [];
            if (cachedChunkIds && cachedChunkIds.length > 0) {
                // 高级跨知识库模式：直接使用缓存的chunks
                const chunks = await prisma_1.prisma.kbChunk.findMany({
                    where: {
                        id: { in: cachedChunkIds },
                    },
                    include: {
                        version: {
                            include: {
                                document: {
                                    select: { title: true },
                                },
                            },
                        },
                    },
                });
                relevantChunks = chunks.map(chunk => `[来源: ${chunk.version.document.title}]\n${chunk.content}`);
            }
            else {
                // 单一知识库模式：自动检索相关内容
                relevantChunks = await retrieveRelevantChunks(query, finalKbScope, userId);
            }
            const contextText = relevantChunks.join('\n\n---\n\n');
            const renderedPromptContent = promptContent
                ? renderPromptTemplate(promptContent, { query, context: contextText })
                : '';
            const systemPrompt = `你是一个专业的写作助手。${styleContent ? `\n\n参考写作风格示例：\n${styleContent}` : ''}${renderedPromptContent ? `\n\n${renderedPromptContent}` : ''}

写作要求：
${query}

输出格式要求：
- 请输出纯文本格式，不要使用Markdown语法
- 不要使用 # 标题符号、** 粗体符号、* 列表符号等Markdown格式
- 使用自然的分段和换行来组织内容结构
- 保持段落清晰、层次分明，便于阅读和复制

请根据上述要求进行创作${relevantChunks.length > 0 ? '，并参考用户提供的知识库内容' : ''}。`;
            const userPrompt = relevantChunks.length > 0
                ? `以下是相关的知识库内容供你参考：\n\n${relevantChunks.join('\n\n---\n\n')}\n\n请开始创作。`
                : '请开始创作。';
            let fullContent = '';
            let totalTokens = 0;
            for await (const chunk of (0, llm_1.streamText)([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ], { maxTokens: 4096, temperature: 0.7 })) {
                fullContent += chunk;
                res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
            }
            const result = await prisma_1.prisma.writingOutput.create({
                data: {
                    taskId: task.id,
                    content: fullContent,
                    tokens: totalTokens,
                    metadata: {
                        systemPrompt,
                        userPrompt,
                        retrievedChunks: relevantChunks.map((chunk, index) => ({
                            index: index + 1,
                            content: chunk,
                        })),
                        styleContent: styleContent || null,
                        promptContent: renderedPromptContent || null,
                        userQuery: query,
                        kbScope: finalKbScope,
                        generatedAt: new Date().toISOString(),
                    },
                },
            });
            await prisma_1.prisma.writingTask.update({
                where: { id: task.id },
                data: { status: 'succeeded' },
            });
            res.write(`data: ${JSON.stringify({ type: 'done', outputId: result.id, tokens: totalTokens })}\n\n`);
            res.end();
        }
        catch (error) {
            await prisma_1.prisma.writingTask.update({
                where: { id: task.id },
                data: { status: 'failed' },
            });
            res.write(`data: ${JSON.stringify({ type: 'error', error: error.message || 'Generation failed' })}\n\n`);
            res.end();
        }
    }
    catch (error) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message || 'Failed to create task' })}\n\n`);
        res.end();
    }
});
// 获取单个写作任务详情
router.get('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const task = await prisma_1.prisma.writingTask.findFirst({
            where: { id, userId },
            include: {
                style: true,
                prompt: true,
                outputs: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!task) {
            return res.status(404).json({ error: 'Writing task not found' });
        }
        res.json(task);
    }
    catch (error) {
        console.error('Get writing task error:', error);
        res.status(500).json({ error: 'Failed to get writing task' });
    }
});
// 创建新的写作任务并生成内容
router.post('/generate', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { query, styleId, promptId, kbScope, // { documentIds: [...], collectionIds: [...] }
        collectionIds, // 向后兼容
        cachedChunkIds, // 新增：高级跨知识库模式使用的缓存chunk IDs
         } = req.body;
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }
        // 向后兼容旧的 collectionIds 字段
        const finalKbScope = kbScope || (collectionIds ? { collectionIds } : null);
        // 创建任务记录
        const task = await prisma_1.prisma.writingTask.create({
            data: {
                userId,
                query,
                styleId: styleId || null,
                promptId: promptId || null,
                kbScope: finalKbScope,
                status: 'running',
            },
        });
        try {
            // 1. 获取写作风格（如果指定）
            let styleContent = '';
            if (styleId) {
                const style = await prisma_1.prisma.writingStyle.findFirst({
                    where: {
                        id: styleId,
                        OR: [
                            { userId },
                            { isPublic: true },
                        ],
                    },
                });
                if (style) {
                    styleContent = style.content;
                }
            }
            // 2. 获取提示词模板（如果指定）
            let promptContent = '';
            if (promptId) {
                const prompt = await prisma_1.prisma.promptTemplate.findFirst({
                    where: {
                        id: promptId,
                        OR: [
                            { userId },
                            { isPublic: true },
                        ],
                    },
                });
                if (prompt) {
                    promptContent = prompt.content;
                }
            }
            // 3. 检索相关知识 - 根据是否有缓存chunk IDs决定使用哪种方式
            let relevantChunks = [];
            if (cachedChunkIds && cachedChunkIds.length > 0) {
                // 高级跨知识库模式：直接使用缓存的chunks
                const chunks = await prisma_1.prisma.kbChunk.findMany({
                    where: {
                        id: { in: cachedChunkIds },
                    },
                    include: {
                        version: {
                            include: {
                                document: {
                                    select: { title: true },
                                },
                            },
                        },
                    },
                });
                relevantChunks = chunks.map(chunk => `[来源: ${chunk.version.document.title}]\n${chunk.content}`);
            }
            else {
                // 单一知识库模式：自动检索相关内容
                relevantChunks = await retrieveRelevantChunks(query, finalKbScope, userId);
            }
            const contextText = relevantChunks.join('\n\n---\n\n');
            const renderedPromptContent = promptContent
                ? renderPromptTemplate(promptContent, { query, context: contextText })
                : '';
            // 4. 构建 LLM 提示
            // 系统提示词：角色定义 + 写作风格 + 写作要求/提示词
            const systemPrompt = `你是一个专业的写作助手。${styleContent ? `\n\n参考写作风格示例：\n${styleContent}` : ''}${renderedPromptContent ? `\n\n${renderedPromptContent}` : ''}

写作要求：
${query}

输出格式要求：
- 请输出纯文本格式，不要使用Markdown语法
- 不要使用 # 标题符号、** 粗体符号、* 列表符号等Markdown格式
- 使用自然的分段和换行来组织内容结构
- 保持段落清晰、层次分明，便于阅读和复制

请根据上述要求进行创作${relevantChunks.length > 0 ? '，并参考用户提供的知识库内容' : ''}。`;
            // 用户消息：主要是知识库参考内容
            const userPrompt = relevantChunks.length > 0
                ? `以下是相关的知识库内容供你参考：\n\n${relevantChunks.join('\n\n---\n\n')}\n\n请开始创作。`
                : '请开始创作。';
            // 5. 调用 LLM 生成内容
            const result = await (0, llm_1.generateText)([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ], {
                maxTokens: 4096,
                temperature: 0.7,
            });
            // 6. 保存输出及生成过程元数据
            const output = await prisma_1.prisma.writingOutput.create({
                data: {
                    taskId: task.id,
                    content: result.content,
                    tokens: result.tokens,
                    metadata: {
                        systemPrompt,
                        userPrompt,
                        retrievedChunks: relevantChunks.map((chunk, index) => ({
                            index: index + 1,
                            content: chunk,
                        })),
                        styleContent: styleContent || null,
                        promptContent: renderedPromptContent || null,
                        userQuery: query,
                        kbScope: finalKbScope,
                        generationParams: {
                            maxTokens: 4096,
                            temperature: 0.7,
                        },
                        generatedAt: new Date().toISOString(),
                    },
                },
            });
            // 7. 更新任务状态
            await prisma_1.prisma.writingTask.update({
                where: { id: task.id },
                data: { status: 'succeeded' },
            });
            res.json({
                task: {
                    id: task.id,
                    query: task.query,
                    status: 'succeeded',
                },
                output: {
                    id: output.id,
                    content: output.content,
                    tokens: output.tokens,
                },
            });
        }
        catch (error) {
            // 更新任务状态为失败
            await prisma_1.prisma.writingTask.update({
                where: { id: task.id },
                data: {
                    status: 'failed',
                },
            });
            throw error;
        }
    }
    catch (error) {
        console.error('Generate writing error:', error);
        res.status(500).json({ error: 'Failed to generate content' });
    }
});
// 删除写作任务
router.delete('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const existingTask = await prisma_1.prisma.writingTask.findFirst({
            where: { id, userId },
        });
        if (!existingTask) {
            return res.status(404).json({ error: 'Writing task not found' });
        }
        await prisma_1.prisma.writingTask.delete({
            where: { id },
        });
        res.json({ message: 'Writing task deleted successfully' });
    }
    catch (error) {
        console.error('Delete writing task error:', error);
        res.status(500).json({ error: 'Failed to delete writing task' });
    }
});
// 更新写作输出内容（保存编辑后的内容）
router.put('/outputs/:outputId', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { outputId } = req.params;
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }
        const output = await prisma_1.prisma.writingOutput.findFirst({
            where: {
                id: outputId,
                task: { userId },
            },
        });
        if (!output) {
            return res.status(404).json({ error: 'Output not found' });
        }
        await prisma_1.prisma.writingOutput.update({
            where: { id: outputId },
            data: { content },
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Update output error:', error);
        res.status(500).json({ error: 'Failed to update output' });
    }
});
router.post('/knowledge/search', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { query, collectionId, limit = 30 } = req.body;
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }
        const chunks = await (0, vectorSearch_1.searchSimilarChunks)(query, userId, {
            collectionId,
            limit: Number(limit),
            threshold: 0.3,
        });
        res.json({
            chunks,
            total: chunks.length,
        });
    }
    catch (error) {
        console.error('Knowledge search error:', error);
        // 返回更详细的错误信息
        const errorMessage = error.message || 'Failed to search knowledge';
        res.status(500).json({ error: errorMessage });
    }
});
router.get('/knowledge/cache', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const chunks = await knowledgeCache_1.KnowledgeCacheService.getCachedChunks(userId);
        const count = await knowledgeCache_1.KnowledgeCacheService.getCount(userId);
        res.json({
            chunks,
            count,
        });
    }
    catch (error) {
        console.error('Get cache error:', error);
        res.status(500).json({ error: 'Failed to get cache' });
    }
});
router.post('/knowledge/cache', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { chunkIds } = req.body;
        if (!chunkIds || !Array.isArray(chunkIds)) {
            return res.status(400).json({ error: 'chunkIds array is required' });
        }
        await knowledgeCache_1.KnowledgeCacheService.addChunks(userId, chunkIds);
        const count = await knowledgeCache_1.KnowledgeCacheService.getCount(userId);
        res.json({
            success: true,
            count,
        });
    }
    catch (error) {
        console.error('Add to cache error:', error);
        res.status(500).json({ error: 'Failed to add to cache' });
    }
});
router.delete('/knowledge/cache/:chunkId', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { chunkId } = req.params;
        await knowledgeCache_1.KnowledgeCacheService.removeChunk(userId, chunkId);
        res.json({
            success: true,
        });
    }
    catch (error) {
        console.error('Remove from cache error:', error);
        res.status(500).json({ error: 'Failed to remove from cache' });
    }
});
router.delete('/knowledge/cache', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        await knowledgeCache_1.KnowledgeCacheService.clearCache(userId);
        res.json({
            success: true,
        });
    }
    catch (error) {
        console.error('Clear cache error:', error);
        res.status(500).json({ error: 'Failed to clear cache' });
    }
});
exports.default = router;
//# sourceMappingURL=writing-tasks.js.map