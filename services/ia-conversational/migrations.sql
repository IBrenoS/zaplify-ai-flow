-- IA Conversational Service - Database Migration
-- Creates tables and indexes for RAG functionality with pgvector

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create schema for tenant isolation (example for tenant 'demo')
-- In practice, you would create this dynamically per tenant
CREATE SCHEMA IF NOT EXISTS tenant_demo;

-- Function to create tenant-specific RAG tables
CREATE OR REPLACE FUNCTION create_tenant_rag_tables(tenant_schema_name TEXT)
RETURNS VOID AS $$
BEGIN
    -- Create documents table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            metadata JSONB DEFAULT ''{}''::jsonb,
            source TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )', tenant_schema_name);

    -- Create embeddings table with pgvector
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.embeddings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            document_id UUID NOT NULL REFERENCES %I.documents(id) ON DELETE CASCADE,
            chunk_index INTEGER NOT NULL,
            content TEXT NOT NULL,
            embedding vector(1536), -- OpenAI embedding dimension
            metadata JSONB DEFAULT ''{}''::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )', tenant_schema_name, tenant_schema_name);

    -- Create assistant configurations table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.assistant_configs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id TEXT NOT NULL,
            name TEXT NOT NULL,
            config JSONB NOT NULL,
            status TEXT DEFAULT ''active'',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )', tenant_schema_name);

    -- Create indexes for performance

    -- Document indexes
    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_%I_documents_created_at
        ON %I.documents(created_at DESC)',
        replace(tenant_schema_name, 'tenant_', ''), tenant_schema_name);

    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_%I_documents_metadata
        ON %I.documents USING GIN(metadata)',
        replace(tenant_schema_name, 'tenant_', ''), tenant_schema_name);

    -- Embedding indexes
    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_%I_embeddings_document_id
        ON %I.embeddings(document_id)',
        replace(tenant_schema_name, 'tenant_', ''), tenant_schema_name);

    -- Vector similarity index (HNSW for better performance)
    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_%I_embeddings_vector_hnsw
        ON %I.embeddings USING hnsw (embedding vector_cosine_ops)',
        replace(tenant_schema_name, 'tenant_', ''), tenant_schema_name);

    -- Alternative: IVFFlat index (if HNSW is not available)
    -- EXECUTE format('
    --     CREATE INDEX IF NOT EXISTS idx_%I_embeddings_vector_ivf
    --     ON %I.embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)',
    --     replace(tenant_schema_name, 'tenant_', ''), tenant_schema_name);

    -- Assistant config indexes
    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_%I_assistant_configs_tenant_id
        ON %I.assistant_configs(tenant_id)',
        replace(tenant_schema_name, 'tenant_', ''), tenant_schema_name);

    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_%I_assistant_configs_status
        ON %I.assistant_configs(status)',
        replace(tenant_schema_name, 'tenant_', ''), tenant_schema_name);

END;
$$ LANGUAGE plpgsql;

-- Create tables for demo tenant
SELECT create_tenant_rag_tables('tenant_demo');

-- Alternative table structure for prefix-based isolation
-- (if using table prefixes instead of schemas)

CREATE TABLE IF NOT EXISTS rag_demo_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rag_demo_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES rag_demo_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rag_demo_assistant_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    config JSONB NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for prefix-based tables
CREATE INDEX IF NOT EXISTS idx_rag_demo_documents_created_at ON rag_demo_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rag_demo_documents_metadata ON rag_demo_documents USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_rag_demo_embeddings_document_id ON rag_demo_embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_rag_demo_embeddings_vector_hnsw ON rag_demo_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_rag_demo_assistant_configs_tenant_id ON rag_demo_assistant_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rag_demo_assistant_configs_status ON rag_demo_assistant_configs(status);

-- Example queries for testing vector similarity

-- Insert test document and embedding
-- INSERT INTO rag_demo_documents (title, content, source)
-- VALUES ('Test Document', 'This is a test document about AI and machine learning.', 'test.pdf');

-- Example similarity search query (would be used by RAG service)
-- SELECT
--     d.title,
--     d.content,
--     e.content as chunk_content,
--     e.embedding <=> '[0.1, 0.2, ...]'::vector as distance
-- FROM rag_demo_embeddings e
-- JOIN rag_demo_documents d ON e.document_id = d.id
-- ORDER BY e.embedding <=> '[0.1, 0.2, ...]'::vector
-- LIMIT 5;

-- Function to search similar embeddings
CREATE OR REPLACE FUNCTION search_similar_embeddings(
    tenant_prefix TEXT,
    query_embedding vector(1536),
    similarity_threshold FLOAT DEFAULT 0.8,
    max_results INTEGER DEFAULT 5
)
RETURNS TABLE (
    document_id UUID,
    chunk_content TEXT,
    similarity_score FLOAT,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY EXECUTE format('
        SELECT
            e.document_id,
            e.content::TEXT,
            (1 - (e.embedding <=> $1))::FLOAT as similarity_score,
            e.metadata
        FROM %I e
        WHERE (1 - (e.embedding <=> $1)) > $2
        ORDER BY e.embedding <=> $1
        LIMIT $3',
        'rag_' || tenant_prefix || '_embeddings'
    ) USING query_embedding, similarity_threshold, max_results;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust as needed)
-- GRANT USAGE ON SCHEMA tenant_demo TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA tenant_demo TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA tenant_demo TO your_app_user;
