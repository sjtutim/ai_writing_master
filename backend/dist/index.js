"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const prisma_1 = require("./services/prisma");
const minio_1 = require("./services/minio");
const embedding_1 = require("./services/embedding");
const llm_1 = require("./services/llm");
const worker_1 = require("./services/worker");
const redis_1 = require("./services/redis");
// Import routes
const health_1 = __importDefault(require("./routes/health"));
const auth_1 = __importDefault(require("./routes/auth"));
const collections_1 = __importDefault(require("./routes/collections"));
const documents_1 = __importDefault(require("./routes/documents"));
const writing_styles_1 = __importDefault(require("./routes/writing-styles"));
const writing_tasks_1 = __importDefault(require("./routes/writing-tasks"));
const prompt_templates_1 = __importDefault(require("./routes/prompt-templates"));
const users_1 = __importDefault(require("./routes/users"));
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// 确保所有响应使用 UTF-8 编码
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});
// 性能监控中间件
app.use((req, res, next) => {
    const startTime = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        // 记录慢请求（超过1秒）
        if (duration > 1000) {
            console.warn(`[SLOW REQUEST] ${req.method} ${req.path} - ${duration}ms`);
        }
        // 记录所有请求（仅在开发环境）
        if (config_1.config.server.env === 'development') {
            console.log(`[${req.method}] ${req.path} - ${duration}ms - ${res.statusCode}`);
        }
    });
    next();
});
// Routes
app.use('/api/health', health_1.default);
app.use('/api/auth', auth_1.default);
app.use('/api/collections', collections_1.default);
app.use('/api/documents', documents_1.default);
app.use('/api/writing-styles', writing_styles_1.default);
app.use('/api/writing-tasks', writing_tasks_1.default);
app.use('/api/prompt-templates', prompt_templates_1.default);
app.use('/api/users', users_1.default);
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'AI4Write API',
        version: '1.0.0',
        status: 'running',
    });
});
async function startServer() {
    console.log('Starting AI4Write Backend...');
    console.log('Environment:', config_1.config.server.env);
    // Test connections
    console.log('\n--- Testing Connections ---');
    const dbConnected = await (0, prisma_1.testPrismaConnection)();
    await (0, minio_1.testMinioConnection)();
    await (0, minio_1.ensureBucket)();
    await (0, embedding_1.testEmbeddingConnection)();
    await (0, llm_1.testLLMConnection)();
    // 初始化 Redis（可选，如果未配置则跳过）
    if (config_1.config.redis.url) {
        await (0, redis_1.initRedis)(config_1.config.redis.url);
    }
    console.log('--- Connection Tests Complete ---\n');
    // Start job worker
    if (dbConnected) {
        (0, worker_1.startWorker)();
    }
    // Start server
    const server = app.listen(config_1.config.server.port, () => {
        console.log(`Server running on http://localhost:${config_1.config.server.port}`);
    });
    // Graceful shutdown
    process.on('SIGTERM', async () => {
        console.log('SIGTERM received, shutting down...');
        await (0, prisma_1.disconnectPrisma)();
        await (0, redis_1.disconnectRedis)();
        server.close();
    });
}
startServer().catch(console.error);
//# sourceMappingURL=index.js.map