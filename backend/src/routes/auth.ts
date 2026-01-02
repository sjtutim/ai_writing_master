import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../services/prisma';
import { config } from '../config';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        createdAt: true,
      },
    });

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status,
      },
      token,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user with roles and permissions
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Extract roles and permissions
    const roles = user.userRoles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
    }));

    const permissionSet = new Set<string>();
    const permissions: Array<{ code: string; name: string; type: string }> = [];
    user.userRoles.forEach((ur) => {
      ur.role.rolePermissions.forEach((rp) => {
        if (!permissionSet.has(rp.permission.code)) {
          permissionSet.add(rp.permission.code);
          permissions.push({
            code: rp.permission.code,
            name: rp.permission.name,
            type: rp.permission.type,
          });
        }
      });
    });

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status,
        roles,
        permissions,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Extract roles and permissions
    const roles = user.userRoles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
    }));

    const permissionSet = new Set<string>();
    const permissions: Array<{ code: string; name: string; type: string }> = [];
    user.userRoles.forEach((ur) => {
      ur.role.rolePermissions.forEach((rp) => {
        if (!permissionSet.has(rp.permission.code)) {
          permissionSet.add(rp.permission.code);
          permissions.push({
            code: rp.permission.code,
            name: rp.permission.name,
            type: rp.permission.type,
          });
        }
      });
    });

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      createdAt: user.createdAt,
      roles,
      permissions,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
