# 本地 RAG 写作系统工程化启动方案（方案 A：上传触发）

## 1. 目标与设计原则

### 1.1 系统目标
构建一个完全本地化、可工程化运行的写作型 RAG 系统，实现：
- 用户管理，角色管理，用户权限管理（角色权限控制）可以看到不同的菜单，角色权限控制可以看到不同的模块
知识写作模块
    - 上传 Word 文件，或者黏贴txt文本，转为 Markdown
    - Markdown 作为长期知识资产入库
    - 基于向量检索（RAG）作为隐式背景
    - 通过提示词生成专业文章（根据知识库和提示词来进行专业写作）
周报模块
    - 根据日历来上传文件（word，text黏贴）

### 1.2 核心设计原则
- 业务系统 100% TypeScript
- 模型通过 HTTP API 调用
- Markdown 是唯一长期知识中间格式
- 入库与写作解耦（异步、可扩展）
- 全链路可审计、可回溯

## 2. 总体架构
   - 登录后根据权限可以看到不同的模块：现在有两个模块，知识写作模块和周报模块
   - 每个登录用户可以根据自己上传的知识来管理文件和知识库
   - 写作或者周报的时候可以选择知识库和提示词


## 3. 上传触发式入库流水线
上传 Word → MinIO(raw) → Word→Markdown → MinIO(md) → 分块 → bge-m3 → pgvector

## 4. 存储设计
### 4.1 MinIO Bucket
- dify-bucket

### 4.2 Postgres 核心表
- kb_document
- kb_document_version
- kb_chunk

## 5. Word → Markdown（TypeScript）
使用 mammoth 实现 docx 转 Markdown。

## 6. 向量化（bge-m3 API）
通过 HTTP API 调用 embedding 服务。

## 7. 写作流水线（RAG + vLLM）
pgvector 检索 + Prompt 拼装 + vLLM 生成。

## 8. 前端（Nuxt3）
- 知识库管理
- 写作工作台

## 9. 安全与权限
- Presigned URL
- 前后端密钥隔离

## 10. MVP 组成
Nuxt3 + Node API + Postgres(pgvector) + MinIO + bge-m3 API + vLLM


## 11. 一些配置信息
- MinIO：
    - endpoint: http://10.10.3.6:9000
    - Access Key: 91Q55YMVLFY6672E32C6
    - Secret Key: tC+mcZjRGrdZyRwPU+9+6DSXYtbxKXzF5ejjb+Y7
    - bucket: kb-raw, kb-md, outputs
- Postgres:
    - host: 10.10.3.6
    - port: 5432
    - user: eltadmin
    - password: 112233Ab_
    - database: kb
- bge-m3 API:
    - http://10.10.3.6:1234/v1/embeddings \
     -H "Content-Type: application/json" \
     -d '{
    "model": "text-embedding-bge-m3",
    "input": "Some text to embed"
        }'
- vLLM:
    - endpoint:出于与 OpenAI 兼容考虑，您也可以将 base_url 设置为 https://api.deepseek.com/v1
    - model: deepseek-chat
    - key:sk-661935686b964a6eae7e85750b60a849
    - 举例：
    import OpenAI from "openai";
    const openai = new OpenAI({
            baseURL: 'https://api.deepseek.com',
            apiKey: process.env.DEEPSEEK_API_KEY,
    });
    async function main() {
    const completion = await openai.chat.completions.create({
        messages: [{ role: "system", content: "You are a helpful assistant." }],
        model: "deepseek-chat",
    });
    console.log(completion.choices[0].message.content);
    }

## 12. 细化规划（根据确认的约束）

### 12.1 范围与约束
- 无多租户，仅用户级隔离；不支持 PDF；检索策略默认 topK + MMR；周报模块仅占位（暂不开发）。
- 单机/内网部署假设，Postgres + MinIO + embedding/vLLM 可直连。
- 文档量级：单用户千级文档、百万级分块以内；写作生成可先同步，后续可异步。

### 12.2 前端（Nuxt3）页面
- 登录页、主框架（按角色过滤菜单）。
- 知识库：文档列表（状态标签）、上传对话框、文档详情（版本、任务状态）。
- 提示词管理：列表/新建/编辑。
- 写作工作台：选择知识库+提示词，输入区，结果区，生成历史。
- 周报：仅入口占位，后续再实现。

### 12.3 后端服务拆分（Node/TypeScript）
- Auth & RBAC：登录、角色、权限、菜单/按钮权限下发。
- 文档：上传（Word/TXT/粘贴）、版本查询、状态查询。
- 解析任务：Word→Markdown；分块任务；向量化任务；任务状态查询。
- 检索：pgvector topK+MMR（入参：query, kb_scope, topK, lambda）。
- 写作：提示词 CRUD，生成任务（同步起步），生成结果查询。
- 任务/队列：先用数据库驱动的 worker（定时轮询 job 表），后续可替换为队列（如 BullMQ）。

### 12.4 数据模型（Postgres 草案）
- `user(id, email, password_hash, status, created_at, updated_at)`
- `role(id, name, description)` / `user_role(user_id, role_id)`
- `permission(id, code, name)` / `role_permission(role_id, permission_id)` 用于菜单/按钮。
- `kb_document(id, user_id, title, status[pending|processing|ready|failed], latest_version, created_at, updated_at)`
- `kb_document_version(id, document_id, version, raw_path, md_path, status[pending|processing|ready|failed], error, created_at)`
- `kb_chunk(id, version_id, chunk_index, content, embedding vector, created_at)`
- `job(id, type[parse|chunk|embed|generate], status[pending|running|succeeded|failed], payload jsonb, result jsonb, retries, created_at, updated_at)`
- `prompt_template(id, user_id, name, content, created_at, updated_at)`
- `writing_task(id, user_id, prompt_id, kb_scope jsonb, query, status, created_at)`
- `writing_output(id, task_id, content_path, tokens, created_at)`

### 12.5 核心流程与状态
- 上传：前端上传→MinIO(raw)→写 `kb_document`/`kb_document_version`（pending）→创建 parse 任务。
- 解析：parse 任务 Word→Markdown→MinIO(md)→version.status=processing→成功创建 chunk 任务；失败写 error，文档/版本 failed。
- 分块：chunk 任务按规则切分→写 `kb_chunk`→创建 embed 任务。
- 向量化：embed 任务批量调用 bge-m3→填 embedding→version.status=ready，文档同步 ready。
- 写作：选知识库+提示词→检索→拼 Prompt→调用 vLLM→写 `writing_output`（可通过 job 支持重试）。
- 任务状态机：pending→running→succeeded/failed，支持 retries 计数和 error 记录。

### 12.6 API 草案
- Auth：`POST /auth/login`，`GET /auth/me`
- RBAC：`GET /roles`，`GET /permissions`，`GET /menus`
- 文档：`POST /documents`（上传），`GET /documents`，`GET /documents/:id`，`GET /documents/:id/versions`
- 任务：`GET /jobs/:id`
- 检索：`POST /search`（query, kb_scope, topK, lambda）
- 提示词：`GET/POST/PUT/DELETE /prompts`
- 写作：`POST /writing/tasks`，`GET /writing/tasks/:id`，`GET /writing/outputs/:id`

### 12.7 MinIO 路径约定（单 Bucket: dify-bucket）
- raw：`dify-bucket/kb-raw/{user_id}/{doc_id}/{version}/source.docx`
- md：`dify-bucket/kb-md/{user_id}/{doc_id}/{version}/document.md`
- output：`dify-bucket/outputs/{user_id}/{task_id}/result.md`

### 12.8 里程碑
- MVP：Auth/RBAC、文档上传+解析+分块+向量化、检索+写作生成（同步）、提示词 CRUD、前端基础页面。
- V1：任务重试/审计日志、写作异步化、生成历史、基础指标。
- V2：知识库共享/协作、召回优化（重排/缓存）、周报正式开发。
