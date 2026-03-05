import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_health_detailed_endpoint():
    response = client.get("/health/detailed")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "services" in data
    assert "api" in data["services"]
    assert "redis" in data["services"]
    assert "database" in data["services"]
