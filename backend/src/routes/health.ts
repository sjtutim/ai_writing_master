import { Router } from 'express';
import { testPrismaConnection } from '../services/prisma';
import { testMinioConnection } from '../services/minio';
import { testEmbeddingConnection } from '../services/embedding';
import { testLLMConnection } from '../services/llm';

const router = Router();

router.get('/', async (req, res) => {
  const checks = {
    database: await testPrismaConnection(),
    minio: await testMinioConnection(),
    embedding: await testEmbeddingConnection(),
    llm: await testLLMConnection(),
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

export default router;
