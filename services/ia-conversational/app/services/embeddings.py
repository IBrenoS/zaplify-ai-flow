"""
Embeddings Service - Support for OpenAI and Local (sentence-transformers) embeddings
"""

import asyncio
import os
from concurrent.futures import ThreadPoolExecutor

from app.core.logging import log_error, log_info


class EmbeddingsService:
    """
    Embeddings service supporting OpenAI and local sentence-transformers
    """

    def __init__(self):
        self.provider = os.getenv("EMBEDDINGS_PROVIDER", "").lower()
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.embedding_dimension = 1536  # OpenAI text-embedding-3-small/large dimension

        # Lazy loading for providers
        self._openai_client = None
        self._local_model = None
        self._executor = ThreadPoolExecutor(
            max_workers=2, thread_name_prefix="embeddings"
        )

        # Validate configuration
        self._validate_config()

    def _validate_config(self):
        """Validate embeddings configuration"""
        if not self.provider:
            log_error("EMBEDDINGS_PROVIDER not set. Set to 'openai' or 'local'")
            return

        if self.provider == "openai" and not self.openai_api_key:
            log_error("OPENAI_API_KEY required when EMBEDDINGS_PROVIDER=openai")
            return

        log_info(f"Embeddings provider configured: {self.provider}")

    def is_available(self) -> bool:
        """Check if embeddings service is properly configured"""
        if self.provider == "openai":
            return bool(self.openai_api_key)
        elif self.provider == "local":
            return True  # sentence-transformers can be installed on demand
        else:
            return False

    def get_status(self) -> dict:
        """Get embeddings service status"""
        return {
            "provider": self.provider,
            "available": self.is_available(),
            "dimension": self.embedding_dimension,
            "openai_configured": (
                bool(self.openai_api_key) if self.provider == "openai" else None
            ),
            "local_model_loaded": (
                self._local_model is not None if self.provider == "local" else None
            ),
        }

    def _load_openai_client(self):
        """Lazy load OpenAI client"""
        if self._openai_client is None and self.provider == "openai":
            try:
                import openai

                self._openai_client = openai.OpenAI(api_key=self.openai_api_key)
                log_info("OpenAI client loaded for embeddings")
            except ImportError:
                log_error("OpenAI library not installed. Run: pip install openai")
                raise
            except Exception as e:
                log_error(f"Failed to load OpenAI client: {e}")
                raise
        return self._openai_client

    def _load_local_model(self):
        """Lazy load sentence-transformers model"""
        if self._local_model is None and self.provider == "local":
            try:
                from sentence_transformers import SentenceTransformer

                model_name = "sentence-transformers/all-MiniLM-L6-v2"
                log_info(f"Loading local embeddings model: {model_name}")
                self._local_model = SentenceTransformer(model_name)
                # Update dimension for local model
                self.embedding_dimension = (
                    self._local_model.get_sentence_embedding_dimension()
                )
                log_info(
                    f"Local embeddings model loaded, dimension: {self.embedding_dimension}"
                )
            except ImportError:
                log_error(
                    "sentence-transformers not installed. Run: pip install sentence-transformers"
                )
                raise
            except Exception as e:
                log_error(f"Failed to load local model: {e}")
                raise
        return self._local_model

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """
        Generate embeddings for a list of texts

        Args:
            texts: List of text strings to embed

        Returns:
            List of embedding vectors (each vector is a list of floats)

        Raises:
            Exception: If embeddings service is not available or fails
        """
        if not texts:
            return []

        if not self.is_available():
            raise Exception(
                f"Embeddings service not available. Provider: {self.provider}"
            )

        try:
            if self.provider == "openai":
                return await self._embed_texts_openai(texts)
            elif self.provider == "local":
                return await self._embed_texts_local(texts)
            else:
                raise Exception(f"Unsupported embeddings provider: {self.provider}")

        except Exception as e:
            log_error(
                f"Embeddings generation failed: {e}",
                provider=self.provider,
                text_count=len(texts),
            )
            raise

    async def embed_text(self, text: str) -> list[float]:
        """
        Generate embedding for a single text

        Args:
            text: Text string to embed

        Returns:
            Embedding vector as list of floats
        """
        embeddings = await self.embed_texts([text])
        return embeddings[0] if embeddings else []

    async def _embed_texts_openai(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings using OpenAI API"""
        client = self._load_openai_client()

        # Run in executor to avoid blocking the event loop
        loop = asyncio.get_event_loop()

        def _generate_embeddings():
            try:
                # Use text-embedding-3-small for cost efficiency
                # Can be configured to use text-embedding-3-large for better quality
                model = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")

                response = client.embeddings.create(input=texts, model=model)

                return [embedding.embedding for embedding in response.data]

            except Exception as e:
                log_error(f"OpenAI embeddings API failed: {e}")
                raise

        try:
            # Apply timeout for API calls
            timeout = int(os.getenv("EMBEDDINGS_TIMEOUT_SECONDS", "30"))
            embeddings = await asyncio.wait_for(
                loop.run_in_executor(self._executor, _generate_embeddings),
                timeout=timeout,
            )

            log_info(f"Generated OpenAI embeddings for {len(texts)} texts")
            return embeddings

        except TimeoutError:
            log_error(f"OpenAI embeddings timed out after {timeout} seconds")
            raise Exception("Embeddings generation timed out") from None

    async def _embed_texts_local(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings using local sentence-transformers model"""
        model = self._load_local_model()

        # Run in executor to avoid blocking the event loop
        loop = asyncio.get_event_loop()

        def _generate_embeddings():
            try:
                # Generate embeddings
                embeddings = model.encode(texts, convert_to_tensor=False)

                # Convert to list of lists (numpy arrays -> Python lists)
                return [embedding.tolist() for embedding in embeddings]

            except Exception as e:
                log_error(f"Local embeddings generation failed: {e}")
                raise

        try:
            # Apply timeout for local generation
            timeout = int(
                os.getenv("EMBEDDINGS_TIMEOUT_SECONDS", "60")
            )  # Local might be slower
            embeddings = await asyncio.wait_for(
                loop.run_in_executor(self._executor, _generate_embeddings),
                timeout=timeout,
            )

            log_info(f"Generated local embeddings for {len(texts)} texts")
            return embeddings

        except TimeoutError:
            log_error(f"Local embeddings timed out after {timeout} seconds")
            raise Exception("Embeddings generation timed out") from None

    def get_embedding_dimension(self) -> int:
        """Get the dimension of embeddings for this provider"""
        if self.provider == "local" and self._local_model:
            return self._local_model.get_sentence_embedding_dimension()
        return self.embedding_dimension


# Global embeddings service instance
embeddings_service = EmbeddingsService()
