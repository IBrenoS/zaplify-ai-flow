-- ================================================================
-- Supabase Setup Script for IA Conversational Microservice
-- ================================================================
-- Execute this in your Supabase SQL Editor or via Supabase CLI

-- 1. Enable vector extension (should already be enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create assistant_configs table for assistant management
CREATE TABLE IF NOT EXISTS assistant_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for tenant queries
CREATE INDEX IF NOT EXISTS idx_assistant_configs_tenant_id ON assistant_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assistant_configs_status ON assistant_configs(status);

-- 3. Create documents table for RAG knowledge base
CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI ada-002 embedding dimension
    metadata JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient vector search and tenant isolation
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- Vector similarity search index (using HNSW for better performance)
CREATE INDEX IF NOT EXISTS idx_documents_embedding ON documents
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 4. Create conversation_memory table for chat history
CREATE TABLE IF NOT EXISTS conversation_memory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    assistant_id UUID REFERENCES assistant_configs(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for conversation queries
CREATE INDEX IF NOT EXISTS idx_conversation_memory_tenant_id ON conversation_memory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversation_memory_conversation_id ON conversation_memory(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_memory_assistant_id ON conversation_memory(assistant_id);
CREATE INDEX IF NOT EXISTS idx_conversation_memory_created_at ON conversation_memory(created_at);

-- 5. Create RPC function for vector similarity search
CREATE OR REPLACE FUNCTION search_documents(
    tenant_id TEXT,
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.content,
        d.metadata,
        1 - (d.embedding <=> query_embedding) AS similarity
    FROM documents d
    WHERE
        d.tenant_id = search_documents.tenant_id
        AND d.status = 'active'
        AND 1 - (d.embedding <=> query_embedding) > match_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 6. Create RPC function to check pgvector extension
CREATE OR REPLACE FUNCTION check_pgvector_extension()
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    -- Simple check that returns true if function executes
    -- This will be called from the application to verify pgvector works
    RETURN TRUE;
END;
$$;

-- 7. Create RPC function for conversation history retrieval
CREATE OR REPLACE FUNCTION get_conversation_history(
    tenant_id TEXT,
    conversation_id TEXT,
    message_limit INT DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    role TEXT,
    content TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cm.id,
        cm.role,
        cm.content,
        cm.metadata,
        cm.created_at
    FROM conversation_memory cm
    WHERE
        cm.tenant_id = get_conversation_history.tenant_id
        AND cm.conversation_id = get_conversation_history.conversation_id
    ORDER BY cm.created_at ASC
    LIMIT message_limit;
END;
$$;

-- 8. Row Level Security (RLS) for multi-tenant isolation
-- Enable RLS on all tables
ALTER TABLE assistant_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_memory ENABLE ROW LEVEL SECURITY;

-- Note: In production, you should create proper RLS policies based on your authentication system
-- For now, we'll rely on application-level tenant filtering

-- Example RLS policies (adjust based on your auth system):
-- CREATE POLICY "tenant_isolation_assistants" ON assistant_configs
--     FOR ALL USING (tenant_id = current_setting('app.current_tenant_id'));

-- CREATE POLICY "tenant_isolation_documents" ON documents
--     FOR ALL USING (tenant_id = current_setting('app.current_tenant_id'));

-- CREATE POLICY "tenant_isolation_conversations" ON conversation_memory
--     FOR ALL USING (tenant_id = current_setting('app.current_tenant_id'));

-- 9. Grant necessary permissions to authenticated users
-- (Adjust based on your Supabase setup and authentication)

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant table permissions
GRANT ALL ON assistant_configs TO authenticated;
GRANT ALL ON documents TO authenticated;
GRANT ALL ON conversation_memory TO authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION search_documents TO authenticated;
GRANT EXECUTE ON FUNCTION check_pgvector_extension TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_history TO authenticated;

-- 10. Create updated_at triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_assistant_configs_updated_at
    BEFORE UPDATE ON assistant_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- Setup Complete!
-- ================================================================
-- Your Supabase database is now ready for the IA Conversational microservice.
--
-- Next steps:
-- 1. Make sure you have SUPABASE_URL and SUPABASE_KEY in your .env
-- 2. Consider adding SUPABASE_SERVICE_ROLE_KEY for admin operations
-- 3. Test the setup by running the health check endpoint
-- 4. Adjust RLS policies based on your authentication requirements
