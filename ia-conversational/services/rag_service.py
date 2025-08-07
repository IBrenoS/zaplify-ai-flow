import asyncio
import logging
from typing import Dict, List, Optional, Any, Tuple
import numpy as np
from datetime import datetime

try:
    from qdrant_client import QdrantClient
    from qdrant_client.http import models
    from qdrant_client.http.models import Distance, VectorParams
except ImportError:
    QdrantClient = None

try:
    import chromadb
    from chromadb.config import Settings
except ImportError:
    chromadb = None

from sentence_transformers import SentenceTransformer
from config import conversational_config

logger = logging.getLogger(__name__)

class RAGService:
    """Retrieval-Augmented Generation service for context retrieval"""

    def __init__(self):
        self.embeddings_model = None
        self.vector_db = None
        self.db_type = "qdrant"  # or "chroma"
        self._initialize_embeddings()
        self._initialize_vector_db()

    def _initialize_embeddings(self):
        """Initialize sentence transformer for embeddings"""
        try:
            self.embeddings_model = SentenceTransformer(conversational_config.EMBEDDINGS_MODEL)
            logger.info(f"Embeddings model {conversational_config.EMBEDDINGS_MODEL} loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load embeddings model: {e}")
            # Fallback to a smaller model
            try:
                self.embeddings_model = SentenceTransformer('all-MiniLM-L6-v2')
                logger.info("Fallback embeddings model loaded")
            except Exception as fallback_error:
                logger.error(f"Failed to load fallback embeddings model: {fallback_error}")

    def _initialize_vector_db(self):
        """Initialize vector database (Qdrant or ChromaDB)"""
        try:
            if QdrantClient and conversational_config.VECTOR_DB_URL:
                self._initialize_qdrant()
            elif chromadb:
                self._initialize_chromadb()
            else:
                logger.warning("No vector database available. RAG functionality will be limited.")
        except Exception as e:
            logger.error(f"Failed to initialize vector database: {e}")

    def _initialize_qdrant(self):
        """Initialize Qdrant vector database"""
        try:
            self.vector_db = QdrantClient(url=conversational_config.VECTOR_DB_URL)
            self.db_type = "qdrant"

            # Check if collection exists, create if not
            collections = self.vector_db.get_collections()
            collection_names = [col.name for col in collections.collections]

            if conversational_config.COLLECTION_NAME not in collection_names:
                self._create_qdrant_collection()

            logger.info("Qdrant vector database initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Qdrant: {e}")
            self._initialize_chromadb()  # Fallback to ChromaDB

    def _initialize_chromadb(self):
        """Initialize ChromaDB as fallback"""
        try:
            self.vector_db = chromadb.Client(Settings(anonymized_telemetry=False))
            self.db_type = "chroma"

            # Get or create collection
            try:
                self.collection = self.vector_db.get_collection(conversational_config.COLLECTION_NAME)
            except:
                self.collection = self.vector_db.create_collection(
                    name=conversational_config.COLLECTION_NAME,
                    metadata={"description": "Zaplify AI Flow knowledge base"}
                )

            logger.info("ChromaDB initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {e}")

    def _create_qdrant_collection(self):
        """Create Qdrant collection"""
        embedding_size = self.embeddings_model.get_sentence_embedding_dimension()

        self.vector_db.create_collection(
            collection_name=conversational_config.COLLECTION_NAME,
            vectors_config=VectorParams(
                size=embedding_size,
                distance=Distance.COSINE
            )
        )
        logger.info(f"Created Qdrant collection: {conversational_config.COLLECTION_NAME}")

    async def add_documents(self, documents: List[Dict[str, Any]]) -> bool:
        """Add documents to the vector database"""
        try:
            if not self.embeddings_model or not self.vector_db:
                logger.error("Embeddings model or vector DB not initialized")
                return False

            # Generate embeddings for documents
            texts = [doc["content"] for doc in documents]
            embeddings = self.embeddings_model.encode(texts, convert_to_tensor=False)

            if self.db_type == "qdrant":
                return await self._add_documents_qdrant(documents, embeddings)
            elif self.db_type == "chroma":
                return await self._add_documents_chroma(documents, embeddings)

            return False

        except Exception as e:
            logger.error(f"Error adding documents: {e}")
            return False

    async def _add_documents_qdrant(self, documents: List[Dict[str, Any]], embeddings: np.ndarray) -> bool:
        """Add documents to Qdrant"""
        try:
            points = []
            for i, (doc, embedding) in enumerate(zip(documents, embeddings)):
                point = models.PointStruct(
                    id=doc.get("id", f"doc_{datetime.now().timestamp()}_{i}"),
                    vector=embedding.tolist(),
                    payload={
                        "content": doc["content"],
                        "metadata": doc.get("metadata", {}),
                        "source": doc.get("source", "unknown"),
                        "timestamp": datetime.now().isoformat()
                    }
                )
                points.append(point)

            self.vector_db.upsert(
                collection_name=conversational_config.COLLECTION_NAME,
                points=points
            )

            logger.info(f"Added {len(documents)} documents to Qdrant")
            return True

        except Exception as e:
            logger.error(f"Error adding documents to Qdrant: {e}")
            return False

    async def _add_documents_chroma(self, documents: List[Dict[str, Any]], embeddings: np.ndarray) -> bool:
        """Add documents to ChromaDB"""
        try:
            ids = [doc.get("id", f"doc_{datetime.now().timestamp()}_{i}") for i, doc in enumerate(documents)]
            texts = [doc["content"] for doc in documents]
            metadatas = [doc.get("metadata", {}) for doc in documents]

            self.collection.add(
                embeddings=embeddings.tolist(),
                documents=texts,
                metadatas=metadatas,
                ids=ids
            )

            logger.info(f"Added {len(documents)} documents to ChromaDB")
            return True

        except Exception as e:
            logger.error(f"Error adding documents to ChromaDB: {e}")
            return False

    async def retrieve_context(
        self,
        query: str,
        top_k: int = 5,
        threshold: float = 0.7
    ) -> Dict[str, Any]:
        """Retrieve relevant context for a query"""
        try:
            if not self.embeddings_model or not self.vector_db:
                return {"documents": [], "sources": [], "scores": []}

            # Generate query embedding
            query_embedding = self.embeddings_model.encode([query], convert_to_tensor=False)[0]

            if self.db_type == "qdrant":
                return await self._retrieve_qdrant(query_embedding, top_k, threshold)
            elif self.db_type == "chroma":
                return await self._retrieve_chroma(query_embedding, top_k, threshold)

            return {"documents": [], "sources": [], "scores": []}

        except Exception as e:
            logger.error(f"Error retrieving context: {e}")
            return {"documents": [], "sources": [], "scores": []}

    async def _retrieve_qdrant(self, query_embedding: np.ndarray, top_k: int, threshold: float) -> Dict[str, Any]:
        """Retrieve from Qdrant"""
        try:
            search_result = self.vector_db.search(
                collection_name=conversational_config.COLLECTION_NAME,
                query_vector=query_embedding.tolist(),
                limit=top_k,
                score_threshold=threshold
            )

            documents = []
            sources = []
            scores = []

            for result in search_result:
                documents.append({
                    "content": result.payload["content"],
                    "metadata": result.payload.get("metadata", {}),
                    "source": result.payload.get("source", "unknown")
                })
                sources.append(result.payload.get("source", "unknown"))
                scores.append(result.score)

            return {
                "documents": documents,
                "sources": sources,
                "scores": scores
            }

        except Exception as e:
            logger.error(f"Error retrieving from Qdrant: {e}")
            return {"documents": [], "sources": [], "scores": []}

    async def _retrieve_chroma(self, query_embedding: np.ndarray, top_k: int, threshold: float) -> Dict[str, Any]:
        """Retrieve from ChromaDB"""
        try:
            results = self.collection.query(
                query_embeddings=[query_embedding.tolist()],
                n_results=top_k
            )

            documents = []
            sources = []
            scores = []

            if results["documents"] and results["documents"][0]:
                for i, doc in enumerate(results["documents"][0]):
                    # ChromaDB returns distances, convert to similarity scores
                    distance = results["distances"][0][i] if results["distances"] else 0
                    score = 1 - distance  # Convert distance to similarity

                    if score >= threshold:
                        metadata = results["metadatas"][0][i] if results["metadatas"] else {}
                        source = metadata.get("source", "unknown")

                        documents.append({
                            "content": doc,
                            "metadata": metadata,
                            "source": source
                        })
                        sources.append(source)
                        scores.append(score)

            return {
                "documents": documents,
                "sources": sources,
                "scores": scores
            }

        except Exception as e:
            logger.error(f"Error retrieving from ChromaDB: {e}")
            return {"documents": [], "sources": [], "scores": []}

    async def delete_documents(self, document_ids: List[str]) -> bool:
        """Delete documents from vector database"""
        try:
            if self.db_type == "qdrant":
                self.vector_db.delete(
                    collection_name=conversational_config.COLLECTION_NAME,
                    points_selector=models.PointIdsList(
                        points=document_ids
                    )
                )
            elif self.db_type == "chroma":
                self.collection.delete(ids=document_ids)

            logger.info(f"Deleted {len(document_ids)} documents")
            return True

        except Exception as e:
            logger.error(f"Error deleting documents: {e}")
            return False

    async def update_document(self, document_id: str, document: Dict[str, Any]) -> bool:
        """Update a document in the vector database"""
        try:
            # For most vector DBs, update = delete + add
            await self.delete_documents([document_id])
            document["id"] = document_id
            return await self.add_documents([document])

        except Exception as e:
            logger.error(f"Error updating document: {e}")
            return False

    async def search_similar(self, text: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search for similar documents"""
        result = await self.retrieve_context(text, top_k=limit, threshold=0.5)
        return result["documents"]

    def get_collection_info(self) -> Dict[str, Any]:
        """Get information about the vector collection"""
        try:
            if self.db_type == "qdrant":
                info = self.vector_db.get_collection(conversational_config.COLLECTION_NAME)
                return {
                    "type": "qdrant",
                    "name": conversational_config.COLLECTION_NAME,
                    "points_count": info.points_count,
                    "vector_size": info.config.params.vectors.size
                }
            elif self.db_type == "chroma":
                count = self.collection.count()
                return {
                    "type": "chroma",
                    "name": conversational_config.COLLECTION_NAME,
                    "points_count": count,
                    "vector_size": "unknown"
                }

            return {"type": "none", "error": "No vector database initialized"}

        except Exception as e:
            logger.error(f"Error getting collection info: {e}")
            return {"type": "error", "error": str(e)}

    async def initialize_knowledge_base(self) -> bool:
        """Initialize with default knowledge base"""
        try:
            default_documents = [
                {
                    "id": "zaplify_intro",
                    "content": """Zaplify AI Flow é uma plataforma de automação de vendas e marketing que utiliza IA conversacional para criar funnels inteligentes. A plataforma permite automatizar conversas no WhatsApp, criar fluxos de nurturing, qualificar leads automaticamente e integrar com diversas ferramentas de CRM e marketing.""",
                    "metadata": {"category": "product_overview", "importance": "high"},
                    "source": "product_documentation"
                },
                {
                    "id": "features_main",
                    "content": """Principais funcionalidades do Zaplify AI Flow: 1) IA Conversacional avançada com OpenAI/Anthropic, 2) Integração nativa com WhatsApp Business, 3) Constructor de funnels visuais drag-and-drop, 4) Automação de follow-ups e nurturing, 5) Analytics e métricas em tempo real, 6) Integrações com CRMs populares, 7) Segmentação avançada de leads, 8) A/B testing de mensagens.""",
                    "metadata": {"category": "features", "importance": "high"},
                    "source": "product_documentation"
                },
                {
                    "id": "pricing_basic",
                    "content": """Zaplify AI Flow oferece planos flexíveis: Starter (R$ 97/mês) para pequenos negócios com até 1.000 contatos, Professional (R$ 297/mês) para empresas em crescimento com até 10.000 contatos, Enterprise (R$ 797/mês) para grandes empresas com recursos ilimitados. Todos os planos incluem 14 dias de trial gratuito.""",
                    "metadata": {"category": "pricing", "importance": "high"},
                    "source": "pricing_page"
                },
                {
                    "id": "setup_quick",
                    "content": """Setup rápido do Zaplify: 1) Conecte sua conta WhatsApp Business, 2) Configure seu primeiro funnel usando templates, 3) Treine a IA com informações do seu negócio, 4) Teste o fluxo com contatos de exemplo, 5) Publique e comece a receber leads. Todo o processo leva menos de 30 minutos.""",
                    "metadata": {"category": "onboarding", "importance": "medium"},
                    "source": "setup_guide"
                },
                {
                    "id": "integrations",
                    "content": """Integrações disponíveis: HubSpot, Salesforce, Pipedrive, RD Station, ActiveCampaign, Mailchimp, Google Sheets, Zapier, Webhooks personalizados. Todas as integrações são configuradas em poucos cliques através de OAuth ou API keys.""",
                    "metadata": {"category": "integrations", "importance": "medium"},
                    "source": "integrations_docs"
                },
                {
                    "id": "support_channels",
                    "content": """Canais de suporte Zaplify: Chat ao vivo 24/7, Base de conhecimento completa, Vídeo tutoriais, Webinars semanais, Suporte técnico por email, Onboarding personalizado para planos Enterprise, Comunidade no Discord para usuários.""",
                    "metadata": {"category": "support", "importance": "medium"},
                    "source": "support_docs"
                }
            ]

            success = await self.add_documents(default_documents)
            if success:
                logger.info("Knowledge base initialized with default documents")
            return success

        except Exception as e:
            logger.error(f"Error initializing knowledge base: {e}")
            return False
