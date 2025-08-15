"""
Test health endpoint
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint():
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200

    data = response.json()
    assert data["service"] == "ia-conversational"
    assert data["status"] == "healthy"
    assert "correlation_id" in data
    assert "tenant_id" in data
    assert "features" in data


def test_health_headers():
    """Test that health endpoint returns correlation headers"""
    response = client.get("/health")
    assert "x-correlation-id" in response.headers
    assert "x-tenant-id" in response.headers


def test_root_endpoint():
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200

    data = response.json()
    assert data["service"] == "ia-conversational"
    assert data["version"] == "1.0.0"
    assert data["status"] == "running"
