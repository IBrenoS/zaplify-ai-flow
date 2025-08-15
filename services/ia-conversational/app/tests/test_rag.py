"""
Test RAG endpoints for Prompt 5 implementation
Tests: document upload (valid/invalid), query with tenant isolation, edge cases
"""

import io

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_upload_valid_txt_document():
    """Test uploading a valid TXT document"""

    # Create a sample text file
    file_content = "This is a sample text document for testing RAG functionality. It contains information about business processes and procedures."
    file_data = io.BytesIO(file_content.encode("utf-8"))

    response = client.post(
        "/rag/documents",
        files={"file": ("test_document.txt", file_data, "text/plain")},
        headers={"x-tenant-id": "test-rag", "x-correlation-id": "rag-upload-001"},
    )

    assert response.status_code == 200
    data = response.json()

    # Verify response structure as per Prompt 5 requirements
    assert data["ok"]
    assert data["count_indexed"] == 1
    assert "document_id" in data
    assert "test_document.txt" in data["message"]


def test_upload_valid_pdf_document():
    """Test uploading a valid PDF document (mock)"""

    # Create mock PDF content
    file_content = b"Mock PDF content for testing"
    file_data = io.BytesIO(file_content)

    response = client.post(
        "/rag/documents",
        files={"file": ("business_report.pdf", file_data, "application/pdf")},
        headers={"x-tenant-id": "test-rag"},
    )

    assert response.status_code == 200
    data = response.json()

    assert data["ok"]
    assert data["count_indexed"] == 1
    assert "business_report.pdf" in data["message"]


def test_upload_valid_csv_document():
    """Test uploading a valid CSV document"""

    csv_content = (
        "Name,Age,Department\nJohn,30,Sales\nJane,25,Marketing\nBob,35,Engineering"
    )
    file_data = io.BytesIO(csv_content.encode("utf-8"))

    response = client.post(
        "/rag/documents",
        files={"file": ("employees.csv", file_data, "text/csv")},
        headers={"x-tenant-id": "test-rag"},
    )

    assert response.status_code == 200
    data = response.json()

    assert data["ok"]
    assert data["count_indexed"] == 1


def test_upload_invalid_file_type():
    """Test uploading an unsupported file type"""

    file_content = b"Invalid file content"
    file_data = io.BytesIO(file_content)

    response = client.post(
        "/rag/documents",
        files={"file": ("invalid_file.exe", file_data, "application/octet-stream")},
        headers={"x-tenant-id": "test-rag"},
    )

    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]


def test_upload_empty_file():
    """Test uploading an empty file"""

    file_data = io.BytesIO(b"")

    response = client.post(
        "/rag/documents",
        files={"file": ("empty.txt", file_data, "text/plain")},
        headers={"x-tenant-id": "test-rag"},
    )

    # Should still process empty file (might be valid in some cases)
    assert response.status_code == 200
    data = response.json()
    assert data["ok"]


def test_upload_large_file():
    """Test uploading a file that's too large"""

    # Create file larger than 10MB limit
    large_content = "x" * (11 * 1024 * 1024)  # 11MB
    file_data = io.BytesIO(large_content.encode("utf-8"))

    response = client.post(
        "/rag/documents",
        files={"file": ("large_file.txt", file_data, "text/plain")},
        headers={"x-tenant-id": "test-rag"},
    )

    assert response.status_code == 400
    assert "File too large" in response.json()["detail"]


def test_list_documents_empty():
    """Test listing documents when no documents exist"""

    response = client.get("/rag/documents", headers={"x-tenant-id": "empty-rag"})

    assert response.status_code == 200
    data = response.json()

    assert data["total"] == 0
    assert data["processed"] == 0
    assert len(data["documents"]) == 0


def test_list_documents_with_content():
    """Test listing documents after uploading some"""

    # Upload a document first
    file_content = "Test document for listing"
    file_data = io.BytesIO(file_content.encode("utf-8"))

    upload_response = client.post(
        "/rag/documents",
        files={"file": ("list_test.txt", file_data, "text/plain")},
        headers={"x-tenant-id": "list-test-rag"},
    )

    assert upload_response.status_code == 200

    # Now list documents
    list_response = client.get(
        "/rag/documents", headers={"x-tenant-id": "list-test-rag"}
    )

    assert list_response.status_code == 200
    data = list_response.json()

    assert data["total"] == 1
    assert data["processed"] == 1
    assert len(data["documents"]) == 1
    assert data["documents"][0]["name"] == "list_test.txt"
    assert data["documents"][0]["processed"]


def test_query_rag_empty_knowledge_base():
    """Test querying RAG when no documents exist"""

    query_data = {"query": "What is our company policy?", "limit": 5}

    response = client.post(
        "/rag/query", json=query_data, headers={"x-tenant-id": "empty-query-rag"}
    )

    assert response.status_code == 200
    data = response.json()

    # Should return empty results
    assert len(data["answers"]) == 0
    assert data["meta"]["total_results"] == 0
    assert data["meta"]["query"] == "What is our company policy?"


def test_query_rag_with_documents():
    """Test querying RAG with indexed documents"""

    # First upload a document
    file_content = "Our company policy states that employees must follow safety procedures and maintain professional conduct at all times."
    file_data = io.BytesIO(file_content.encode("utf-8"))

    upload_response = client.post(
        "/rag/documents",
        files={"file": ("company_policy.txt", file_data, "text/plain")},
        headers={"x-tenant-id": "query-test-rag"},
    )

    assert upload_response.status_code == 200

    # Now query for relevant content
    query_data = {"query": "company policy safety procedures", "limit": 3}

    response = client.post(
        "/rag/query", json=query_data, headers={"x-tenant-id": "query-test-rag"}
    )

    assert response.status_code == 200
    data = response.json()

    # Should find relevant document
    assert len(data["answers"]) > 0
    assert data["meta"]["total_results"] > 0

    # Check first result
    first_result = data["answers"][0]
    assert "document_id" in first_result
    assert first_result["name"] == "company_policy.txt"
    assert first_result["type"] == "txt"
    assert first_result["relevance_score"] > 0
    assert "company policy" in first_result["content"]


def test_query_rag_with_correlation():
    """Test RAG query includes correlation tracking"""

    query_data = {"query": "test query for correlation", "limit": 3}

    response = client.post(
        "/rag/query",
        json=query_data,
        headers={"x-tenant-id": "correlation-rag", "x-correlation-id": "rag-query-123"},
    )

    assert response.status_code == 200
    data = response.json()

    # Check correlation is preserved in metadata
    assert data["meta"]["correlation_id"] == "rag-query-123"
    assert data["meta"]["tenant_id"] == "correlation-rag"


def test_query_rag_tenant_isolation():
    """Test that RAG queries respect tenant isolation"""

    # Upload document to tenant A
    file_content = "Tenant A confidential information"
    file_data = io.BytesIO(file_content.encode("utf-8"))

    upload_response = client.post(
        "/rag/documents",
        files={"file": ("tenant_a_doc.txt", file_data, "text/plain")},
        headers={"x-tenant-id": "tenant-a"},
    )

    assert upload_response.status_code == 200

    # Query from tenant B - should not see tenant A's documents
    query_data = {"query": "confidential information", "limit": 5}

    response = client.post(
        "/rag/query", json=query_data, headers={"x-tenant-id": "tenant-b"}
    )

    assert response.status_code == 200
    data = response.json()

    # Should not find any documents (tenant isolation)
    assert len(data["answers"]) == 0
    assert data["meta"]["total_documents"] == 0


def test_query_rag_multiple_documents():
    """Test querying with multiple documents and relevance scoring"""

    # Upload multiple documents
    documents = [
        ("doc1.txt", "Machine learning algorithms and artificial intelligence"),
        ("doc2.txt", "Business processes and workflow optimization"),
        ("doc3.txt", "Machine learning applications in business intelligence"),
    ]

    tenant_id = "multi-doc-rag"

    for filename, content in documents:
        file_data = io.BytesIO(content.encode("utf-8"))
        response = client.post(
            "/rag/documents",
            files={"file": (filename, file_data, "text/plain")},
            headers={"x-tenant-id": tenant_id},
        )
        assert response.status_code == 200

    # Query for machine learning
    query_data = {"query": "machine learning", "limit": 5}

    response = client.post(
        "/rag/query", json=query_data, headers={"x-tenant-id": tenant_id}
    )

    assert response.status_code == 200
    data = response.json()

    # Should find relevant documents
    assert len(data["answers"]) >= 2  # doc1 and doc3 should be relevant
    assert data["meta"]["total_documents"] == 3

    # Results should be sorted by relevance
    if len(data["answers"]) >= 2:
        assert (
            data["answers"][0]["relevance_score"]
            >= data["answers"][1]["relevance_score"]
        )


def test_delete_document():
    """Test deleting a document"""

    # Upload a document first
    file_content = "Document to be deleted"
    file_data = io.BytesIO(file_content.encode("utf-8"))

    upload_response = client.post(
        "/rag/documents",
        files={"file": ("delete_me.txt", file_data, "text/plain")},
        headers={"x-tenant-id": "delete-test-rag"},
    )

    assert upload_response.status_code == 200
    document_id = upload_response.json()["document_id"]

    # Delete the document
    delete_response = client.delete(
        f"/rag/documents/{document_id}", headers={"x-tenant-id": "delete-test-rag"}
    )

    assert delete_response.status_code == 200
    data = delete_response.json()
    assert data["ok"]

    # Verify document is deleted by listing
    list_response = client.get(
        "/rag/documents", headers={"x-tenant-id": "delete-test-rag"}
    )

    assert list_response.status_code == 200
    assert list_response.json()["total"] == 0


def test_delete_document_not_found():
    """Test deleting a non-existent document"""

    response = client.delete(
        "/rag/documents/non-existent-id", headers={"x-tenant-id": "delete-test-rag"}
    )

    assert response.status_code == 404
    assert "Document not found" in response.json()["detail"]


def test_delete_document_tenant_isolation():
    """Test that document deletion respects tenant isolation"""

    # Upload document to tenant A
    file_content = "Tenant A document"
    file_data = io.BytesIO(file_content.encode("utf-8"))

    upload_response = client.post(
        "/rag/documents",
        files={"file": ("tenant_a.txt", file_data, "text/plain")},
        headers={"x-tenant-id": "tenant-a-delete"},
    )

    assert upload_response.status_code == 200
    document_id = upload_response.json()["document_id"]

    # Try to delete from tenant B
    delete_response = client.delete(
        f"/rag/documents/{document_id}", headers={"x-tenant-id": "tenant-b-delete"}
    )

    assert delete_response.status_code == 404
    assert "Document not found" in delete_response.json()["detail"]


def test_query_with_invalid_limit():
    """Test query with invalid limit parameters"""

    # Test limit too high
    query_data = {"query": "test query", "limit": 25}  # Max is 20

    response = client.post(
        "/rag/query", json=query_data, headers={"x-tenant-id": "test-rag"}
    )

    assert response.status_code == 422  # Validation error


def test_query_empty_query():
    """Test query with empty query string"""

    query_data = {"query": "", "limit": 3}

    response = client.post(
        "/rag/query", json=query_data, headers={"x-tenant-id": "test-rag"}
    )

    assert response.status_code == 200
    # Should handle empty query gracefully
    data = response.json()
    assert len(data["answers"]) == 0
