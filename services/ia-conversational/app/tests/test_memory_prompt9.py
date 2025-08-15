"""
Tests for Memory Service and Conversation with Context - Prompt 9
Tests Redis backend with fallback, TTL, and context building
"""

import asyncio
import time
from unittest.mock import AsyncMock, Mock, patch

import pytest
from fastapi.testclient import TestClient

from app.services.memory_service import (
    CONV_TTL_SECONDS,
    MAX_CONTEXT_TURNS,
    ConversationMemory,
    ConversationTurn,
    MemoryService,
)


class TestConversationTurn:
    """Test ConversationTurn dataclass"""

    def test_turn_creation(self):
        """Test turn creation and serialization"""
        turn = ConversationTurn(
            role="user",
            content="Hello world",
            timestamp=time.time(),
            metadata={"source": "test"},
        )

        assert turn.role == "user"
        assert turn.content == "Hello world"
        assert turn.metadata["source"] == "test"

        # Test serialization
        turn_dict = turn.to_dict()
        assert turn_dict["role"] == "user"
        assert turn_dict["content"] == "Hello world"

        # Test deserialization
        turn_restored = ConversationTurn.from_dict(turn_dict)
        assert turn_restored.role == turn.role
        assert turn_restored.content == turn.content


class TestConversationMemory:
    """Test ConversationMemory dataclass"""

    def test_memory_creation(self):
        """Test memory creation with turns"""
        turns = [
            ConversationTurn("user", "Hello", time.time()),
            ConversationTurn("assistant", "Hi there!", time.time()),
        ]

        memory = ConversationMemory(
            conversation_id="test-conv", tenant_id="test-tenant", turns=turns
        )

        assert memory.conversation_id == "test-conv"
        assert memory.tenant_id == "test-tenant"
        assert len(memory.turns) == 2
        assert memory.created_at is not None
        assert memory.updated_at is not None

        # Test serialization
        memory_dict = memory.to_dict()
        assert memory_dict["conversation_id"] == "test-conv"
        assert len(memory_dict["turns"]) == 2

        # Test deserialization
        memory_restored = ConversationMemory.from_dict(memory_dict)
        assert memory_restored.conversation_id == memory.conversation_id
        assert len(memory_restored.turns) == len(memory.turns)


class TestMemoryServiceInMemoryFallback:
    """Test memory service with in-memory fallback (no Redis)"""

    @pytest.fixture
    def memory_service_no_redis(self):
        """Memory service without Redis"""
        with patch.dict("os.environ", {"REDIS_URL": ""}, clear=False):
            service = MemoryService()
            service.use_redis = False  # Force in-memory mode
            return service

    @pytest.mark.asyncio
    async def test_append_turn_in_memory(self, memory_service_no_redis):
        """Test appending turns in memory mode"""
        service = memory_service_no_redis

        # Append first turn
        success = await service.append_turn(
            conversation_id="test-conv",
            role="user",
            text="Hello",
            tenant_id="test-tenant",
        )

        assert success is True

        # Append second turn
        success = await service.append_turn(
            conversation_id="test-conv",
            role="assistant",
            text="Hi there!",
            tenant_id="test-tenant",
        )

        assert success is True

        # Verify storage
        key = "test-tenant:test-conv"
        assert key in service.in_memory_storage
        memory = service.in_memory_storage[key]
        assert len(memory.turns) == 2
        assert memory.turns[0].role == "user"
        assert memory.turns[1].role == "assistant"

    @pytest.mark.asyncio
    async def test_get_context_in_memory(self, memory_service_no_redis):
        """Test getting context in memory mode"""
        service = memory_service_no_redis

        # Add multiple turns
        for i in range(10):
            await service.append_turn(
                conversation_id="test-conv",
                role="user" if i % 2 == 0 else "assistant",
                text=f"Message {i}",
                tenant_id="test-tenant",
            )

        # Get context with default limit
        context = await service.get_context(
            conversation_id="test-conv", tenant_id="test-tenant"
        )

        assert context["has_history"] is True
        assert context["total_turns"] == 10
        assert len(context["turns"]) == MAX_CONTEXT_TURNS
        assert context["conversation_id"] == "test-conv"

        # Check that we get the last N turns
        turns = context["turns"]
        assert turns[-1]["content"] == "Message 9"  # Last turn

    @pytest.mark.asyncio
    async def test_ttl_cleanup_in_memory(self, memory_service_no_redis):
        """Test TTL cleanup in memory mode"""
        service = memory_service_no_redis

        # Add conversation
        await service.append_turn(
            conversation_id="test-conv",
            role="user",
            text="Hello",
            tenant_id="test-tenant",
        )

        # Verify it exists
        key = "test-tenant:test-conv"
        assert key in service.in_memory_storage

        # Manually expire the TTL
        service.in_memory_ttl[key] = time.time() - 10  # 10 seconds ago

        # Trigger cleanup
        await service._cleanup_expired_memory()

        # Verify it's cleaned up
        assert key not in service.in_memory_storage
        assert key not in service.in_memory_ttl

    @pytest.mark.asyncio
    async def test_clear_conversation_in_memory(self, memory_service_no_redis):
        """Test clearing conversation in memory mode"""
        service = memory_service_no_redis

        # Add conversation
        await service.append_turn(
            conversation_id="test-conv",
            role="user",
            text="Hello",
            tenant_id="test-tenant",
        )

        # Clear conversation
        success = await service.clear_conversation(
            tenant_id="test-tenant", conversation_id="test-conv"
        )

        assert success is True

        # Verify it's gone
        key = "test-tenant:test-conv"
        assert key not in service.in_memory_storage
        assert key not in service.in_memory_ttl


class TestMemoryServiceWithMockRedis:
    """Test memory service with mocked Redis"""

    @pytest.fixture
    def memory_service_redis(self):
        """Memory service with mocked Redis"""
        with patch("app.services.memory_service.redis_service") as mock_redis:
            mock_redis.is_available.return_value = True
            mock_redis.get.return_value = None
            mock_redis.setex.return_value = True
            mock_redis.delete.return_value = True

            service = MemoryService()
            service.use_redis = True
            return service, mock_redis

    @pytest.mark.asyncio
    async def test_append_turn_redis(self, memory_service_redis):
        """Test appending turns with Redis"""
        service, mock_redis = memory_service_redis

        # Mock Redis get to return None (new conversation)
        mock_redis.get.return_value = None

        success = await service.append_turn(
            conversation_id="test-conv",
            role="user",
            text="Hello",
            tenant_id="test-tenant",
        )

        assert success is True

        # Verify Redis setex was called
        mock_redis.setex.assert_called()
        call_args = mock_redis.setex.call_args
        assert call_args[0][0] == "session:test-tenant:test-conv"  # key
        assert call_args[0][1] == CONV_TTL_SECONDS  # ttl
        # Third argument is the memory dict

    @pytest.mark.asyncio
    async def test_get_context_redis(self, memory_service_redis):
        """Test getting context with Redis"""
        service, mock_redis = memory_service_redis

        # Mock existing conversation in Redis
        existing_memory = ConversationMemory(
            conversation_id="test-conv",
            tenant_id="test-tenant",
            turns=[
                ConversationTurn("user", "Hello", time.time()),
                ConversationTurn("assistant", "Hi there!", time.time()),
            ],
        )

        mock_redis.get.return_value = existing_memory.to_dict()

        context = await service.get_context(
            conversation_id="test-conv", tenant_id="test-tenant"
        )

        assert context["has_history"] is True
        assert context["total_turns"] == 2
        assert len(context["turns"]) == 2
        assert context["turns"][0]["role"] == "user"
        assert context["turns"][1]["role"] == "assistant"

    @pytest.mark.asyncio
    async def test_redis_fallback_to_memory(self):
        """Test fallback to in-memory when Redis fails"""
        with patch("app.services.memory_service.redis_service") as mock_redis:
            mock_redis.is_available.return_value = True
            mock_redis.setex.side_effect = Exception("Redis error")

            service = MemoryService()
            service.use_redis = True

            # This should fallback to in-memory
            success = await service.append_turn(
                conversation_id="test-conv",
                role="user",
                text="Hello",
                tenant_id="test-tenant",
            )

            assert success is True
            # Should have fallen back to in-memory
            assert not service.use_redis
            key = "test-tenant:test-conv"
            assert key in service.in_memory_storage


class TestMemoryServiceSummarization:
    """Test conversation summarization functionality"""

    @pytest.fixture
    def memory_service_no_redis(self):
        """Memory service without Redis for testing"""
        service = MemoryService()
        service.use_redis = False
        return service

    @pytest.mark.asyncio
    async def test_summarization_threshold(self, memory_service_no_redis):
        """Test that summarization kicks in after threshold"""
        service = memory_service_no_redis

        # Add many turns to trigger summarization
        for i in range(25):  # More than SUMMARIZE_THRESHOLD (20)
            await service.append_turn(
                conversation_id="test-conv",
                role="user" if i % 2 == 0 else "assistant",
                text=f"Message {i}",
                tenant_id="test-tenant",
            )

        # Get the memory
        key = "test-tenant:test-conv"
        memory = service.in_memory_storage[key]

        # Should have a summary now
        assert memory.summary is not None
        assert len(memory.summary) > 0

    @pytest.mark.asyncio
    async def test_fallback_summarization(self, memory_service_no_redis):
        """Test fallback summarization when LLM unavailable"""
        service = memory_service_no_redis

        # Mock LLM service as unavailable
        with patch("app.services.memory_service.llm_service") as mock_llm:
            mock_llm.is_available.return_value = False

            # Create turns for summarization
            turns = [
                ConversationTurn("user", f"User message {i}", time.time())
                for i in range(10)
            ]

            summary = await service._generate_fallback_summary(turns)

            assert "Previous conversation with 10 messages" in summary
            assert "User discussed:" in summary

    @pytest.mark.asyncio
    async def test_llm_summarization(self, memory_service_no_redis):
        """Test LLM-based summarization"""
        service = memory_service_no_redis

        # Mock LLM service
        with patch("app.services.memory_service.llm_service") as mock_llm:
            mock_llm.is_available.return_value = True
            mock_llm.generate_reply = AsyncMock(
                return_value="Test summary generated by LLM"
            )

            turns = [
                ConversationTurn("user", "Hello", time.time()),
                ConversationTurn("assistant", "Hi there!", time.time()),
            ]

            summary = await service._generate_llm_summary(turns)

            assert summary == "Test summary generated by LLM"
            mock_llm.generate_reply.assert_called_once()


class TestMemoryServiceStatus:
    """Test memory service status and configuration"""

    def test_status_redis_available(self):
        """Test status when Redis is available"""
        with patch("app.services.memory_service.redis_service") as mock_redis:
            mock_redis.is_available.return_value = True

            service = MemoryService()
            service.use_redis = True

            status = service.get_status()

            assert status["backend"] == "redis"
            assert status["redis_available"] is True
            assert status["ttl_seconds"] == CONV_TTL_SECONDS
            assert status["max_context_turns"] == MAX_CONTEXT_TURNS

    def test_status_in_memory_fallback(self):
        """Test status when using in-memory fallback"""
        service = MemoryService()
        service.use_redis = False
        service.in_memory_storage = {"key1": Mock(), "key2": Mock()}

        status = service.get_status()

        assert status["backend"] == "in_memory"
        assert status["redis_available"] is False
        assert status["in_memory_conversations"] == 2


class TestConversationAPIIntegration:
    """Test conversation API with memory integration"""

    @pytest.fixture
    def client(self):
        """Test client with memory service"""
        from app.main import app

        return TestClient(app)

    @pytest.fixture
    def mock_assistant_storage(self):
        """Mock assistant storage"""
        assistant_config = {
            "name": "Test Assistant",
            "selected_archetype": "professional",
            "personality_instructions": "Be helpful and professional",
            "objective": "Help users with their questions",
            "can_qualify": True,
            "can_capture_data": True,
            "formality_level": 7,
            "detail_level": 6,
            "emoji_usage": 2,
        }

        with patch("app.api.conversation.get_tenant_storage") as mock_storage:
            mock_storage.return_value = {"test-assistant": assistant_config}
            yield mock_storage

    @patch("app.services.memory_service.memory_service")
    @patch("app.services.llm_service.llm_service")
    def test_conversation_with_memory(
        self, mock_llm, mock_memory, client, mock_assistant_storage
    ):
        """Test conversation endpoint with memory integration"""
        # Mock memory service
        mock_memory.append_turn = AsyncMock(return_value=True)
        mock_memory.get_context = AsyncMock(
            return_value={
                "turns": [
                    {
                        "role": "user",
                        "content": "Previous message",
                        "timestamp": time.time(),
                    }
                ],
                "summary": None,
                "total_turns": 1,
                "has_history": True,
            }
        )

        # Mock LLM service
        mock_llm.is_available.return_value = True
        mock_llm.generate_reply = AsyncMock(return_value="Test response with context")

        # Make conversation request
        response = client.post(
            "/conversation/",
            json={
                "assistantId": "test-assistant",
                "message": "Hello again",
                "conversation_id": "test-conversation",
            },
        )

        assert response.status_code == 200
        data = response.json()

        assert data["reply"] == "Test response with context"
        assert data["meta"]["conversation_id"] == "test-conversation"
        assert data["meta"]["context_used"] is True
        assert data["meta"]["total_turns"] == 3  # Previous + current exchange

        # Verify memory service was called
        assert mock_memory.append_turn.call_count == 2  # User turn + assistant turn
        mock_memory.get_context.assert_called_once()

    @patch("app.services.memory_service.memory_service")
    def test_get_conversation_endpoint(self, mock_memory, client):
        """Test GET /conversation/{id} endpoint"""
        # Mock memory service
        mock_memory.get_context = AsyncMock(
            return_value={
                "turns": [
                    {"role": "user", "content": "Hello", "timestamp": time.time()},
                    {
                        "role": "assistant",
                        "content": "Hi there!",
                        "timestamp": time.time(),
                    },
                ],
                "summary": "User greeted assistant",
                "total_turns": 2,
                "has_history": True,
                "created_at": time.time(),
                "updated_at": time.time(),
            }
        )

        response = client.get("/conversation/test-conversation")

        assert response.status_code == 200
        data = response.json()

        assert data["conversation_id"] == "test-conversation"
        assert len(data["turns"]) == 2
        assert data["summary"] == "User greeted assistant"
        assert data["total_turns"] == 2

    @patch("app.services.memory_service.memory_service")
    def test_delete_conversation_endpoint(self, mock_memory, client):
        """Test DELETE /conversation/{id} endpoint"""
        # Mock memory service
        mock_memory.clear_conversation = AsyncMock(return_value=True)

        response = client.delete("/conversation/test-conversation")

        assert response.status_code == 200
        data = response.json()

        assert data["message"] == "Conversation deleted successfully"
        assert data["conversation_id"] == "test-conversation"

        mock_memory.clear_conversation.assert_called_once_with(
            tenant_id="demo", conversation_id="test-conversation"
        )

    def test_conversation_context_prompt_building(self):
        """Test context prompt building functionality"""
        from app.api.conversation import _build_context_prompt
        from app.schemas.assistant import AssistantConfig

        # Mock assistant config
        config = AssistantConfig(
            name="Test Assistant",
            selected_archetype="professional",
            personality_instructions="Be helpful and professional",
            objective="Assist users effectively",
            product_service="AI Assistant Platform",
            main_benefits="Efficient communication and task completion",
            target_audience="Business professionals",
            can_qualify=True,
            can_capture_data=True,
        )

        # Mock context
        context = {
            "turns": [
                {"role": "user", "content": "Hello"},
                {"role": "assistant", "content": "Hi there!"},
            ],
            "summary": "User greeted assistant",
            "has_history": True,
        }

        # Test prompt building
        prompt = asyncio.run(
            _build_context_prompt(
                user_message="How can you help me?",
                assistant_config=config,
                context=context,
                tenant_id="test",
            )
        )

        assert "Assistant Personality: Be helpful and professional" in prompt
        assert "Communication Style: professional" in prompt
        assert "Primary Objective: Assist users effectively" in prompt
        assert "Product/Service: AI Assistant Platform" in prompt
        assert "Previous Summary: User greeted assistant" in prompt
        assert "User: Hello" in prompt
        assert "Assistant: Hi there!" in prompt
        assert "Current User Message: How can you help me?" in prompt


class TestMemoryServiceConfiguration:
    """Test memory service configuration and environment variables"""

    def test_configuration_from_environment(self):
        """Test that configuration is read from environment variables"""
        with patch.dict(
            "os.environ",
            {
                "CONV_TTL_SECONDS": "1200",
                "MAX_CONTEXT_TURNS": "10",
                "SUMMARIZE_THRESHOLD": "30",
            },
        ):
            # Reload module to pick up new environment
            import importlib

            import app.services.memory_service

            importlib.reload(app.services.memory_service)

            assert app.services.memory_service.CONV_TTL_SECONDS == 1200
            assert app.services.memory_service.MAX_CONTEXT_TURNS == 10
            assert app.services.memory_service.SUMMARIZE_THRESHOLD == 30

    def test_redis_key_format(self):
        """Test Redis key format"""
        service = MemoryService()
        key = service._get_redis_key("tenant123", "conv456")
        assert key == "session:tenant123:conv456"


if __name__ == "__main__":
    """Run tests directly"""
    pytest.main([__file__, "-v", "--tb=short"])
