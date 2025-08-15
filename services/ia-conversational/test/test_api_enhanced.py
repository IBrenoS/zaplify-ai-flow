"""
Tests for enhanced Intent and Sentiment API endpoints with HuggingFace Transformers
"""

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.config import config
from app.main import app


class TestIntentAPI:

    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)

    @pytest.fixture
    def mock_nlp_service(self):
        """Mock NLP service"""
        with patch("app.api.intent.nlp_service") as mock:
            yield mock

    def test_classify_intent_success(self, client, mock_nlp_service):
        """Test successful intent classification"""
        # Mock NLP service response
        mock_nlp_service.classify_intent = AsyncMock(
            return_value=(
                "purchase",
                0.85,
                {
                    "method": "transformers_zero_shot",
                    "processing_time_ms": 150.5,
                    "all_predictions": [("purchase", 0.85), ("support", 0.15)],
                },
            )
        )

        mock_nlp_service.get_status.return_value = {
            "transformers_enabled": True,
            "models_available": True,
        }

        response = client.post(
            "/intent/classify",
            json={"text": "I want to buy something"},
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 200
        data = response.json()

        assert data["intent"] == "purchase"
        assert data["confidence"] == 0.85
        assert (
            "entities" in data
        )  # Metadata mapped to entities for backward compatibility

        # Verify NLP service was called correctly
        mock_nlp_service.classify_intent.assert_called_once()
        call_args = mock_nlp_service.classify_intent.call_args
        assert call_args[1]["text"] == "I want to buy something"
        assert "correlation_id" in call_args[1]
        assert "tenant_id" in call_args[1]

    def test_classify_intent_with_custom_labels(self, client, mock_nlp_service):
        """Test intent classification with custom labels"""
        mock_nlp_service.classify_intent = AsyncMock(
            return_value=(
                "booking",
                0.75,
                {"method": "stub_keyword_based", "processing_time_ms": 1.0},
            )
        )

        mock_nlp_service.get_status.return_value = {
            "transformers_enabled": False,
            "models_available": False,
        }

        response = client.post(
            "/intent/classify",
            json={
                "text": "I want to book a table",
                "labels": ["booking", "cancellation", "information"],
            },
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 200
        data = response.json()

        assert data["intent"] == "booking"
        assert data["confidence"] == 0.75

        # Verify custom labels were passed
        call_args = mock_nlp_service.classify_intent.call_args
        assert call_args[1]["labels"] == ["booking", "cancellation", "information"]

    def test_classify_intent_fallback_mode(self, client, mock_nlp_service):
        """Test intent classification in fallback mode"""
        mock_nlp_service.classify_intent = AsyncMock(
            return_value=(
                "support",
                0.7,
                {
                    "method": "stub_keyword_based",
                    "processing_time_ms": 1.0,
                    "available_labels": ["purchase", "support", "question", "other"],
                },
            )
        )

        mock_nlp_service.get_status.return_value = {
            "transformers_enabled": False,
            "models_available": False,
        }

        response = client.post(
            "/intent/classify",
            json={"text": "I need help with my account"},
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 200
        data = response.json()

        assert data["intent"] == "support"
        assert data["confidence"] == 0.7
        assert data["entities"]["method"] == "stub_keyword_based"

    def test_classify_intent_service_error(self, client, mock_nlp_service):
        """Test intent classification when service fails"""
        mock_nlp_service.classify_intent = AsyncMock(
            side_effect=Exception("Service error")
        )

        response = client.post(
            "/intent/classify",
            json={"text": "Test text"},
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 500
        assert "Intent classification failed" in response.json()["detail"]

    def test_classify_intent_invalid_request(self, client):
        """Test intent classification with invalid request"""
        response = client.post(
            "/intent/classify",
            json={},  # Missing required text field
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 422  # Validation error

    def test_classify_intent_unauthorized(self, client):
        """Test intent classification without authorization"""
        response = client.post(
            "/intent/classify",
            json={"text": "Test text"},
            # Missing Authorization header
        )

        assert response.status_code == 401


class TestSentimentAPI:

    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)

    @pytest.fixture
    def mock_nlp_service(self):
        """Mock NLP service"""
        with patch("app.api.sentiment.nlp_service") as mock:
            yield mock

    def test_analyze_sentiment_positive(self, client, mock_nlp_service):
        """Test positive sentiment analysis"""
        mock_nlp_service.analyze_sentiment = AsyncMock(
            return_value=(
                "positive",
                0.9,
                0.8,
                {
                    "method": "transformers_sentiment",
                    "processing_time_ms": 120.3,
                    "raw_prediction": {"label": "POSITIVE", "score": 0.9},
                },
            )
        )

        mock_nlp_service.get_status.return_value = {
            "transformers_enabled": True,
            "models_available": True,
        }

        response = client.post(
            "/sentiment/analyze",
            json={"text": "This is amazing and wonderful!"},
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 200
        data = response.json()

        assert data["sentiment"] == "positive"
        assert data["confidence"] == 0.9
        assert data["score"] == 0.8

        # Verify NLP service was called correctly
        mock_nlp_service.analyze_sentiment.assert_called_once()
        call_args = mock_nlp_service.analyze_sentiment.call_args
        assert call_args[1]["text"] == "This is amazing and wonderful!"
        assert "correlation_id" in call_args[1]
        assert "tenant_id" in call_args[1]

    def test_analyze_sentiment_negative(self, client, mock_nlp_service):
        """Test negative sentiment analysis"""
        mock_nlp_service.analyze_sentiment = AsyncMock(
            return_value=(
                "negative",
                0.85,
                -0.75,
                {
                    "method": "transformers_sentiment",
                    "processing_time_ms": 98.7,
                    "raw_prediction": {"label": "NEGATIVE", "score": 0.85},
                },
            )
        )

        mock_nlp_service.get_status.return_value = {
            "transformers_enabled": True,
            "models_available": True,
        }

        response = client.post(
            "/sentiment/analyze",
            json={"text": "This is terrible and awful!"},
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 200
        data = response.json()

        assert data["sentiment"] == "negative"
        assert data["confidence"] == 0.85
        assert data["score"] == -0.75

    def test_analyze_sentiment_neutral(self, client, mock_nlp_service):
        """Test neutral sentiment analysis"""
        mock_nlp_service.analyze_sentiment = AsyncMock(
            return_value=(
                "neutral",
                0.6,
                0.0,
                {
                    "method": "stub_keyword_based",
                    "processing_time_ms": 1.0,
                    "positive_words_found": 0,
                    "negative_words_found": 0,
                },
            )
        )

        mock_nlp_service.get_status.return_value = {
            "transformers_enabled": False,
            "models_available": False,
        }

        response = client.post(
            "/sentiment/analyze",
            json={"text": "Just some normal text here"},
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 200
        data = response.json()

        assert data["sentiment"] == "neutral"
        assert data["confidence"] == 0.6
        assert data["score"] == 0.0

    def test_analyze_sentiment_fallback_mode(self, client, mock_nlp_service):
        """Test sentiment analysis in fallback mode"""
        mock_nlp_service.analyze_sentiment = AsyncMock(
            return_value=(
                "positive",
                0.8,
                0.6,
                {
                    "method": "stub_keyword_based",
                    "processing_time_ms": 1.0,
                    "positive_words_found": 3,
                    "negative_words_found": 0,
                },
            )
        )

        mock_nlp_service.get_status.return_value = {
            "transformers_enabled": False,
            "models_available": False,
        }

        response = client.post(
            "/sentiment/analyze",
            json={"text": "Muito bom e excelente produto!"},
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 200
        data = response.json()

        assert data["sentiment"] == "positive"
        assert data["confidence"] == 0.8
        assert data["score"] == 0.6

    def test_analyze_sentiment_service_error(self, client, mock_nlp_service):
        """Test sentiment analysis when service fails"""
        mock_nlp_service.analyze_sentiment = AsyncMock(
            side_effect=Exception("Service error")
        )

        response = client.post(
            "/sentiment/analyze",
            json={"text": "Test text"},
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 500
        assert "Failed to analyze sentiment" in response.json()["detail"]

    def test_analyze_sentiment_invalid_request(self, client):
        """Test sentiment analysis with invalid request"""
        response = client.post(
            "/sentiment/analyze",
            json={},  # Missing required text field
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 422  # Validation error

    def test_analyze_sentiment_unauthorized(self, client):
        """Test sentiment analysis without authorization"""
        response = client.post(
            "/sentiment/analyze",
            json={"text": "Test text"},
            # Missing Authorization header
        )

        assert response.status_code == 401


@pytest.mark.asyncio
class TestAPIIntegration:
    """Integration tests for both APIs"""

    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)

    def test_intent_and_sentiment_pipeline(self, client):
        """Test complete pipeline of intent classification and sentiment analysis"""
        # Test with transformers disabled (fallback mode)
        with patch.object(config, "ENABLE_TRANSFORMERS", False):
            # Test intent classification
            intent_response = client.post(
                "/intent/classify",
                json={"text": "I love this amazing product and want to buy it!"},
                headers={"Authorization": "Bearer test-token"},
            )

            assert intent_response.status_code == 200
            intent_data = intent_response.json()

            # Should detect purchase intent
            assert intent_data["intent"] == "purchase"
            assert intent_data["confidence"] > 0.6

            # Test sentiment analysis on same text
            sentiment_response = client.post(
                "/sentiment/analyze",
                json={"text": "I love this amazing product and want to buy it!"},
                headers={"Authorization": "Bearer test-token"},
            )

            assert sentiment_response.status_code == 200
            sentiment_data = sentiment_response.json()

            # Should detect positive sentiment
            assert sentiment_data["sentiment"] == "positive"
            assert sentiment_data["confidence"] > 0.6
            assert sentiment_data["score"] > 0

    def test_multilingual_support(self, client):
        """Test multilingual support (Portuguese and English)"""
        test_cases = [
            {
                "text": "Preciso de ajuda com minha conta",
                "expected_intent": "support",
                "expected_sentiment": "neutral",
            },
            {
                "text": "Quero comprar este produto excelente!",
                "expected_intent": "purchase",
                "expected_sentiment": "positive",
            },
            {
                "text": "Este serviço é péssimo e horrível",
                "expected_intent": "complaint",
                "expected_sentiment": "negative",
            },
        ]

        with patch.object(config, "ENABLE_TRANSFORMERS", False):
            for case in test_cases:
                # Test intent
                intent_response = client.post(
                    "/intent/classify",
                    json={"text": case["text"]},
                    headers={"Authorization": "Bearer test-token"},
                )

                assert intent_response.status_code == 200
                intent_data = intent_response.json()
                assert intent_data["intent"] == case["expected_intent"]

                # Test sentiment
                sentiment_response = client.post(
                    "/sentiment/analyze",
                    json={"text": case["text"]},
                    headers={"Authorization": "Bearer test-token"},
                )

                assert sentiment_response.status_code == 200
                sentiment_data = sentiment_response.json()
                assert sentiment_data["sentiment"] == case["expected_sentiment"]

    def test_edge_cases(self, client):
        """Test edge cases and boundary conditions"""
        edge_cases = [
            "",  # Empty text
            " ",  # Whitespace only
            "a",  # Single character
            "x" * 1000,  # Very long text
            "123456789",  # Numbers only
            "!@#$%^&*()",  # Special characters only
            "Mix of 123 and !@# symbols",  # Mixed content
        ]

        with patch.object(config, "ENABLE_TRANSFORMERS", False):
            for text in edge_cases:
                # Test intent classification
                intent_response = client.post(
                    "/intent/classify",
                    json={"text": text},
                    headers={"Authorization": "Bearer test-token"},
                )

                assert intent_response.status_code == 200
                intent_data = intent_response.json()
                assert isinstance(intent_data["intent"], str)
                assert 0.0 <= intent_data["confidence"] <= 1.0

                # Test sentiment analysis
                sentiment_response = client.post(
                    "/sentiment/analyze",
                    json={"text": text},
                    headers={"Authorization": "Bearer test-token"},
                )

                assert sentiment_response.status_code == 200
                sentiment_data = sentiment_response.json()
                assert sentiment_data["sentiment"] in [
                    "positive",
                    "negative",
                    "neutral",
                ]
                assert 0.0 <= sentiment_data["confidence"] <= 1.0
                assert -1.0 <= sentiment_data["score"] <= 1.0
