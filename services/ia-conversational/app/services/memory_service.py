"""
Memory service for conversation context management - Prompt 9 Implementation
Redis-based conversation memory with fallback to in-memory storage
"""

import asyncio
import json
import os
import time
from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any

from app.core.logging import log_error, log_info
from app.core.redis import redis_service
from app.schemas.assistant import ConversationMessage

# Configuration
CONV_TTL_SECONDS = int(os.getenv("CONV_TTL_SECONDS", "600"))  # 10 minutes default
REDIS_URL = os.getenv("REDIS_URL")
MAX_CONTEXT_TURNS = int(os.getenv("MAX_CONTEXT_TURNS", "6"))
SUMMARIZE_THRESHOLD = int(
    os.getenv("SUMMARIZE_THRESHOLD", "20")
)  # Summarize after 20 turns


@dataclass
class ConversationTurn:
    """Single conversation turn"""

    role: str  # "user" or "assistant"
    content: str
    timestamp: float
    metadata: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ConversationTurn":
        return cls(**data)


@dataclass
class ConversationMemory:
    """Conversation memory structure"""

    conversation_id: str
    tenant_id: str
    turns: list[ConversationTurn]
    summary: str | None = None
    created_at: float = None
    updated_at: float = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = time.time()
        self.updated_at = time.time()

    def to_dict(self) -> dict[str, Any]:
        return {
            "conversation_id": self.conversation_id,
            "tenant_id": self.tenant_id,
            "turns": [turn.to_dict() for turn in self.turns],
            "summary": self.summary,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ConversationMemory":
        turns = [ConversationTurn.from_dict(turn) for turn in data.get("turns", [])]
        return cls(
            conversation_id=data["conversation_id"],
            tenant_id=data["tenant_id"],
            turns=turns,
            summary=data.get("summary"),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
        )


class MemoryService:
    """
    Conversation memory service with Redis backend and in-memory fallback

    Features:
    - Redis storage with TTL when REDIS_URL is available
    - In-memory fallback with TTL cleanup when Redis unavailable
    - Automatic context building (last N turns + summary)
    - Intelligent summarization when conversation gets long
    - Thread-safe operations
    """

    def __init__(self):
        self.in_memory_storage: dict[str, ConversationMemory] = {}
        self.in_memory_ttl: dict[str, float] = {}
        self.use_redis = redis_service.is_available()

        if self.use_redis:
            log_info("Memory service initialized with Redis backend")
        else:
            log_info(
                "Memory service initialized with in-memory backend (Redis not available)"
            )

    def _get_redis_key(self, tenant_id: str, conversation_id: str) -> str:
        """Generate Redis key for conversation"""
        return f"session:{tenant_id}:{conversation_id}"

    async def _cleanup_expired_memory(self):
        """Clean up expired in-memory conversations"""
        if self.use_redis:
            return

        current_time = time.time()
        expired_keys = [
            key for key, ttl in self.in_memory_ttl.items() if current_time > ttl
        ]

        for key in expired_keys:
            self.in_memory_storage.pop(key, None)
            self.in_memory_ttl.pop(key, None)

        if expired_keys:
            log_info(
                f"Cleaned up {len(expired_keys)} expired conversations from memory"
            )

    async def append_turn(
        self,
        conversation_id: str,
        role: str,
        text: str,
        tenant_id: str = "demo",
        metadata: dict[str, Any] | None = None,
    ) -> bool:
        """
        Append a turn to conversation memory

        Args:
            conversation_id: Conversation identifier
            role: "user" or "assistant"
            text: Message content
            tenant_id: Tenant identifier
            metadata: Optional metadata

        Returns:
            True if successful, False otherwise
        """
        try:
            # Clean up expired memory first
            await self._cleanup_expired_memory()

            # Create new turn
            turn = ConversationTurn(
                role=role, content=text, timestamp=time.time(), metadata=metadata or {}
            )

            # Get or create conversation memory
            memory = await self._get_conversation_memory(tenant_id, conversation_id)
            if memory is None:
                memory = ConversationMemory(
                    conversation_id=conversation_id, tenant_id=tenant_id, turns=[]
                )

            # Add turn to memory
            memory.turns.append(turn)
            memory.updated_at = time.time()

            # Check if summarization is needed
            if len(memory.turns) > SUMMARIZE_THRESHOLD and not memory.summary:
                await self.summarize_if_needed(conversation_id, tenant_id)

            # Store updated memory
            await self._store_conversation_memory(memory)

            log_info(
                "Turn appended to conversation",
                tenant_id=tenant_id,
                conversation_id=conversation_id,
                role=role,
                content_length=len(text),
                total_turns=len(memory.turns),
            )

            return True

        except Exception as e:
            log_error(
                f"Failed to append turn: {e}",
                tenant_id=tenant_id,
                conversation_id=conversation_id,
                role=role,
                error_type=type(e).__name__,
            )
            return False

    async def get_context(
        self,
        conversation_id: str,
        last_n: int = MAX_CONTEXT_TURNS,
        tenant_id: str = "demo",
    ) -> dict[str, Any]:
        """
        Get conversation context (last N turns + summary)

        Args:
            conversation_id: Conversation identifier
            last_n: Number of recent turns to include
            tenant_id: Tenant identifier

        Returns:
            Dictionary with context information
        """
        try:
            await self._cleanup_expired_memory()

            memory = await self._get_conversation_memory(tenant_id, conversation_id)

            if memory is None:
                return {
                    "turns": [],
                    "summary": None,
                    "total_turns": 0,
                    "has_history": False,
                }

            # Get last N turns
            recent_turns = memory.turns[-last_n:] if memory.turns else []

            context = {
                "turns": [turn.to_dict() for turn in recent_turns],
                "summary": memory.summary,
                "total_turns": len(memory.turns),
                "has_history": len(memory.turns) > 0,
                "conversation_id": conversation_id,
                "created_at": memory.created_at,
                "updated_at": memory.updated_at,
            }

            log_info(
                "Context retrieved",
                tenant_id=tenant_id,
                conversation_id=conversation_id,
                recent_turns=len(recent_turns),
                total_turns=len(memory.turns),
                has_summary=memory.summary is not None,
            )

            return context

        except Exception as e:
            log_error(
                f"Failed to get context: {e}",
                tenant_id=tenant_id,
                conversation_id=conversation_id,
                error_type=type(e).__name__,
            )
            return {
                "turns": [],
                "summary": None,
                "total_turns": 0,
                "has_history": False,
                "error": str(e),
            }

    async def summarize_if_needed(
        self, conversation_id: str, tenant_id: str = "demo"
    ) -> str | None:
        """
        Summarize conversation if it's getting long

        Args:
            conversation_id: Conversation identifier
            tenant_id: Tenant identifier

        Returns:
            Summary text if created, None otherwise
        """
        try:
            memory = await self._get_conversation_memory(tenant_id, conversation_id)

            if memory is None or len(memory.turns) < SUMMARIZE_THRESHOLD:
                return None

            # Don't re-summarize if we already have a summary
            if memory.summary:
                return memory.summary

            # Get older turns (exclude recent ones that will be kept as context)
            turns_to_summarize = memory.turns[:-MAX_CONTEXT_TURNS]

            if len(turns_to_summarize) < 5:  # Need at least 5 turns to summarize
                return None

            # Check if LLM service is available
            try:
                from app.services.llm_service import llm_service

                if llm_service.is_available():
                    summary = await self._generate_llm_summary(turns_to_summarize)
                else:
                    summary = await self._generate_fallback_summary(turns_to_summarize)
            except ImportError:
                summary = await self._generate_fallback_summary(turns_to_summarize)

            # Store summary
            memory.summary = summary
            memory.updated_at = time.time()
            await self._store_conversation_memory(memory)

            log_info(
                "Conversation summarized",
                tenant_id=tenant_id,
                conversation_id=conversation_id,
                turns_summarized=len(turns_to_summarize),
                summary_length=len(summary),
            )

            return summary

        except Exception as e:
            log_error(
                f"Failed to summarize conversation: {e}",
                tenant_id=tenant_id,
                conversation_id=conversation_id,
                error_type=type(e).__name__,
            )
            return None

    async def _generate_llm_summary(self, turns: list[ConversationTurn]) -> str:
        """Generate summary using LLM"""
        try:
            from app.schemas.assistant import AssistantConfig
            from app.services.llm_service import llm_service

            # Create conversation text for summarization
            conversation_text = "\n".join(
                [f"{turn.role}: {turn.content}" for turn in turns]
            )

            prompt = f"""Please create a concise summary of this conversation. Focus on:
- Main topics discussed
- Key decisions or outcomes
- Important context for future reference

Conversation:
{conversation_text}

Summary:"""

            # Use a simple assistant config for summarization
            summary_config = AssistantConfig(
                name="Summarizer",
                selected_archetype="professional",
                personality_instructions="Create concise, accurate summaries",
                formality_level=7,
                detail_level=6,
            )

            summary = await llm_service.generate_reply(
                text=prompt,
                assistant_config=summary_config,
                correlation_id="summary",
                tenant_id="system",
            )

            return summary.strip()

        except Exception as e:
            log_error(f"LLM summarization failed: {e}")
            return await self._generate_fallback_summary(turns)

    async def _generate_fallback_summary(self, turns: list[ConversationTurn]) -> str:
        """Generate fallback summary when LLM unavailable"""
        user_messages = [turn.content for turn in turns if turn.role == "user"]
        assistant_messages = [
            turn.content for turn in turns if turn.role == "assistant"
        ]

        summary = f"Previous conversation with {len(turns)} messages exchanged. "

        if user_messages:
            # Get a sample of user topics
            sample_topics = [
                msg[:50] + "..." if len(msg) > 50 else msg for msg in user_messages[:3]
            ]
            summary += f"User discussed: {', '.join(sample_topics)}. "

        summary += f"Assistant provided {len(assistant_messages)} responses."

        return summary

    async def _get_conversation_memory(
        self, tenant_id: str, conversation_id: str
    ) -> ConversationMemory | None:
        """Get conversation memory from storage"""
        if self.use_redis:
            try:
                key = self._get_redis_key(tenant_id, conversation_id)
                data = redis_service.get(key)

                if data:
                    if isinstance(data, str):
                        memory_dict = json.loads(data)
                    else:
                        memory_dict = data
                    return ConversationMemory.from_dict(memory_dict)

                return None

            except Exception as e:
                log_error(f"Redis get failed: {e}")
                # Fall back to in-memory
                self.use_redis = False

        # In-memory storage
        key = f"{tenant_id}:{conversation_id}"
        return self.in_memory_storage.get(key)

    async def _store_conversation_memory(self, memory: ConversationMemory) -> bool:
        """Store conversation memory"""
        try:
            if self.use_redis:
                try:
                    key = self._get_redis_key(memory.tenant_id, memory.conversation_id)
                    data = memory.to_dict()

                    # Store with TTL using setex
                    success = redis_service.setex(key, CONV_TTL_SECONDS, data)
                    if success:
                        return True

                except Exception as e:
                    log_error(f"Redis store failed: {e}")
                    # Fall back to in-memory
                    self.use_redis = False

            # In-memory storage
            key = f"{memory.tenant_id}:{memory.conversation_id}"
            self.in_memory_storage[key] = memory
            self.in_memory_ttl[key] = time.time() + CONV_TTL_SECONDS

            return True

        except Exception as e:
            log_error(f"Failed to store conversation memory: {e}")
            return False

    async def clear_conversation(self, tenant_id: str, conversation_id: str) -> bool:
        """
        Clear conversation memory

        Args:
            tenant_id: Tenant identifier
            conversation_id: Conversation identifier

        Returns:
            True if successful, False otherwise
        """
        try:
            if self.use_redis:
                try:
                    key = self._get_redis_key(tenant_id, conversation_id)
                    deleted = redis_service.delete(key)

                    log_info(
                        "Conversation cleared from Redis",
                        tenant_id=tenant_id,
                        conversation_id=conversation_id,
                        deleted=bool(deleted),
                    )

                    return True

                except Exception as e:
                    log_error(f"Redis delete failed: {e}")
                    self.use_redis = False

            # In-memory cleanup
            key = f"{tenant_id}:{conversation_id}"
            deleted_memory = self.in_memory_storage.pop(key, None) is not None
            deleted_ttl = self.in_memory_ttl.pop(key, None) is not None

            log_info(
                "Conversation cleared from memory",
                tenant_id=tenant_id,
                conversation_id=conversation_id,
                deleted=deleted_memory or deleted_ttl,
            )

            return True

        except Exception as e:
            log_error(
                f"Failed to clear conversation: {e}",
                tenant_id=tenant_id,
                conversation_id=conversation_id,
                error_type=type(e).__name__,
            )
            return False

    def get_status(self) -> dict[str, Any]:
        """Get memory service status"""
        return {
            "backend": "redis" if self.use_redis else "in_memory",
            "redis_url": REDIS_URL,
            "redis_available": self.use_redis,
            "ttl_seconds": CONV_TTL_SECONDS,
            "max_context_turns": MAX_CONTEXT_TURNS,
            "summarize_threshold": SUMMARIZE_THRESHOLD,
            "in_memory_conversations": (
                len(self.in_memory_storage) if not self.use_redis else 0
            ),
        }

    # Legacy methods for backward compatibility
    def create_conversation(
        self,
        tenant_id: str,
        assistant_id: str,
        conversation_id: str | None = None,
        correlation_id: str | None = None,
    ) -> str:
        """Create new conversation (legacy method)"""
        import uuid

        if not conversation_id:
            conversation_id = str(uuid.uuid4())

        # Create empty conversation memory
        memory = ConversationMemory(
            conversation_id=conversation_id, tenant_id=tenant_id, turns=[]
        )

        # Store asynchronously in background
        try:
            loop = asyncio.get_event_loop()
            loop.create_task(self._store_conversation_memory(memory))
        except RuntimeError:
            # No event loop, store synchronously via Redis service
            if self.use_redis:
                key = self._get_redis_key(tenant_id, conversation_id)
                redis_service.setex(key, CONV_TTL_SECONDS, memory.to_dict())

        log_info(
            f"Conversation created: {conversation_id}",
            tenant_id=tenant_id,
            assistant_id=assistant_id,
            conversation_id=conversation_id,
        )

        return conversation_id

    def add_message(
        self,
        tenant_id: str,
        assistant_id: str,
        conversation_id: str,
        role: str,
        content: str,
        correlation_id: str | None = None,
    ) -> bool:
        """Add message to conversation (legacy method)"""
        try:
            # Use async method in background
            import asyncio

            try:
                loop = asyncio.get_event_loop()
                loop.create_task(
                    self.append_turn(
                        conversation_id=conversation_id,
                        role=role,
                        text=content,
                        tenant_id=tenant_id,
                    )
                )
                return True
            except RuntimeError:
                # No event loop, use synchronous approach
                if self.use_redis:
                    # Store directly in Redis
                    key = self._get_redis_key(tenant_id, conversation_id)
                    data = redis_service.get(key)

                    if data:
                        memory = ConversationMemory.from_dict(data)
                    else:
                        memory = ConversationMemory(
                            conversation_id=conversation_id,
                            tenant_id=tenant_id,
                            turns=[],
                        )

                    turn = ConversationTurn(
                        role=role, content=content, timestamp=time.time()
                    )
                    memory.turns.append(turn)
                    memory.updated_at = time.time()

                    redis_service.setex(key, CONV_TTL_SECONDS, memory.to_dict())
                    return True

                return False
        except Exception as e:
            log_error(f"Failed to add message: {e}")
            return False

    def get_conversation(
        self,
        tenant_id: str,
        assistant_id: str,
        conversation_id: str,
        limit: int | None = None,
        correlation_id: str | None = None,
    ) -> list[ConversationMessage]:
        """Get conversation messages (legacy method)"""
        try:
            # Get memory synchronously
            if self.use_redis:
                key = self._get_redis_key(tenant_id, conversation_id)
                data = redis_service.get(key)
                if data:
                    memory = ConversationMemory.from_dict(data)
                    turns = memory.turns[-limit:] if limit else memory.turns

                    # Convert to ConversationMessage format
                    messages = []
                    for turn in turns:
                        messages.append(
                            ConversationMessage(
                                role=turn.role,
                                content=turn.content,
                                timestamp=datetime.fromtimestamp(
                                    turn.timestamp
                                ).isoformat(),
                            )
                        )

                    return messages

            return []

        except Exception as e:
            log_error(f"Failed to get conversation: {e}")
            return []

    def conversation_exists(
        self, tenant_id: str, assistant_id: str, conversation_id: str
    ) -> bool:
        """Check if conversation exists (legacy method)"""
        if self.use_redis:
            key = self._get_redis_key(tenant_id, conversation_id)
            return redis_service.exists(key)
        else:
            key = f"{tenant_id}:{conversation_id}"
            return key in self.in_memory_storage

    def delete_conversation(
        self,
        tenant_id: str,
        assistant_id: str,
        conversation_id: str,
        correlation_id: str | None = None,
    ) -> bool:
        """Delete conversation (legacy method)"""
        try:
            import asyncio

            try:
                loop = asyncio.get_event_loop()
                loop.create_task(self.clear_conversation(tenant_id, conversation_id))
                return True
            except RuntimeError:
                # No event loop, use synchronous approach
                if self.use_redis:
                    key = self._get_redis_key(tenant_id, conversation_id)
                    return redis_service.delete(key)
                else:
                    key = f"{tenant_id}:{conversation_id}"
                    self.in_memory_storage.pop(key, None)
                    self.in_memory_ttl.pop(key, None)
                    return True
        except Exception as e:
            log_error(f"Failed to delete conversation: {e}")
            return False


# Global memory service instance
memory_service = MemoryService()
