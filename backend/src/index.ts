import express from 'express';
import cors from 'cors';
import { config } from './config';
import { testPrismaConnection, disconnectPrisma } from './services/prisma';
import { testMinioConnection, ensureBucket } from './services/minio';
import { testEmbeddingConnection } from './services/embedding';
import { testLLMConnection } from './services/llm';
import { startWorker } from './services/worker';

// Import routes
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import collectionsRoutes from './routes/collections';
import documentsRoutes from './routes/documents';
import writingStylesRoutes from './routes/writing-styles';
import writingTasksRoutes from './routes/writing-tasks';
import promptTemplatesRoutes from './routes/prompt-templates';
import usersRoutes from './routes/users';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 确保所有响应使用 UTF-8 编码
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/collections', collectionsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/writing-styles', writingStylesRoutes);
app.use('/api/writing-tasks', writingTasksRoutes);
app.use('/api/prompt-templates', promptTemplatesRoutes);
app.use('/api/users', usersRoutes);

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
  console.log('Environment:', config.server.env);

  // Test connections
  console.log('\n--- Testing Connections ---');

  const dbConnected = await testPrismaConnection();
  await testMinioConnection();
  await ensureBucket();
  await testEmbeddingConnection();
  await testLLMConnection();

  console.log('--- Connection Tests Complete ---\n');

  // Start job worker
  if (dbConnected) {
    startWorker();
  }

  // Start server
  const server = app.listen(config.server.port, () => {
    console.log(`Server running on http://localhost:${config.server.port}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down...');
    await disconnectPrisma();
    server.close();
  });
}

startServer().catch(console.error);
