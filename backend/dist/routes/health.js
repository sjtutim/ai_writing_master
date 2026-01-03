"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../services/prisma");
const minio_1 = require("../services/minio");
const embedding_1 = require("../services/embedding");
const llm_1 = require("../services/llm");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    const checks = {
        database: await (0, prisma_1.testPrismaConnection)(),
        minio: await (0, minio_1.testMinioConnection)(),
        embedding: await (0, embedding_1.testEmbeddingConnection)(),
        llm: await (0, llm_1.testLLMConnection)(),
    };
    const allHealthy = Object.values(checks).every(Boolean);
    res.status(allHealthy ? 200 : 503).json({
        status: allHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: checks,
    });
});
router.get('/ping', (req, res) => {
    res.json({ message: 'pong', timestamp: new Date().toISOString() });
});
exports.default = router;
//# sourceMappingURL=health.js.map