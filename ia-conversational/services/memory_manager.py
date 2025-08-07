from typing import Dict, List, Any, Optional
import logging
from datetime import datetime, timedelta
import asyncio
import json

try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

from config import conversational_config

logger = logging.getLogger(__name__)

class ConversationMemory:
    """Manages conversation memory and context"""

    def __init__(self):
        self.redis_client = None
        self.local_memory = {}  # Fallback when Redis is not available
        self._initialize_storage()

    def _initialize_storage(self):
        """Initialize storage backend"""
        if REDIS_AVAILABLE and conversational_config.REDIS_URL:
            try:
                self.redis_client = redis.from_url(
                    conversational_config.REDIS_URL,
                    decode_responses=True
                )
                logger.info("Redis client initialized for conversation memory")
            except Exception as e:
                logger.warning(f"Failed to initialize Redis: {e}, using local memory")
        else:
            logger.info("Using local memory for conversation storage")

    async def store_message(self, user_id: str, session_id: str, message: Dict[str, Any]):
        """Store a conversation message"""
        try:
            key = f"conversation:{user_id}:{session_id}"

            # Add timestamp if not present
            message["timestamp"] = message.get("timestamp", datetime.now().isoformat())

            if self.redis_client:
                # Store in Redis with expiration
                await self.redis_client.lpush(key, json.dumps(message))
                await self.redis_client.expire(key, conversational_config.CONVERSATION_MEMORY_TTL)

                # Keep only recent messages
                await self.redis_client.ltrim(key, 0, conversational_config.MAX_CONVERSATION_HISTORY - 1)

            else:
                # Store in local memory
                if key not in self.local_memory:
                    self.local_memory[key] = []

                self.local_memory[key].insert(0, message)

                # Keep only recent messages
                if len(self.local_memory[key]) > conversational_config.MAX_CONVERSATION_HISTORY:
                    self.local_memory[key] = self.local_memory[key][:conversational_config.MAX_CONVERSATION_HISTORY]

            logger.debug(f"Message stored for {user_id}:{session_id}")

        except Exception as e:
            logger.error(f"Error storing message: {e}")

    async def get_conversation_history(
        self,
        user_id: str,
        session_id: str,
        limit: int = None
    ) -> List[Dict[str, Any]]:
        """Get conversation history"""
        try:
            key = f"conversation:{user_id}:{session_id}"
            limit = limit or conversational_config.MAX_CONVERSATION_HISTORY

            if self.redis_client:
                # Get from Redis
                messages = await self.redis_client.lrange(key, 0, limit - 1)
                return [json.loads(msg) for msg in messages]

            else:
                # Get from local memory
                messages = self.local_memory.get(key, [])
                return messages[:limit]

        except Exception as e:
            logger.error(f"Error getting conversation history: {e}")
            return []

    async def clear_conversation(self, user_id: str, session_id: str = None):
        """Clear conversation history"""
        try:
            if session_id:
                key = f"conversation:{user_id}:{session_id}"
                if self.redis_client:
                    await self.redis_client.delete(key)
                else:
                    self.local_memory.pop(key, None)
            else:
                # Clear all sessions for user
                pattern = f"conversation:{user_id}:*"

                if self.redis_client:
                    keys = await self.redis_client.keys(pattern)
                    if keys:
                        await self.redis_client.delete(*keys)
                else:
                    keys_to_remove = [k for k in self.local_memory.keys() if k.startswith(f"conversation:{user_id}:")]
                    for key in keys_to_remove:
                        self.local_memory.pop(key, None)

            logger.info(f"Conversation cleared for {user_id}:{session_id}")

        except Exception as e:
            logger.error(f"Error clearing conversation: {e}")

    async def get_recent_context(
        self,
        user_id: str,
        session_id: str,
        context_window: int = 5
    ) -> str:
        """Get recent conversation context as formatted string"""
        try:
            history = await self.get_conversation_history(user_id, session_id, context_window)

            if not history:
                return ""

            context_parts = []
            for msg in reversed(history):  # Reverse to get chronological order
                role = msg.get("role", "unknown")
                content = msg.get("content", "")

                if role == "user":
                    context_parts.append(f"Usuário: {content}")
                elif role == "assistant":
                    context_parts.append(f"Assistente: {content}")

            return "\n".join(context_parts)

        except Exception as e:
            logger.error(f"Error getting recent context: {e}")
            return ""

    async def store_user_context(self, user_id: str, context: Dict[str, Any]):
        """Store user context information"""
        try:
            key = f"user_context:{user_id}"

            if self.redis_client:
                await self.redis_client.hset(key, mapping=context)
                await self.redis_client.expire(key, conversational_config.USER_CONTEXT_TTL)
            else:
                if "user_contexts" not in self.local_memory:
                    self.local_memory["user_contexts"] = {}
                self.local_memory["user_contexts"][user_id] = context

        except Exception as e:
            logger.error(f"Error storing user context: {e}")

    async def get_user_context(self, user_id: str) -> Dict[str, Any]:
        """Get user context information"""
        try:
            key = f"user_context:{user_id}"

            if self.redis_client:
                context = await self.redis_client.hgetall(key)
                return context or {}
            else:
                return self.local_memory.get("user_contexts", {}).get(user_id, {})

        except Exception as e:
            logger.error(f"Error getting user context: {e}")
            return {}

    async def update_session_metadata(self, user_id: str, session_id: str, metadata: Dict[str, Any]):
        """Update session metadata"""
        try:
            key = f"session_metadata:{user_id}:{session_id}"

            if self.redis_client:
                await self.redis_client.hset(key, mapping=metadata)
                await self.redis_client.expire(key, conversational_config.CONVERSATION_MEMORY_TTL)
            else:
                if "session_metadata" not in self.local_memory:
                    self.local_memory["session_metadata"] = {}
                self.local_memory["session_metadata"][f"{user_id}:{session_id}"] = metadata

        except Exception as e:
            logger.error(f"Error updating session metadata: {e}")

    async def get_session_metadata(self, user_id: str, session_id: str) -> Dict[str, Any]:
        """Get session metadata"""
        try:
            key = f"session_metadata:{user_id}:{session_id}"

            if self.redis_client:
                metadata = await self.redis_client.hgetall(key)
                return metadata or {}
            else:
                return self.local_memory.get("session_metadata", {}).get(f"{user_id}:{session_id}", {})

        except Exception as e:
            logger.error(f"Error getting session metadata: {e}")
            return {}

    async def cleanup_expired_conversations(self):
        """Clean up expired conversations (for local memory)"""
        if self.redis_client:
            return  # Redis handles TTL automatically

        try:
            current_time = datetime.now()
            expired_keys = []

            for key, messages in self.local_memory.items():
                if key.startswith("conversation:") and messages:
                    last_message_time = datetime.fromisoformat(messages[0].get("timestamp", ""))
                    if (current_time - last_message_time).total_seconds() > conversational_config.CONVERSATION_MEMORY_TTL:
                        expired_keys.append(key)

            for key in expired_keys:
                del self.local_memory[key]

            if expired_keys:
                logger.info(f"Cleaned up {len(expired_keys)} expired conversations")

        except Exception as e:
            logger.error(f"Error cleaning up expired conversations: {e}")


class ResponseTemplateManager:
    """Manages response templates for different contexts"""

    def __init__(self):
        self.templates = self._load_default_templates()

    def _load_default_templates(self) -> Dict[str, Dict[str, str]]:
        """Load default response templates"""
        return {
            "greeting": {
                "first_time": "Olá! 👋 Sou o assistente de IA da Zaplify. Como posso ajudá-lo hoje?",
                "returning": "Oi novamente! Como posso ajudá-lo hoje?",
                "formal": "Bom dia/tarde! Sou o assistente virtual da Zaplify. Em que posso auxiliá-lo?"
            },
            "pricing_inquiry": {
                "general": "Vou te ajudar com informações sobre nossos planos! Temos opções para diferentes necessidades e tamanhos de empresa.",
                "specific_plan": "Excelente escolha! O plano {plan_name} oferece {features}. Gostaria de saber mais detalhes?",
                "comparison": "Vou te mostrar uma comparação entre nossos planos para você escolher o melhor para seu negócio."
            },
            "technical_support": {
                "general": "Vou te ajudar a resolver esse problema! Pode me descrever mais detalhes sobre o que está acontecendo?",
                "specific_error": "Entendo o problema. Vamos resolver isso passo a passo.",
                "escalation": "Vou conectar você com nosso suporte técnico especializado para resolver essa questão."
            },
            "feature_question": {
                "general": "Vou te explicar sobre nossas funcionalidades! Sobre qual recurso específico você gostaria de saber mais?",
                "whatsapp": "Nossa integração com WhatsApp permite automação completa de conversas, desde respostas automáticas até funis complexos.",
                "ai": "Nossa IA conversacional usa tecnologia avançada para entender e responder de forma natural aos seus clientes."
            },
            "demo_request": {
                "general": "Ótimo! Vou agendar uma demonstração personalizada para você. Qual seria o melhor horário?",
                "immediate": "Posso te mostrar algumas funcionalidades agora mesmo! O que você gostaria de ver primeiro?",
                "scheduled": "Perfeito! Demonstração agendada para {date} às {time}. Você receberá o link por email."
            },
            "objection_handling": {
                "price": "Entendo sua preocupação com o investimento. Nossos clientes geralmente recuperam o valor investido em apenas {roi_period} através da automação.",
                "complexity": "Nossa plataforma foi desenvolvida para ser intuitiva! Oferecemos onboarding completo e suporte dedicado.",
                "competition": "Cada solução tem seus pontos fortes. O que torna a Zaplify única é nossa combinação de IA avançada com facilidade de uso."
            },
            "closing": {
                "positive": "Ficou alguma dúvida? Estou aqui para ajudar no que precisar!",
                "neutral": "Se precisar de mais informações, estarei disponível. Obrigado pelo contato!",
                "follow_up": "Vou acompanhar sua solicitação e entro em contato em breve. Tenha um ótimo dia!"
            },
            "error": {
                "general": "Desculpe, tive um pequeno problema para processar sua mensagem. Pode tentar novamente?",
                "technical": "Estou passando por uma atualização no momento. Nossa equipe será notificada para ajudá-lo.",
                "timeout": "A resposta está demorando mais que o esperado. Deixe seu contato que retornamos em breve!"
            }
        }

    def get_template(self, intent: str, subtype: str = "general", context: Dict[str, Any] = None) -> str:
        """Get response template for intent and subtype"""
        try:
            template = self.templates.get(intent, {}).get(subtype, "")

            if not template:
                # Fallback to general template for the intent
                template = self.templates.get(intent, {}).get("general", "")

            if not template:
                # Final fallback
                template = "Como posso ajudá-lo?"

            # Format template with context if provided
            if context:
                try:
                    template = template.format(**context)
                except (KeyError, ValueError):
                    pass  # Keep original template if formatting fails

            return template

        except Exception as e:
            logger.error(f"Error getting template: {e}")
            return "Como posso ajudá-lo?"

    def add_custom_template(self, intent: str, subtype: str, template: str):
        """Add custom response template"""
        if intent not in self.templates:
            self.templates[intent] = {}

        self.templates[intent][subtype] = template

    def get_available_intents(self) -> List[str]:
        """Get list of available intent categories"""
        return list(self.templates.keys())

    def get_subtypes_for_intent(self, intent: str) -> List[str]:
        """Get available subtypes for an intent"""
        return list(self.templates.get(intent, {}).keys())


class ConversationTracker:
    """Tracks conversation state and flow"""

    def __init__(self):
        self.conversation_states = {}

    async def track_conversation_flow(
        self,
        user_id: str,
        session_id: str,
        intent: str,
        message: str,
        response: str
    ):
        """Track conversation flow and state"""
        try:
            key = f"{user_id}:{session_id}"

            if key not in self.conversation_states:
                self.conversation_states[key] = {
                    "start_time": datetime.now(),
                    "last_activity": datetime.now(),
                    "intent_sequence": [],
                    "message_count": 0,
                    "current_topic": None,
                    "user_satisfaction": None,
                    "resolved": False
                }

            state = self.conversation_states[key]
            state["last_activity"] = datetime.now()
            state["message_count"] += 1
            state["intent_sequence"].append({
                "intent": intent,
                "timestamp": datetime.now().isoformat(),
                "message_length": len(message),
                "response_length": len(response)
            })

            # Update current topic based on intent
            if intent != "greeting" and intent != "goodbye":
                state["current_topic"] = intent

            # Track conversation patterns
            await self._analyze_conversation_patterns(state, intent)

        except Exception as e:
            logger.error(f"Error tracking conversation flow: {e}")

    async def _analyze_conversation_patterns(self, state: Dict[str, Any], current_intent: str):
        """Analyze conversation patterns for insights"""
        try:
            intent_sequence = state["intent_sequence"]

            if len(intent_sequence) >= 2:
                # Check for repetitive intents (might indicate confusion)
                recent_intents = [item["intent"] for item in intent_sequence[-3:]]
                if len(set(recent_intents)) == 1 and current_intent == recent_intents[0]:
                    state["pattern_flags"] = state.get("pattern_flags", [])
                    if "repetitive" not in state["pattern_flags"]:
                        state["pattern_flags"].append("repetitive")

                # Check for escalation patterns
                escalation_sequence = ["feature_question", "pricing_inquiry", "demo_request"]
                if len(intent_sequence) >= 3:
                    last_three = [item["intent"] for item in intent_sequence[-3:]]
                    if last_three == escalation_sequence:
                        state["pattern_flags"] = state.get("pattern_flags", [])
                        if "escalating" not in state["pattern_flags"]:
                            state["pattern_flags"].append("escalating")

        except Exception as e:
            logger.error(f"Error analyzing conversation patterns: {e}")

    def get_conversation_state(self, user_id: str, session_id: str) -> Dict[str, Any]:
        """Get current conversation state"""
        key = f"{user_id}:{session_id}"
        return self.conversation_states.get(key, {})

    def should_escalate_to_human(self, user_id: str, session_id: str) -> bool:
        """Determine if conversation should be escalated to human"""
        state = self.get_conversation_state(user_id, session_id)

        # Escalate if repetitive pattern detected
        if "repetitive" in state.get("pattern_flags", []):
            return True

        # Escalate if complaint intent with negative sentiment
        recent_intents = [item["intent"] for item in state.get("intent_sequence", [])[-2:]]
        if "complaint" in recent_intents:
            return True

        # Escalate if long conversation without resolution
        if state.get("message_count", 0) > 20 and not state.get("resolved", False):
            return True

        return False
