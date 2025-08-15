"""
RAG endpoints with document upload and query - Prompt 5 implementation
"""

import os

from fastapi import APIRouter, File, HTTPException, Request, UploadFile, status
from fastapi.responses import JSONResponse

from app.core.logging import log_error, log_info
from app.schemas.assistant import (
    DocumentListResponse,
    DocumentUploadResponse,
    RAGAnswerResult,
    RAGQueryRequest,
    RAGQueryResponseV5,
)
from app.services.rag_store import rag_store

router = APIRouter(prefix="/rag", tags=["rag"])

# Supported file types as per Prompt 5 requirements
SUPPORTED_FILE_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "text/csv": "csv",
}

SUPPORTED_EXTENSIONS = [".pdf", ".docx", ".txt", ".xlsx", ".csv"]


@router.post("/documents", response_model=DocumentUploadResponse)
async def upload_document(
    req: Request, file: UploadFile = File(...)
) -> DocumentUploadResponse:
    """
    Upload and index document in RAG knowledge base

    Endpoint: POST /rag/documents
    Input: multipart/form-data with file (pdf|docx|txt|xlsx|csv)
    Output: { ok: true, count_indexed: 1 }

    Supports: pdf|docx|txt|xlsx|csv with multipart upload
    Returns: { ok: true, count_indexed: 1 } and marks processed: true
    """

    correlation_id = getattr(req.state, "correlation_id", "unknown")
    tenant_id = getattr(req.state, "tenant_id", "demo")

    try:
        # Validate file type
        file_extension = os.path.splitext(file.filename)[1].lower()
        if file_extension not in SUPPORTED_EXTENSIONS:
            log_error(
                f"Unsupported file type: {file_extension}",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                file_name=file.filename,
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type. Supported: {', '.join(SUPPORTED_EXTENSIONS)}",
            )

        # Read file content
        file_content = await file.read()
        file_size = len(file_content)

        # Validate file size (max 10MB)
        if file_size > 10 * 1024 * 1024:
            log_error(
                f"File too large: {file_size} bytes",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                file_name=file.filename,
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File too large. Maximum size: 10MB",
            )

        log_info(
            f"Processing document upload: {file.filename}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            file_name=file.filename,
            file_size=file_size,
            file_type=file_extension,
        )

        # Extract text content based on file type (mock extraction)
        extracted_text = await _extract_text_content(
            file_content, file_extension, file.filename
        )

        # Index document in RAG store
        doc_metadata = await rag_store.index_document(
            content=extracted_text,
            filename=file.filename,
            file_size=file_size,
            file_type=file_extension.lstrip("."),
            tenant_id=tenant_id,
            correlation_id=correlation_id,
        )

        # Create response matching Prompt 5 specification
        response = DocumentUploadResponse(
            ok=True,
            count_indexed=1,
            documents=[
                {
                    "id": doc_metadata.id,
                    "name": doc_metadata.name,
                    "type": doc_metadata.type,
                    "size": doc_metadata.size,
                    "upload_date": doc_metadata.upload_date,
                    "url": doc_metadata.url,
                    "processed": doc_metadata.processed,
                }
            ],
            message=f"Document '{file.filename}' uploaded and indexed successfully",
        )

        log_info(
            "Document uploaded and indexed successfully",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            document_id=doc_metadata.id,
            file_name=file.filename,
            processed=doc_metadata.processed,
        )

        return response

    except HTTPException:
        raise
    except Exception as e:
        # Simple error logging to avoid field conflicts
        log_error(
            f"Document upload failed: {str(e)}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document upload failed: {str(e)}",
        ) from e


@router.get("/documents", response_model=DocumentListResponse)
async def list_documents(req: Request) -> DocumentListResponse:
    """
    List all documents in tenant's knowledge base

    Endpoint: GET /rag/documents
    Returns: { documents: [...], count: N }

    Each document includes: id, name, type, size, upload_date, url, processed
    Tenant isolation: only shows documents for current tenant
    """
    correlation_id = getattr(req.state, "correlation_id", "unknown")
    tenant_id = getattr(req.state, "tenant_id", "demo")

    try:
        documents = await rag_store.list_documents(tenant_id=tenant_id)

        # Convert to response format
        doc_list = []
        for doc in documents:
            doc_list.append(
                {
                    "id": doc.id,
                    "name": doc.name,
                    "type": doc.type,
                    "size": doc.size,
                    "upload_date": doc.upload_date,
                    "url": doc.url,
                    "processed": doc.processed,
                }
            )

        response = DocumentListResponse(documents=doc_list, count=len(doc_list))

        log_info(
            f"Listed {len(doc_list)} documents",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            document_count=len(doc_list),
        )

        return response

    except Exception as e:
        log_error(
            f"Failed to list documents: {str(e)}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list documents: {str(e)}",
        ) from e


@router.post("/query", response_model=RAGQueryResponseV5)
async def query_rag(req: Request, query_request: RAGQueryRequest) -> RAGQueryResponseV5:
    """
    Query the RAG knowledge base with semantic search

    Endpoint: POST /rag/query
    Input: { query: "question", limit?: 5 }
    Output: { answers: [...], metadata: {...} }

    Performs semantic search across tenant's documents
    Returns answer with sources and confidence scores
    Mock similarity calculation using term overlap
    """
    correlation_id = getattr(req.state, "correlation_id", "unknown")
    tenant_id = getattr(req.state, "tenant_id", "demo")

    try:
        # Input validation
        if not query_request.query or not query_request.query.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Query cannot be empty"
            )

        # Validate limit parameter
        limit = getattr(query_request, "limit", 5)
        if limit < 1 or limit > 20:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Limit must be between 1 and 20",
            )

        log_info(
            f"Processing RAG query: {query_request.query[:100]}...",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            query_length=len(query_request.query),
            limit=limit,
        )

        # Query RAG store with tenant isolation
        results = await rag_store.query_similar(
            query=query_request.query,
            tenant_id=tenant_id,
            limit=limit,
            correlation_id=correlation_id,
        )

        # Format response according to Prompt 5 specification
        answers = []
        for result in results:
            answer = RAGAnswerResult(
                text=result["answer"],
                source=result["source"],
                confidence=result["confidence"],
                document_id=result["document_id"],
            )
            answers.append(answer)

        response = RAGQueryResponseV5(
            answers=answers,
            metadata={
                "query": query_request.query,
                "results_found": len(answers),
                "tenant_id": tenant_id,
                "processing_time_ms": getattr(req.state, "processing_time", 0),
            },
        )

        log_info(
            "RAG query completed",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            results_found=len(answers),
            query_hash=hash(query_request.query),
        )

        return response

    except HTTPException:
        raise
    except Exception as e:
        log_error(
            f"RAG query failed: {str(e)}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG query failed: {str(e)}",
        ) from e


@router.delete("/documents/{document_id}")
async def delete_document(document_id: str, req: Request) -> JSONResponse:
    """
    Delete a specific document from the knowledge base

    Endpoint: DELETE /rag/documents/{document_id}
    Returns: { ok: true, message: "Document deleted" }

    Tenant isolation: can only delete documents belonging to current tenant
    Returns 404 if document not found or belongs to different tenant
    """
    correlation_id = getattr(req.state, "correlation_id", "unknown")
    tenant_id = getattr(req.state, "tenant_id", "demo")

    try:
        success = await rag_store.delete_document(
            document_id=document_id, tenant_id=tenant_id
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document {document_id} not found or access denied",
            )

        log_info(
            "Document deleted successfully",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            document_id=document_id,
        )

        return JSONResponse(
            content={
                "ok": True,
                "message": f"Document {document_id} deleted successfully",
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        log_error(
            f"Failed to delete document: {str(e)}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            document_id=document_id,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document: {str(e)}",
        ) from e


async def _extract_text_content(
    file_content: bytes, file_extension: str, filename: str
) -> str:
    """
    Mock text extraction from different file types
    In production, this would use actual parsers (PyPDF2, python-docx, etc.)
    """

    # For Phase 1, we'll do mock extraction based on file type
    if file_extension == ".txt":
        try:
            return file_content.decode("utf-8")
        except UnicodeDecodeError:
            try:
                return file_content.decode("latin-1")
            except UnicodeDecodeError:
                return f"Mock content for text file: {filename}"

    elif file_extension == ".pdf":
        return f"Mock PDF content for {filename}. This would contain extracted text from PDF pages. Sample content about business processes, documentation, and procedures."

    elif file_extension == ".docx":
        return f"Mock DOCX content for {filename}. This would contain text extracted from Word document including headings, paragraphs, and formatted content about business operations."

    elif file_extension == ".xlsx":
        return f"Mock XLSX content for {filename}. This would contain text representation of spreadsheet data including headers, cell values, and structured business data."

    elif file_extension == ".csv":
        try:
            text_content = file_content.decode("utf-8")
            # For CSV, return first few rows as sample
            lines = text_content.split("\n")[:10]  # First 10 rows
            return "\n".join(lines)
        except UnicodeDecodeError:
            return f"Mock CSV content for {filename}. This would contain structured data in comma-separated format."

    else:
        return f"Mock content for {filename}. File type: {file_extension}"
