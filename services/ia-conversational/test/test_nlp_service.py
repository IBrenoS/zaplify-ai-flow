"""
Tests for NLP Service with HuggingFace Transformers integration
"""

import asyncio
from unittest.mock import Mock, patch

import pytest

from app.config import config
from app.services.nlp_service import NLPService, nlp_service


class TestNLPService:

    @pytest.fixture
    def service(self):
        """Create a fresh NLP service instance for testing"""
        return NLPService()

    @pytest.fixture
    def mock_transformers(self):
        """Mock transformers library"""
        with patch("app.services.nlp_service.transformers") as mock:
            # Mock pipeline function
            mock_pipeline = Mock()
            mock.pipeline.return_value = mock_pipeline
            yield mock, mock_pipeline

    @pytest.fixture
    def mock_torch(self):
        """Mock torch library"""
        with patch("app.services.nlp_service.torch") as mock:
            yield mock

    def test_load_transformers_dependencies_success(
        self, service, mock_transformers, mock_torch
    ):
        """Test successful loading of transformers dependencies"""
        result = service._load_transformers_dependencies()
        assert result is True

    def test_load_transformers_dependencies_failure(self, service):
        """Test handling of missing transformers dependencies"""
        # Mock builtins.__import__ to simulate ImportError
        import builtins

        original_import = builtins.__import__

        def mock_import(name, *args, **kwargs):
            if name == "transformers":
                raise ImportError("No module named 'transformers'")
            return original_import(name, *args, **kwargs)

        with patch("builtins.__import__", side_effect=mock_import):
            result = service._load_transformers_dependencies()
            assert result is False

    @pytest.mark.asyncio
    async def test_classify_intent_transformers_disabled(self, service):
        """Test intent classification when transformers are disabled"""
        with patch.object(config, "ENABLE_TRANSFORMERS", False):
            intent, confidence, metadata = await service.classify_intent(
                text="I want to buy something",
                correlation_id="test-123",
                tenant_id="test-tenant",
            )

            assert intent == "purchase"
            assert confidence > 0.6
            assert metadata["method"] == "stub_keyword_based"

    @pytest.mark.asyncio
    async def test_classify_intent_stub_keywords(self, service):
        """Test intent classification stub with various keywords"""
        test_cases = [
            ("I want to buy something", "purchase"),
            ("I need help with my account", "support"),
            ("Can I schedule an appointment?", "scheduling"),
            ("This is terrible service", "complaint"),
            ("What time do you open?", "question"),
            ("Hello there", "greeting"),
            ("Goodbye for now", "goodbye"),
            ("Random text here", "other"),
        ]

        with patch.object(config, "ENABLE_TRANSFORMERS", False):
            for text, expected_intent in test_cases:
                intent, confidence, metadata = await service.classify_intent(
                    text=text, correlation_id="test-123", tenant_id="test-tenant"
                )
                assert intent == expected_intent
                assert isinstance(confidence, float)
                assert 0.0 <= confidence <= 1.0
                assert metadata["method"] == "stub_keyword_based"

    @pytest.mark.asyncio
    async def test_classify_intent_real_success(
        self, service, mock_transformers, mock_torch
    ):
        """Test successful real intent classification"""
        mock_transformers_lib, mock_pipeline = mock_transformers

        # Mock pipeline response
        mock_pipeline.return_value = {
            "labels": ["purchase", "support", "question"],
            "scores": [0.8, 0.15, 0.05],
        }

        with (
            patch.object(config, "ENABLE_TRANSFORMERS", True),
            patch.object(service, "_load_transformers_dependencies", return_value=True),
        ):

            intent, confidence, metadata = await service.classify_intent(
                text="I want to buy something",
                correlation_id="test-123",
                tenant_id="test-tenant",
            )

            assert intent == "purchase"
            assert confidence == 0.8
            assert metadata["method"] == "transformers_zero_shot"
            assert "processing_time_ms" in metadata
            assert "all_predictions" in metadata

    @pytest.mark.asyncio
    async def test_classify_intent_real_timeout(
        self, service, mock_transformers, mock_torch
    ):
        """Test intent classification timeout handling"""
        mock_transformers_lib, mock_pipeline = mock_transformers

        # Mock pipeline to raise timeout
        async def slow_pipeline(*args, **kwargs):
            await asyncio.sleep(2)  # Longer than timeout
            return {"labels": ["test"], "scores": [0.5]}

        mock_pipeline.side_effect = slow_pipeline

        with (
            patch.object(config, "ENABLE_TRANSFORMERS", True),
            patch.object(config, "MODEL_TIMEOUT_SECONDS", 0.1),
            patch.object(service, "_load_transformers_dependencies", return_value=True),
        ):

            # Should fall back to stub
            intent, confidence, metadata = await service.classify_intent(
                text="I want to buy something",
                correlation_id="test-123",
                tenant_id="test-tenant",
            )

            assert metadata["method"] == "stub_keyword_based"

    @pytest.mark.asyncio
    async def test_analyze_sentiment_transformers_disabled(self, service):
        """Test sentiment analysis when transformers are disabled"""
        with patch.object(config, "ENABLE_TRANSFORMERS", False):
            sentiment, confidence, score, metadata = await service.analyze_sentiment(
                text="This is amazing!",
                correlation_id="test-123",
                tenant_id="test-tenant",
            )

            assert sentiment == "positive"
            assert confidence > 0.6
            assert score > 0
            assert metadata["method"] == "stub_keyword_based"

    @pytest.mark.asyncio
    async def test_analyze_sentiment_stub_keywords(self, service):
        """Test sentiment analysis stub with various texts"""
        test_cases = [
            ("This is amazing and wonderful!", "positive"),
            ("This is terrible and awful", "negative"),
            ("Just some normal text", "neutral"),
            ("Muito bom e excelente!", "positive"),
            ("Péssimo e horrível", "negative"),
        ]

        with patch.object(config, "ENABLE_TRANSFORMERS", False):
            for text, expected_sentiment in test_cases:
                sentiment, confidence, score, metadata = (
                    await service.analyze_sentiment(
                        text=text, correlation_id="test-123", tenant_id="test-tenant"
                    )
                )
                assert sentiment == expected_sentiment
                assert isinstance(confidence, float)
                assert 0.0 <= confidence <= 1.0
                assert isinstance(score, float)
                assert -1.0 <= score <= 1.0
                assert metadata["method"] == "stub_keyword_based"

    @pytest.mark.asyncio
    async def test_analyze_sentiment_real_success(
        self, service, mock_transformers, mock_torch
    ):
        """Test successful real sentiment analysis"""
        mock_transformers_lib, mock_pipeline = mock_transformers

        # Mock pipeline response
        mock_pipeline.return_value = [{"label": "POSITIVE", "score": 0.85}]

        with (
            patch.object(config, "ENABLE_TRANSFORMERS", True),
            patch.object(service, "_load_transformers_dependencies", return_value=True),
        ):

            sentiment, confidence, score, metadata = await service.analyze_sentiment(
                text="This is amazing!",
                correlation_id="test-123",
                tenant_id="test-tenant",
            )

            assert sentiment == "positive"
            assert confidence == 0.85
            assert score == 0.85
            assert metadata["method"] == "transformers_sentiment"
            assert "processing_time_ms" in metadata

    @pytest.mark.asyncio
    async def test_analyze_sentiment_real_negative(
        self, service, mock_transformers, mock_torch
    ):
        """Test real sentiment analysis with negative result"""
        mock_transformers_lib, mock_pipeline = mock_transformers

        # Mock pipeline response for negative sentiment
        mock_pipeline.return_value = [{"label": "NEGATIVE", "score": 0.75}]

        with (
            patch.object(config, "ENABLE_TRANSFORMERS", True),
            patch.object(service, "_load_transformers_dependencies", return_value=True),
        ):

            sentiment, confidence, score, metadata = await service.analyze_sentiment(
                text="This is terrible!",
                correlation_id="test-123",
                tenant_id="test-tenant",
            )

            assert sentiment == "negative"
            assert confidence == 0.75
            assert score == -0.75  # Negative score for negative sentiment
            assert metadata["method"] == "transformers_sentiment"

    @pytest.mark.asyncio
    async def test_analyze_sentiment_low_confidence(
        self, service, mock_transformers, mock_torch
    ):
        """Test sentiment analysis with low confidence fallback to neutral"""
        mock_transformers_lib, mock_pipeline = mock_transformers

        # Mock pipeline response with low confidence
        mock_pipeline.return_value = [
            {"label": "POSITIVE", "score": 0.3}  # Below threshold
        ]

        with (
            patch.object(config, "ENABLE_TRANSFORMERS", True),
            patch.object(config, "MIN_SENTIMENT_CONFIDENCE", 0.5),
            patch.object(service, "_load_transformers_dependencies", return_value=True),
        ):

            sentiment, confidence, score, metadata = await service.analyze_sentiment(
                text="Maybe okay", correlation_id="test-123", tenant_id="test-tenant"
            )

            assert sentiment == "neutral"
            assert confidence == 0.5
            assert score == 0.0

    def test_is_models_available_true(self, service):
        """Test models availability when transformers are enabled and available"""
        with (
            patch.object(config, "ENABLE_TRANSFORMERS", True),
            patch.object(service, "_load_transformers_dependencies", return_value=True),
        ):
            assert service.is_models_available() is True

    def test_is_models_available_false_disabled(self, service):
        """Test models availability when transformers are disabled"""
        with patch.object(config, "ENABLE_TRANSFORMERS", False):
            assert service.is_models_available() is False

    def test_is_models_available_false_unavailable(self, service):
        """Test models availability when transformers are unavailable"""
        with (
            patch.object(config, "ENABLE_TRANSFORMERS", True),
            patch.object(
                service, "_load_transformers_dependencies", return_value=False
            ),
        ):
            assert service.is_models_available() is False

    def test_get_status(self, service):
        """Test service status reporting"""
        with (
            patch.object(config, "ENABLE_TRANSFORMERS", True),
            patch.object(service, "is_models_available", return_value=True),
        ):

            status = service.get_status()

            assert status["transformers_enabled"] is True
            assert status["models_available"] is True
            assert status["intent_model"] == config.INTENT_MODEL_NAME
            assert status["sentiment_model"] == config.SENTIMENT_MODEL_NAME
            assert "models_loaded" in status
            assert "intent" in status["models_loaded"]
            assert "sentiment" in status["models_loaded"]

    def test_global_service_instance(self):
        """Test that global service instance is available"""
        assert nlp_service is not None
        assert isinstance(nlp_service, NLPService)


@pytest.mark.asyncio
class TestNLPServiceIntegration:
    """Integration tests for NLP service"""

    async def test_intent_classification_with_custom_labels(self):
        """Test intent classification with custom labels"""
        custom_labels = ["booking", "cancellation", "information"]

        with patch.object(config, "ENABLE_TRANSFORMERS", False):
            intent, confidence, metadata = await nlp_service.classify_intent(
                text="I want to book a table",
                labels=custom_labels,
                correlation_id="test-123",
                tenant_id="test-tenant",
            )

            # Should still work with fallback, even with custom labels
            assert intent in custom_labels + ["other"]
            assert isinstance(confidence, float)
            assert metadata["method"] == "stub_keyword_based"

    async def test_concurrent_requests(self):
        """Test concurrent processing of multiple requests"""
        texts = [
            "I want to buy something",
            "This is amazing!",
            "I need help",
            "What time is it?",
            "Goodbye",
        ]

        with patch.object(config, "ENABLE_TRANSFORMERS", False):
            # Process intent classification concurrently
            intent_tasks = [
                nlp_service.classify_intent(
                    text, correlation_id=f"test-{i}", tenant_id="test"
                )
                for i, text in enumerate(texts)
            ]

            # Process sentiment analysis concurrently
            sentiment_tasks = [
                nlp_service.analyze_sentiment(
                    text, correlation_id=f"test-{i}", tenant_id="test"
                )
                for i, text in enumerate(texts)
            ]

            intent_results = await asyncio.gather(*intent_tasks)
            sentiment_results = await asyncio.gather(*sentiment_tasks)

            # Verify all requests completed successfully
            assert len(intent_results) == len(texts)
            assert len(sentiment_results) == len(texts)

            for intent, confidence, metadata in intent_results:
                assert isinstance(intent, str)
                assert isinstance(confidence, float)
                assert isinstance(metadata, dict)

            for sentiment, confidence, score, metadata in sentiment_results:
                assert isinstance(sentiment, str)
                assert isinstance(confidence, float)
                assert isinstance(score, float)
                assert isinstance(metadata, dict)
