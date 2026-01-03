import { PrismaClient } from '../generated/prisma';

// 优化：配置Prisma连接池和性能参数
export const prisma = new PrismaClient({
  log: ['warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

export async function testPrismaConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('Prisma database connected successfully');
    return true;
  } catch (error) {
    console.error('Prisma database connection failed:', error);
    return false;
  }
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
