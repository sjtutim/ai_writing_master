# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI4Write is a local RAG (Retrieval-Augmented Generation) writing system. Users can upload Word/TXT documents which are converted to Markdown, chunked, vectorized (bge-m3), and stored in PostgreSQL with pgvector. Writing tasks use the knowledge base + LLM (DeepSeek) to generate content.

## Commands

```bash
# Start both frontend (3000) and backend (3001)
npm run dev

# Start individually
npm run dev:backend
npm run dev:frontend

# Build both
npm run build

# Database
cd backend && npm run prisma:generate  # Generate Prisma client
npm run prisma:push                    # Push schema to database
npm run prisma:studio                  # Open Prisma GUI
npm run prisma:seed                    # Seed database
```

## Architecture

### Data Flow
1. **Upload**: Document → MinIO (raw) → Create job (parse)
2. **Parse**: Worker downloads from MinIO → mammoth (Word→Markdown) → MinIO (md) → Create job (chunk)
3. **Chunk**: Split Markdown into chunks (500 chars, 50 overlap) → Save to DB → Create job (embed)
4. **Embed**: Batch call bge-m3 API → Store 1024-dim vectors in pgvector
5. **Write**: User query → pgvector search (topK+MMR) → Prompt + context → DeepSeek → Output

### Key Services
- **Backend** (`backend/src/`): Express + TypeScript on port 3001
  - `services/worker.ts`: Database-driven job worker (5s polling interval)
  - `services/embedding.ts`: bge-m3 HTTP API for embeddings
  - `services/llm.ts`: DeepSeek (OpenAI-compatible) API
  - `services/minio.ts`: File storage (buckets: kb-raw, kb-md, outputs)
- **Frontend** (`frontend/`): Nuxt 3 + Vue 3 + Pinia + TailwindCSS on port 3000
- **Database**: PostgreSQL with pgvector extension (tables prefixed with `kb_`, `writing_`, `job`)

### Route Structure
- `POST /api/auth/*` - Authentication
- `POST /api/documents/upload` - Upload Word/TXT (multer, 50MB limit)
- `POST /api/documents/paste` - Paste text content
- `GET /api/writing-tasks/*` - Writing task management

## User & Permission Management

### RBAC Model
- **Users**: Authenticated via email/password, JWT token-based sessions
- **Roles**: `admin` (all permissions), `user` (basic permissions)
- **Permissions**: Menu/button-level access control

### Default Accounts
| Email | Password | Role | Permissions |
|-------|----------|------|-------------|
| admin@ai4write.local | admin123 | admin | All permissions |
| test@ai4write.local | user123 | user | kb, kb:read, kb:write, writing, writing:create, prompts, prompts:manage |

### Permission Codes
| Code | Type | Description |
|------|------|-------------|
| `kb` | menu | Knowledge base module |
| `kb:read` | button | View knowledge base |
| `kb:write` | button | Edit knowledge base |
| `kb:delete` | button | Delete knowledge base |
| `writing` | menu | Writing workspace |
| `writing:create` | button | Create writing tasks |
| `prompts` | menu | Prompt templates |
| `prompts:manage` | button | Manage prompts |
| `weekly` | menu | Weekly reports (placeholder) |
| `system` | menu | System management |
| `system:users` | menu | User management |
| `system:roles` | menu | Role management |

### Auth Flow
1. `POST /api/auth/register` - New user registration
2. `POST /api/auth/login` - Login, returns JWT token + user info with roles/permissions
3. `GET /api/auth/me` - Get current user profile
4. JWT token expires in 7 days (configurable via `JWT_EXPIRES_IN`)
5. All API routes require `Authorization: Bearer <token>` header

## Tech Stack
- Frontend: Nuxt 3, Vue 3, Pinia, TailwindCSS
- Backend: Express, TypeScript, Prisma, OpenAI SDK
- Storage: PostgreSQL (pgvector), MinIO
- External APIs: DeepSeek (chat), bge-m3 (embeddings)

## Conventions
- MinIO paths: `{bucket}/kb-raw|md|outputs/{userId}/{documentId}/{version}/filename`
- Document status: `pending` → `processing` → `ready` | `failed`
- Job types: `parse` → `chunk` → `embed`
