"""
History Index Service - Prompt 10 Implementation
Manages historical conversation indexing for long-term memory enhancement
"""

import time
import uuid
from dataclasses import dataclass

from app.core.logging import log_error, log_info
from app.services.embeddings import embeddings_service
from app.services.rag_store import rag_store


@dataclass
class HistoryChunk:
    """Represents a chunk of historical conversation"""

    chunk_id: str
    tenant_id: str
    assistant_id: str
    conversation_id: str
    content: str
    timestamp: float
    turn_count: int
    metadata: dict


class HistoryIndexService:
    """
    Service for indexing and retrieving historical conversation data
    for long-term memory enhancement
    """

    def __init__(self):
        self.index_prefix = "history"
        self.chunk_size = 500  # Max characters per chunk
        self.overlap_size = 50  # Character overlap between chunks
        self.min_conversation_age_hours = (
            1  # Only index conversations older than 1 hour
        )
        self.max_similarity_results = 3  # Max history chunks to return

        log_info("History index service initialized")

    async def reindex_history(
        self, tenant_id: str, assistant_id: str | None = None, force: bool = False
    ) -> dict:
        """
        Reindex historical conversations for better retrieval

        Args:
            tenant_id: Tenant to reindex
            assistant_id: Specific assistant (None for all)
            force: Force reindex even if recent

        Returns:
            Dictionary with indexing statistics
        """
        try:
            log_info(
                "Starting history reindex",
                tenant_id=tenant_id,
                assistant_id=assistant_id,
                force=force,
            )

            stats = {
                "conversations_processed": 0,
                "chunks_created": 0,
                "chunks_indexed": 0,
                "errors": 0,
                "start_time": time.time(),
            }

            # Get historical conversations from memory service
            historical_conversations = await self._get_historical_conversations(
                tenant_id, assistant_id, force
            )

            for conv_data in historical_conversations:
                try:
                    await self._process_conversation_for_indexing(conv_data, stats)
                    stats["conversations_processed"] += 1

                except Exception as e:
                    log_error(
                        f"Error processing conversation {conv_data.get('conversation_id', 'unknown')}: {e}"
                    )
                    stats["errors"] += 1

            stats["duration_seconds"] = time.time() - stats["start_time"]

            log_info(
                "History reindex completed",
                tenant_id=tenant_id,
                assistant_id=assistant_id,
                stats=stats,
            )

            return stats

        except Exception as e:
            log_error(f"History reindex failed: {e}", tenant_id=tenant_id)
            raise

    async def search_similar_history(
        self,
        query: str,
        tenant_id: str,
        assistant_id: str,
        max_results: int | None = None,
    ) -> list[dict]:
        """
        Search for similar historical conversation chunks

        Args:
            query: Search query (user message)
            tenant_id: Tenant ID
            assistant_id: Assistant ID
            max_results: Maximum results to return

        Returns:
            List of relevant history chunks
        """
        try:
            if not embeddings_service.is_available():
                log_error("Embeddings service not available for history search")
                return []

            if max_results is None:
                max_results = self.max_similarity_results

            # Generate query embedding
            query_embedding = await embeddings_service.embed_text(query)
            if not query_embedding:
                log_error("Failed to generate query embedding for history search")
                return []

            # Search in RAG store with history prefix
            document_id = f"{self.index_prefix}:{tenant_id}:{assistant_id}"

            similar_chunks = await rag_store.search_similar(
                query_embedding=query_embedding,
                tenant_id=tenant_id,
                document_id=document_id,
                max_results=max_results,
            )

            # Format results for conversation use
            formatted_results = []
            for chunk in similar_chunks:
                if chunk.get("similarity", 0) > 0.7:  # Similarity threshold
                    formatted_results.append(
                        {
                            "content": chunk["content"],
                            "similarity": chunk["similarity"],
                            "metadata": chunk.get("metadata", {}),
                            "conversation_id": chunk.get("metadata", {}).get(
                                "conversation_id"
                            ),
                            "timestamp": chunk.get("metadata", {}).get("timestamp"),
                        }
                    )

            log_info(
                f"Found {len(formatted_results)} similar history chunks",
                tenant_id=tenant_id,
                assistant_id=assistant_id,
                query_length=len(query),
            )

            return formatted_results

        except Exception as e:
            log_error(f"History search failed: {e}", tenant_id=tenant_id)
            return []

    async def _get_historical_conversations(
        self, tenant_id: str, assistant_id: str | None, force: bool
    ) -> list[dict]:
        """
        Get historical conversations that need indexing

        Note: In a real implementation, this would query a database
        For now, we'll use memory service and simulate historical data
        """
        try:
            historical_conversations = []

            # In production, this would query a database like:
            # SELECT * FROM conversations WHERE tenant_id = ? AND created_at < ?

            # For demonstration, we'll create some sample historical data
            if force or not hasattr(self, "_demo_history_created"):
                historical_conversations = await self._create_demo_historical_data(
                    tenant_id, assistant_id
                )
                self._demo_history_created = True

            return historical_conversations

        except Exception as e:
            log_error(f"Failed to get historical conversations: {e}")
            return []

    async def _create_demo_historical_data(
        self, tenant_id: str, assistant_id: str | None
    ) -> list[dict]:
        """
        Create demonstration historical conversation data
        In production, this would be replaced with database queries
        """
        demo_conversations = [
            {
                "conversation_id": "hist_conv_1",
                "assistant_id": assistant_id or "demo_assistant",
                "tenant_id": tenant_id,
                "turns": [
                    {
                        "role": "user",
                        "content": "I'm starting a new e-commerce business selling handmade jewelry",
                        "timestamp": time.time() - 86400,
                    },
                    {
                        "role": "assistant",
                        "content": "That's exciting! Handmade jewelry is a great niche. What type of jewelry are you planning to focus on? Consider starting with a specific style or material to build your brand identity.",
                        "timestamp": time.time() - 86400,
                    },
                    {
                        "role": "user",
                        "content": "I'm thinking silver rings with gemstones",
                        "timestamp": time.time() - 86400,
                    },
                    {
                        "role": "assistant",
                        "content": "Silver rings with gemstones are very popular! Consider these key points: 1) Source quality silver and authentic gemstones, 2) Perfect your craftsmanship before launching, 3) Build an online presence through social media showcasing your work process, 4) Price competitively while ensuring profit margins.",
                        "timestamp": time.time() - 86400,
                    },
                ],
                "created_at": time.time() - 86400,
                "summary": "User discussed starting an e-commerce jewelry business, specifically silver rings with gemstones. Assistant provided business advice on sourcing, craftsmanship, marketing, and pricing.",
            },
            {
                "conversation_id": "hist_conv_2",
                "assistant_id": assistant_id or "demo_assistant",
                "tenant_id": tenant_id,
                "turns": [
                    {
                        "role": "user",
                        "content": "How do I handle customer service for my online business?",
                        "timestamp": time.time() - 72000,
                    },
                    {
                        "role": "assistant",
                        "content": "Great customer service is crucial for online businesses! Here are key strategies: 1) Respond quickly (within 24 hours), 2) Be proactive with order updates, 3) Have clear return/exchange policies, 4) Use multiple contact channels (email, chat, phone), 5) Train your team to be empathetic and solution-focused.",
                        "timestamp": time.time() - 72000,
                    },
                    {
                        "role": "user",
                        "content": "What about handling returns and refunds?",
                        "timestamp": time.time() - 72000,
                    },
                    {
                        "role": "assistant",
                        "content": "For returns and refunds: 1) Create a clear, fair return policy (30-day window is standard), 2) Make the process easy for customers, 3) Inspect returned items carefully, 4) Process refunds promptly, 5) Consider offering store credit as an alternative, 6) Track return reasons to improve products.",
                        "timestamp": time.time() - 72000,
                    },
                ],
                "created_at": time.time() - 72000,
                "summary": "User asked about customer service for online business. Assistant provided comprehensive advice on response times, communication channels, and return/refund policies.",
            },
            {
                "conversation_id": "hist_conv_3",
                "assistant_id": assistant_id or "demo_assistant",
                "tenant_id": tenant_id,
                "turns": [
                    {
                        "role": "user",
                        "content": "I need help with marketing my products on social media",
                        "timestamp": time.time() - 48000,
                    },
                    {
                        "role": "assistant",
                        "content": "Social media marketing is essential for product visibility! Key tactics: 1) Post consistently (3-5 times per week), 2) Use high-quality product photos, 3) Share behind-the-scenes content, 4) Engage with your audience through comments and stories, 5) Use relevant hashtags, 6) Collaborate with micro-influencers in your niche.",
                        "timestamp": time.time() - 48000,
                    },
                    {
                        "role": "user",
                        "content": "Which platforms should I focus on?",
                        "timestamp": time.time() - 48000,
                    },
                    {
                        "role": "assistant",
                        "content": "For handmade jewelry, focus on visual platforms: 1) Instagram (primary) - great for product photos and stories, 2) Pinterest - excellent for discovery and driving traffic, 3) TikTok - show creation process videos, 4) Facebook - for community building and ads. Start with Instagram and Pinterest, then expand.",
                        "timestamp": time.time() - 48000,
                    },
                ],
                "created_at": time.time() - 48000,
                "summary": "User sought social media marketing advice. Assistant recommended posting strategies, content types, and platform-specific approaches for handmade jewelry business.",
            },
        ]

        return demo_conversations

    async def _process_conversation_for_indexing(
        self, conv_data: dict, stats: dict
    ) -> None:
        """
        Process a single conversation for indexing

        Args:
            conv_data: Conversation data dictionary
            stats: Statistics dictionary to update
        """
        try:
            conversation_id = conv_data["conversation_id"]
            assistant_id = conv_data["assistant_id"]
            tenant_id = conv_data["tenant_id"]

            # Create conversation text for chunking
            conversation_text = self._format_conversation_for_indexing(conv_data)

            # Create chunks from conversation
            chunks = self._create_conversation_chunks(
                conversation_text, conversation_id, assistant_id, tenant_id, conv_data
            )

            stats["chunks_created"] += len(chunks)

            # Index each chunk
            for chunk in chunks:
                await self._index_history_chunk(chunk)
                stats["chunks_indexed"] += 1

        except Exception as e:
            log_error(f"Error processing conversation for indexing: {e}")
            raise

    def _format_conversation_for_indexing(self, conv_data: dict) -> str:
        """
        Format conversation data into indexable text
        """
        turns = conv_data["turns"]
        summary = conv_data.get("summary", "")

        # Start with summary if available
        text_parts = []
        if summary:
            text_parts.append(f"Summary: {summary}")

        # Add conversation turns
        text_parts.append("Conversation:")
        for turn in turns:
            role = turn["role"].capitalize()
            content = turn["content"]
            text_parts.append(f"{role}: {content}")

        return "\n".join(text_parts)

    def _create_conversation_chunks(
        self,
        conversation_text: str,
        conversation_id: str,
        assistant_id: str,
        tenant_id: str,
        conv_data: dict,
    ) -> list[HistoryChunk]:
        """
        Create chunks from conversation text for indexing
        """
        chunks = []
        text_length = len(conversation_text)

        if text_length <= self.chunk_size:
            # Single chunk
            chunk = HistoryChunk(
                chunk_id=str(uuid.uuid4()),
                tenant_id=tenant_id,
                assistant_id=assistant_id,
                conversation_id=conversation_id,
                content=conversation_text,
                timestamp=conv_data.get("created_at", time.time()),
                turn_count=len(conv_data.get("turns", [])),
                metadata={
                    "conversation_id": conversation_id,
                    "assistant_id": assistant_id,
                    "tenant_id": tenant_id,
                    "timestamp": conv_data.get("created_at", time.time()),
                    "turn_count": len(conv_data.get("turns", [])),
                    "chunk_index": 0,
                    "total_chunks": 1,
                },
            )
            chunks.append(chunk)
        else:
            # Multiple chunks with overlap
            start = 0
            chunk_index = 0
            total_chunks = (text_length // (self.chunk_size - self.overlap_size)) + 1

            while start < text_length:
                end = min(start + self.chunk_size, text_length)
                chunk_text = conversation_text[start:end]

                chunk = HistoryChunk(
                    chunk_id=str(uuid.uuid4()),
                    tenant_id=tenant_id,
                    assistant_id=assistant_id,
                    conversation_id=conversation_id,
                    content=chunk_text,
                    timestamp=conv_data.get("created_at", time.time()),
                    turn_count=len(conv_data.get("turns", [])),
                    metadata={
                        "conversation_id": conversation_id,
                        "assistant_id": assistant_id,
                        "tenant_id": tenant_id,
                        "timestamp": conv_data.get("created_at", time.time()),
                        "turn_count": len(conv_data.get("turns", [])),
                        "chunk_index": chunk_index,
                        "total_chunks": total_chunks,
                    },
                )
                chunks.append(chunk)

                start = end - self.overlap_size
                chunk_index += 1

                if end >= text_length:
                    break

        return chunks

    async def _index_history_chunk(self, chunk: HistoryChunk) -> bool:
        """
        Index a single history chunk in the RAG store
        """
        try:
            if not embeddings_service.is_available():
                log_error("Embeddings service not available for indexing")
                return False

            # Generate embedding for chunk content
            embedding = await embeddings_service.embed_text(chunk.content)
            if not embedding:
                log_error(f"Failed to generate embedding for chunk {chunk.chunk_id}")
                return False

            # Store in RAG store with special document_id for history
            document_id = f"{self.index_prefix}:{chunk.tenant_id}:{chunk.assistant_id}"

            success = await rag_store.store_chunk(
                tenant_id=chunk.tenant_id,
                document_id=document_id,
                chunk_id=chunk.chunk_id,
                content=chunk.content,
                embedding=embedding,
                metadata=chunk.metadata,
            )

            if success:
                log_info(f"Successfully indexed history chunk {chunk.chunk_id}")
            else:
                log_error(f"Failed to store history chunk {chunk.chunk_id}")

            return success

        except Exception as e:
            log_error(f"Error indexing history chunk {chunk.chunk_id}: {e}")
            return False

    async def clear_history_index(
        self, tenant_id: str, assistant_id: str | None = None
    ) -> bool:
        """
        Clear history index for tenant/assistant
        """
        try:
            if assistant_id:
                document_id = f"{self.index_prefix}:{tenant_id}:{assistant_id}"
                success = await rag_store.delete_document(tenant_id, document_id)
            else:
                # Clear all history for tenant (would need additional RAG store method)
                success = True  # Placeholder

            log_info(
                "History index cleared",
                tenant_id=tenant_id,
                assistant_id=assistant_id,
                success=success,
            )

            return success

        except Exception as e:
            log_error(f"Failed to clear history index: {e}")
            return False

    def get_status(self) -> dict:
        """
        Get service status and configuration
        """
        return {
            "service": "history_index",
            "embeddings_available": embeddings_service.is_available(),
            "rag_store_available": hasattr(rag_store, "store_chunk"),
            "chunk_size": self.chunk_size,
            "overlap_size": self.overlap_size,
            "max_similarity_results": self.max_similarity_results,
            "min_conversation_age_hours": self.min_conversation_age_hours,
        }


# Global service instance
history_index_service = HistoryIndexService()
