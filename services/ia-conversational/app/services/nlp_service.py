"""
NLP Service with HuggingFace Transformers integration
Implements real intent classification and sentiment analysis with fallback support
"""

import asyncio
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from app.config import config
from app.core.logging import log_error, log_info


class NLPService:
    """
    NLP Service with HuggingFace Transformers integration
    Features lazy loading, caching, and graceful fallback
    """

    def __init__(self):
        self._intent_pipeline = None
        self._sentiment_pipeline = None
        self._loading_lock = threading.Lock()
        self._executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="nlp")
        self._models_loaded = False

    def _load_transformers_dependencies(self):
        """Lazy import of transformers to avoid startup overhead"""
        try:
            global transformers, torch
            import torch
            import transformers

            return True
        except ImportError as e:
            log_error(
                f"Transformers not available: {e}",
                feature="nlp_service",
                fallback_mode=True,
            )
            return False

    def _load_intent_pipeline(self):
        """Load intent classification pipeline (zero-shot)"""
        if not config.ENABLE_TRANSFORMERS:
            return None

        if not self._load_transformers_dependencies():
            return None

        try:
            with self._loading_lock:
                if self._intent_pipeline is None:
                    log_info(
                        f"Loading intent model: {config.INTENT_MODEL_NAME}",
                        model_name=config.INTENT_MODEL_NAME,
                        feature="intent_classification",
                    )

                    pipeline = transformers.pipeline(
                        "zero-shot-classification",
                        model=config.INTENT_MODEL_NAME,
                        device="cpu",  # Force CPU for compatibility
                    )

                    self._intent_pipeline = pipeline
                    log_info(
                        "Intent model loaded successfully",
                        model_name=config.INTENT_MODEL_NAME,
                    )

            return self._intent_pipeline

        except Exception as e:
            log_error(
                f"Failed to load intent model: {e}",
                model_name=config.INTENT_MODEL_NAME,
                error_type=type(e).__name__,
            )
            return None

    def _load_sentiment_pipeline(self):
        """Load sentiment analysis pipeline"""
        if not config.ENABLE_TRANSFORMERS:
            return None

        if not self._load_transformers_dependencies():
            return None

        try:
            with self._loading_lock:
                if self._sentiment_pipeline is None:
                    log_info(
                        f"Loading sentiment model: {config.SENTIMENT_MODEL_NAME}",
                        model_name=config.SENTIMENT_MODEL_NAME,
                        feature="sentiment_analysis",
                    )

                    pipeline = transformers.pipeline(
                        "sentiment-analysis",
                        model=config.SENTIMENT_MODEL_NAME,
                        device="cpu",  # Force CPU for compatibility
                    )

                    self._sentiment_pipeline = pipeline
                    log_info(
                        "Sentiment model loaded successfully",
                        model_name=config.SENTIMENT_MODEL_NAME,
                    )

            return self._sentiment_pipeline

        except Exception as e:
            log_error(
                f"Failed to load sentiment model: {e}",
                model_name=config.SENTIMENT_MODEL_NAME,
                error_type=type(e).__name__,
            )
            return None

    async def classify_intent(
        self,
        text: str,
        labels: list[str] | None = None,
        correlation_id: str = "unknown",
        tenant_id: str = "demo",
    ) -> tuple[str, float, dict[str, Any]]:
        """
        Classify intent using zero-shot classification
        Returns: (intent, confidence, metadata)
        """
        if labels is None:
            labels = config.DEFAULT_INTENT_LABELS

        # Try real model first
        if config.ENABLE_TRANSFORMERS:
            try:
                result = await self._classify_intent_real(
                    text, labels, correlation_id, tenant_id
                )
                if result is not None:
                    return result
            except Exception as e:
                log_error(
                    f"Real intent classification failed, falling back to stub: {e}",
                    correlation_id=correlation_id,
                    tenant_id=tenant_id,
                    error_type=type(e).__name__,
                )

        # Fallback to stub
        return self._classify_intent_stub(text, labels, correlation_id, tenant_id)

    async def _classify_intent_real(
        self, text: str, labels: list[str], correlation_id: str, tenant_id: str
    ) -> tuple[str, float, dict[str, Any]] | None:
        """Real intent classification using transformers"""
        pipeline = self._load_intent_pipeline()
        if pipeline is None:
            return None

        try:
            # Run in executor to avoid blocking
            loop = asyncio.get_event_loop()

            def _run_pipeline():
                return pipeline(text, labels)

            # Run with timeout
            start_time = time.time()
            result = await asyncio.wait_for(
                loop.run_in_executor(self._executor, _run_pipeline),
                timeout=config.MODEL_TIMEOUT_SECONDS,
            )
            processing_time = time.time() - start_time

            # Extract results
            top_prediction = result["labels"][0]
            confidence = result["scores"][0]

            # Apply confidence threshold
            if confidence < config.MIN_INTENT_CONFIDENCE:
                intent = "other"
                confidence = 0.5
            else:
                intent = top_prediction

            metadata = {
                "model": config.INTENT_MODEL_NAME,
                "processing_time_ms": round(processing_time * 1000, 2),
                "all_predictions": list(
                    zip(result["labels"], result["scores"], strict=False)
                ),
                "method": "transformers_zero_shot",
            }

            log_info(
                f"Intent classified (real): {intent}",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                intent=intent,
                confidence=confidence,
                processing_time_ms=metadata["processing_time_ms"],
                model_name=config.INTENT_MODEL_NAME,
            )

            return intent, confidence, metadata

        except TimeoutError:
            log_error(
                "Intent classification timed out",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                timeout_seconds=config.MODEL_TIMEOUT_SECONDS,
            )
            return None
        except Exception as e:
            log_error(
                f"Intent classification failed: {e}",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                error_type=type(e).__name__,
            )
            return None

    def _classify_intent_stub(
        self, text: str, labels: list[str], correlation_id: str, tenant_id: str
    ) -> tuple[str, float, dict[str, Any]]:
        """Fallback stub implementation"""

        # Simple keyword-based classification
        text_lower = text.lower()

        intent_keywords = {
            "purchase": [
                "buy",
                "purchase",
                "order",
                "shop",
                "price",
                "cost",
                "comprar",
                "preço",
            ],
            "support": [
                "help",
                "problem",
                "issue",
                "bug",
                "error",
                "ajuda",
                "problema",
            ],
            "scheduling": [
                "schedule",
                "appointment",
                "book",
                "calendar",
                "agendar",
                "marcar",
            ],
            "complaint": [
                "complaint",
                "bad",
                "terrible",
                "awful",
                "reclamação",
                "ruim",
            ],
            "question": [
                "what",
                "how",
                "when",
                "where",
                "why",
                "como",
                "que",
                "quando",
            ],
            "greeting": ["hello", "hi", "hey", "good morning", "olá", "oi", "bom dia"],
            "goodbye": ["bye", "goodbye", "see you", "tchau", "até logo"],
        }

        # Find best match
        best_intent = "other"
        best_score = 0.6

        for intent, keywords in intent_keywords.items():
            if intent in labels:
                score = sum(1 for keyword in keywords if keyword in text_lower)
                if score > 0:
                    confidence = min(0.85, 0.6 + (score * 0.1))
                    if confidence > best_score:
                        best_intent = intent
                        best_score = confidence

        metadata = {
            "method": "stub_keyword_based",
            "processing_time_ms": 1.0,
            "available_labels": labels,
        }

        log_info(
            f"Intent classified (stub): {best_intent}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            intent=best_intent,
            confidence=best_score,
            method="stub",
        )

        return best_intent, best_score, metadata

    async def analyze_sentiment(
        self, text: str, correlation_id: str = "unknown", tenant_id: str = "demo"
    ) -> tuple[str, float, float, dict[str, Any]]:
        """
        Analyze sentiment
        Returns: (sentiment, confidence, score, metadata)
        """

        # Try real model first
        if config.ENABLE_TRANSFORMERS:
            try:
                result = await self._analyze_sentiment_real(
                    text, correlation_id, tenant_id
                )
                if result is not None:
                    return result
            except Exception as e:
                log_error(
                    f"Real sentiment analysis failed, falling back to stub: {e}",
                    correlation_id=correlation_id,
                    tenant_id=tenant_id,
                    error_type=type(e).__name__,
                )

        # Fallback to stub
        return self._analyze_sentiment_stub(text, correlation_id, tenant_id)

    async def _analyze_sentiment_real(
        self, text: str, correlation_id: str, tenant_id: str
    ) -> tuple[str, float, float, dict[str, Any]] | None:
        """Real sentiment analysis using transformers"""
        pipeline = self._load_sentiment_pipeline()
        if pipeline is None:
            return None

        try:
            # Run in executor to avoid blocking
            loop = asyncio.get_event_loop()

            def _run_pipeline():
                return pipeline(text)

            # Run with timeout
            start_time = time.time()
            result = await asyncio.wait_for(
                loop.run_in_executor(self._executor, _run_pipeline),
                timeout=config.MODEL_TIMEOUT_SECONDS,
            )
            processing_time = time.time() - start_time

            # Extract results
            prediction = result[0]
            label = prediction["label"].lower()
            confidence = prediction["score"]

            # Normalize labels to standard format
            if label in ["positive", "pos", "label_2"]:
                sentiment = "positive"
                score = confidence
            elif label in ["negative", "neg", "label_0"]:
                sentiment = "negative"
                score = -confidence
            else:
                sentiment = "neutral"
                score = 0.0

            # Apply confidence threshold
            if confidence < config.MIN_SENTIMENT_CONFIDENCE:
                sentiment = "neutral"
                confidence = 0.5
                score = 0.0

            metadata = {
                "model": config.SENTIMENT_MODEL_NAME,
                "processing_time_ms": round(processing_time * 1000, 2),
                "raw_prediction": prediction,
                "method": "transformers_sentiment",
            }

            log_info(
                f"Sentiment analyzed (real): {sentiment}",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                sentiment=sentiment,
                confidence=confidence,
                score=score,
                processing_time_ms=metadata["processing_time_ms"],
                model_name=config.SENTIMENT_MODEL_NAME,
            )

            return sentiment, confidence, score, metadata

        except TimeoutError:
            log_error(
                "Sentiment analysis timed out",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                timeout_seconds=config.MODEL_TIMEOUT_SECONDS,
            )
            return None
        except Exception as e:
            log_error(
                f"Sentiment analysis failed: {e}",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                error_type=type(e).__name__,
            )
            return None

    def _analyze_sentiment_stub(
        self, text: str, correlation_id: str, tenant_id: str
    ) -> tuple[str, float, float, dict[str, Any]]:
        """Fallback stub implementation (from existing code)"""

        text_lower = text.lower()

        # Define positive and negative keywords (Portuguese + English)
        positive_words = {
            "ótimo",
            "excelente",
            "bom",
            "boa",
            "legal",
            "perfeito",
            "maravilhoso",
            "adorei",
            "amei",
            "gostei",
            "feliz",
            "contente",
            "satisfeito",
            "obrigado",
            "great",
            "excellent",
            "good",
            "perfect",
            "amazing",
            "love",
            "like",
            "happy",
            "fantastic",
            "wonderful",
            "awesome",
            "thank",
            "thanks",
            "pleased",
        }

        negative_words = {
            "ruim",
            "péssimo",
            "horrível",
            "terrível",
            "não gostei",
            "odeio",
            "detesto",
            "problema",
            "erro",
            "falha",
            "defeito",
            "insatisfeito",
            "irritado",
            "raiva",
            "bad",
            "terrible",
            "horrible",
            "awful",
            "hate",
            "angry",
            "frustrated",
            "problem",
            "issue",
            "error",
            "fail",
            "wrong",
            "disappointed",
            "upset",
        }

        # Count positive and negative words
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)

        # Calculate sentiment
        total_sentiment_words = positive_count + negative_count

        if total_sentiment_words == 0:
            # No sentiment indicators found
            sentiment, confidence, score = "neutral", 0.5, 0.0
        else:
            # Calculate score (-1 to 1)
            score = (positive_count - negative_count) / total_sentiment_words

            # Determine sentiment category
            if score > 0.2:
                sentiment = "positive"
                confidence = min(0.9, 0.6 + (score * 0.3))
            elif score < -0.2:
                sentiment = "negative"
                confidence = min(0.9, 0.6 + (abs(score) * 0.3))
            else:
                sentiment = "neutral"
                confidence = 0.7

        metadata = {
            "method": "stub_keyword_based",
            "processing_time_ms": 1.0,
            "positive_words_found": positive_count,
            "negative_words_found": negative_count,
        }

        log_info(
            f"Sentiment analyzed (stub): {sentiment}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            sentiment=sentiment,
            confidence=confidence,
            score=score,
            method="stub",
        )

        return sentiment, confidence, score, metadata

    def is_models_available(self) -> bool:
        """Check if transformers models are available"""
        return config.ENABLE_TRANSFORMERS and self._load_transformers_dependencies()

    def get_status(self) -> dict[str, Any]:
        """Get service status"""
        return {
            "transformers_enabled": config.ENABLE_TRANSFORMERS,
            "models_available": self.is_models_available(),
            "intent_model": config.INTENT_MODEL_NAME,
            "sentiment_model": config.SENTIMENT_MODEL_NAME,
            "models_loaded": {
                "intent": self._intent_pipeline is not None,
                "sentiment": self._sentiment_pipeline is not None,
            },
        }


# Global service instance
nlp_service = NLPService()
