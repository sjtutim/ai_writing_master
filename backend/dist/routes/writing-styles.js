"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../services/prisma");
const router = express_1.default.Router();
// 获取所有写作风格
router.get('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const showAll = req.query.all === 'true';
        let whereClause;
        if (showAll) {
            whereClause = {
                OR: [
                    { userId: userId },
                    { isPublic: true }
                ]
            };
        }
        else {
            whereClause = {
                OR: [
                    { userId: userId, favorites: { some: { userId: userId } } },
                    { isPublic: true, favorites: { some: { userId: userId } } }
                ]
            };
        }
        const styles = await prisma_1.prisma.writingStyle.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: { name: true }
                },
                favorites: {
                    where: { userId: userId },
                    select: { id: true }
                }
            }
        });
        res.json(styles.map(s => ({
            id: s.id,
            name: s.name,
            content: s.content,
            isPublic: s.isPublic,
            isFavorite: s.favorites.length > 0,
            userId: s.userId,
            user: s.user,
        })));
    }
    catch (error) {
        console.error('Get writing styles error:', error);
        res.status(500).json({ error: 'Failed to fetch writing styles' });
    }
});
// 获取单个写作风格
router.get('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const style = await prisma_1.prisma.writingStyle.findFirst({
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
        const favorite = await prisma_1.prisma.writingStyleFavorite.findUnique({
            where: { userId_styleId: { userId, styleId: id } }
        });
        res.json({
            id: style.id,
            name: style.name,
            content: style.content,
            isPublic: style.isPublic,
            isFavorite: !!favorite,
            userId: style.userId,
        });
    }
    catch (error) {
        console.error('Get writing style error:', error);
        res.status(500).json({ error: 'Failed to fetch writing style' });
    }
});
// 创建写作风格
router.post('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { name, content, isPublic } = req.body;
        if (!name || !content) {
            return res.status(400).json({ error: 'Name and content are required' });
        }
        const style = await prisma_1.prisma.writingStyle.create({
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
    }
    catch (error) {
        console.error('Create writing style error:', error);
        res.status(500).json({ error: 'Failed to create writing style' });
    }
});
// 更新写作风格
router.put('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const { name, content, isPublic } = req.body;
        const style = await prisma_1.prisma.writingStyle.findFirst({
            where: { id, userId },
        });
        if (!style) {
            return res.status(404).json({ error: 'Writing style not found or permission denied' });
        }
        const updated = await prisma_1.prisma.writingStyle.update({
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
    }
    catch (error) {
        console.error('Update writing style error:', error);
        res.status(500).json({ error: 'Failed to update writing style' });
    }
});
// 删除写作风格
router.delete('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const style = await prisma_1.prisma.writingStyle.findFirst({
            where: { id, userId },
        });
        if (!style) {
            return res.status(404).json({ error: 'Writing style not found or permission denied' });
        }
        await prisma_1.prisma.writingStyle.delete({
            where: { id },
        });
        res.json({ message: 'Writing style deleted successfully' });
    }
    catch (error) {
        console.error('Delete writing style error:', error);
        res.status(500).json({ error: 'Failed to delete writing style' });
    }
});
// 切换收藏状态
router.post('/:id/toggle-favorite', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const style = await prisma_1.prisma.writingStyle.findFirst({
            where: {
                id,
                OR: [{ userId }, { isPublic: true }],
            },
        });
        if (!style) {
            return res.status(404).json({ error: 'Writing style not found' });
        }
        const existing = await prisma_1.prisma.writingStyleFavorite.findUnique({
            where: { userId_styleId: { userId, styleId: id } }
        });
        if (existing) {
            await prisma_1.prisma.writingStyleFavorite.delete({
                where: { id: existing.id }
            });
            res.json({ isFavorite: false });
        }
        else {
            await prisma_1.prisma.writingStyleFavorite.create({
                data: { userId, styleId: id }
            });
            res.json({ isFavorite: true });
        }
    }
    catch (error) {
        console.error('Toggle favorite error:', error);
        res.status(500).json({ error: 'Failed to toggle favorite' });
    }
});
exports.default = router;
//# sourceMappingURL=writing-styles.js.map