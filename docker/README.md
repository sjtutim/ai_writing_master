# AI4Write Docker Deployment

## 目录结构

```
docker/
├── docker-compose.yml    # Docker Compose 主配置文件
├── .env                  # 环境变量配置 (需要根据实际情况修改)
├── .env.example          # 环境变量示例
└── README.md             # 本文档
```

## 架构说明

本 Docker 配置部署 **前端** 和 **后端** 应用，以下服务需要使用外部部署：

| 服务 | 说明 | 必需 |
|------|------|------|
| PostgreSQL | 数据库，需安装 pgvector 扩展 | ✅ |
| MinIO | 对象存储 | ✅ |
| Redis | 缓存服务 | ⚠️ 可选 |
| Embedding API | BGE-M3 向量服务 | ✅ |
| LLM API | DeepSeek/vLLM | ✅ |

## 快速开始

### 1. 前置条件

确保以下外部服务已部署并可访问：
- PostgreSQL (需安装 pgvector 扩展)
- MinIO
- Redis (可选)
- Embedding API
- LLM API

### 2. 配置环境变量

```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑 .env 文件，配置外部服务连接信息
vim .env
```

**必须配置的项目：**

```bash
# PostgreSQL 连接
POSTGRES_HOST=your-postgres-host    # 或 host.docker.internal 连接宿主机
POSTGRES_PORT=5432
POSTGRES_USER=ai4write
POSTGRES_PASSWORD=your-password
POSTGRES_DB=kb

# MinIO 连接
MINIO_ENDPOINT=your-minio-host      # 或 host.docker.internal 连接宿主机
MINIO_PORT=9000
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=ai4write

# Redis 连接
REDIS_HOST=your-redis-host          # 或 host.docker.internal 连接宿主机
REDIS_PORT=6379

# API 配置
EMBEDDING_API_URL=http://your-embedding-host:1234/v1/embeddings
DEEPSEEK_API_KEY=your-api-key
JWT_SECRET=your-jwt-secret
```

### 3. 构建并启动服务

```bash
# 构建镜像并启动
docker-compose up -d --build
```

### 4. 初始化数据库

首次启动后，运行数据库迁移：

```bash
# 进入后端容器
docker exec -it ai4write-backend sh

# 运行数据库迁移
npx prisma migrate deploy

# 运行数据库种子（如需要）
npx prisma db seed
```

### 5. 访问服务

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:3000 |
| 后端 API | http://localhost:3001 |

## 连接宿主机服务

如果外部服务运行在宿主机上，使用 `host.docker.internal` 作为主机名：

```bash
POSTGRES_HOST=host.docker.internal
MINIO_ENDPOINT=host.docker.internal
REDIS_HOST=host.docker.internal
```

## 常用命令

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend

# 停止服务
docker-compose down

# 重新构建镜像
docker-compose build --no-cache

# 重启单个服务
docker-compose restart backend
```

## 故障排除

### 无法连接外部服务

1. 确认外部服务已启动并监听正确端口
2. 检查防火墙/安全组规则
3. 如果使用 `host.docker.internal`，确保 Docker 版本支持此特性

### 后端服务无法启动

```bash
# 检查后端日志
docker-compose logs backend

# 确认环境变量
docker exec -it ai4write-backend env | grep -E "(POSTGRES|MINIO|REDIS)"
```
