import express from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { prisma } from '../services/prisma';

const router = express.Router();

// 获取所有写作风格
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    const styles = await prisma.writingStyle.findMany({
      where: {
        OR: [
          { userId },
          { isPublic: true }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true }
        }
      }
    });

    res.json(styles);
  } catch (error) {
    console.error('Get writing styles error:', error);
    res.status(500).json({ error: 'Failed to fetch writing styles' });
  }
});

// 获取单个写作风格
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const style = await prisma.writingStyle.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { isPublic: true }
        ]
      },
    });

    if (!style) {
      return res.status(404).json({ error: 'Writing style not found' });
    }

    res.json(style);
  } catch (error) {
    console.error('Get writing style error:', error);
    res.status(500).json({ error: 'Failed to fetch writing style' });
  }
});

// 创建写作风格
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { name, content, isPublic } = req.body;

    if (!name || !content) {
      return res.status(400).json({ error: 'Name and content are required' });
    }

    const style = await prisma.writingStyle.create({
      data: {
        userId,
        name,
        content,
        isPublic: isPublic || false,
      },
    });

    res.status(201).json({
      message: 'Writing style created successfully',
      style,
    });
  } catch (error) {
    console.error('Create writing style error:', error);
    res.status(500).json({ error: 'Failed to create writing style' });
  }
});

// 更新写作风格
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { name, content, isPublic } = req.body;

    // 检查权限
    const style = await prisma.writingStyle.findFirst({
      where: { id, userId },
    });

    if (!style) {
      return res.status(404).json({ error: 'Writing style not found or permission denied' });
    }

    const updated = await prisma.writingStyle.update({
      where: { id },
      data: {
        name,
        content,
        isPublic,
      },
    });

    res.json({
      message: 'Writing style updated successfully',
      style: updated,
    });
  } catch (error) {
    console.error('Update writing style error:', error);
    res.status(500).json({ error: 'Failed to update writing style' });
  }
});

// 删除写作风格
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    // 检查权限
    const style = await prisma.writingStyle.findFirst({
      where: { id, userId },
    });

    if (!style) {
      return res.status(404).json({ error: 'Writing style not found or permission denied' });
    }

    await prisma.writingStyle.delete({
      where: { id },
    });

    res.json({ message: 'Writing style deleted successfully' });
  } catch (error) {
    console.error('Delete writing style error:', error);
    res.status(500).json({ error: 'Failed to delete writing style' });
  }
});

export default router;
