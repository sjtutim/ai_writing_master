"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const prisma_1 = require("../generated/prisma");
// 使用单例模式，避免开发时热重载创建多个连接
const globalForPrisma = globalThis;
exports.prisma = globalForPrisma.prisma ??
    new prisma_1.PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.prisma;
exports.default = exports.prisma;
//# sourceMappingURL=prisma.js.map