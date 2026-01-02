import { PrismaClient } from '../generated/prisma';

export const prisma = new PrismaClient();

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
