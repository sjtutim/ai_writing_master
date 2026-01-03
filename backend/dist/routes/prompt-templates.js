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
        const templates = await prisma_1.prisma.promptTemplate.findMany({
            where: {
                OR: [
                    { userId },
                    { isPublic: true }
                ]
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(templates.map(t => ({
            id: t.id,
            name: t.name,
            content: t.content,
            category: t.category,
            isPublic: t.isPublic,
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
        res.json({
            id: template.id,
            name: template.name,
            content: template.content,
            category: template.category,
            isPublic: template.isPublic,
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
        // 检查权限
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
        // 检查权限
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
exports.default = router;
//# sourceMappingURL=prompt-templates.js.map