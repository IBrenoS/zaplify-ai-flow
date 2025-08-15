"""
Test middleware functionality
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_correlation_middleware_generates_id():
    """Test that correlation middleware generates correlation ID"""
    response = client.get("/health")

    assert "x-correlation-id" in response.headers
    assert len(response.headers["x-correlation-id"]) > 0


def test_correlation_middleware_preserves_id():
    """Test that correlation middleware preserves provided correlation ID"""
    custom_id = "test-correlation-123"

    response = client.get("/health", headers={"x-correlation-id": custom_id})

    assert response.headers["x-correlation-id"] == custom_id


def test_tenant_middleware_default():
    """Test that tenant middleware sets default tenant"""
    response = client.get("/health")

    assert response.headers["x-tenant-id"] == "demo"


def test_tenant_middleware_custom():
    """Test that tenant middleware preserves custom tenant"""
    custom_tenant = "custom-tenant"

    response = client.get("/health", headers={"x-tenant-id": custom_tenant})

    assert response.headers["x-tenant-id"] == custom_tenant
