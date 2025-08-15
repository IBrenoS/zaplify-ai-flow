"""
RAG Service - Document ingestion and similarity search with pgvector
"""

import uuid
from typing import Any

from app.core.database import supabase_service
from app.core.logging import log_error, log_info
from app.services.embeddings import embeddings_service


class TextChunker:
    """
    Text chunking utility for splitting documents into manageable pieces
    """

    def __init__(self, chunk_size: int = 800, chunk_overlap: int = 100):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_text(self, text: str) -> list[str]:
        """
        Split text into overlapping chunks

        Args:
            text: Input text to chunk

        Returns:
            List of text chunks
        """
        if not text or not text.strip():
            return []

        # Simple word-based chunking
        words = text.split()

        if len(words) <= self.chunk_size:
            return [text]

        chunks = []
        start = 0

        while start < len(words):
            end = start + self.chunk_size
            chunk_words = words[start:end]
            chunk_text = " ".join(chunk_words)
            chunks.append(chunk_text)

            # Move start forward, accounting for overlap
            start = end - self.chunk_overlap

            # Break if we're at the end
            if end >= len(words):
                break

        return chunks


class DocumentParser:
    """
    Document parsing utilities for different file types
    """

    @staticmethod
    def parse_text(content: bytes) -> str:
        """Parse plain text file"""
        try:
            return content.decode("utf-8")
        except UnicodeDecodeError:
            # Try other encodings
            for encoding in ["latin-1", "cp1252"]:
                try:
                    return content.decode(encoding)
                except UnicodeDecodeError:
                    continue
            # Last resort
            return content.decode("utf-8", errors="replace")

    @staticmethod
    def parse_pdf(content: bytes) -> str:
        """Parse PDF file - requires PyPDF2 or similar"""
        try:
            import io

            import PyPDF2

            pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
            text = ""

            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"

            return text.strip()

        except ImportError:
            log_error("PyPDF2 not installed. Install with: pip install PyPDF2")
            raise Exception(
                "PDF parsing not available - PyPDF2 not installed"
            ) from None
        except Exception as e:
            log_error(f"PDF parsing failed: {e}")
            raise Exception(f"Failed to parse PDF: {e}") from e

    @staticmethod
    def parse_docx(content: bytes) -> str:
        """Parse DOCX file - TODO: implement with python-docx"""
        # TODO: Implement DOCX parsing
        raise Exception("DOCX parsing not yet implemented")

    @staticmethod
    def parse_csv(content: bytes) -> str:
        """Parse CSV file - TODO: implement"""
        # TODO: Implement CSV parsing
        raise Exception("CSV parsing not yet implemented")

    @staticmethod
    def parse_xlsx(content: bytes) -> str:
        """Parse XLSX file - TODO: implement"""
        # TODO: Implement XLSX parsing
        raise Exception("XLSX parsing not yet implemented")

    @classmethod
    def parse_document(cls, content: bytes, file_type: str) -> str:
        """
        Parse document based on file type

        Args:
            content: File content as bytes
            file_type: File type/extension

        Returns:
            Extracted text content
        """
        file_type = file_type.lower()

        if file_type in ["txt", "text"]:
            return cls.parse_text(content)
        elif file_type == "pdf":
            return cls.parse_pdf(content)
        elif file_type == "docx":
            return cls.parse_docx(content)
        elif file_type == "csv":
            return cls.parse_csv(content)
        elif file_type in ["xlsx", "xls"]:
            return cls.parse_xlsx(content)
        else:
            # Try as text by default
            log_info(f"Unknown file type {file_type}, attempting text parsing")
            return cls.parse_text(content)


class RAGService:
    """
    RAG (Retrieval-Augmented Generation) service for document ingestion and search
    """

    def __init__(self):
        self.chunker = TextChunker()
        self.parser = DocumentParser()

    def is_available(self) -> bool:
        """Check if RAG service is available"""
        return (
            supabase_service.is_available()
            and supabase_service.is_pgvector_available()
            and embeddings_service.is_available()
        )

    def get_status(self) -> dict:
        """Get RAG service status"""
        return {
            "available": self.is_available(),
            "supabase": supabase_service.is_available(),
            "pgvector": supabase_service.is_pgvector_available(),
            "embeddings": embeddings_service.get_status(),
            "chunk_size": self.chunker.chunk_size,
            "chunk_overlap": self.chunker.chunk_overlap,
        }

    async def ingest_document(
        self,
        tenant_id: str,
        name: str,
        content: bytes,
        file_type: str,
        url: str | None = None,
        correlation_id: str = "unknown",
    ) -> str:
        """
        Ingest a document: parse, chunk, embed, and store

        Args:
            tenant_id: Tenant identifier
            name: Document name
            content: File content as bytes
            file_type: File type/extension
            url: Optional file URL
            correlation_id: Request correlation ID

        Returns:
            Document ID (UUID)
        """
        if not self.is_available():
            raise Exception("RAG service not available")

        document_id = str(uuid.uuid4())

        try:
            log_info(
                f"Starting document ingestion: {name}",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                document_id=document_id,
                file_type=file_type,
            )

            # Parse document content
            text_content = self.parser.parse_document(content, file_type)

            if not text_content or not text_content.strip():
                raise Exception("No text content extracted from document")

            # Store document metadata
            await self._store_document(
                document_id=document_id,
                tenant_id=tenant_id,
                name=name,
                file_type=file_type,
                size=len(content),
                url=url,
                content=text_content,
            )

            # Chunk the text
            chunks = self.chunker.chunk_text(text_content)

            if not chunks:
                raise Exception("No chunks generated from document")

            log_info(
                f"Generated {len(chunks)} chunks for document",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                document_id=document_id,
                chunk_count=len(chunks),
            )

            # Generate embeddings for chunks
            chunk_texts = [chunk for chunk in chunks if chunk.strip()]
            embeddings = await embeddings_service.embed_texts(chunk_texts)

            # Store chunks with embeddings
            await self._store_chunks(
                document_id=document_id,
                tenant_id=tenant_id,
                chunks=chunk_texts,
                embeddings=embeddings,
            )

            # Mark document as processed
            await self._mark_document_processed(document_id)

            log_info(
                "Document ingestion completed successfully",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                document_id=document_id,
                chunk_count=len(chunks),
            )

            return document_id

        except Exception as e:
            log_error(
                f"Document ingestion failed: {e}",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                document_id=document_id,
                error_type=type(e).__name__,
            )

            # Clean up on failure
            try:
                await self._cleanup_failed_ingestion(document_id)
            except Exception as cleanup_error:
                log_error(f"Cleanup failed: {cleanup_error}")

            raise

    async def _store_document(
        self,
        document_id: str,
        tenant_id: str,
        name: str,
        file_type: str,
        size: int,
        url: str | None,
        content: str,
    ):
        """Store document metadata in database"""
        if not supabase_service.client:
            raise Exception("Supabase client not available")

        try:
            result = (
                supabase_service.client.table("documents")
                .insert(
                    {
                        "id": document_id,
                        "tenant_id": tenant_id,
                        "name": name,
                        "type": file_type,
                        "size": size,
                        "url": url,
                        "content": content,
                        "processed": False,
                    }
                )
                .execute()
            )

            if result.data is None:
                raise Exception("Failed to insert document")

        except Exception as e:
            log_error(f"Failed to store document: {e}")
            raise

    async def _store_chunks(
        self,
        document_id: str,
        tenant_id: str,
        chunks: list[str],
        embeddings: list[list[float]],
    ):
        """Store chunks with embeddings in database"""
        if not supabase_service.client:
            raise Exception("Supabase client not available")

        if len(chunks) != len(embeddings):
            raise Exception("Chunks and embeddings count mismatch")

        try:
            # Prepare chunk records
            chunk_records = []
            for idx, (chunk, embedding) in enumerate(
                zip(chunks, embeddings, strict=False)
            ):
                chunk_records.append(
                    {
                        "id": str(uuid.uuid4()),
                        "document_id": document_id,
                        "tenant_id": tenant_id,
                        "idx": idx,
                        "content": chunk,
                        "embedding": embedding,
                    }
                )

            # Insert chunks in batches to avoid payload size limits
            batch_size = 50
            for i in range(0, len(chunk_records), batch_size):
                batch = chunk_records[i : i + batch_size]

                result = supabase_service.client.table("chunks").insert(batch).execute()

                if result.data is None:
                    raise Exception(f"Failed to insert chunk batch {i//batch_size + 1}")

            log_info(f"Stored {len(chunk_records)} chunks for document {document_id}")

        except Exception as e:
            log_error(f"Failed to store chunks: {e}")
            raise

    async def _mark_document_processed(self, document_id: str):
        """Mark document as successfully processed"""
        if not supabase_service.client:
            raise Exception("Supabase client not available")

        try:
            result = (
                supabase_service.client.table("documents")
                .update({"processed": True})
                .eq("id", document_id)
                .execute()
            )

            if result.data is None:
                raise Exception("Failed to mark document as processed")

        except Exception as e:
            log_error(f"Failed to mark document as processed: {e}")
            raise

    async def _cleanup_failed_ingestion(self, document_id: str):
        """Clean up failed ingestion attempts"""
        if not supabase_service.client:
            return

        try:
            # Delete chunks first (foreign key constraint)
            supabase_service.client.table("chunks").delete().eq(
                "document_id", document_id
            ).execute()

            # Delete document
            supabase_service.client.table("documents").delete().eq(
                "id", document_id
            ).execute()

            log_info(f"Cleaned up failed ingestion for document {document_id}")

        except Exception as e:
            log_error(f"Cleanup failed for document {document_id}: {e}")

    async def search_similar_chunks(
        self,
        tenant_id: str,
        query: str,
        top_k: int = 5,
        correlation_id: str = "unknown",
    ) -> list[dict[str, Any]]:
        """
        Search for similar chunks using vector similarity

        Args:
            tenant_id: Tenant identifier
            query: Search query
            top_k: Number of results to return
            correlation_id: Request correlation ID

        Returns:
            List of similar chunks with metadata
        """
        if not self.is_available():
            raise Exception("RAG service not available")

        try:
            log_info(
                f"Searching for similar chunks: '{query[:50]}...'",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                top_k=top_k,
            )

            # Generate embedding for query
            query_embedding = await embeddings_service.embed_text(query)

            # Search for similar chunks
            results = await self._vector_search(
                tenant_id=tenant_id, query_embedding=query_embedding, top_k=top_k
            )

            log_info(
                f"Found {len(results)} similar chunks",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                result_count=len(results),
            )

            return results

        except Exception as e:
            log_error(
                f"Similarity search failed: {e}",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                error_type=type(e).__name__,
            )
            raise

    async def _vector_search(
        self, tenant_id: str, query_embedding: list[float], top_k: int
    ) -> list[dict[str, Any]]:
        """Perform vector similarity search in database"""
        if not supabase_service.client:
            raise Exception("Supabase client not available")

        try:
            # Convert embedding to pgvector format
            embedding_str = str(query_embedding)

            # Use RPC function for vector similarity search
            # This requires a stored procedure in Supabase
            result = supabase_service.client.rpc(
                "search_similar_chunks",
                {
                    "query_embedding": embedding_str,
                    "tenant_filter": tenant_id,
                    "match_count": top_k,
                },
            ).execute()

            # If RPC is not available, fall back to direct query
            # Note: This is a simplified approach - in production you'd use proper vector operations
            if not result.data:
                # Fallback query without vector ops
                result = (
                    supabase_service.client.table("chunks")
                    .select("id, content, document_id, idx, documents(name, type)")
                    .eq("tenant_id", tenant_id)
                    .limit(top_k)
                    .execute()
                )

            return result.data or []

        except Exception as e:
            log_error(f"Vector search failed: {e}")
            raise

    async def get_document_info(
        self, tenant_id: str, document_id: str | None = None
    ) -> list[dict[str, Any]]:
        """
        Get document information

        Args:
            tenant_id: Tenant identifier
            document_id: Specific document ID (optional)

        Returns:
            List of document information
        """
        if not supabase_service.client:
            raise Exception("Supabase client not available")

        try:
            query = (
                supabase_service.client.table("documents")
                .select("id, name, type, size, upload_date, processed, url")
                .eq("tenant_id", tenant_id)
            )

            if document_id:
                query = query.eq("id", document_id)

            result = query.execute()
            return result.data or []

        except Exception as e:
            log_error(f"Failed to get document info: {e}")
            raise

    async def delete_document(self, tenant_id: str, document_id: str) -> bool:
        """
        Delete a document and all its chunks

        Args:
            tenant_id: Tenant identifier
            document_id: Document to delete

        Returns:
            True if deleted successfully, False otherwise
        """
        if not supabase_service.client:
            raise Exception("Supabase client not available")

        try:
            # First verify document belongs to tenant
            doc_check = (
                supabase_service.client.table("documents")
                .select("id")
                .eq("id", document_id)
                .eq("tenant_id", tenant_id)
                .execute()
            )

            if not doc_check.data:
                return False  # Document not found or doesn't belong to tenant

            # Delete chunks first (foreign key constraint)
            (
                supabase_service.client.table("chunks")
                .delete()
                .eq("document_id", document_id)
                .eq("tenant_id", tenant_id)
                .execute()
            )

            # Delete document
            doc_result = (
                supabase_service.client.table("documents")
                .delete()
                .eq("id", document_id)
                .eq("tenant_id", tenant_id)
                .execute()
            )

            success = doc_result.data is not None and len(doc_result.data) > 0

            if success:
                log_info(f"Deleted document {document_id} and its chunks")

            return success

        except Exception as e:
            log_error(f"Failed to delete document {document_id}: {e}")
            return False


# Global RAG service instance
rag_service = RAGService()
