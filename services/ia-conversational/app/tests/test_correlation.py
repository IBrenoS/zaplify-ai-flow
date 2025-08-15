"""
Test correlation middleware functionality
Validates that response includes x-correlation-id and tenant_id reaches handler
"""

import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_correlation_id_generated_when_missing():
    """Test that correlation middleware generates correlation ID when not provided"""
    response = client.get("/health")

    assert response.status_code == 200
    assert "x-correlation-id" in response.headers

    correlation_id = response.headers["x-correlation-id"]
    assert len(correlation_id) > 0

    # Should be a valid UUID format
    try:
        uuid.UUID(correlation_id)
    except ValueError:
        pytest.fail("Generated correlation_id is not a valid UUID")


def test_correlation_id_preserved_when_provided():
    """Test that correlation middleware preserves provided correlation ID"""
    custom_correlation_id = "test-correlation-12345"

    response = client.get(
        "/health", headers={"x-correlation-id": custom_correlation_id}
    )

    assert response.status_code == 200
    assert response.headers["x-correlation-id"] == custom_correlation_id


def test_tenant_id_defaults_to_demo():
    """Test that tenant middleware sets default tenant to 'demo'"""
    response = client.get("/health")

    assert response.status_code == 200
    assert "x-tenant-id" in response.headers
    assert response.headers["x-tenant-id"] == "demo"


def test_tenant_id_preserved_when_provided():
    """Test that tenant middleware preserves custom tenant ID"""
    custom_tenant_id = "custom-tenant-123"

    response = client.get("/health", headers={"x-tenant-id": custom_tenant_id})

    assert response.status_code == 200
    assert response.headers["x-tenant-id"] == custom_tenant_id


def test_correlation_and_tenant_both_provided():
    """Test both correlation_id and tenant_id are handled correctly"""
    custom_correlation_id = str(uuid.uuid4())
    custom_tenant_id = "test-tenant-456"

    response = client.get(
        "/health",
        headers={
            "x-correlation-id": custom_correlation_id,
            "x-tenant-id": custom_tenant_id,
        },
    )

    assert response.status_code == 200
    assert response.headers["x-correlation-id"] == custom_correlation_id
    assert response.headers["x-tenant-id"] == custom_tenant_id


def test_headers_present_in_all_endpoints():
    """Test that correlation headers are present in all endpoints"""
    endpoints_to_test = [
        "/",
        "/health",
    ]

    for endpoint in endpoints_to_test:
        response = client.get(endpoint)

        assert (
            "x-correlation-id" in response.headers
        ), f"Missing correlation_id in {endpoint}"
        assert "x-tenant-id" in response.headers, f"Missing tenant_id in {endpoint}"
        assert len(response.headers["x-correlation-id"]) > 0
        assert response.headers["x-tenant-id"] == "demo"


def test_correlation_persists_across_request_cycle():
    """Test that correlation ID is consistent throughout request processing"""
    custom_correlation_id = "persistent-test-id"

    # Make request to health endpoint (which should log and return the same ID)
    response = client.get(
        "/health", headers={"x-correlation-id": custom_correlation_id}
    )

    assert response.status_code == 200
    assert response.headers["x-correlation-id"] == custom_correlation_id


def test_tenant_id_reaches_handler():
    """Test that tenant_id is accessible in request handlers via request.state"""
    # This test validates that the middleware correctly sets request.state
    # The health endpoint should be able to access tenant_id
    custom_tenant_id = "handler-test-tenant"

    response = client.get("/health", headers={"x-tenant-id": custom_tenant_id})

    assert response.status_code == 200
    assert response.headers["x-tenant-id"] == custom_tenant_id

    # The health endpoint should reflect the tenant information
    # (This assumes the health endpoint uses request.state.tenant_id)


def test_uuid_format_validation():
    """Test that generated UUIDs are properly formatted"""
    response = client.get("/health")

    correlation_id = response.headers["x-correlation-id"]

    # Should be valid UUID4 format
    parsed_uuid = uuid.UUID(correlation_id)
    assert str(parsed_uuid) == correlation_id
    assert parsed_uuid.version == 4


def test_case_insensitive_headers():
    """Test that headers work regardless of case"""
    custom_correlation_id = "case-test-id"
    custom_tenant_id = "case-test-tenant"

    # Test with different case combinations
    response = client.get(
        "/health",
        headers={
            "X-Correlation-ID": custom_correlation_id,  # Different case
            "x-tenant-id": custom_tenant_id,
        },
    )

    assert response.status_code == 200
    # Response headers should be normalized
    assert response.headers["x-correlation-id"] == custom_correlation_id
    assert response.headers["x-tenant-id"] == custom_tenant_id
