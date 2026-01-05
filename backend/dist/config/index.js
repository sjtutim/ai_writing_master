"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
exports.config = {
    server: {
        port: parseInt(process.env.PORT || '3001', 10),
        env: process.env.NODE_ENV || 'development',
    },
    postgres: {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || '',
        database: process.env.POSTGRES_DB || 'kb',
    },
    minio: {
        endPoint: process.env.MINIO_ENDPOINT || 'localhost',
        port: parseInt(process.env.MINIO_PORT || '9000', 10),
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey: process.env.MINIO_ACCESS_KEY || '',
        secretKey: process.env.MINIO_SECRET_KEY || '',
        bucket: process.env.MINIO_BUCKET || 'dify-bucket',
        // 文件类型通过路径前缀区分
        prefixes: {
            raw: 'kb-raw',
            md: 'kb-md',
            outputs: 'outputs',
        },
    },
    embedding: {
        apiUrl: process.env.EMBEDDING_API_URL || 'http://localhost:1234/v1/embeddings',
        model: process.env.EMBEDDING_MODEL || 'text-embedding-bge-m3',
    },
    chunking: {
        // 单块最大字符数（增大以保留更多上下文）
        chunkSize: parseInt(process.env.CHUNK_SIZE || '1500', 10),
        // 块之间的重叠字符数
        overlap: parseInt(process.env.CHUNK_OVERLAP || '150', 10),
        // 向量化批处理大小（每批处理的分块数量）
        embeddingBatchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE || '5', 10),
        // 批次之间的延迟（毫秒），防止请求过快
        embeddingBatchDelay: parseInt(process.env.EMBEDDING_BATCH_DELAY || '500', 10),
    },
    deepseek: {
        baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
        apiKey: process.env.DEEPSEEK_API_KEY || '',
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'default-secret',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
    redis: {
        url: process.env.REDIS_URL || '',
    },
};
//# sourceMappingURL=index.js.map