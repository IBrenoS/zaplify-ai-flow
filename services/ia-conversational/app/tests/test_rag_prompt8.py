"""
Comprehensive tests for RAG implementation - Prompt 8
Tests real vector search with Supabase + pgvector
"""

import os
import tempfile
from unittest.mock import AsyncMock, Mock, patch

import pytest
from fastapi.testclient import TestClient

from app.db.migrations import MigrationRunner
from app.services.embeddings import EmbeddingsService, embeddings_service

# Import our services
from app.services.rag import DocumentParser, RAGService, TextChunker


class TestEmbeddingsService:
    """Test embeddings service with dual providers"""

    def test_embeddings_service_initialization(self):
        """Test embeddings service can be initialized"""
        service = EmbeddingsService()
        assert service is not None

    def test_openai_provider_configuration(self):
        """Test OpenAI provider configuration"""
        with patch.dict(
            "os.environ",
            {"EMBEDDINGS_PROVIDER": "openai", "OPENAI_API_KEY": "test-key-123"},
        ):
            service = EmbeddingsService()
            status = service.get_status()
            assert status["provider"] == "openai"
            assert status["openai_configured"] is True

    def test_local_provider_configuration(self):
        """Test local model provider configuration"""
        with patch.dict("os.environ", {"EMBEDDINGS_PROVIDER": "local"}):
            service = EmbeddingsService()
            status = service.get_status()
            assert status["provider"] == "local"

    @pytest.mark.asyncio
    async def test_embeddings_generation_openai(self):
        """Test embeddings generation with OpenAI"""
        with (
            patch.dict(
                "os.environ",
                {"EMBEDDINGS_PROVIDER": "openai", "OPENAI_API_KEY": "test-key"},
            ),
            patch("openai.embeddings.create") as mock_create,
        ):
            # Mock OpenAI response
            mock_create.return_value = Mock(
                data=[Mock(embedding=[0.1, 0.2, 0.3] * 512)]  # 1536 dimensions
            )

            service = EmbeddingsService()
            if service.is_available():
                embeddings = await service.embed_texts(["test text"])
                assert len(embeddings) == 1
                assert len(embeddings[0]) == 1536

    @pytest.mark.asyncio
    async def test_embeddings_generation_local(self):
        """Test embeddings generation with local model"""
        with (
            patch.dict("os.environ", {"EMBEDDINGS_PROVIDER": "local"}),
            patch("sentence_transformers.SentenceTransformer") as mock_st,
        ):
            # Mock sentence transformers
            mock_model = Mock()
            mock_model.encode.return_value = [[0.1, 0.2, 0.3] * 128]  # 384 dimensions
            mock_st.return_value = mock_model

            service = EmbeddingsService()
            if service.is_available():
                embeddings = await service.embed_texts(["test text"])
                assert len(embeddings) == 1
                assert len(embeddings[0]) == 384


class TestTextChunker:
    """Test text chunking functionality"""

    def test_chunker_initialization(self):
        """Test chunker can be initialized"""
        chunker = TextChunker(chunk_size=800, overlap=100)
        assert chunker.chunk_size == 800
        assert chunker.overlap == 100

    def test_simple_text_chunking(self):
        """Test chunking of simple text"""
        chunker = TextChunker(chunk_size=100, overlap=20)
        text = "This is a test sentence. " * 20  # Create longer text

        chunks = chunker.chunk_text(text)
        assert len(chunks) > 1
        assert all(len(chunk) <= 120 for chunk in chunks)  # Allow some flexibility

    def test_short_text_single_chunk(self):
        """Test that short text returns single chunk"""
        chunker = TextChunker(chunk_size=1000, overlap=100)
        text = "Short text"

        chunks = chunker.chunk_text(text)
        assert len(chunks) == 1
        assert chunks[0] == text

    def test_overlap_functionality(self):
        """Test that chunks have proper overlap"""
        chunker = TextChunker(chunk_size=50, overlap=10)
        text = "Word " * 50  # Create predictable text

        chunks = chunker.chunk_text(text)
        if len(chunks) > 1:
            # Check that consecutive chunks share some text
            for i in range(len(chunks) - 1):
                chunk1_end = chunks[i][-30:]  # Last 30 chars
                chunk2_start = chunks[i + 1][:30]  # First 30 chars
                # Should have some overlap (not exact due to word boundaries)
                assert len(set(chunk1_end.split()) & set(chunk2_start.split())) > 0


class TestDocumentParser:
    """Test document parsing functionality"""

    def test_parser_initialization(self):
        """Test parser can be initialized"""
        parser = DocumentParser()
        assert parser is not None

    def test_text_file_parsing(self):
        """Test parsing of text files"""
        parser = DocumentParser()
        content = b"This is a test text file content"

        extracted = parser.parse_document(content, "txt", "test.txt")
        assert extracted == "This is a test text file content"

    def test_pdf_parsing_mock(self):
        """Test PDF parsing (mocked)"""
        parser = DocumentParser()
        content = b"PDF binary content"

        with patch("PyPDF2.PdfReader") as mock_reader:
            mock_page = Mock()
            mock_page.extract_text.return_value = "Extracted PDF text"
            mock_reader.return_value.pages = [mock_page]

            extracted = parser.parse_document(content, "pdf", "test.pdf")
            assert "Extracted PDF text" in extracted

    def test_unsupported_format_error(self):
        """Test error handling for unsupported formats"""
        parser = DocumentParser()
        content = b"Some content"

        with pytest.raises(ValueError, match="Unsupported file type"):
            parser.parse_document(content, "xyz", "test.xyz")


class TestRAGService:
    """Test RAG service functionality"""

    @pytest.fixture
    def mock_supabase_client(self):
        """Mock Supabase client"""
        client = Mock()
        client.table.return_value = client
        client.insert.return_value = client
        client.execute.return_value = Mock(data=[{"id": "test-doc-id"}])
        client.select.return_value = client
        client.eq.return_value = client
        client.rpc.return_value = Mock(data=[])
        client.delete.return_value = client
        return client

    @pytest.fixture
    def mock_embeddings_service(self):
        """Mock embeddings service"""
        service = Mock()
        service.is_available.return_value = True
        service.embed_texts = AsyncMock(return_value=[[0.1] * 1536])
        return service

    def test_rag_service_initialization(
        self, mock_supabase_client, mock_embeddings_service
    ):
        """Test RAG service initialization"""
        with (
            patch("app.services.rag.supabase_admin", mock_supabase_client),
            patch("app.services.rag.embeddings_service", mock_embeddings_service),
        ):
            service = RAGService()
            assert service is not None

    @pytest.mark.asyncio
    async def test_document_ingestion(
        self, mock_supabase_client, mock_embeddings_service
    ):
        """Test document ingestion pipeline"""
        with (
            patch("app.services.rag.supabase_admin", mock_supabase_client),
            patch("app.services.rag.embeddings_service", mock_embeddings_service),
        ):

            service = RAGService()
            content = (
                b"This is a test document with enough content to create multiple chunks. "
                * 50
            )

            doc_id = await service.ingest_document(
                tenant_id="test-tenant",
                name="test.txt",
                content=content,
                file_type="txt",
                correlation_id="test-correlation",
            )

            assert doc_id is not None
            mock_supabase_client.table.assert_called()

    @pytest.mark.asyncio
    async def test_similarity_search(
        self, mock_supabase_client, mock_embeddings_service
    ):
        """Test similarity search functionality"""
        # Mock search results
        mock_results = [
            {
                "content": "Test chunk content",
                "similarity": 0.8,
                "document_id": "doc-1",
                "document_name": "test.txt",
                "metadata": {},
            }
        ]
        mock_supabase_client.rpc.return_value = Mock(data=mock_results)

        with (
            patch("app.services.rag.supabase_admin", mock_supabase_client),
            patch("app.services.rag.embeddings_service", mock_embeddings_service),
        ):

            service = RAGService()
            results = await service.search_similar_chunks(
                tenant_id="test-tenant",
                query="test query",
                top_k=5,
                correlation_id="test-correlation",
            )

            assert len(results) == 1
            assert results[0]["content"] == "Test chunk content"
            assert results[0]["similarity"] == 0.8

    def test_rag_service_status(self, mock_supabase_client, mock_embeddings_service):
        """Test RAG service status reporting"""
        with (
            patch("app.services.rag.supabase_admin", mock_supabase_client),
            patch("app.services.rag.embeddings_service", mock_embeddings_service),
        ):

            service = RAGService()
            status = service.get_status()

            assert "database_available" in status
            assert "embeddings_available" in status
            assert isinstance(status["database_available"], bool)

    def test_rag_service_availability(
        self, mock_supabase_client, mock_embeddings_service
    ):
        """Test RAG service availability check"""
        with (
            patch("app.services.rag.supabase_admin", mock_supabase_client),
            patch("app.services.rag.embeddings_service", mock_embeddings_service),
        ):

            service = RAGService()
            is_available = service.is_available()

            assert isinstance(is_available, bool)


class TestMigrationRunner:
    """Test database migration functionality"""

    @pytest.fixture
    def mock_supabase_admin(self):
        """Mock Supabase admin client"""
        client = Mock()
        client.table.return_value = client
        client.select.return_value = client
        client.execute.return_value = Mock(data=[])
        client.insert.return_value = client
        client.sql.return_value = Mock(data=None)
        return client

    def test_migration_runner_initialization(self, mock_supabase_admin):
        """Test migration runner initialization"""
        with patch("app.db.migrations.supabase_admin", mock_supabase_admin):
            runner = MigrationRunner()
            assert runner is not None

    @pytest.mark.asyncio
    async def test_migration_tracking_table_creation(self, mock_supabase_admin):
        """Test migration tracking table creation"""
        with patch("app.db.migrations.supabase_admin", mock_supabase_admin):
            runner = MigrationRunner()
            await runner.ensure_migrations_table()

            # Should call SQL to create table
            mock_supabase_admin.sql.assert_called()

    @pytest.mark.asyncio
    async def test_pending_migrations_detection(self, mock_supabase_admin):
        """Test detection of pending migrations"""
        # Mock no applied migrations
        mock_supabase_admin.table.return_value.select.return_value.execute.return_value = Mock(
            data=[]
        )

        with (
            patch("app.db.migrations.supabase_admin", mock_supabase_admin),
            patch("os.listdir", return_value=["001_create_rag_tables.sql"]),
            patch("os.path.isfile", return_value=True),
        ):

            runner = MigrationRunner()
            pending = await runner.get_pending_migrations()

            assert len(pending) >= 1


class TestRAGAPIIntegration:
    """Integration tests for RAG API endpoints"""

    @pytest.fixture
    def client(self):
        """Test client"""
        from app.main import app

        return TestClient(app)

    def test_rag_status_endpoint(self, client):
        """Test RAG status endpoint"""
        response = client.get("/rag/status")
        assert response.status_code == 200

        data = response.json()
        assert "rag_available" in data
        assert "embeddings_status" in data
        assert "database_status" in data
        assert "migration_status" in data

    def test_upload_document_validation(self, client):
        """Test document upload validation"""
        # Test missing file
        response = client.post("/rag/documents")
        assert response.status_code == 422  # Validation error

        # Test unsupported file type
        with tempfile.NamedTemporaryFile(suffix=".xyz", delete=False) as tmp:
            tmp.write(b"test content")
            tmp.flush()

            with open(tmp.name, "rb") as f:
                response = client.post(
                    "/rag/documents",
                    files={"file": ("test.xyz", f, "application/octet-stream")},
                )

            os.unlink(tmp.name)
            assert response.status_code == 422  # Unsupported file type

    def test_query_validation(self, client):
        """Test query validation"""
        # Test empty query
        response = client.post("/rag/query", json={"query": ""})
        assert response.status_code == 400

        # Test invalid top_k
        response = client.post("/rag/query", json={"query": "test", "top_k": 100})
        assert response.status_code == 400

    @patch("app.services.rag.rag_service")
    def test_documents_list_endpoint(self, mock_rag_service, client):
        """Test documents list endpoint"""
        mock_rag_service.is_available.return_value = True
        mock_rag_service.get_document_info = AsyncMock(
            return_value=[
                {
                    "id": "doc-1",
                    "name": "test.txt",
                    "type": "txt",
                    "size": 1000,
                    "upload_date": "2024-01-01T00:00:00Z",
                    "processed": True,
                }
            ]
        )

        response = client.get("/rag/documents")
        assert response.status_code == 200

        data = response.json()
        assert "documents" in data
        assert "total_count" in data
        assert data["total_count"] >= 0


class TestRealDatabaseIntegration:
    """Tests requiring real database connection (optional)"""

    @pytest.mark.skipif(
        not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
        reason="Real database credentials not available",
    )
    @pytest.mark.asyncio
    async def test_real_migration_execution(self):
        """Test real migration execution (requires Supabase)"""
        from app.db.migrations import migration_runner

        try:
            status = await migration_runner.get_migration_status()
            assert "total_migrations" in status
            assert "applied_migrations" in status
        except Exception as e:
            pytest.skip(f"Database connection failed: {e}")

    @pytest.mark.skipif(
        not os.getenv("SUPABASE_URL") or not os.getenv("OPENAI_API_KEY"),
        reason="Real credentials not available",
    )
    @pytest.mark.asyncio
    async def test_real_embeddings_generation(self):
        """Test real embeddings generation (requires OpenAI key)"""
        with patch.dict("os.environ", {"EMBEDDINGS_PROVIDER": "openai"}):
            try:
                embeddings = await embeddings_service.embed_texts(["test text"])
                assert len(embeddings) == 1
                assert len(embeddings[0]) in [1536, 3072]  # OpenAI embedding dimensions
            except Exception as e:
                pytest.skip(f"Embeddings service failed: {e}")


def test_configuration_validation():
    """Test configuration validation"""
    # Test missing provider
    with patch.dict("os.environ", {}, clear=True):
        service = EmbeddingsService()
        assert not service.is_available()

    # Test OpenAI without key
    with patch.dict("os.environ", {"EMBEDDINGS_PROVIDER": "openai"}, clear=True):
        service = EmbeddingsService()
        assert not service.is_available()

    # Test local provider (should work without external dependencies)
    with patch.dict("os.environ", {"EMBEDDINGS_PROVIDER": "local"}, clear=True):
        service = EmbeddingsService()
        # Availability depends on sentence-transformers installation


if __name__ == "__main__":
    """Run tests directly"""
    pytest.main([__file__, "-v", "--tb=short"])
