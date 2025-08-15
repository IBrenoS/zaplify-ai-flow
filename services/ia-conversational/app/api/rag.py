"""
RAG API endpoints for document upload and similarity search - Prompt 8 Implementation
Real RAG with Supabase + pgvector (ingestion & search)
"""

import os
import time
from typing import Any

from fastapi import APIRouter, File, HTTPException, Request, UploadFile, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.core.logging import log_error, log_info
from app.db.migrations import get_migration_status
from app.services.embeddings import embeddings_service
from app.services.rag import rag_service


class RAGQueryRequest(BaseModel):
    query: str
    top_k: int | None = 5


class RAGQueryResponse(BaseModel):
    query: str
    results: list[dict[str, Any]]
    total_results: int
    processing_time_ms: float


class DocumentUploadResponse(BaseModel):
    document_id: str
    name: str
    type: str
    size: int
    processed: bool
    message: str


class RAGStatusResponse(BaseModel):
    rag_available: bool
    embeddings_status: dict[str, Any]
    database_status: dict[str, Any]
    migration_status: dict[str, Any]


router = APIRouter(prefix="/rag", tags=["rag"])


@router.get("/status", response_model=RAGStatusResponse)
async def get_rag_status(request: Request):
    """Get RAG service status and configuration"""
    correlation_id = getattr(request.state, "correlation_id", "unknown")
    tenant_id = getattr(request.state, "tenant_id", "demo")

    try:
        log_info(
            "Getting RAG service status",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
        )

        # Check if embeddings service is configured
        if not embeddings_service.is_available():
            # Return helpful error message for configuration
            provider = os.getenv("EMBEDDINGS_PROVIDER", "").lower()
            openai_key = bool(os.getenv("OPENAI_API_KEY"))

            error_msg = "RAG service not available: "
            if not provider:
                error_msg += "EMBEDDINGS_PROVIDER not set (use 'openai' or 'local')"
            elif provider == "openai" and not openai_key:
                error_msg += "OPENAI_API_KEY required when EMBEDDINGS_PROVIDER=openai"
            else:
                error_msg += f"embeddings service not available (provider: {provider})"

            return RAGStatusResponse(
                rag_available=False,
                embeddings_status={
                    "available": False,
                    "error": error_msg,
                    "provider": provider,
                    "openai_configured": openai_key,
                },
                database_status=rag_service.get_status(),
                migration_status=get_migration_status(),
            )

        # Get comprehensive status
        embeddings_status = embeddings_service.get_status()
        rag_status = rag_service.get_status()
        migration_status = get_migration_status()

        response = RAGStatusResponse(
            rag_available=rag_service.is_available(),
            embeddings_status=embeddings_status,
            database_status=rag_status,
            migration_status=migration_status,
        )

        log_info(
            f"RAG status retrieved: available={response.rag_available}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            rag_available=response.rag_available,
        )

        return response

    except Exception as e:
        log_error(
            f"RAG service status check failed: {e}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            error_type=type(e).__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get RAG service status",
        ) from e


@router.post("/documents", response_model=DocumentUploadResponse)
async def upload_document(request: Request, file: UploadFile = File(...)):
    """
    Upload and ingest a document for RAG

    Supports: PDF, TXT files (DOCX, CSV, XLSX marked as TODO)
    """
    correlation_id = getattr(request.state, "correlation_id", "unknown")
    tenant_id = getattr(request.state, "tenant_id", "demo")

    try:
        log_info(
            f"Document upload started: {file.filename}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            filename=file.filename,
            content_type=file.content_type,
        )

        # Check if RAG service is available
        if not rag_service.is_available():
            # Provide specific error guidance
            if not embeddings_service.is_available():
                provider = os.getenv("EMBEDDINGS_PROVIDER", "").lower()
                if not provider:
                    error_detail = (
                        "EMBEDDINGS_PROVIDER not configured. Set to 'openai' or 'local'"
                    )
                elif provider == "openai" and not os.getenv("OPENAI_API_KEY"):
                    error_detail = (
                        "OPENAI_API_KEY required when EMBEDDINGS_PROVIDER=openai"
                    )
                else:
                    error_detail = (
                        f"Embeddings service not available (provider: {provider})"
                    )
            else:
                error_detail = "RAG service not available (check database and pgvector)"

            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=error_detail
            )

        # Validate file
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="No filename provided"
            )

        # Determine file type from filename
        file_extension = (
            file.filename.split(".")[-1].lower() if "." in file.filename else ""
        )

        if file_extension not in ["pdf", "txt", "text"]:
            # Check for unsupported but planned formats
            if file_extension in ["docx", "csv", "xlsx", "xls"]:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"{file_extension.upper()} parsing not yet implemented (TODO)",
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Unsupported file type: {file_extension}. Supported: PDF, TXT",
                )

        # Read file content
        file_content = await file.read()
        file_size = len(file_content)

        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file provided"
            )

        # Ingest document
        document_id = await rag_service.ingest_document(
            tenant_id=tenant_id,
            name=file.filename,
            content=file_content,
            file_type=file_extension,
            correlation_id=correlation_id,
        )

        response = DocumentUploadResponse(
            document_id=document_id,
            name=file.filename,
            type=file_extension,
            size=file_size,
            processed=True,  # Should be true after successful ingestion
            message="Document uploaded and processed successfully",
        )

        log_info(
            f"Document upload completed: {file.filename}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            document_id=document_id,
            file_size=file_size,
        )

        return response

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        log_error(
            f"Document upload failed: {e}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            filename=getattr(file, "filename", "unknown"),
            error_type=type(e).__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document upload failed: {str(e)}",
        ) from e


@router.post("/query", response_model=RAGQueryResponse)
async def query_documents(request_data: RAGQueryRequest, request: Request):
    """
    Query documents using vector similarity search
    """
    correlation_id = getattr(request.state, "correlation_id", "unknown")
    tenant_id = getattr(request.state, "tenant_id", "demo")

    try:
        start_time = time.time()

        log_info(
            f"RAG query started: '{request_data.query[:50]}...'",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            query_length=len(request_data.query),
            top_k=request_data.top_k,
        )

        # Check if RAG service is available
        if not rag_service.is_available():
            # Provide specific error guidance
            if not embeddings_service.is_available():
                provider = os.getenv("EMBEDDINGS_PROVIDER", "").lower()
                if not provider:
                    error_detail = (
                        "EMBEDDINGS_PROVIDER not configured. Set to 'openai' or 'local'"
                    )
                elif provider == "openai" and not os.getenv("OPENAI_API_KEY"):
                    error_detail = (
                        "OPENAI_API_KEY required when EMBEDDINGS_PROVIDER=openai"
                    )
                else:
                    error_detail = (
                        f"Embeddings service not available (provider: {provider})"
                    )
            else:
                error_detail = "RAG service not available (check database and pgvector)"

            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=error_detail
            )

        # Validate query
        if not request_data.query or not request_data.query.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Query cannot be empty"
            )

        # Validate top_k
        if request_data.top_k is not None and (
            request_data.top_k < 1 or request_data.top_k > 50
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="top_k must be between 1 and 50",
            )

        # Perform similarity search
        results = await rag_service.search_similar_chunks(
            tenant_id=tenant_id,
            query=request_data.query,
            top_k=request_data.top_k or 5,
            correlation_id=correlation_id,
        )

        processing_time = (time.time() - start_time) * 1000  # Convert to milliseconds

        response = RAGQueryResponse(
            query=request_data.query,
            results=results,
            total_results=len(results),
            processing_time_ms=round(processing_time, 2),
        )

        log_info(
            f"RAG query completed: found {len(results)} results",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            result_count=len(results),
            processing_time_ms=response.processing_time_ms,
        )

        return response

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        log_error(
            f"RAG query failed: {e}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            query=request_data.query[:100],
            error_type=type(e).__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Query failed: {str(e)}",
        ) from e


@router.get("/documents")
async def get_documents(request: Request):
    """Get list of uploaded documents for tenant"""
    correlation_id = getattr(request.state, "correlation_id", "unknown")
    tenant_id = getattr(request.state, "tenant_id", "demo")

    try:
        log_info(
            "Getting document list", correlation_id=correlation_id, tenant_id=tenant_id
        )

        if not rag_service.is_available():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="RAG service not available",
            )

        documents = await rag_service.get_document_info(tenant_id=tenant_id)

        log_info(
            f"Retrieved {len(documents)} documents",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            document_count=len(documents),
        )

        return {"documents": documents, "total_count": len(documents)}

    except HTTPException:
        raise
    except Exception as e:
        log_error(
            f"Failed to get documents: {e}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            error_type=type(e).__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve documents",
        ) from e


@router.delete("/documents/{document_id}")
async def delete_document(document_id: str, request: Request):
    """Delete a document and all its chunks"""
    correlation_id = getattr(request.state, "correlation_id", "unknown")
    tenant_id = getattr(request.state, "tenant_id", "demo")

    try:
        log_info(
            f"Deleting document: {document_id}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            document_id=document_id,
        )

        if not rag_service.is_available():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="RAG service not available",
            )

        success = await rag_service.delete_document(
            tenant_id=tenant_id, document_id=document_id
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found or could not be deleted",
            )

        log_info(
            f"Document deleted successfully: {document_id}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            document_id=document_id,
        )

        return JSONResponse(
            status_code=200,
            content={
                "message": "Document deleted successfully",
                "document_id": document_id,
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        log_error(
            f"Failed to delete document: {e}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            document_id=document_id,
            error_type=type(e).__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete document",
        ) from e
