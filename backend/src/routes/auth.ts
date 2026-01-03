import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../services/prisma';
import { config } from '../config';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { CacheService } from '../services/redis';

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
    const signOptions: SignOptions = { expiresIn: config.jwt.expiresIn as any };
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwt.secret,
      signOptions
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

    // 优化：只查询必要的用户信息
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        passwordHash: true,
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

    // 优化：尝试从Redis缓存获取角色和权限
    const cacheKey = CacheService.keys.userAuth(user.id);
    let rolesData: Array<{ id: string; name: string }> = [];
    let permissionsData: Array<{ code: string; name: string; type: string }> = [];

    const cachedAuth = await CacheService.get<{
      roles: Array<{ id: string; name: string }>;
      permissions: Array<{ code: string; name: string; type: string }>;
    }>(cacheKey);

    if (cachedAuth) {
      // 从缓存获取
      rolesData = cachedAuth.roles;
      permissionsData = cachedAuth.permissions;
    } else {
      // 从数据库查询
      rolesData = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
        SELECT DISTINCT r.id, r.name
        FROM "roles" r
        INNER JOIN "user_roles" ur ON ur."role_id" = r.id
        WHERE ur."user_id" = ${user.id}
      `;

      permissionsData = await prisma.$queryRaw<Array<{ code: string; name: string; type: string }>>`
        SELECT DISTINCT p.code, p.name, p.type
        FROM "permissions" p
        INNER JOIN "role_permissions" rp ON rp."permission_id" = p.id
        INNER JOIN "user_roles" ur ON ur."role_id" = rp."role_id"
        WHERE ur."user_id" = ${user.id}
      `;

      // 缓存角色和权限信息（1小时）
      await CacheService.set(cacheKey, { roles: rolesData, permissions: permissionsData }, 3600);
    }

    // Generate token
    const signOptions: SignOptions = { expiresIn: config.jwt.expiresIn as any };
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwt.secret,
      signOptions
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status,
        roles: rolesData,
        permissions: permissionsData,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password (self-service)
router.post('/change-password', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: '当前密码和新密码均为必填项' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码长度至少为 6 位' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true, status: true },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (user.status === 'disabled') {
      return res.status(403).json({ error: '账号已被禁用' });
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return res.status(400).json({ error: '当前密码不正确' });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      return res.status(400).json({ error: '新密码不能与当前密码相同' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // 清除用户缓存
    await CacheService.del([
      CacheService.keys.userAuth(userId),
      CacheService.keys.userProfile(userId),
    ]);

    res.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.userId;

    // 优化：尝试从Redis缓存获取用户信息
    const cacheKey = CacheService.keys.userProfile(userId);
    const cachedProfile = await CacheService.get<{
      id: string;
      email: string;
      name: string | null;
      status: string;
      createdAt: Date;
      roles: Array<{ id: string; name: string }>;
      permissions: Array<{ code: string; name: string; type: string }>;
    }>(cacheKey);

    if (cachedProfile) {
      return res.json(cachedProfile);
    }

    // 优化：只查询必要的用户基本信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 优化：使用原始SQL查询获取角色和权限
    const rolesData = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
      SELECT DISTINCT r.id, r.name
      FROM "Role" r
      INNER JOIN "UserRole" ur ON ur."roleId" = r.id
      WHERE ur."userId" = ${userId}
    `;

    const permissionsData = await prisma.$queryRaw<Array<{ code: string; name: string; type: string }>>`
      SELECT DISTINCT p.code, p.name, p.type
      FROM "Permission" p
      INNER JOIN "RolePermission" rp ON rp."permissionId" = p.id
      INNER JOIN "UserRole" ur ON ur."roleId" = rp."roleId"
      WHERE ur."userId" = ${userId}
    `;

    const result = {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      createdAt: user.createdAt,
      roles: rolesData,
      permissions: permissionsData,
    };

    // 缓存用户信息（30分钟）
    await CacheService.set(cacheKey, result, 1800);

    res.json(result);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
