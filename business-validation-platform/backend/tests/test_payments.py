import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient


def test_confirm_payment_invalid_tier():
    from app.main import app
    client = TestClient(app)
    response = client.post("/api/payments/confirm", json={
        "paymentKey": "test_key",
        "orderId": "order_123",
        "amount": 99000,
        "tier": "invalid_tier",
    })
    assert response.status_code == 400


def test_confirm_payment_amount_mismatch():
    from app.main import app
    client = TestClient(app)
    response = client.post("/api/payments/confirm", json={
        "paymentKey": "test_key",
        "orderId": "order_123",
        "amount": 50000,  # wrong amount for basic
        "tier": "basic",
    })
    assert response.status_code == 400


def test_confirm_payment_test_key_succeeds():
    """Test mode with test_ prefix should bypass real Toss verification."""
    from app.main import app
    import os
    client = TestClient(app)
    with patch.dict(os.environ, {"TOSS_SECRET_KEY": "test_sk_placeholder"}):
        with patch("app.api.routes.payments.httpx.AsyncClient") as mock_client_cls:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_async_client = AsyncMock()
            mock_async_client.__aenter__ = AsyncMock(return_value=mock_async_client)
            mock_async_client.__aexit__ = AsyncMock(return_value=None)
            mock_async_client.post = AsyncMock(return_value=mock_response)
            mock_client_cls.return_value = mock_async_client

            response = client.post("/api/payments/confirm", json={
                "paymentKey": "test_paymentKey_123",
                "orderId": "order_123",
                "amount": 99000,
                "tier": "basic",
            })
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["report_id"] is not None
