# AI4Write

<div align="center">

![AI4Write](https://img.shields.io/badge/AI4Write-Local%20RAG%20Writing%20System-blue?style=for-the-badge)
![Vue 3](https://img.shields.io/badge/Vue-3.4-42b883?style=flat-square&logo=vue.js)
![Nuxt 3](https://img.shields.io/badge/Nuxt-3.11-00DC82?style=flat-square&logo=nuxt.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat-square&logo=tailwindcss)

**Local RAG-based Intelligent Writing System**

[English](./README_EN.md) | [简体中文](./README.md)

</div>

---

## ✨ Features

- **📚 Knowledge Base Management** - Upload Word/TXT documents, automatically convert to Markdown and store with vector embeddings
- **✍️ Intelligent Writing** - Generate high-quality content using LLM based on knowledge base context
- **🎨 Templates & Styles** - Custom prompt templates and writing styles for flexible output control
- **🔒 Local Deployment** - Fully local operation with complete data control
- **👥 Multi-user Support** - Role-based access control (RBAC) for team collaboration

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Nuxt 3)                         │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌─────────────┐   │
│  │  Pinia    │  │ Tailwind  │  │  Vue 3    │  │  Components │   │
│  └───────────┘  └───────────┘  └───────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Backend (Express + TypeScript)             │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌─────────────┐   │
│  │  Prisma   │  │  JWT Auth │  │  Jobs     │  │  API Routes │   │
│  └───────────┘  └───────────┘  └───────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│   PostgreSQL │    │      MinIO       │    │  bge-m3 API  │
│  (pgvector)  │    │   File Storage   │    │  Embeddings  │
└──────────────┘    └──────────────────┘    └──────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Nuxt 3 + Vue 3 (Composition API) |
| State Management | Pinia |
| UI Styling | Tailwind CSS |
| Backend | Express + TypeScript |
| ORM | Prisma |
| Vector Database | PostgreSQL + pgvector |
| Object Storage | MinIO |
| Text Embedding | BGE-M3 |
| LLM | DeepSeek (OpenAI-compatible API) |

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- PostgreSQL >= 14 (with pgvector extension)
- MinIO (object storage)
- DeepSeek API Key (optional for local deployment)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/ai4write.git
cd ai4write
```

2. **Install dependencies**

```bash
# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && npm install
```

3. **Configure environment variables**

```bash
# Backend configuration
cp backend/.env.example backend/.env
# Edit .env with database connection, MinIO, API keys, etc.
```

4. **Initialize database**

```bash
cd backend
npx prisma generate
npx prisma db push
npm run seed  # Optional: seed test data
```

5. **Start services**

```bash
# Start backend (port 3001)
npm run dev:backend

# In a new terminal, start frontend (port 3000)
cd frontend && npm run dev:frontend
```

6. **Access the application**

Open browser to http://localhost:3000

### Default Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@ai4write.local | admin123 | Administrator |
| test@ai4write.local | user123 | Regular User |

## 📁 Project Structure

```
ai4write/
├── frontend/                 # Nuxt 3 frontend project
│   ├── assets/css/          # Global styles
│   ├── components/          # Vue components
│   ├── layouts/            # Page layouts
│   ├── pages/              # Page routes
│   ├── stores/             # Pinia stores
│   ├── composables/        # Composable functions
│   └── nuxt.config.ts      # Nuxt configuration
│
├── backend/                 # Express backend project
│   ├── src/
│   │   ├── controllers/    # Controllers
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Middleware
│   │   └── prisma/         # Prisma schema
│   └── prisma/             # Database migrations
│
└── README.md               # Project documentation
```

## 🔧 Configuration

### Backend Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ai4write?schema=public"

# JWT
JWT_SECRET="your-jwt-secret-key"
JWT_EXPIRES_IN="7d"

# MinIO
MINIO_ENDPOINT="localhost"
MINIO_PORT=9000
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="ai4write"

# DeepSeek API
DEEPSEEK_API_KEY="sk-xxx"
DEEPSEEK_BASE_URL="https://api.deepseek.com"

# bge-m3 Embedding
BGE_API_URL="http://localhost:8000"
BGE_API_KEY="your-bge-api-key"
```

### Docker Deployment (Optional)

```bash
# Start infrastructure with Docker Compose
docker-compose up -d postgres minio

# Start applications
docker-compose up -d backend frontend
```

## 📖 User Guide

### 1. Create Knowledge Base

1. Navigate to "Knowledge Base" page
2. Click "New Knowledge Base" to create a category Word/TXT documents
3. Upload or paste text directly
4. System automatically parses, vectorizes and stores content

### 2. Start Writing

1. Navigate to "Writing Workspace"
2. Select a prompt template (optional)
3. Enter your writing requirements
4. Select reference knowledge base (optional)
5. Select writing style (optional)
6. Click "Start Generation"

### 3. Manage Templates

Switch to "Template Management" or "Style Management" tabs in "Writing Workspace":

- Create/edit/delete prompt templates
- Manage writing style examples
- Organize templates by categories

## 🛠️ Development Guide

### Adding New Features

```bash
# 1. Add backend API
backend/src/routes/api.ts     # Add route
backend/src/services/user.ts  # Add business logic

# 2. Add frontend page
frontend/pages/admin.vue      # New page
frontend/components/MyComponent.vue  # New component
```

### Database Migrations

```bash
# Create migration
npx prisma migrate dev --name add_user_field

# Deploy migration
npx prisma migrate deploy
```

## 🤝 Contributing

Issues and Pull Requests are welcome!

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Nuxt.js](https://nuxt.com/) - The Vue.js Framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS Framework
- [DeepSeek](https://deepseek.com/) - Large Language Model
- [BGE-M3](https://github.com/FlagOpen/FlagEmbedding) - Embedding Model

---

<div align="center">

**If you find this project helpful, please ⭐ Star to show your support!**

</div>
