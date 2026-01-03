"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.testPrismaConnection = testPrismaConnection;
exports.disconnectPrisma = disconnectPrisma;
const prisma_1 = require("../generated/prisma");
// 优化：配置Prisma连接池和性能参数
exports.prisma = new prisma_1.PrismaClient({
    log: ['warn', 'error'],
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
});
async function testPrismaConnection() {
    try {
        await exports.prisma.$queryRaw `SELECT 1`;
        console.log('Prisma database connected successfully');
        return true;
    }
    catch (error) {
        console.error('Prisma database connection failed:', error);
        return false;
    }
}
async function disconnectPrisma() {
    await exports.prisma.$disconnect();
}
//# sourceMappingURL=prisma.js.map