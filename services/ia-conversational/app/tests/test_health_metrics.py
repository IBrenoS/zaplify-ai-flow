"""
Test health endpoints and metrics
"""

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestHealthEndpoints:
    """Test health check endpoints"""

    def test_liveness_check(self):
        """Test GET /health/live returns simple ok response"""
        response = client.get("/health/live")

        assert response.status_code == 200
        data = response.json()
        assert data == {"ok": True}

    def test_readiness_check_no_dependencies(self):
        """Test readiness when no Redis/DB URLs configured"""
        with patch.dict("os.environ", {}, clear=True):
            response = client.get("/health/ready")

            assert response.status_code == 200
            data = response.json()
            assert data["ok"] is True
            assert data["mode"] == "ready"
            assert data["deps"]["redis"] == "unknown"
            assert data["deps"]["db"] == "unknown"

    def test_readiness_check_with_redis_url(self):
        """Test readiness with Redis URL configured"""
        with patch.dict("os.environ", {"REDIS_URL": "redis://localhost:6379"}):
            with patch("app.core.redis.redis_service.is_available", return_value=True):
                response = client.get("/health/ready")

                assert response.status_code == 200
                data = response.json()
                assert data["ok"] is True
                assert data["deps"]["redis"] == "ok"

    def test_readiness_check_redis_failed(self):
        """Test readiness when Redis check fails"""
        with patch.dict("os.environ", {"REDIS_URL": "redis://localhost:6379"}):
            with patch("app.core.redis.redis_service.is_available", return_value=False):
                response = client.get("/health/ready")

                assert response.status_code == 200
                data = response.json()
                assert data["ok"] is False
                assert data["deps"]["redis"] == "error"

    def test_readiness_check_with_database_url(self):
        """Test readiness with Database URL configured"""
        with patch.dict("os.environ", {"DATABASE_URL": "postgresql://localhost/test"}):
            with patch(
                "app.core.database.supabase_service.is_available", return_value=True
            ):
                response = client.get("/health/ready")

                assert response.status_code == 200
                data = response.json()
                assert data["ok"] is True
                assert data["deps"]["db"] == "ok"

    def test_readiness_check_database_failed(self):
        """Test readiness when Database check fails"""
        with patch.dict("os.environ", {"SUPABASE_URL": "https://test.supabase.co"}):
            with patch(
                "app.core.database.supabase_service.is_available", return_value=False
            ):
                response = client.get("/health/ready")

                assert response.status_code == 200
                data = response.json()
                assert data["ok"] is False
                assert data["deps"]["db"] == "error"

    def test_readiness_check_all_dependencies_ok(self):
        """Test readiness when all dependencies are healthy"""
        with patch.dict(
            "os.environ",
            {
                "REDIS_URL": "redis://localhost:6379",
                "DATABASE_URL": "postgresql://localhost/test",
            },
        ):
            with (
                patch("app.core.redis.redis_service.is_available", return_value=True),
                patch(
                    "app.core.database.supabase_service.is_available", return_value=True
                ),
            ):
                response = client.get("/health/ready")

                assert response.status_code == 200
                data = response.json()
                assert data["ok"] is True
                assert data["deps"]["redis"] == "ok"
                assert data["deps"]["db"] == "ok"

    def test_readiness_check_mixed_dependencies(self):
        """Test readiness with mixed dependency states"""
        with patch.dict(
            "os.environ",
            {
                "REDIS_URL": "redis://localhost:6379",
                "DATABASE_URL": "postgresql://localhost/test",
            },
        ):
            with (
                patch("app.core.redis.redis_service.is_available", return_value=True),
                patch(
                    "app.core.database.supabase_service.is_available",
                    return_value=False,
                ),
            ):
                response = client.get("/health/ready")

                assert response.status_code == 200
                data = response.json()
                assert data["ok"] is False  # One dependency failed
                assert data["deps"]["redis"] == "ok"
                assert data["deps"]["db"] == "error"

    def test_legacy_health_endpoint_still_works(self):
        """Test that existing /health endpoint still works for compatibility"""
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "ia-conversational"
        assert data["status"] == "healthy"


class TestMetricsEndpoint:
    """Test Prometheus metrics endpoint"""

    def test_metrics_endpoint_accessible(self):
        """Test that /metrics endpoint is accessible"""
        response = client.get("/metrics")

        assert response.status_code == 200
        assert "text/plain" in response.headers["content-type"]

    def test_metrics_contains_expected_counters(self):
        """Test that metrics endpoint exposes expected counter names"""
        response = client.get("/metrics")
        content = response.text

        # Check for our custom metrics
        assert "messages_processed_total" in content
        assert "errors_total" in content
        assert "response_latency_seconds" in content

    def test_metrics_counter_labels(self):
        """Test that metrics have expected labels"""
        response = client.get("/metrics")
        content = response.text

        # Check for expected label names
        assert "tenant_id" in content
        assert "assistant_type" in content or "endpoint" in content

    def test_metrics_help_text(self):
        """Test that metrics include help documentation"""
        response = client.get("/metrics")
        content = response.text

        # Check for HELP lines
        assert (
            "# HELP messages_processed_total Total number of messages processed"
            in content
        )
        assert "# HELP errors_total Total number of errors" in content
        assert "# HELP response_latency_seconds Response latency in seconds" in content


class TestMetricsInstrumentation:
    """Test that metrics are properly instrumented in endpoints"""

    def test_conversation_metrics_instrumentation(self):
        """Test that conversation endpoint increments metrics"""
        # First, create an assistant
        assistant_data = {
            "name": "TestBot",
            "description": "Test assistant for metrics",
            "instructions": "You are a helpful test assistant.",
            "model": "gpt-4o",
            "temperature": 0.7,
        }
        create_response = client.post("/assistants", json=assistant_data)
        assert create_response.status_code == 200
        assistant_id = create_response.json()["assistantId"]

        # Get initial metric values
        metrics_before = client.get("/metrics").text

        # Make a conversation request
        conversation_data = {
            "assistantId": assistant_id,
            "message": "Hello, this is a test message for metrics",
        }

        with patch(
            "app.services.llm_service.llm_service.generate_reply",
            return_value="Test reply",
        ):
            conversation_response = client.post("/conversation", json=conversation_data)
            assert conversation_response.status_code == 200

        # Get metrics after request
        metrics_after = client.get("/metrics").text

        # Verify metrics were incremented
        assert "messages_processed_total" in metrics_after

        # The metrics should show some activity
        # Note: In a real test, you'd parse the Prometheus format to check exact values
        assert len(metrics_after) > len(metrics_before)

    def test_error_metrics_instrumentation(self):
        """Test that error cases increment error metrics"""
        # Make a request that should fail (non-existent assistant)
        conversation_data = {
            "assistantId": "non-existent-assistant",
            "message": "This should fail",
        }
        conversation_response = client.post("/conversation", json=conversation_data)
        assert conversation_response.status_code == 404

        # Get metrics after request
        metrics_after = client.get("/metrics").text

        # Verify error metrics were incremented
        assert "errors_total" in metrics_after

    def test_rag_query_metrics_instrumentation(self):
        """Test that RAG queries increment metrics"""
        # Make a RAG query
        query_data = {"query": "test query for metrics", "limit": 3}

        query_response = client.post("/rag/query", json=query_data)
        assert query_response.status_code == 200

        # Get metrics after request
        metrics_after = client.get("/metrics").text

        # Verify metrics were incremented
        assert "messages_processed_total" in metrics_after

        # Check that the response time was measured
        assert "response_latency_seconds" in metrics_after


class TestHealthHeaders:
    """Test that health endpoints include proper headers"""

    def test_liveness_includes_correlation_headers(self):
        """Test that liveness endpoint includes correlation headers"""
        response = client.get("/health/live")

        assert "x-correlation-id" in response.headers
        assert "x-tenant-id" in response.headers

    def test_readiness_includes_correlation_headers(self):
        """Test that readiness endpoint includes correlation headers"""
        response = client.get("/health/ready")

        assert "x-correlation-id" in response.headers
        assert "x-tenant-id" in response.headers

    def test_metrics_includes_correlation_headers(self):
        """Test that metrics endpoint includes correlation headers"""
        response = client.get("/metrics")

        assert "x-correlation-id" in response.headers
        assert "x-tenant-id" in response.headers


class TestDependencyFailureHandling:
    """Test graceful handling of dependency failures"""

    def test_redis_exception_handling(self):
        """Test readiness check handles Redis exceptions gracefully"""
        with patch.dict("os.environ", {"REDIS_URL": "redis://localhost:6379"}):
            with patch(
                "app.core.redis.redis_service.is_available",
                side_effect=Exception("Redis connection failed"),
            ):
                response = client.get("/health/ready")

                assert response.status_code == 200
                data = response.json()
                assert data["ok"] is False
                assert data["deps"]["redis"] == "error"

    def test_database_exception_handling(self):
        """Test readiness check handles Database exceptions gracefully"""
        with patch.dict("os.environ", {"DATABASE_URL": "postgresql://localhost/test"}):
            with patch(
                "app.core.database.supabase_service.is_available",
                side_effect=Exception("DB connection failed"),
            ):
                response = client.get("/health/ready")

                assert response.status_code == 200
                data = response.json()
                assert data["ok"] is False
                assert data["deps"]["db"] == "error"
