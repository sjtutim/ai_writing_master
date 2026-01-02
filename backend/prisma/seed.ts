import { PrismaClient } from '../src/generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 开始初始化数据库种子数据...');

    // 1. 创建权限
    const permissions = await Promise.all([
        // 知识库模块
        prisma.permission.upsert({
            where: { code: 'kb' },
            update: {},
            create: { code: 'kb', name: '知识库管理', type: 'menu', path: '/kb', icon: 'folder', sortOrder: 1 },
        }),
        prisma.permission.upsert({
            where: { code: 'kb:read' },
            update: {},
            create: { code: 'kb:read', name: '查看知识库', type: 'button', sortOrder: 1 },
        }),
        prisma.permission.upsert({
            where: { code: 'kb:write' },
            update: {},
            create: { code: 'kb:write', name: '编辑知识库', type: 'button', sortOrder: 2 },
        }),
        prisma.permission.upsert({
            where: { code: 'kb:delete' },
            update: {},
            create: { code: 'kb:delete', name: '删除知识库', type: 'button', sortOrder: 3 },
        }),
        // 写作模块
        prisma.permission.upsert({
            where: { code: 'writing' },
            update: {},
            create: { code: 'writing', name: '写作工作台', type: 'menu', path: '/writing', icon: 'edit', sortOrder: 2 },
        }),
        prisma.permission.upsert({
            where: { code: 'writing:create' },
            update: {},
            create: { code: 'writing:create', name: '创建写作任务', type: 'button', sortOrder: 1 },
        }),
        // 提示词模块
        prisma.permission.upsert({
            where: { code: 'prompts' },
            update: {},
            create: { code: 'prompts', name: '提示词管理', type: 'menu', path: '/prompts', icon: 'message', sortOrder: 3 },
        }),
        prisma.permission.upsert({
            where: { code: 'prompts:manage' },
            update: {},
            create: { code: 'prompts:manage', name: '管理提示词', type: 'button', sortOrder: 1 },
        }),
        // 周报模块（占位）
        prisma.permission.upsert({
            where: { code: 'weekly' },
            update: {},
            create: { code: 'weekly', name: '周报管理', type: 'menu', path: '/weekly', icon: 'calendar', sortOrder: 4 },
        }),
        // 系统管理
        prisma.permission.upsert({
            where: { code: 'system' },
            update: {},
            create: { code: 'system', name: '系统管理', type: 'menu', path: '/system', icon: 'settings', sortOrder: 10 },
        }),
        prisma.permission.upsert({
            where: { code: 'system:users' },
            update: {},
            create: { code: 'system:users', name: '用户管理', type: 'menu', path: '/system/users', sortOrder: 1 },
        }),
        prisma.permission.upsert({
            where: { code: 'system:roles' },
            update: {},
            create: { code: 'system:roles', name: '角色管理', type: 'menu', path: '/system/roles', sortOrder: 2 },
        }),
    ]);
    console.log(`✅ 创建了 ${permissions.length} 个权限`);

    // 2. 创建角色
    const adminRole = await prisma.role.upsert({
        where: { name: 'admin' },
        update: {},
        create: {
            name: 'admin',
            description: '系统管理员，拥有所有权限',
            isAdmin: true,
        },
    });

    const userRole = await prisma.role.upsert({
        where: { name: 'user' },
        update: {},
        create: {
            name: 'user',
            description: '普通用户，拥有基础功能权限',
            isAdmin: false,
        },
    });
    console.log('✅ 创建了 admin 和 user 角色');

    // 3. 为角色分配权限
    // 管理员拥有所有权限
    for (const perm of permissions) {
        await prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: {
                    roleId: adminRole.id,
                    permissionId: perm.id,
                },
            },
            update: {},
            create: {
                roleId: adminRole.id,
                permissionId: perm.id,
            },
        });
    }

    // 普通用户只有基础权限（知识库、写作、提示词）
    const userPermCodes = ['kb', 'kb:read', 'kb:write', 'writing', 'writing:create', 'prompts', 'prompts:manage'];
    const userPerms = permissions.filter(p => userPermCodes.includes(p.code));
    for (const perm of userPerms) {
        await prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: {
                    roleId: userRole.id,
                    permissionId: perm.id,
                },
            },
            update: {},
            create: {
                roleId: userRole.id,
                permissionId: perm.id,
            },
        });
    }
    console.log('✅ 角色权限分配完成');

    // 4. 创建管理员用户
    const passwordHash = await bcrypt.hash('admin123', 10);
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@ai4write.local' },
        update: {},
        create: {
            email: 'admin@ai4write.local',
            passwordHash,
            name: '系统管理员',
            status: 'active',
        },
    });

    // 分配管理员角色
    await prisma.userRole.upsert({
        where: {
            userId_roleId: {
                userId: adminUser.id,
                roleId: adminRole.id,
            },
        },
        update: {},
        create: {
            userId: adminUser.id,
            roleId: adminRole.id,
        },
    });
    console.log('✅ 创建了管理员用户: admin@ai4write.local / admin123');

    // 5. 创建测试普通用户
    const testUserHash = await bcrypt.hash('user123', 10);
    const testUser = await prisma.user.upsert({
        where: { email: 'test@ai4write.local' },
        update: {},
        create: {
            email: 'test@ai4write.local',
            passwordHash: testUserHash,
            name: '测试用户',
            status: 'active',
        },
    });

    await prisma.userRole.upsert({
        where: {
            userId_roleId: {
                userId: testUser.id,
                roleId: userRole.id,
            },
        },
        update: {},
        create: {
            userId: testUser.id,
            roleId: userRole.id,
        },
    });
    console.log('✅ 创建了测试用户: test@ai4write.local / user123');

    // 6. 创建示例提示词模板
    await prisma.promptTemplate.upsert({
        where: { id: 'default-writing-prompt' },
        update: {},
        create: {
            id: 'default-writing-prompt',
            userId: adminUser.id,
            name: '通用写作模板',
            category: '通用',
            isPublic: true,
            content: `你是一个专业的写作助手。请根据以下背景知识和用户需求，撰写一篇专业、结构清晰的文章。

## 背景知识
{{context}}

## 用户需求
{{query}}

## 写作要求
1. 内容准确，基于提供的背景知识
2. 结构清晰，使用合适的标题层级
3. 语言专业，符合学术/技术写作规范
4. 适当引用背景知识中的关键信息

请开始撰写：`,
        },
    });

    await prisma.promptTemplate.upsert({
        where: { id: 'medical-writing-prompt' },
        update: {},
        create: {
            id: 'medical-writing-prompt',
            userId: adminUser.id,
            name: '医学写作模板',
            category: '医学',
            isPublic: true,
            content: `你是一位资深的医学内容撰写专家。请根据提供的医学文献和资料，撰写专业的医学文章。

## 参考文献与资料
{{context}}

## 写作主题
{{query}}

## 写作规范
1. 使用规范的医学术语
2. 确保医学信息的准确性和时效性
3. 遵循循证医学原则
4. 标注关键数据和结论的来源
5. 对于不确定的信息要注明

请开始撰写：`,
        },
    });
    console.log('✅ 创建了示例提示词模板');

    console.log('\n🎉 数据库种子数据初始化完成！');
}

main()
    .catch((e) => {
        console.error('❌ 初始化失败:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
