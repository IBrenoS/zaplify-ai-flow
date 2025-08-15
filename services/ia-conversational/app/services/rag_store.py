"""
RAG Store Service - In-memory document storage and retrieval for Prompt 5
Structured for easy replacement with Postgres+pgvector in the future
"""

import asyncio
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any

from app.core.logging import log_error, log_info


@dataclass
class ChunkMetadata:
    """Chunk metadata for embeddings storage"""

    chunk_id: str
    document_id: str
    content: str
    embedding: list[float]
    metadata: dict[str, Any]
    tenant_id: str


@dataclass
class DocumentMetadata:
    """Document metadata matching frontend expectations"""

    id: str
    name: str
    type: str  # pdf|docx|txt|xlsx|csv
    size: int  # bytes
    upload_date: str  # ISO format
    url: str | None = None  # File URL (would be S3/storage in production)
    processed: bool = False
    tenant_id: str = ""
    # Vector representation (mock - would be pgvector in production)
    vector_terms: list[str] = None  # Simulated vector as list of terms
    content_preview: str = ""  # First 200 chars for search

    def __post_init__(self):
        if self.vector_terms is None:
            self.vector_terms = []


class RAGStore:
    """
    In-memory RAG document store with tenant isolation
    Designed for easy replacement with Postgres+pgvector
    """

    def __init__(self):
        # Structure: {tenant_id: {document_id: DocumentMetadata}}
        self._documents: dict[str, dict[str, DocumentMetadata]] = {}
        self._document_contents: dict[str, str] = {}  # {doc_id: full_content}
        # Chunk storage for embeddings (Prompt 10)
        self._chunks: dict[str, dict[str, ChunkMetadata]] = (
            {}
        )  # {tenant_id: {chunk_id: ChunkMetadata}}

    def get_tenant_storage(self, tenant_id: str) -> dict[str, DocumentMetadata]:
        """Get or create tenant-specific document storage"""
        if tenant_id not in self._documents:
            self._documents[tenant_id] = {}
        return self._documents[tenant_id]

    async def index_document(
        self,
        content: str,
        filename: str,
        file_size: int,
        file_type: str,
        tenant_id: str,
        correlation_id: str,
    ) -> DocumentMetadata:
        """
        Index a document with mock vector generation
        Returns: DocumentMetadata with processed=True
        """
        try:
            # Generate document ID
            doc_id = str(uuid.uuid4())

            # Extract terms for mock vector (simulate embedding)
            vector_terms = self._extract_terms(content)

            # Create document metadata
            doc_metadata = DocumentMetadata(
                id=doc_id,
                name=filename,
                type=file_type,
                size=file_size,
                upload_date=datetime.utcnow().isoformat(),
                url=f"/documents/{tenant_id}/{doc_id}",  # Mock URL
                processed=True,  # Mark as processed after indexing
                tenant_id=tenant_id,
                vector_terms=vector_terms,
                content_preview=content[:200] if content else "",
            )

            # Store in tenant-specific storage
            tenant_storage = self.get_tenant_storage(tenant_id)
            tenant_storage[doc_id] = doc_metadata

            # Store full content separately (would be in database in production)
            self._document_contents[doc_id] = content

            log_info(
                f"Document indexed successfully: {filename}",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                document_id=doc_id,
                document_name=filename,
                document_size=file_size,
                vector_terms_count=len(vector_terms),
            )

            return doc_metadata

        except Exception as e:
            log_error(
                f"Document indexing failed: {e}",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                filename=filename,
                error_type=type(e).__name__,
            )
            raise

    async def query_similar(
        self,
        query: str,
        tenant_id: str,
        top_k: int = 3,
        correlation_id: str = "unknown",
    ) -> list[dict[str, Any]]:
        """
        Query similar documents using mock similarity calculation
        Returns: List of document matches with relevance scores
        """
        try:
            # Add simulated latency (would be database query time)
            await asyncio.sleep(0.1)  # 100ms simulated latency

            tenant_storage = self.get_tenant_storage(tenant_id)

            if not tenant_storage:
                log_info(
                    "No documents found for tenant",
                    correlation_id=correlation_id,
                    tenant_id=tenant_id,
                    query=query[:100],
                )
                return []

            # Extract query terms for similarity calculation
            query_terms = self._extract_terms(query)

            # Calculate similarity scores for all documents
            results = []
            for doc_id, doc_metadata in tenant_storage.items():
                if not doc_metadata.processed:
                    continue  # Skip unprocessed documents

                # Mock similarity calculation (would be vector similarity in production)
                similarity_score = self._calculate_similarity(
                    query_terms, doc_metadata.vector_terms
                )

                if similarity_score > 0.1:  # Minimum relevance threshold
                    # Get full content for context
                    content = self._document_contents.get(doc_id, "")

                    result = {
                        "document_id": doc_id,
                        "name": doc_metadata.name,
                        "type": doc_metadata.type,
                        "size": doc_metadata.size,
                        "upload_date": doc_metadata.upload_date,
                        "url": doc_metadata.url,
                        "relevance_score": similarity_score,
                        "content": content[:500],  # Return first 500 chars as context
                        "content_preview": doc_metadata.content_preview,
                    }
                    results.append(result)

            # Sort by relevance score (descending)
            results.sort(key=lambda x: x["relevance_score"], reverse=True)

            # Limit to top_k results
            results = results[:top_k]

            log_info(
                f"RAG query completed - {len(results)} results",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                query=query[:100],
                total_documents=len(tenant_storage),
                results_returned=len(results),
            )

            return results

        except Exception as e:
            log_error(
                f"RAG query failed: {e}",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                query=query[:100],
                error_type=type(e).__name__,
            )
            raise

    def get_document_count(self, tenant_id: str) -> int:
        """Get total document count for tenant"""
        tenant_storage = self.get_tenant_storage(tenant_id)
        return len(tenant_storage)

    def get_processed_document_count(self, tenant_id: str) -> int:
        """Get processed document count for tenant"""
        tenant_storage = self.get_tenant_storage(tenant_id)
        return sum(1 for doc in tenant_storage.values() if doc.processed)

    def list_documents(self, tenant_id: str) -> list[dict[str, Any]]:
        """List all documents for tenant"""
        tenant_storage = self.get_tenant_storage(tenant_id)
        return [asdict(doc) for doc in tenant_storage.values()]

    def get_document(self, document_id: str, tenant_id: str) -> DocumentMetadata | None:
        """Get specific document by ID"""
        tenant_storage = self.get_tenant_storage(tenant_id)
        return tenant_storage.get(document_id)

    def delete_document(self, document_id: str, tenant_id: str) -> bool:
        """Delete document from storage"""
        tenant_storage = self.get_tenant_storage(tenant_id)
        if document_id in tenant_storage:
            del tenant_storage[document_id]
            # Also delete content
            if document_id in self._document_contents:
                del self._document_contents[document_id]
            return True
        return False

    def _extract_terms(self, text: str) -> list[str]:
        """
        Extract terms for mock vector representation
        In production, this would be replaced by embedding generation
        """
        if not text:
            return []

        # Simple term extraction (would be embeddings in production)
        import re

        # Clean and normalize text
        text = re.sub(r"[^\w\s]", " ", text.lower())

        # Extract meaningful terms (filter out common words)
        common_words = {
            "the",
            "a",
            "an",
            "and",
            "or",
            "but",
            "in",
            "on",
            "at",
            "to",
            "for",
            "of",
            "with",
            "by",
            "is",
            "are",
            "was",
            "were",
            "be",
            "been",
            "being",
            "have",
            "has",
            "had",
            "do",
            "does",
            "did",
            "will",
            "would",
            "could",
            "should",
            "may",
            "might",
            "can",
            "this",
            "that",
            "these",
            "those",
            "o",
            "os",
            "as",
            "um",
            "uma",
            "de",
            "da",
            "dos",
            "das",
            "em",
            "no",
            "na",
            "nos",
            "nas",
            "para",
            "por",
            "com",
            "sem",
            "sobre",
            "é",
            "são",
            "foi",
            "foram",
            "ser",
            "estar",
            "ter",
            "que",
            "se",
        }

        terms = []
        words = text.split()
        for word in words:
            word = word.strip()
            if len(word) > 2 and word not in common_words:
                terms.append(word)

        # Return unique terms, limited to avoid huge vectors
        return list(set(terms))[:50]

    def _calculate_similarity(
        self, query_terms: list[str], doc_terms: list[str]
    ) -> float:
        """
        Calculate mock similarity score between query and document terms
        In production, this would be vector cosine similarity
        """
        if not query_terms or not doc_terms:
            return 0.0

        # Simple Jaccard similarity (intersection over union)
        query_set = set(query_terms)
        doc_set = set(doc_terms)

        intersection = len(query_set.intersection(doc_set))
        union = len(query_set.union(doc_set))

        if union == 0:
            return 0.0

        return intersection / union

    # Chunk-level methods for history indexing (Prompt 10)
    async def store_chunk(
        self,
        tenant_id: str,
        document_id: str,
        chunk_id: str,
        content: str,
        embedding: list[float],
        metadata: dict[str, Any],
    ) -> bool:
        """Store a chunk with embedding for similarity search"""
        try:
            if tenant_id not in self._chunks:
                self._chunks[tenant_id] = {}

            chunk = ChunkMetadata(
                chunk_id=chunk_id,
                document_id=document_id,
                content=content,
                embedding=embedding,
                metadata=metadata,
                tenant_id=tenant_id,
            )

            self._chunks[tenant_id][chunk_id] = chunk

            log_info(f"Chunk stored successfully: {chunk_id}", tenant_id=tenant_id)
            return True

        except Exception as e:
            log_error(f"Failed to store chunk {chunk_id}: {e}", tenant_id=tenant_id)
            return False

    async def search_similar(
        self,
        query_embedding: list[float],
        tenant_id: str,
        document_id: str | None = None,
        max_results: int = 3,
    ) -> list[dict[str, Any]]:
        """Search for similar chunks using cosine similarity"""
        try:
            if tenant_id not in self._chunks:
                return []

            tenant_chunks = self._chunks[tenant_id]

            # Filter by document_id if specified
            if document_id:
                tenant_chunks = {
                    chunk_id: chunk
                    for chunk_id, chunk in tenant_chunks.items()
                    if chunk.document_id == document_id
                }

            if not tenant_chunks:
                return []

            # Calculate similarities
            similarities = []
            for chunk_id, chunk in tenant_chunks.items():
                similarity = self._cosine_similarity(query_embedding, chunk.embedding)
                similarities.append(
                    {
                        "chunk_id": chunk_id,
                        "content": chunk.content,
                        "similarity": similarity,
                        "metadata": chunk.metadata,
                    }
                )

            # Sort by similarity and return top results
            similarities.sort(key=lambda x: x["similarity"], reverse=True)
            return similarities[:max_results]

        except Exception as e:
            log_error(f"Similarity search failed: {e}", tenant_id=tenant_id)
            return []

    async def delete_document_async(self, tenant_id: str, document_id: str) -> bool:
        """Delete all chunks for a document"""
        try:
            if tenant_id not in self._chunks:
                return True

            # Remove chunks for this document
            tenant_chunks = self._chunks[tenant_id]
            chunks_to_remove = [
                chunk_id
                for chunk_id, chunk in tenant_chunks.items()
                if chunk.document_id == document_id
            ]

            for chunk_id in chunks_to_remove:
                del tenant_chunks[chunk_id]

            log_info(
                f"Deleted {len(chunks_to_remove)} chunks for document {document_id}",
                tenant_id=tenant_id,
            )
            return True

        except Exception as e:
            log_error(
                f"Failed to delete document {document_id}: {e}", tenant_id=tenant_id
            )
            return False

    def _cosine_similarity(self, vec1: list[float], vec2: list[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        try:
            import math

            if len(vec1) != len(vec2):
                return 0.0

            dot_product = sum(a * b for a, b in zip(vec1, vec2, strict=False))
            magnitude1 = math.sqrt(sum(a * a for a in vec1))
            magnitude2 = math.sqrt(sum(a * a for a in vec2))

            if magnitude1 == 0 or magnitude2 == 0:
                return 0.0

            return dot_product / (magnitude1 * magnitude2)

        except Exception:
            return 0.0


# Global RAG store instance
rag_store = RAGStore()
