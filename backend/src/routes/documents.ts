import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../services/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { uploadToMinio, convertWordToMarkdown, splitTextToChunks } from '../services/document';
import { getEmbeddings } from '../services/embedding';
import { deleteFolder, getPresignedUrl, downloadFile } from '../services/minio';
import { config } from '../config';

const router = Router();

// 解码文件名（处理中文编码问题）
function decodeFilename(filename: string): string {
  try {
    // multer 使用 Latin1 编码读取文件名，需要转换为 UTF-8
    return Buffer.from(filename, 'latin1').toString('utf-8');
  } catch {
    return filename;
  }
}

// 配置 multer 用于文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'text/plain', // .txt
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型，仅支持 .docx, .doc, .txt'));
    }
  },
});

// 获取用户的所有文档
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    const documents = await prisma.kbDocument.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    res.json(documents);
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to get documents' });
  }
});

// 获取单个文档详情
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const document = await prisma.kbDocument.findFirst({
      where: { id, userId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          include: {
            chunks: {
              select: {
                id: true,
                chunkIndex: true,
                content: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(document);
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: 'Failed to get document' });
  }
});

// 上传文档
router.post('/upload', authMiddleware, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const file = req.file;
    const { title, collectionId } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // 解码文件名处理中文
    const originalFilename = decodeFilename(file.originalname);
    const docTitle = title || originalFilename.replace(/\.[^/.]+$/, '');

    // 创建文档记录
    const document = await prisma.kbDocument.create({
      data: {
        userId,
        title: docTitle,
        collectionId: collectionId || null,
        status: 'processing',
      },
    });

    // 创建版本记录
    const version = await prisma.kbDocumentVersion.create({
      data: {
        documentId: document.id,
        version: 1,
        status: 'processing',
      },
    });

    // 上传原始文件到 MinIO
    const rawPath = await uploadToMinio(
      'raw',
      userId,
      document.id,
      1,
      originalFilename,
      file.buffer,
      file.mimetype
    );

    // 更新版本的 rawPath
    await prisma.kbDocumentVersion.update({
      where: { id: version.id },
      data: { rawPath },
    });

    // 创建处理任务
    await prisma.job.create({
      data: {
        type: 'parse',
        status: 'pending',
        payload: {
          documentId: document.id,
          versionId: version.id,
          userId,
          rawPath,
          filename: originalFilename,
          mimetype: file.mimetype,
        },
      },
    });

    res.status(201).json({
      message: 'Document uploaded successfully',
      document: {
        id: document.id,
        title: document.title,
        status: document.status,
      },
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// 上传文本（粘贴）
router.post('/paste', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { title, content, collectionId } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'No content provided' });
    }

    const docTitle = title || `粘贴文本 ${new Date().toLocaleString('zh-CN')}`;

    // 创建文档记录
    const document = await prisma.kbDocument.create({
      data: {
        userId,
        title: docTitle,
        collectionId: collectionId || null,
        status: 'processing',
      },
    });

    // 创建版本记录
    const version = await prisma.kbDocumentVersion.create({
      data: {
        documentId: document.id,
        version: 1,
        status: 'processing',
      },
    });

    // 直接保存为 Markdown
    const mdPath = await uploadToMinio(
      'md',
      userId,
      document.id,
      1,
      'document.md',
      content,
      'text/markdown'
    );

    // 更新版本
    await prisma.kbDocumentVersion.update({
      where: { id: version.id },
      data: { mdPath },
    });

    // 创建分块任务（跳过解析）
    await prisma.job.create({
      data: {
        type: 'chunk',
        status: 'pending',
        payload: {
          documentId: document.id,
          versionId: version.id,
          userId,
          mdPath,
          content, // 直接传递内容
        },
      },
    });

    res.status(201).json({
      message: 'Text uploaded successfully',
      document: {
        id: document.id,
        title: document.title,
        status: document.status,
      },
    });
  } catch (error) {
    console.error('Paste text error:', error);
    res.status(500).json({ error: 'Failed to save text' });
  }
});

// 删除文档
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const document = await prisma.kbDocument.findFirst({
      where: { id, userId },
      include: {
        versions: {
          select: {
            rawPath: true,
            mdPath: true,
          },
        },
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // 删除数据库记录（级联删除 versions 和 chunks）
    await prisma.kbDocument.delete({
      where: { id },
    });

    // 删除 MinIO 文件（后台异步删除，不影响响应）
    const deleteMinioFiles = async () => {
      try {
        // 删除该文档的所有文件夹
        // 路径格式：kb-raw/userId/docId/, kb-md/userId/docId/
        const prefixes = [
          `kb-raw/${userId}/${id}/`,
          `kb-md/${userId}/${id}/`,
          `outputs/${userId}/${id}/`,
        ];

        for (const prefix of prefixes) {
          try {
            await deleteFolder(config.minio.bucket, prefix);
          } catch (err) {
            console.error(`Failed to delete folder ${prefix}:`, err);
          }
        }
      } catch (error) {
        console.error('MinIO cleanup error:', error);
      }
    };

    // 后台执行删除
    deleteMinioFiles();

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// 手动触发处理（重新处理失败的文档）
router.post('/:id/reprocess', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const document = await prisma.kbDocument.findFirst({
      where: { id, userId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const latestVersion = document.versions[0];
    if (!latestVersion) {
      return res.status(400).json({ error: 'No version found' });
    }

    // 更新状态为处理中
    await prisma.kbDocument.update({
      where: { id },
      data: { status: 'processing' },
    });

    await prisma.kbDocumentVersion.update({
      where: { id: latestVersion.id },
      data: { status: 'processing', error: null },
    });

    // 根据当前状态决定从哪一步开始
    let jobType = 'parse';
    if (latestVersion.mdPath) {
      jobType = 'chunk';
    }

    await prisma.job.create({
      data: {
        type: jobType,
        status: 'pending',
        payload: {
          documentId: document.id,
          versionId: latestVersion.id,
          userId,
          rawPath: latestVersion.rawPath,
          mdPath: latestVersion.mdPath,
        },
      },
    });

    res.json({ message: 'Reprocessing started' });
  } catch (error) {
    console.error('Reprocess error:', error);
    res.status(500).json({ error: 'Failed to start reprocessing' });
  }
});

// 下载原文文件
router.get('/:id/download/raw', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const document = await prisma.kbDocument.findFirst({
      where: { id, userId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const latestVersion = document.versions[0];
    if (!latestVersion?.rawPath) {
      return res.status(404).json({ error: 'Raw file not found' });
    }

    const url = await getPresignedUrl(config.minio.bucket, latestVersion.rawPath, 3600);
    res.json({ url, filename: document.title });
  } catch (error) {
    console.error('Download raw error:', error);
    res.status(500).json({ error: 'Failed to get download URL' });
  }
});

// 获取 Markdown 预览内容
router.get('/:id/preview/md', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const document = await prisma.kbDocument.findFirst({
      where: { id, userId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const latestVersion = document.versions[0];
    if (!latestVersion?.mdPath) {
      return res.status(404).json({ error: 'Markdown file not found' });
    }

    const content = await downloadFile(config.minio.bucket, latestVersion.mdPath);
    res.json({
      title: document.title,
      content: content.toString('utf-8'),
      version: latestVersion.version,
    });
  } catch (error) {
    console.error('Preview md error:', error);
    res.status(500).json({ error: 'Failed to get preview' });
  }
});

// 获取 Markdown 下载 URL
router.get('/:id/download/md', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const document = await prisma.kbDocument.findFirst({
      where: { id, userId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const latestVersion = document.versions[0];
    if (!latestVersion?.mdPath) {
      return res.status(404).json({ error: 'Markdown file not found' });
    }

    const url = await getPresignedUrl(config.minio.bucket, latestVersion.mdPath, 3600);
    res.json({ url, filename: `${document.title}.md` });
  } catch (error) {
    console.error('Download md error:', error);
    res.status(500).json({ error: 'Failed to get download URL' });
  }
});

export default router;
