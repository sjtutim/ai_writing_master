"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../services/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// List all users (admin only)
router.get('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const users = await prisma_1.prisma.user.findMany({
            include: {
                userRoles: {
                    include: {
                        role: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(users.map(u => ({
            id: u.id,
            email: u.email,
            name: u.name,
            status: u.status,
            createdAt: u.createdAt,
            roles: u.userRoles.map(ur => ur.role),
        })));
    }
    catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});
// Get single user
router.get('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id },
            include: {
                userRoles: {
                    include: {
                        role: true,
                    },
                },
            },
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            status: user.status,
            createdAt: user.createdAt,
            roles: user.userRoles.map(ur => ({
                id: ur.role.id,
                name: ur.role.name,
            })),
        });
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});
// Create new user (admin only)
router.post('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const { email, password, name, roleId, status } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const existingUser = await prisma_1.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.prisma.user.create({
            data: {
                email,
                passwordHash,
                name: name || null,
                status: status || 'active',
            },
        });
        if (roleId) {
            await prisma_1.prisma.userRole.create({
                data: {
                    userId: user.id,
                    roleId,
                },
            });
        }
        res.status(201).json({
            id: user.id,
            email: user.email,
            name: user.name,
            status: user.status,
        });
    }
    catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});
// Update user (admin only)
router.put('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { email, name, status, roleId } = req.body;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id },
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (email && email !== user.email) {
            const existingUser = await prisma_1.prisma.user.findUnique({
                where: { email },
            });
            if (existingUser) {
                return res.status(400).json({ error: 'Email already in use' });
            }
        }
        const updateData = {};
        if (email)
            updateData.email = email;
        if (name !== undefined)
            updateData.name = name;
        if (status)
            updateData.status = status;
        const updatedUser = await prisma_1.prisma.user.update({
            where: { id },
            data: updateData,
        });
        if (roleId) {
            await prisma_1.prisma.userRole.deleteMany({
                where: { userId: id },
            });
            await prisma_1.prisma.userRole.create({
                data: {
                    userId: id,
                    roleId,
                },
            });
        }
        res.json({
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            status: updatedUser.status,
        });
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});
// Reset user password (admin only)
router.post('/:id/reset-password', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id },
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        await prisma_1.prisma.user.update({
            where: { id },
            data: { passwordHash },
        });
        res.json({ message: 'Password reset successfully' });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});
// Delete user (admin only)
router.delete('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user.userId;
        if (id === currentUserId) {
            return res.status(400).json({ error: 'Cannot delete yourself' });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id },
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        await prisma_1.prisma.user.delete({
            where: { id },
        });
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});
// Get all roles
router.get('/meta/roles', auth_1.authMiddleware, async (req, res) => {
    try {
        const roles = await prisma_1.prisma.role.findMany({
            orderBy: { name: 'asc' },
        });
        res.json(roles);
    }
    catch (error) {
        console.error('Get roles error:', error);
        res.status(500).json({ error: 'Failed to get roles' });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map