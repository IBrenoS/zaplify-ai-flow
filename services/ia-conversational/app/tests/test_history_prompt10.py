"""
Tests for Prompt 10 - Learning from Previous Conversations
Tests history indexing, similarity search, and integration with conversation pipeline
"""

import time
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.schemas.assistant import AssistantConfig, ExternalSources
from app.services.history_index import (
    HistoryChunk,
    HistoryIndexService,
)


class TestHistoryChunk:
    """Test HistoryChunk dataclass"""

    def test_chunk_creation(self):
        """Test history chunk creation"""
        chunk = HistoryChunk(
            chunk_id="test-chunk-id",
            tenant_id="test-tenant",
            assistant_id="test-assistant",
            conversation_id="test-conv",
            content="This is a test conversation chunk",
            timestamp=time.time(),
            turn_count=4,
            metadata={"test": "value"},
        )

        assert chunk.chunk_id == "test-chunk-id"
        assert chunk.tenant_id == "test-tenant"
        assert chunk.assistant_id == "test-assistant"
        assert chunk.conversation_id == "test-conv"
        assert chunk.content == "This is a test conversation chunk"
        assert chunk.turn_count == 4
        assert chunk.metadata["test"] == "value"


class TestHistoryIndexService:
    """Test history index service functionality"""

    @pytest.fixture
    def history_service(self):
        """Get history index service instance"""
        return HistoryIndexService()

    def test_service_initialization(self, history_service):
        """Test service initializes correctly"""
        assert history_service.index_prefix == "history"
        assert history_service.chunk_size == 500
        assert history_service.overlap_size == 50
        assert history_service.max_similarity_results == 3

    def test_status(self, history_service):
        """Test service status reporting"""
        status = history_service.get_status()

        assert status["service"] == "history_index"
        assert "embeddings_available" in status
        assert "chunk_size" in status
        assert "max_similarity_results" in status

    def test_format_conversation_for_indexing(self, history_service):
        """Test conversation formatting for indexing"""
        conv_data = {
            "conversation_id": "test-conv",
            "turns": [
                {"role": "user", "content": "Hello"},
                {"role": "assistant", "content": "Hi there!"},
            ],
            "summary": "User greeted assistant",
        }

        formatted = history_service._format_conversation_for_indexing(conv_data)

        assert "Summary: User greeted assistant" in formatted
        assert "User: Hello" in formatted
        assert "Assistant: Hi there!" in formatted

    def test_create_conversation_chunks_single(self, history_service):
        """Test chunking for short conversations"""
        conversation_text = "Short conversation"
        conv_data = {"turns": [{"role": "user", "content": "test"}]}

        chunks = history_service._create_conversation_chunks(
            conversation_text, "test-conv", "test-assistant", "test-tenant", conv_data
        )

        assert len(chunks) == 1
        assert chunks[0].content == conversation_text
        assert chunks[0].metadata["total_chunks"] == 1
        assert chunks[0].metadata["chunk_index"] == 0

    def test_create_conversation_chunks_multiple(self, history_service):
        """Test chunking for long conversations"""
        # Create a long conversation that needs chunking
        long_text = "A" * 600  # Longer than chunk_size (500)
        conv_data = {"turns": [{"role": "user", "content": "test"}]}

        chunks = history_service._create_conversation_chunks(
            long_text, "test-conv", "test-assistant", "test-tenant", conv_data
        )

        assert len(chunks) > 1
        assert chunks[0].metadata["chunk_index"] == 0
        assert chunks[1].metadata["chunk_index"] == 1
        assert chunks[0].metadata["total_chunks"] == len(chunks)

    @pytest.mark.asyncio
    async def test_create_demo_historical_data(self, history_service):
        """Test demo historical data creation"""
        demo_data = await history_service._create_demo_historical_data(
            "test-tenant", "test-assistant"
        )

        assert len(demo_data) == 3  # Should create 3 demo conversations
        for conv in demo_data:
            assert "conversation_id" in conv
            assert "turns" in conv
            assert "summary" in conv
            assert len(conv["turns"]) > 0

    @pytest.mark.asyncio
    async def test_search_similar_history_no_embeddings(self, history_service):
        """Test history search when embeddings unavailable"""
        with patch("app.services.history_index.embeddings_service") as mock_embeddings:
            mock_embeddings.is_available.return_value = False

            results = await history_service.search_similar_history(
                query="test query",
                tenant_id="test-tenant",
                assistant_id="test-assistant",
            )

            assert results == []

    @pytest.mark.asyncio
    async def test_search_similar_history_success(self, history_service):
        """Test successful history search"""
        with (
            patch("app.services.history_index.embeddings_service") as mock_embeddings,
            patch("app.services.history_index.rag_store") as mock_rag,
        ):

            mock_embeddings.is_available.return_value = True
            mock_embeddings.embed_text = AsyncMock(return_value=[0.1, 0.2, 0.3])

            mock_rag.search_similar = AsyncMock(
                return_value=[
                    {
                        "content": "Similar conversation content",
                        "similarity": 0.85,
                        "metadata": {
                            "conversation_id": "similar-conv",
                            "timestamp": time.time(),
                        },
                    }
                ]
            )

            results = await history_service.search_similar_history(
                query="test query",
                tenant_id="test-tenant",
                assistant_id="test-assistant",
            )

            assert len(results) == 1
            assert results[0]["content"] == "Similar conversation content"
            assert results[0]["similarity"] == 0.85
            assert "conversation_id" in results[0]["metadata"]

    @pytest.mark.asyncio
    async def test_index_history_chunk_success(self, history_service):
        """Test successful chunk indexing"""
        chunk = HistoryChunk(
            chunk_id="test-chunk",
            tenant_id="test-tenant",
            assistant_id="test-assistant",
            conversation_id="test-conv",
            content="Test content",
            timestamp=time.time(),
            turn_count=2,
            metadata={},
        )

        with (
            patch("app.services.history_index.embeddings_service") as mock_embeddings,
            patch("app.services.history_index.rag_store") as mock_rag,
        ):

            mock_embeddings.is_available.return_value = True
            mock_embeddings.embed_text = AsyncMock(return_value=[0.1, 0.2, 0.3])
            mock_rag.store_chunk = AsyncMock(return_value=True)

            success = await history_service._index_history_chunk(chunk)

            assert success is True
            mock_rag.store_chunk.assert_called_once()

    @pytest.mark.asyncio
    async def test_reindex_history_integration(self, history_service):
        """Test full reindex operation"""
        with (
            patch("app.services.history_index.embeddings_service") as mock_embeddings,
            patch("app.services.history_index.rag_store") as mock_rag,
        ):

            mock_embeddings.is_available.return_value = True
            mock_embeddings.embed_text = AsyncMock(return_value=[0.1, 0.2, 0.3])
            mock_rag.store_chunk = AsyncMock(return_value=True)

            stats = await history_service.reindex_history(
                tenant_id="test-tenant", assistant_id="test-assistant", force=True
            )

            assert "conversations_processed" in stats
            assert "chunks_created" in stats
            assert "chunks_indexed" in stats
            assert "duration_seconds" in stats
            assert stats["conversations_processed"] >= 0


class TestExternalSourcesSchema:
    """Test external sources schema additions"""

    def test_external_sources_default(self):
        """Test external sources default values"""
        from app.schemas.assistant import ExternalSources

        sources = ExternalSources()
        assert sources.previousConversations is False
        assert sources.knowledgeBase is False

    def test_external_sources_enabled(self):
        """Test external sources with enabled flags"""
        from app.schemas.assistant import ExternalSources

        sources = ExternalSources(previousConversations=True, knowledgeBase=True)
        assert sources.previousConversations is True
        assert sources.knowledgeBase is True

    def test_assistant_config_with_external_sources(self):
        """Test assistant config includes external sources"""
        config = AssistantConfig(
            name="Test Assistant",
            externalSources=ExternalSources(previousConversations=True),
        )

        assert config.externalSources.previousConversations is True
        assert config.externalSources.knowledgeBase is False


class TestConversationIntegration:
    """Test conversation integration with historical insights"""

    @pytest.fixture
    def client(self):
        """Test client"""
        from app.main import app

        return TestClient(app)

    @pytest.fixture
    def mock_assistant_with_history(self):
        """Mock assistant with history enabled"""
        return {
            "id": "test-assistant",
            "name": "Test Assistant",
            "selected_archetype": "professional",
            "personality_instructions": "Be helpful and learn from past conversations",
            "objective": "Help users effectively using historical insights",
            "externalSources": {"previousConversations": True, "knowledgeBase": False},
            "can_qualify": True,
            "can_capture_data": True,
        }

    @patch("app.api.conversation.history_index_service")
    @patch("app.api.conversation.llm_service")
    @patch("app.api.conversation.memory_service")
    def test_conversation_with_history_enabled(
        self, mock_memory, mock_llm, mock_history, client, mock_assistant_with_history
    ):
        """Test conversation with historical insights enabled"""
        # Mock memory service
        mock_memory.append_turn = AsyncMock(return_value=True)
        mock_memory.get_context = AsyncMock(
            return_value={"turns": [], "has_history": False}
        )

        # Mock history service
        mock_history.search_similar_history = AsyncMock(
            return_value=[
                {
                    "content": "Previous conversation about business strategy",
                    "similarity": 0.88,
                    "metadata": {
                        "conversation_id": "hist-123",
                        "timestamp": time.time(),
                    },
                }
            ]
        )

        # Mock LLM service
        mock_llm.is_available.return_value = True
        mock_llm.generate_reply = AsyncMock(
            return_value="Response with historical context"
        )

        # Create assistant
        with patch("app.api.conversation.get_tenant_storage") as mock_storage:
            mock_storage.return_value = {"test-assistant": mock_assistant_with_history}

            response = client.post(
                "/conversation/",
                json={
                    "assistantId": "test-assistant",
                    "message": "I need business advice",
                },
            )

        assert response.status_code == 200

        # Verify history search was called
        mock_history.search_similar_history.assert_called_once()

        # Verify LLM was called with enhanced prompt containing historical insights
        mock_llm.generate_reply.assert_called_once()
        prompt_used = mock_llm.generate_reply.call_args[1]["text"]
        assert "Relevant Past Conversation Insights" in prompt_used

    @patch("app.api.conversation.history_index_service")
    @patch("app.api.conversation.llm_service")
    @patch("app.api.conversation.memory_service")
    def test_conversation_with_history_disabled(
        self, mock_memory, mock_llm, mock_history, client
    ):
        """Test conversation with historical insights disabled"""
        assistant_no_history = {
            "id": "test-assistant",
            "name": "Test Assistant",
            "externalSources": {"previousConversations": False, "knowledgeBase": False},
            "can_qualify": True,
            "can_capture_data": True,
        }

        # Mock services
        mock_memory.append_turn = AsyncMock(return_value=True)
        mock_memory.get_context = AsyncMock(
            return_value={"turns": [], "has_history": False}
        )
        mock_llm.is_available.return_value = True
        mock_llm.generate_reply = AsyncMock(return_value="Standard response")

        with patch("app.api.conversation.get_tenant_storage") as mock_storage:
            mock_storage.return_value = {"test-assistant": assistant_no_history}

            response = client.post(
                "/conversation/",
                json={"assistantId": "test-assistant", "message": "I need help"},
            )

        assert response.status_code == 200

        # Verify history search was NOT called
        mock_history.search_similar_history.assert_not_called()


class TestReindexEndpoint:
    """Test the reindex history endpoint"""

    @pytest.fixture
    def client(self):
        """Test client"""
        from app.main import app

        return TestClient(app)

    def test_reindex_endpoint_assistant_not_found(self, client):
        """Test reindex with non-existent assistant"""
        with patch("app.api.assistants.get_tenant_storage") as mock_storage:
            mock_storage.return_value = {}  # No assistants

            response = client.post("/assistants/nonexistent/reindex-history")

            assert response.status_code == 404
            assert "not found" in response.json()["detail"]

    @patch("app.api.assistants.history_index_service")
    def test_reindex_endpoint_success(self, mock_history_service, client):
        """Test successful reindex operation"""
        mock_stats = {
            "conversations_processed": 5,
            "chunks_created": 15,
            "chunks_indexed": 15,
            "errors": 0,
            "duration_seconds": 2.5,
        }

        mock_history_service.reindex_history = AsyncMock(return_value=mock_stats)

        with patch("app.api.assistants.get_tenant_storage") as mock_storage:
            mock_storage.return_value = {"test-assistant": {"name": "Test"}}

            response = client.post("/assistants/test-assistant/reindex-history")

            assert response.status_code == 200
            data = response.json()

            assert data["message"] == "History reindex completed successfully"
            assert data["assistant_id"] == "test-assistant"
            assert data["stats"] == mock_stats

            # Verify service was called
            mock_history_service.reindex_history.assert_called_once_with(
                tenant_id="demo", assistant_id="test-assistant", force=False
            )

    @patch("app.api.assistants.history_index_service")
    def test_reindex_endpoint_with_force(self, mock_history_service, client):
        """Test reindex with force parameter"""
        mock_history_service.reindex_history = AsyncMock(return_value={})

        with patch("app.api.assistants.get_tenant_storage") as mock_storage:
            mock_storage.return_value = {"test-assistant": {"name": "Test"}}

            response = client.post(
                "/assistants/test-assistant/reindex-history?force=true"
            )

            assert response.status_code == 200

            # Verify force parameter was passed
            mock_history_service.reindex_history.assert_called_once_with(
                tenant_id="demo", assistant_id="test-assistant", force=True
            )


class TestHistoryServiceConfiguration:
    """Test history service configuration"""

    def test_default_configuration(self):
        """Test default service configuration"""
        service = HistoryIndexService()

        assert service.chunk_size == 500
        assert service.overlap_size == 50
        assert service.min_conversation_age_hours == 1
        assert service.max_similarity_results == 3
        assert service.index_prefix == "history"

    def test_configuration_environment_override(self):
        """Test configuration can be overridden"""
        # In production, these would come from environment variables
        service = HistoryIndexService()
        service.chunk_size = 1000
        service.max_similarity_results = 5

        assert service.chunk_size == 1000
        assert service.max_similarity_results == 5


if __name__ == "__main__":
    """Run tests directly"""
    pytest.main([__file__, "-v", "--tb=short"])
