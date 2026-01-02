import { Pool } from 'pg';
import { config } from '../config';

export const pool = new Pool({
  host: config.postgres.host,
  port: config.postgres.port,
  user: config.postgres.user,
  password: config.postgres.password,
  database: config.postgres.database,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('Database connected successfully:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

export async function initDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    // Enable pgvector extension
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');

    // Create tables
    await client.query(`
      -- Users table
      CREATE TABLE IF NOT EXISTS "user" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Roles table
      CREATE TABLE IF NOT EXISTS role (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT
      );

      -- User-Role mapping
      CREATE TABLE IF NOT EXISTS user_role (
        user_id UUID REFERENCES "user"(id) ON DELETE CASCADE,
        role_id UUID REFERENCES role(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, role_id)
      );

      -- Permissions table
      CREATE TABLE IF NOT EXISTS permission (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(20) DEFAULT 'menu'
      );

      -- Role-Permission mapping
      CREATE TABLE IF NOT EXISTS role_permission (
        role_id UUID REFERENCES role(id) ON DELETE CASCADE,
        permission_id UUID REFERENCES permission(id) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_id)
      );

      -- Knowledge base documents
      CREATE TABLE IF NOT EXISTS kb_document (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES "user"(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        latest_version INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Document versions
      CREATE TABLE IF NOT EXISTS kb_document_version (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID REFERENCES kb_document(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        raw_path TEXT,
        md_path TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        error TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Document chunks with vector embedding
      CREATE TABLE IF NOT EXISTS kb_chunk (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        version_id UUID REFERENCES kb_document_version(id) ON DELETE CASCADE,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        embedding vector(1024),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Jobs table for async processing
      CREATE TABLE IF NOT EXISTS job (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        payload JSONB,
        result JSONB,
        retries INTEGER DEFAULT 0,
        error TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Prompt templates
      CREATE TABLE IF NOT EXISTS prompt_template (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES "user"(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Writing tasks
      CREATE TABLE IF NOT EXISTS writing_task (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES "user"(id) ON DELETE CASCADE,
        prompt_id UUID REFERENCES prompt_template(id),
        kb_scope JSONB,
        query TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Writing outputs
      CREATE TABLE IF NOT EXISTS writing_output (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID REFERENCES writing_task(id) ON DELETE CASCADE,
        content_path TEXT,
        content TEXT,
        tokens INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_kb_chunk_embedding ON kb_chunk USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
      CREATE INDEX IF NOT EXISTS idx_kb_document_user ON kb_document(user_id);
      CREATE INDEX IF NOT EXISTS idx_job_status ON job(status);
    `);

    console.log('Database tables initialized successfully');
  } finally {
    client.release();
  }
}
