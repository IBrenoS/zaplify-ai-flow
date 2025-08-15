# RAG System Setup Guide - Prompt 8 Implementation

## Overview

This is a comprehensive RAG (Retrieval-Augmented Generation) system implementation using Supabase + pgvector for real vector similarity search. The system supports document ingestion, chunking, embedding generation, and semantic search.

## Features

- **Real Vector Database**: Supabase with pgvector extension for cosine similarity search
- **Dual Embeddings Providers**: OpenAI (text-embedding-3-small/large) or local models (sentence-transformers)
- **Document Processing**: PDF and TXT parsing (DOCX/CSV/XLSX marked as TODO)
- **Intelligent Chunking**: Text chunking with configurable size and overlap
- **Tenant Isolation**: Multi-tenant architecture with data isolation
- **Comprehensive Testing**: Unit tests, integration tests, and real API tests

## Prerequisites

### 1. Supabase Setup

- Create a Supabase project at [supabase.com](https://supabase.com)
- Enable the pgvector extension in your database
- Note your project URL and service role key

### 2. Environment Configuration

Create a `.env` file in `services/ia-conversational/`:

```bash
# Database Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Embeddings Configuration
EMBEDDINGS_PROVIDER=openai  # or 'local'

# OpenAI Configuration (if using OpenAI provider)
OPENAI_API_KEY=sk-your-openai-api-key

# Optional: Embedding Model Configuration
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # or text-embedding-3-large
LOCAL_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

# Chunking Configuration (optional)
CHUNK_SIZE=800
CHUNK_OVERLAP=100
```

### 3. Install Dependencies

```bash
cd services/ia-conversational
pip install -r requirements.txt

# For local embeddings (optional)
pip install sentence-transformers

# For PDF parsing
pip install PyPDF2

# For testing
pip install pytest pytest-asyncio
```

## Database Migration

### 1. Run Migrations

The system includes automatic database migration:

```python
from app.db.migrations import migration_runner

# Check migration status
status = await migration_runner.get_migration_status()
print(status)

# Apply pending migrations
pending = await migration_runner.get_pending_migrations()
for migration in pending:
    await migration_runner.apply_migration(migration)
```

### 2. Enable pgvector Extension

In your Supabase SQL editor, run:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### 3. Vector Search Function (Optional)

For optimal performance, add this RPC function in Supabase:

```sql
CREATE OR REPLACE FUNCTION search_similar_chunks(
  query_embedding vector(1536),
  tenant_filter text,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float,
  document_id uuid,
  document_name text,
  chunk_index int,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.content,
    (c.embedding <=> query_embedding) * -1 + 1 as similarity,
    c.document_id,
    d.name as document_name,
    c.idx as chunk_index,
    c.metadata
  FROM chunks c
  JOIN documents d ON c.document_id = d.id
  WHERE c.tenant_id = tenant_filter
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

## Usage Guide

### 1. Check System Status

```bash
curl -X GET "http://localhost:8000/rag/status"
```

Expected response:

```json
{
  "rag_available": true,
  "embeddings_status": {
    "available": true,
    "provider": "openai",
    "model": "text-embedding-3-small"
  },
  "database_status": {
    "database_available": true,
    "pgvector_enabled": true
  },
  "migration_status": {
    "total_migrations": 1,
    "applied_migrations": 1,
    "pending_migrations": 0
  }
}
```

### 2. Upload Documents

```bash
curl -X POST "http://localhost:8000/rag/documents" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@document.pdf"
```

Supported formats:

- **PDF**: Parsed using PyPDF2
- **TXT**: Direct text processing
- **DOCX, CSV, XLSX**: Marked as TODO (will return error with guidance)

### 3. Query Documents

```bash
curl -X POST "http://localhost:8000/rag/query" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the main topic of the documents?",
    "top_k": 5
  }'
```

Response format:

```json
{
  "query": "What is the main topic?",
  "results": [
    {
      "content": "Relevant chunk content...",
      "similarity": 0.85,
      "document_id": "uuid",
      "document_name": "document.pdf",
      "chunk_index": 2,
      "metadata": {}
    }
  ],
  "total_results": 5,
  "processing_time_ms": 245.3
}
```

### 4. List Documents

```bash
curl -X GET "http://localhost:8000/rag/documents"
```

### 5. Delete Documents

```bash
curl -X DELETE "http://localhost:8000/rag/documents/{document-id}"
```

## Testing

### 1. Unit Tests

```bash
cd services/ia-conversational
pytest app/tests/test_rag_prompt8.py::TestEmbeddingsService -v
pytest app/tests/test_rag_prompt8.py::TestTextChunker -v
pytest app/tests/test_rag_prompt8.py::TestDocumentParser -v
```

### 2. Integration Tests

```bash
pytest app/tests/test_rag_prompt8.py::TestRAGService -v
pytest app/tests/test_rag_prompt8.py::TestMigrationRunner -v
```

### 3. API Tests

```bash
pytest app/tests/test_rag_prompt8.py::TestRAGAPIIntegration -v
```

### 4. Real Database Tests (requires credentials)

```bash
# Set real credentials in environment
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-key"
export OPENAI_API_KEY="sk-your-key"

pytest app/tests/test_rag_prompt8.py::TestRealDatabaseIntegration -v
```

### 5. Run All Tests

```bash
pytest app/tests/test_rag_prompt8.py -v
```

## Configuration Options

### Embeddings Providers

#### OpenAI (Recommended for production)

```bash
EMBEDDINGS_PROVIDER=openai
OPENAI_API_KEY=sk-your-key
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # 1536 dimensions, faster
# OPENAI_EMBEDDING_MODEL=text-embedding-3-large  # 3072 dimensions, more accurate
```

#### Local Models (Good for development)

```bash
EMBEDDINGS_PROVIDER=local
LOCAL_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2  # 384 dimensions
# LOCAL_EMBEDDING_MODEL=sentence-transformers/all-mpnet-base-v2  # 768 dimensions
```

### Chunking Configuration

```bash
CHUNK_SIZE=800          # Characters per chunk
CHUNK_OVERLAP=100       # Overlap between chunks
```

### Performance Tuning

```bash
# Batch processing
CHUNK_BATCH_SIZE=50     # Chunks per database batch
EMBEDDING_BATCH_SIZE=10 # Texts per embedding request

# Vector search
VECTOR_SEARCH_TIMEOUT=30  # Seconds
MAX_SEARCH_RESULTS=50     # Maximum results per query
```

## Troubleshooting

### Common Issues

#### 1. "RAG service not available"

- Check EMBEDDINGS_PROVIDER is set
- Verify API keys are correct
- Test database connection

#### 2. "pgvector extension not found"

- Enable pgvector in Supabase dashboard
- Run: `CREATE EXTENSION IF NOT EXISTS vector;`

#### 3. "Embeddings service not available"

- For OpenAI: Check OPENAI_API_KEY
- For local: Install sentence-transformers

#### 4. "Document parsing failed"

- For PDF: Install PyPDF2
- Check file format is supported
- Verify file isn't corrupted

#### 5. "Migration failed"

- Check Supabase connection
- Verify service role key has sufficient permissions
- Check migration files exist

### Debug Mode

Set environment variable for detailed logging:

```bash
LOG_LEVEL=DEBUG
```

### Health Checks

```bash
# Check embeddings service
curl -X GET "http://localhost:8000/rag/status" | jq '.embeddings_status'

# Check database connection
curl -X GET "http://localhost:8000/rag/status" | jq '.database_status'

# Check migrations
curl -X GET "http://localhost:8000/rag/status" | jq '.migration_status'
```

## Production Deployment

### Security

- Use environment variables for all secrets
- Restrict Supabase API keys to necessary permissions
- Implement proper authentication/authorization
- Enable rate limiting

### Performance

- Use pgvector indexes (created automatically)
- Monitor embedding API usage and costs
- Implement caching for frequent queries
- Use connection pooling for database

### Monitoring

- Track embedding generation costs
- Monitor query response times
- Set up alerts for service availability
- Log all document ingestion activities

## API Reference

### Endpoints

#### `GET /rag/status`

Returns system status and configuration

#### `POST /rag/documents`

Upload and ingest documents

- **Input**: multipart/form-data with file
- **Output**: Document metadata and processing status

#### `POST /rag/query`

Query documents using vector similarity

- **Input**: JSON with query and optional top_k
- **Output**: Similar chunks with similarity scores

#### `GET /rag/documents`

List all documents for current tenant

- **Output**: Array of document metadata

#### `DELETE /rag/documents/{id}`

Delete document and all its chunks

- **Output**: Success/failure status

All endpoints support tenant isolation via request headers or middleware.

## Next Steps

1. **Implement remaining parsers**: Add DOCX, CSV, XLSX support
2. **Add answer generation**: Integrate with LLM for answer synthesis
3. **Optimize vector search**: Add metadata filtering and hybrid search
4. **Add caching**: Implement Redis for query caching
5. **Monitor usage**: Add analytics and cost tracking
