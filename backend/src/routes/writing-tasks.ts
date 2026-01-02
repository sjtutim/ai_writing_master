import { Router } from 'express';
import { prisma } from '../services/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { generateText, streamText } from '../services/llm';
import { config } from '../config';

const router = Router();

// 简单的模板渲染，用于把提示词模板中的 {{query}} / {{context}} 占位符替换成实际值
function renderPromptTemplate(template: string, params: { query: string; context?: string }) {
  return template
    .replace(/{{\s*query\s*}}/gi, params.query || '')
    .replace(/{{\s*context\s*}}/gi, params.context || '');
}

// 检索相关知识块
async function retrieveRelevantChunks(
  query: string,
  kbScope: { documentIds?: string[]; collectionIds?: string[] } | null,
  userId: string,
  limit: number = 10
): Promise<string[]> {
  try {
    // 如果没有指定范围，使用用户的所有文档
    const whereCondition: any = {
      version: {
        document: {
          userId,
          status: 'ready',
        },
      },
    };

    // 如果指定了文档或集合范围
    if (kbScope) {
      const orConditions: any[] = [];

      if (kbScope.documentIds && kbScope.documentIds.length > 0) {
        orConditions.push({
          version: {
            documentId: { in: kbScope.documentIds },
          },
        });
      }

      if (kbScope.collectionIds && kbScope.collectionIds.length > 0) {
        orConditions.push({
          version: {
            document: {
              collectionId: { in: kbScope.collectionIds },
            },
          },
        });
      }

      if (orConditions.length > 0) {
        whereCondition.OR = orConditions;
      }
    }

    // 简单实现：获取相关chunks（这里使用随机或最近的chunks）
    // 在实际生产环境中，应该使用向量搜索
    const chunks = await prisma.kbChunk.findMany({
      where: whereCondition,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        version: {
          include: {
            document: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    return chunks.map(chunk =>
      `[来源: ${chunk.version.document.title}]\n${chunk.content}`
    );
  } catch (error) {
    console.error('Error retrieving chunks:', error);
    return [];
  }
}

// 获取用户的写作任务历史
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { limit = 20, offset = 0 } = req.query;

    const tasks = await prisma.writingTask.findMany({
      where: { userId },
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

    const total = await prisma.writingTask.count({
      where: { userId },
    });

    res.json({ tasks, total });
  } catch (error) {
    console.error('Get writing tasks error:', error);
    res.status(500).json({ error: 'Failed to get writing tasks' });
  }
});

// 创建新的写作任务并流式生成内容 (SSE)
router.post('/generate/stream', authMiddleware, async (req: AuthRequest, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    const userId = req.user!.userId;
    const {
      query,
      styleId,
      promptId,
      kbScope,
      collectionIds,
    } = req.body;

    if (!query) {
      res.write(`data: ${JSON.stringify({ error: 'Query is required' })}\n\n`);
      res.end();
      return;
    }

    const finalKbScope = kbScope || (collectionIds ? { collectionIds } : null);

    const task = await prisma.writingTask.create({
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
        const style = await prisma.writingStyle.findFirst({
          where: {
            id: styleId,
            OR: [{ userId }, { isPublic: true }],
          },
        });
        if (style) styleContent = style.content;
      }

      let promptContent = '';
      if (promptId) {
        const prompt = await prisma.promptTemplate.findFirst({
          where: {
            id: promptId,
            OR: [{ userId }, { isPublic: true }],
          },
        });
        if (prompt) promptContent = prompt.content;
      }

      const relevantChunks = await retrieveRelevantChunks(
        query,
        finalKbScope as any,
        userId
      );

      const contextText = relevantChunks.join('\n\n---\n\n');
      const renderedPromptContent = promptContent
        ? renderPromptTemplate(promptContent, { query, context: contextText })
        : '';

      const systemPrompt = `你是一个专业的写作助手。${styleContent ? `\n\n参考写作风格示例：\n${styleContent}` : ''
        }${renderedPromptContent ? `\n\n${renderedPromptContent}` : ''}

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

      for await (const chunk of streamText([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ], { maxTokens: 4096, temperature: 0.7 })) {
        fullContent += chunk;
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
      }

      const result = await prisma.writingOutput.create({
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

      await prisma.writingTask.update({
        where: { id: task.id },
        data: { status: 'succeeded' },
      });

      res.write(`data: ${JSON.stringify({ type: 'done', outputId: result.id, tokens: totalTokens })}\n\n`);
      res.end();
    } catch (error: any) {
      await prisma.writingTask.update({
        where: { id: task.id },
        data: { status: 'failed' },
      });
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message || 'Generation failed' })}\n\n`);
      res.end();
    }
  } catch (error: any) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message || 'Failed to create task' })}\n\n`);
    res.end();
  }
});

// 获取单个写作任务详情
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const task = await prisma.writingTask.findFirst({
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
  } catch (error) {
    console.error('Get writing task error:', error);
    res.status(500).json({ error: 'Failed to get writing task' });
  }
});

// 创建新的写作任务并生成内容
router.post('/generate', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const {
      query,
      styleId,
      promptId,
      kbScope, // { documentIds: [...], collectionIds: [...] }
      collectionIds, // 向后兼容
    } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // 向后兼容旧的 collectionIds 字段
    const finalKbScope = kbScope || (collectionIds ? { collectionIds } : null);

    // 创建任务记录
    const task = await prisma.writingTask.create({
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
        const style = await prisma.writingStyle.findFirst({
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
        const prompt = await prisma.promptTemplate.findFirst({
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

      // 3. 检索相关知识
      const relevantChunks = await retrieveRelevantChunks(
        query,
        finalKbScope as any,
        userId
      );

      const contextText = relevantChunks.join('\n\n---\n\n');
      const renderedPromptContent = promptContent
        ? renderPromptTemplate(promptContent, { query, context: contextText })
        : '';

      // 4. 构建 LLM 提示
      // 系统提示词：角色定义 + 写作风格 + 写作要求/提示词
      const systemPrompt = `你是一个专业的写作助手。${styleContent ? `\n\n参考写作风格示例：\n${styleContent}` : ''
        }${renderedPromptContent ? `\n\n${renderedPromptContent}` : ''
        }

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
      const result = await generateText([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ], {
        maxTokens: 4096,
        temperature: 0.7,
      });

      // 6. 保存输出及生成过程元数据
      const output = await prisma.writingOutput.create({
        data: {
          taskId: task.id,
          content: result.content,
          tokens: result.tokens,
          metadata: {
            systemPrompt,
            userPrompt,
            retrievedChunks: relevantChunks.map((chunk: string, index: number) => ({
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
      await prisma.writingTask.update({
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
    } catch (error) {
      // 更新任务状态为失败
      await prisma.writingTask.update({
        where: { id: task.id },
        data: {
          status: 'failed',
        },
      });

      throw error;
    }
  } catch (error) {
    console.error('Generate writing error:', error);
    res.status(500).json({ error: 'Failed to generate content' });
  }
});

// 删除写作任务
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existingTask = await prisma.writingTask.findFirst({
      where: { id, userId },
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Writing task not found' });
    }

    await prisma.writingTask.delete({
      where: { id },
    });

    res.json({ message: 'Writing task deleted successfully' });
  } catch (error) {
    console.error('Delete writing task error:', error);
    res.status(500).json({ error: 'Failed to delete writing task' });
  }
});

export default router;
