from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import logging
import asyncio
from typing import Dict, List, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field

# Internal imports
from config import conversational_config
from services.conversational_ai import ConversationalAI
from services.rag_service import RAGService
from services.intent_classifier import IntentClassifier, SentimentAnalyzer

# Configure logging
logging.basicConfig(
    level=getattr(logging, conversational_config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Security
security = HTTPBearer()

# Global services
conversational_ai = None
rag_service = None
intent_classifier = None
sentiment_analyzer = None

# Pydantic models for API
class ConversationRequest(BaseModel):
    message: str = Field(..., description="User message")
    user_id: str = Field(..., description="Unique user identifier")
    session_id: Optional[str] = Field(None, description="Session identifier")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional context")
    use_rag: Optional[bool] = Field(True, description="Whether to use RAG for response")
    intent_override: Optional[str] = Field(None, description="Override intent classification")

class ConversationResponse(BaseModel):
    response: str
    intent: Dict[str, Any]
    sentiment: Dict[str, Any]
    session_id: str
    timestamp: str
    metadata: Optional[Dict[str, Any]] = None

class IntentClassificationRequest(BaseModel):
    message: str = Field(..., description="Message to classify")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict)

class SentimentAnalysisRequest(BaseModel):
    text: str = Field(..., description="Text to analyze")

class RAGQueryRequest(BaseModel):
    query: str = Field(..., description="Query for document retrieval")
    top_k: Optional[int] = Field(5, description="Number of top results to return")
    threshold: Optional[float] = Field(0.7, description="Similarity threshold")

class DocumentUploadRequest(BaseModel):
    content: str = Field(..., description="Document content")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    document_type: Optional[str] = Field("text", description="Type of document")

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    services: Dict[str, bool]
    version: str = "1.0.0"

# Startup and shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan"""
    # Startup
    logger.info("Starting IA Conversational Service...")

    global conversational_ai, rag_service, intent_classifier, sentiment_analyzer

    try:
        # Initialize services
        logger.info("Initializing services...")

        conversational_ai = ConversationalAI()
        await conversational_ai.initialize()

        rag_service = RAGService()
        await rag_service.initialize()

        intent_classifier = IntentClassifier()
        sentiment_analyzer = SentimentAnalyzer()

        logger.info("All services initialized successfully")

        yield

    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        raise
    finally:
        # Shutdown
        logger.info("Shutting down IA Conversational Service...")

        if rag_service:
            await rag_service.close()

        logger.info("Shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="IA Conversational Service",
    description="Advanced AI conversational processing with LangChain integration",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=conversational_config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth dependency
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Validate API token"""
    if conversational_config.API_KEY and credentials.credentials != conversational_config.API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return credentials.credentials

# Health check
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    services_status = {
        "conversational_ai": conversational_ai is not None,
        "rag_service": rag_service is not None and rag_service.is_initialized,
        "intent_classifier": intent_classifier is not None,
        "sentiment_analyzer": sentiment_analyzer is not None
    }

    return HealthResponse(
        status="healthy" if all(services_status.values()) else "degraded",
        timestamp=datetime.now().isoformat(),
        services=services_status
    )

# Main conversation endpoint
@app.post("/conversation", response_model=ConversationResponse)
async def process_conversation(
    request: ConversationRequest,
    background_tasks: BackgroundTasks,
    token: str = Depends(get_current_user)
):
    """Process a conversational message"""
    try:
        logger.info(f"Processing conversation for user {request.user_id}")

        if not conversational_ai:
            raise HTTPException(status_code=503, detail="Conversational AI service not available")

        # Generate session ID if not provided
        session_id = request.session_id or f"{request.user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        # Process the conversation
        result = await conversational_ai.process_conversation(
            message=request.message,
            user_id=request.user_id,
            session_id=session_id,
            context=request.context,
            use_rag=request.use_rag,
            intent_override=request.intent_override
        )

        # Log conversation in background
        background_tasks.add_task(
            log_conversation,
            request.user_id,
            session_id,
            request.message,
            result
        )

        return ConversationResponse(
            response=result["response"],
            intent=result["intent"],
            sentiment=result["sentiment"],
            session_id=session_id,
            timestamp=result["timestamp"],
            metadata=result.get("metadata")
        )

    except Exception as e:
        logger.error(f"Error processing conversation: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing conversation: {str(e)}")

# Intent classification endpoint
@app.post("/intent/classify")
async def classify_intent(
    request: IntentClassificationRequest,
    token: str = Depends(get_current_user)
):
    """Classify intent of a message"""
    try:
        if not intent_classifier:
            raise HTTPException(status_code=503, detail="Intent classifier not available")

        result = await intent_classifier.classify_intent(request.message, request.context)
        return result

    except Exception as e:
        logger.error(f"Error classifying intent: {e}")
        raise HTTPException(status_code=500, detail=f"Error classifying intent: {str(e)}")

# Sentiment analysis endpoint
@app.post("/sentiment/analyze")
async def analyze_sentiment(
    request: SentimentAnalysisRequest,
    token: str = Depends(get_current_user)
):
    """Analyze sentiment of text"""
    try:
        if not sentiment_analyzer:
            raise HTTPException(status_code=503, detail="Sentiment analyzer not available")

        result = await sentiment_analyzer.analyze_sentiment(request.text)
        return result

    except Exception as e:
        logger.error(f"Error analyzing sentiment: {e}")
        raise HTTPException(status_code=500, detail=f"Error analyzing sentiment: {str(e)}")

# RAG endpoints
@app.post("/rag/query")
async def rag_query(
    request: RAGQueryRequest,
    token: str = Depends(get_current_user)
):
    """Query documents using RAG"""
    try:
        if not rag_service or not rag_service.is_initialized:
            raise HTTPException(status_code=503, detail="RAG service not available")

        results = await rag_service.similarity_search(
            query=request.query,
            k=request.top_k,
            score_threshold=request.threshold
        )

        return {
            "query": request.query,
            "results": results,
            "count": len(results),
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Error in RAG query: {e}")
        raise HTTPException(status_code=500, detail=f"Error in RAG query: {str(e)}")

@app.post("/rag/documents")
async def upload_document(
    request: DocumentUploadRequest,
    background_tasks: BackgroundTasks,
    token: str = Depends(get_current_user)
):
    """Upload document to RAG knowledge base"""
    try:
        if not rag_service or not rag_service.is_initialized:
            raise HTTPException(status_code=503, detail="RAG service not available")

        # Process document upload in background
        background_tasks.add_task(
            process_document_upload,
            request.content,
            request.metadata,
            request.document_type
        )

        return {
            "status": "accepted",
            "message": "Document upload processing started",
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        raise HTTPException(status_code=500, detail=f"Error uploading document: {str(e)}")

@app.get("/rag/documents")
async def list_documents(
    limit: int = 50,
    offset: int = 0,
    token: str = Depends(get_current_user)
):
    """List documents in RAG knowledge base"""
    try:
        if not rag_service or not rag_service.is_initialized:
            raise HTTPException(status_code=503, detail="RAG service not available")

        documents = await rag_service.list_documents(limit=limit, offset=offset)

        return {
            "documents": documents,
            "limit": limit,
            "offset": offset,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail=f"Error listing documents: {str(e)}")

@app.delete("/rag/documents/{document_id}")
async def delete_document(
    document_id: str,
    token: str = Depends(get_current_user)
):
    """Delete document from RAG knowledge base"""
    try:
        if not rag_service or not rag_service.is_initialized:
            raise HTTPException(status_code=503, detail="RAG service not available")

        success = await rag_service.delete_document(document_id)

        if not success:
            raise HTTPException(status_code=404, detail="Document not found")

        return {
            "status": "deleted",
            "document_id": document_id,
            "timestamp": datetime.now().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting document: {str(e)}")

# Conversation management endpoints
@app.get("/conversations/{user_id}")
async def get_conversation_history(
    user_id: str,
    session_id: Optional[str] = None,
    limit: int = 50,
    token: str = Depends(get_current_user)
):
    """Get conversation history for a user"""
    try:
        if not conversational_ai:
            raise HTTPException(status_code=503, detail="Conversational AI service not available")

        history = await conversational_ai.get_conversation_history(
            user_id=user_id,
            session_id=session_id,
            limit=limit
        )

        return {
            "user_id": user_id,
            "session_id": session_id,
            "history": history,
            "count": len(history),
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Error getting conversation history: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting conversation history: {str(e)}")

@app.delete("/conversations/{user_id}")
async def clear_conversation_history(
    user_id: str,
    session_id: Optional[str] = None,
    token: str = Depends(get_current_user)
):
    """Clear conversation history for a user"""
    try:
        if not conversational_ai:
            raise HTTPException(status_code=503, detail="Conversational AI service not available")

        await conversational_ai.clear_conversation_memory(user_id, session_id)

        return {
            "status": "cleared",
            "user_id": user_id,
            "session_id": session_id,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Error clearing conversation history: {e}")
        raise HTTPException(status_code=500, detail=f"Error clearing conversation history: {str(e)}")

# Analytics endpoints
@app.get("/analytics/intents")
async def get_intent_analytics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    token: str = Depends(get_current_user)
):
    """Get intent classification analytics"""
    try:
        # This would typically query a database
        # For now, return supported intents
        if intent_classifier:
            return {
                "supported_intents": intent_classifier.get_supported_intents(),
                "confidence_threshold": intent_classifier.get_intent_confidence_threshold(),
                "timestamp": datetime.now().isoformat()
            }
        else:
            raise HTTPException(status_code=503, detail="Intent classifier not available")

    except Exception as e:
        logger.error(f"Error getting intent analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting intent analytics: {str(e)}")

@app.get("/analytics/sentiment")
async def get_sentiment_analytics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    token: str = Depends(get_current_user)
):
    """Get sentiment analysis analytics"""
    try:
        # This would typically query a database for sentiment trends
        return {
            "message": "Sentiment analytics would be implemented with conversation logging",
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Error getting sentiment analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting sentiment analytics: {str(e)}")

# Background tasks
async def log_conversation(user_id: str, session_id: str, message: str, result: Dict[str, Any]):
    """Log conversation for analytics (background task)"""
    try:
        # This would typically save to a database
        logger.info(f"Conversation logged: user={user_id}, session={session_id}")

        # Here you would implement conversation logging to your database
        # Example structure:
        conversation_log = {
            "user_id": user_id,
            "session_id": session_id,
            "user_message": message,
            "ai_response": result["response"],
            "intent": result["intent"],
            "sentiment": result["sentiment"],
            "timestamp": result["timestamp"],
            "metadata": result.get("metadata", {})
        }

        # Save to database...

    except Exception as e:
        logger.error(f"Error logging conversation: {e}")

async def process_document_upload(content: str, metadata: Dict[str, Any], document_type: str):
    """Process document upload (background task)"""
    try:
        if rag_service and rag_service.is_initialized:
            document_id = await rag_service.add_document(content, metadata)
            logger.info(f"Document uploaded successfully: {document_id}")
        else:
            logger.error("RAG service not available for document upload")

    except Exception as e:
        logger.error(f"Error processing document upload: {e}")

# Run the application
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=conversational_config.HOST,
        port=conversational_config.PORT,
        reload=conversational_config.DEBUG,
        log_level=conversational_config.LOG_LEVEL.lower()
    )
