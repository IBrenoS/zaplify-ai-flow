-- RAG System Tables Migration
-- Creates tables for document storage and vector embeddings with pgvector

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table: stores document metadata and content
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'pdf', 'txt', 'docx', 'csv', 'xlsx', etc.
    size BIGINT NOT NULL, -- file size in bytes
    upload_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    url TEXT, -- file storage URL (if applicable)
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    content TEXT, -- extracted text content
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chunks table: stores text chunks with embeddings
CREATE TABLE IF NOT EXISTS chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    idx INTEGER NOT NULL, -- chunk index within document
    content TEXT NOT NULL,
    embedding VECTOR(1536), -- OpenAI text-embedding-3-small/large dimension
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_processed ON documents(processed);
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_tenant_id ON chunks(tenant_id);

-- Vector similarity index using ivfflat with cosine distance
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_cosine
ON chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_chunks_tenant_embedding ON chunks(tenant_id)
INCLUDE (embedding, content, document_id);

-- RLS (Row Level Security) preparation - commented out for now
/*
-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;

-- Policies for tenant isolation
CREATE POLICY documents_tenant_isolation ON documents
    FOR ALL TO authenticated
    USING (tenant_id = current_setting('app.current_tenant_id', true));

CREATE POLICY chunks_tenant_isolation ON chunks
    FOR ALL TO authenticated
    USING (tenant_id = current_setting('app.current_tenant_id', true));
*/

-- Update trigger for documents.updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
