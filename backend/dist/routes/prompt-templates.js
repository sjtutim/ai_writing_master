"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../services/prisma");
const router = express_1.default.Router();
// 获取所有提示词模板
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
        const templates = await prisma_1.prisma.promptTemplate.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: {
                favorites: {
                    where: { userId: userId },
                    select: { id: true }
                }
            }
        });
        res.json(templates.map(t => ({
            id: t.id,
            name: t.name,
            content: t.content,
            category: t.category,
            isPublic: t.isPublic,
            isFavorite: t.favorites.length > 0,
            userId: t.userId,
        })));
    }
    catch (error) {
        console.error('Get prompt templates error:', error);
        res.status(500).json({ error: 'Failed to fetch prompt templates' });
    }
});
// 获取单个提示词模板
router.get('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const template = await prisma_1.prisma.promptTemplate.findFirst({
            where: {
                id,
                OR: [
                    { userId },
                    { isPublic: true }
                ]
            },
        });
        if (!template) {
            return res.status(404).json({ error: 'Prompt template not found' });
        }
        const favorite = await prisma_1.prisma.promptTemplateFavorite.findUnique({
            where: { userId_templateId: { userId, templateId: id } }
        });
        res.json({
            id: template.id,
            name: template.name,
            content: template.content,
            category: template.category,
            isPublic: template.isPublic,
            isFavorite: !!favorite,
            userId: template.userId,
        });
    }
    catch (error) {
        console.error('Get prompt template error:', error);
        res.status(500).json({ error: 'Failed to fetch prompt template' });
    }
});
// 创建提示词模板
router.post('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { name, content, category, isPublic } = req.body;
        if (!name || !content) {
            return res.status(400).json({ error: 'Name and content are required' });
        }
        const template = await prisma_1.prisma.promptTemplate.create({
            data: {
                userId,
                name,
                content,
                category: category || null,
                isPublic: isPublic || false,
            },
        });
        res.status(201).json({
            message: 'Prompt template created successfully',
            template,
        });
    }
    catch (error) {
        console.error('Create prompt template error:', error);
        res.status(500).json({ error: 'Failed to create prompt template' });
    }
});
// 更新提示词模板
router.put('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const { name, content, category, isPublic } = req.body;
        const template = await prisma_1.prisma.promptTemplate.findFirst({
            where: { id, userId },
        });
        if (!template) {
            return res.status(404).json({ error: 'Prompt template not found or permission denied' });
        }
        const updated = await prisma_1.prisma.promptTemplate.update({
            where: { id },
            data: {
                name,
                content,
                category,
                isPublic,
            },
        });
        res.json({
            message: 'Prompt template updated successfully',
            template: updated,
        });
    }
    catch (error) {
        console.error('Update prompt template error:', error);
        res.status(500).json({ error: 'Failed to update prompt template' });
    }
});
// 删除提示词模板
router.delete('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const template = await prisma_1.prisma.promptTemplate.findFirst({
            where: { id, userId },
        });
        if (!template) {
            return res.status(404).json({ error: 'Prompt template not found or permission denied' });
        }
        await prisma_1.prisma.promptTemplate.delete({
            where: { id },
        });
        res.json({ message: 'Prompt template deleted successfully' });
    }
    catch (error) {
        console.error('Delete prompt template error:', error);
        res.status(500).json({ error: 'Failed to delete prompt template' });
    }
});
// 切换收藏状态
router.post('/:id/toggle-favorite', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const template = await prisma_1.prisma.promptTemplate.findFirst({
            where: {
                id,
                OR: [{ userId }, { isPublic: true }],
            },
        });
        if (!template) {
            return res.status(404).json({ error: 'Prompt template not found' });
        }
        const existing = await prisma_1.prisma.promptTemplateFavorite.findUnique({
            where: { userId_templateId: { userId, templateId: id } }
        });
        if (existing) {
            await prisma_1.prisma.promptTemplateFavorite.delete({
                where: { id: existing.id }
            });
            res.json({ isFavorite: false });
        }
        else {
            await prisma_1.prisma.promptTemplateFavorite.create({
                data: { userId, templateId: id }
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
//# sourceMappingURL=prompt-templates.js.map