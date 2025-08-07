import logging
from typing import Dict, List, Any
import asyncio
from datetime import datetime

try:
    from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False

try:
    from textblob import TextBlob
    TEXTBLOB_AVAILABLE = True
except ImportError:
    TEXTBLOB_AVAILABLE = False

try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    VADER_AVAILABLE = True
except ImportError:
    VADER_AVAILABLE = False

from config import conversational_config

logger = logging.getLogger(__name__)

class IntentClassifier:
    """Intent classification service for conversational AI"""

    def __init__(self):
        self.classifier = None
        self.intent_patterns = self._load_intent_patterns()
        self._initialize_classifier()

    def _initialize_classifier(self):
        """Initialize intent classification model"""
        try:
            if TRANSFORMERS_AVAILABLE:
                # Try to load a pre-trained model for intent classification
                self.classifier = pipeline(
                    "text-classification",
                    model="microsoft/DialoGPT-medium",
                    return_all_scores=True
                )
                logger.info("Transformers-based intent classifier initialized")
            else:
                logger.warning("Transformers not available, using pattern-based intent classification")
        except Exception as e:
            logger.error(f"Failed to initialize transformers classifier: {e}")
            logger.info("Falling back to pattern-based intent classification")

    def _load_intent_patterns(self) -> Dict[str, List[str]]:
        """Load intent patterns for pattern-based classification"""
        return {
            "greeting": [
                "olá", "oi", "bom dia", "boa tarde", "boa noite", "hello", "hi",
                "e aí", "tudo bem", "como vai", "saudações"
            ],
            "pricing_inquiry": [
                "preço", "custo", "valor", "quanto custa", "plano", "assinatura",
                "mensalidade", "investimento", "price", "cost", "pricing"
            ],
            "feature_question": [
                "funcionalidade", "recurso", "como funciona", "o que faz",
                "features", "capabilities", "função", "ferramenta"
            ],
            "technical_support": [
                "problema", "erro", "bug", "não funciona", "ajuda técnica",
                "suporte", "issue", "technical", "broken", "failed"
            ],
            "demo_request": [
                "demonstração", "demo", "apresentação", "mostrar", "ver funcionando",
                "exemplo", "showcase", "presentation"
            ],
            "trial_request": [
                "teste", "trial", "experimentar", "testar", "versão gratuita",
                "free trial", "try", "test drive"
            ],
            "integration_question": [
                "integração", "conectar", "integrar", "api", "webhook",
                "crm", "zapier", "connection", "integrate"
            ],
            "onboarding_help": [
                "como começar", "primeiros passos", "setup", "configurar",
                "getting started", "onboarding", "initial setup"
            ],
            "complaint": [
                "reclamação", "insatisfeito", "problema sério", "cancelar",
                "complaint", "unhappy", "disappointed", "cancel"
            ],
            "compliment": [
                "excelente", "ótimo", "perfeito", "adorei", "fantástico",
                "excellent", "great", "perfect", "amazing", "wonderful"
            ],
            "goodbye": [
                "tchau", "adeus", "até logo", "obrigado", "bye", "goodbye",
                "see you", "talk later", "thanks"
            ]
        }

    async def classify_intent(self, message: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Classify the intent of a message"""
        try:
            message_lower = message.lower().strip()

            # Try ML-based classification first if available
            if self.classifier and TRANSFORMERS_AVAILABLE:
                ml_result = await self._classify_with_ml(message)
                if ml_result["confidence"] >= conversational_config.INTENT_CONFIDENCE_THRESHOLD:
                    return ml_result

            # Fallback to pattern-based classification
            pattern_result = self._classify_with_patterns(message_lower)

            # Enhance with context if available
            if context:
                pattern_result = self._enhance_with_context(pattern_result, context)

            return pattern_result

        except Exception as e:
            logger.error(f"Error classifying intent: {e}")
            return {
                "intent": "unknown",
                "confidence": 0.0,
                "method": "error",
                "entities": [],
                "timestamp": datetime.now().isoformat()
            }

    async def _classify_with_ml(self, message: str) -> Dict[str, Any]:
        """Classify intent using ML model"""
        try:
            # This is a simplified example - you'd need a proper intent classification model
            results = self.classifier(message)

            if results and len(results) > 0:
                best_result = max(results, key=lambda x: x["score"])

                # Map model labels to our intent categories
                intent_mapping = {
                    "POSITIVE": "compliment",
                    "NEGATIVE": "complaint",
                    "NEUTRAL": "general_inquiry"
                }

                mapped_intent = intent_mapping.get(best_result["label"], "general_inquiry")

                return {
                    "intent": mapped_intent,
                    "confidence": best_result["score"],
                    "method": "ml",
                    "entities": [],
                    "raw_results": results,
                    "timestamp": datetime.now().isoformat()
                }

            return {
                "intent": "unknown",
                "confidence": 0.0,
                "method": "ml_failed",
                "entities": [],
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error in ML classification: {e}")
            return {
                "intent": "unknown",
                "confidence": 0.0,
                "method": "ml_error",
                "entities": [],
                "timestamp": datetime.now().isoformat()
            }

    def _classify_with_patterns(self, message: str) -> Dict[str, Any]:
        """Classify intent using keyword patterns"""
        intent_scores = {}

        # Calculate scores for each intent based on keyword matches
        for intent, patterns in self.intent_patterns.items():
            score = 0
            matched_patterns = []

            for pattern in patterns:
                if pattern in message:
                    # Weight longer patterns more heavily
                    weight = len(pattern.split()) * 0.3 + 0.7
                    score += weight
                    matched_patterns.append(pattern)

            if score > 0:
                # Normalize score based on message length and pattern count
                normalized_score = min(score / (len(message.split()) * 0.1 + 1), 1.0)
                intent_scores[intent] = {
                    "score": normalized_score,
                    "matched_patterns": matched_patterns
                }

        # Find best intent
        if intent_scores:
            best_intent = max(intent_scores.keys(), key=lambda x: intent_scores[x]["score"])
            best_score = intent_scores[best_intent]["score"]

            # Extract entities (simple keyword extraction)
            entities = self._extract_entities(message, best_intent)

            return {
                "intent": best_intent,
                "confidence": best_score,
                "method": "pattern",
                "entities": entities,
                "matched_patterns": intent_scores[best_intent]["matched_patterns"],
                "all_scores": intent_scores,
                "timestamp": datetime.now().isoformat()
            }

        return {
            "intent": "general_inquiry",
            "confidence": 0.5,
            "method": "default",
            "entities": [],
            "timestamp": datetime.now().isoformat()
        }

    def _extract_entities(self, message: str, intent: str) -> List[Dict[str, Any]]:
        """Extract entities from message based on intent"""
        entities = []
        message_lower = message.lower()

        # Entity patterns based on intent
        entity_patterns = {
            "pricing_inquiry": {
                "plan_type": ["starter", "professional", "enterprise", "básico", "avançado"],
                "duration": ["mensal", "anual", "monthly", "yearly", "trimestral"]
            },
            "feature_question": {
                "feature": ["whatsapp", "crm", "analytics", "funil", "automação", "ia", "chatbot"]
            },
            "integration_question": {
                "platform": ["hubspot", "salesforce", "pipedrive", "rd station", "mailchimp", "zapier"]
            }
        }

        if intent in entity_patterns:
            for entity_type, patterns in entity_patterns[intent].items():
                for pattern in patterns:
                    if pattern in message_lower:
                        entities.append({
                            "type": entity_type,
                            "value": pattern,
                            "confidence": 0.8
                        })

        # Extract common entities (emails, phones, numbers)
        import re

        # Email extraction
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, message)
        for email in emails:
            entities.append({"type": "email", "value": email, "confidence": 0.9})

        # Phone extraction (Brazilian format)
        phone_pattern = r'\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}'
        phones = re.findall(phone_pattern, message)
        for phone in phones:
            entities.append({"type": "phone", "value": phone, "confidence": 0.8})

        # Number extraction
        number_pattern = r'\b\d+\b'
        numbers = re.findall(number_pattern, message)
        for number in numbers:
            if len(number) <= 10:  # Avoid extracting very long numbers
                entities.append({"type": "number", "value": int(number), "confidence": 0.7})

        return entities

    def _enhance_with_context(self, intent_result: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Enhance intent classification with contextual information"""

        # Check conversation history for intent patterns
        if "conversation_history" in context:
            history = context["conversation_history"]
            if len(history) > 0:
                last_message = history[-1] if history else ""

                # If last message was about pricing and current is vague, likely still pricing
                if "preço" in last_message.lower() and intent_result["confidence"] < 0.7:
                    if intent_result["intent"] == "general_inquiry":
                        intent_result["intent"] = "pricing_inquiry"
                        intent_result["confidence"] = min(intent_result["confidence"] + 0.2, 1.0)
                        intent_result["context_enhanced"] = True

        # Check user profile for intent enhancement
        if "user_profile" in context:
            profile = context["user_profile"]

            # If user is a trial user asking questions, likely need onboarding help
            if profile.get("status") == "trial" and intent_result["intent"] == "general_inquiry":
                intent_result["intent"] = "onboarding_help"
                intent_result["confidence"] = min(intent_result["confidence"] + 0.1, 1.0)
                intent_result["profile_enhanced"] = True

        return intent_result

    async def batch_classify(self, messages: List[str]) -> List[Dict[str, Any]]:
        """Classify multiple messages in batch"""
        tasks = [self.classify_intent(msg) for msg in messages]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        return [
            result if not isinstance(result, Exception) else {"intent": "error", "confidence": 0.0}
            for result in results
        ]

    def get_intent_confidence_threshold(self) -> float:
        """Get the confidence threshold for intent classification"""
        return conversational_config.INTENT_CONFIDENCE_THRESHOLD

    def get_supported_intents(self) -> List[str]:
        """Get list of supported intents"""
        return list(self.intent_patterns.keys())


class SentimentAnalyzer:
    """Sentiment analysis service"""

    def __init__(self):
        self.vader_analyzer = None
        self.transformers_analyzer = None
        self._initialize_analyzers()

    def _initialize_analyzers(self):
        """Initialize sentiment analysis models"""
        try:
            if VADER_AVAILABLE:
                self.vader_analyzer = SentimentIntensityAnalyzer()
                logger.info("VADER sentiment analyzer initialized")

            if TRANSFORMERS_AVAILABLE:
                try:
                    self.transformers_analyzer = pipeline(
                        "sentiment-analysis",
                        model="cardiffnlp/twitter-roberta-base-sentiment-latest",
                        return_all_scores=True
                    )
                    logger.info("Transformers sentiment analyzer initialized")
                except Exception as e:
                    logger.warning(f"Failed to load transformers sentiment model: {e}")

            if not self.vader_analyzer and not self.transformers_analyzer:
                logger.warning("No sentiment analyzers available, using TextBlob fallback")

        except Exception as e:
            logger.error(f"Error initializing sentiment analyzers: {e}")

    async def analyze_sentiment(self, text: str) -> Dict[str, Any]:
        """Analyze sentiment of text"""
        try:
            results = {}

            # VADER analysis (good for social media text)
            if self.vader_analyzer:
                vader_scores = self.vader_analyzer.polarity_scores(text)
                results["vader"] = {
                    "positive": vader_scores["pos"],
                    "neutral": vader_scores["neu"],
                    "negative": vader_scores["neg"],
                    "compound": vader_scores["compound"]
                }

            # Transformers analysis (more accurate for general text)
            if self.transformers_analyzer:
                try:
                    transformer_results = self.transformers_analyzer(text)
                    results["transformers"] = transformer_results
                except Exception as e:
                    logger.warning(f"Transformers sentiment analysis failed: {e}")

            # TextBlob fallback
            if not results and TEXTBLOB_AVAILABLE:
                blob = TextBlob(text)
                results["textblob"] = {
                    "polarity": blob.sentiment.polarity,
                    "subjectivity": blob.sentiment.subjectivity
                }

            # Aggregate results
            final_sentiment = self._aggregate_sentiment_results(results)

            return {
                "label": final_sentiment["label"],
                "score": final_sentiment["score"],
                "confidence": final_sentiment["confidence"],
                "details": results,
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error analyzing sentiment: {e}")
            return {
                "label": "neutral",
                "score": 0.0,
                "confidence": 0.0,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

    def _aggregate_sentiment_results(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Aggregate results from multiple sentiment analyzers"""

        if not results:
            return {"label": "neutral", "score": 0.0, "confidence": 0.0}

        scores = []
        confidences = []

        # Process VADER results
        if "vader" in results:
            compound = results["vader"]["compound"]
            if compound >= 0.05:
                scores.append(compound)
                confidences.append(0.8)
            elif compound <= -0.05:
                scores.append(compound)
                confidences.append(0.8)
            else:
                scores.append(0.0)
                confidences.append(0.6)

        # Process Transformers results
        if "transformers" in results:
            for result in results["transformers"]:
                if result["label"] == "LABEL_2":  # Positive
                    scores.append(result["score"])
                    confidences.append(0.9)
                elif result["label"] == "LABEL_0":  # Negative
                    scores.append(-result["score"])
                    confidences.append(0.9)
                else:  # Neutral
                    scores.append(0.0)
                    confidences.append(0.7)

        # Process TextBlob results
        if "textblob" in results:
            polarity = results["textblob"]["polarity"]
            scores.append(polarity)
            confidences.append(0.6)

        # Calculate weighted average
        if scores:
            weighted_score = sum(s * c for s, c in zip(scores, confidences)) / sum(confidences)
            avg_confidence = sum(confidences) / len(confidences)

            # Determine label
            if weighted_score > 0.1:
                label = "positive"
            elif weighted_score < -0.1:
                label = "negative"
            else:
                label = "neutral"

            return {
                "label": label,
                "score": weighted_score,
                "confidence": avg_confidence
            }

        return {"label": "neutral", "score": 0.0, "confidence": 0.0}

    async def batch_analyze(self, texts: List[str]) -> List[Dict[str, Any]]:
        """Analyze sentiment for multiple texts"""
        tasks = [self.analyze_sentiment(text) for text in texts]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        return [
            result if not isinstance(result, Exception) else {"label": "error", "score": 0.0, "confidence": 0.0}
            for result in results
        ]

    def is_positive(self, sentiment_result: Dict[str, Any]) -> bool:
        """Check if sentiment is positive"""
        return sentiment_result.get("label") == "positive" and sentiment_result.get("confidence", 0) >= 0.6

    def is_negative(self, sentiment_result: Dict[str, Any]) -> bool:
        """Check if sentiment is negative"""
        return sentiment_result.get("label") == "negative" and sentiment_result.get("confidence", 0) >= 0.6

    def get_sentiment_intensity(self, sentiment_result: Dict[str, Any]) -> str:
        """Get sentiment intensity level"""
        score = abs(sentiment_result.get("score", 0))
        confidence = sentiment_result.get("confidence", 0)

        if confidence < 0.5:
            return "uncertain"
        elif score > 0.7:
            return "strong"
        elif score > 0.3:
            return "moderate"
        else:
            return "weak"
