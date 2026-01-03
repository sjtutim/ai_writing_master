"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../services/prisma");
const router = express_1.default.Router();
// 获取所有知识库集合
router.get('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const collections = await prisma_1.prisma.kbCollection.findMany({
            where: { userId },
            include: {
                _count: {
                    select: { documents: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(collections);
    }
    catch (error) {
        console.error('Get collections error:', error);
        res.status(500).json({ error: 'Failed to fetch collections' });
    }
});
// 创建知识库集合
router.post('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { name, description, color } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Collection name is required' });
        }
        const collection = await prisma_1.prisma.kbCollection.create({
            data: {
                userId,
                name,
                description,
                color: color || '#3B82F6',
            },
        });
        res.json({
            message: 'Collection created successfully',
            collection,
        });
    }
    catch (error) {
        console.error('Create collection error:', error);
        res.status(500).json({ error: 'Failed to create collection' });
    }
});
// 更新知识库集合
router.put('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const { name, description, color } = req.body;
        // 检查权限
        const collection = await prisma_1.prisma.kbCollection.findFirst({
            where: { id, userId },
        });
        if (!collection) {
            return res.status(404).json({ error: 'Collection not found' });
        }
        const updated = await prisma_1.prisma.kbCollection.update({
            where: { id },
            data: {
                name,
                description,
                color,
            },
        });
        res.json({
            message: 'Collection updated successfully',
            collection: updated,
        });
    }
    catch (error) {
        console.error('Update collection error:', error);
        res.status(500).json({ error: 'Failed to update collection' });
    }
});
// 删除知识库集合
router.delete('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        // 检查权限
        const collection = await prisma_1.prisma.kbCollection.findFirst({
            where: { id, userId },
        });
        if (!collection) {
            return res.status(404).json({ error: 'Collection not found' });
        }
        // 删除集合（文档的 collectionId 会被设置为 null）
        await prisma_1.prisma.kbCollection.delete({
            where: { id },
        });
        res.json({ message: 'Collection deleted successfully' });
    }
    catch (error) {
        console.error('Delete collection error:', error);
        res.status(500).json({ error: 'Failed to delete collection' });
    }
});
// 获取集合的文档列表
router.get('/:id/documents', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        // 检查权限
        const collection = await prisma_1.prisma.kbCollection.findFirst({
            where: { id, userId },
        });
        if (!collection) {
            return res.status(404).json({ error: 'Collection not found' });
        }
        const documents = await prisma_1.prisma.kbDocument.findMany({
            where: { collectionId: id },
            include: {
                versions: {
                    orderBy: { version: 'desc' },
                    take: 1,
                },
            },
            orderBy: { updatedAt: 'desc' },
        });
        res.json(documents);
    }
    catch (error) {
        console.error('Get collection documents error:', error);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
});
exports.default = router;
//# sourceMappingURL=collections.js.map