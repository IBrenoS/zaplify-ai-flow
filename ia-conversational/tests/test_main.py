import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "timestamp" in data
    assert "services" in data

def test_conversation_without_auth():
    response = client.post("/conversation", json={
        "message": "Hello",
        "user_id": "test_user"
    })
    assert response.status_code == 401  # Should require authentication

def test_intent_classification_without_auth():
    response = client.post("/intent/classify", json={
        "message": "Hello"
    })
    assert response.status_code == 401  # Should require authentication
