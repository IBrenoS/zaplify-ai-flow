import asyncio
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import json

from langchain.llms import OpenAI
from langchain.chat_models import ChatOpenAI, ChatAnthropic
from langchain.schema import HumanMessage, AIMessage, SystemMessage
from langchain.memory import ConversationBufferWindowMemory
from langchain.callbacks import AsyncCallbackHandler
from langchain.prompts import ChatPromptTemplate, PromptTemplate

from config import conversational_config
from services.rag_service import RAGService
from services.intent_classifier import IntentClassifier
from services.sentiment_analyzer import SentimentAnalyzer

logger = logging.getLogger(__name__)

class ConversationalAI:
    def __init__(self, rag_service: RAGService, intent_classifier: IntentClassifier, sentiment_analyzer: SentimentAnalyzer):
        self.rag_service = rag_service
        self.intent_classifier = intent_classifier
        self.sentiment_analyzer = sentiment_analyzer

        # Initialize AI models
        self.openai_chat = None
        self.anthropic_chat = None
        self._initialize_models()

        # Conversation memory
        self.conversations: Dict[str, ConversationBufferWindowMemory] = {}

        # System prompts
        self.system_prompts = self._load_system_prompts()

    def _initialize_models(self):
        """Initialize AI models based on configuration"""
        try:
            if conversational_config.OPENAI_API_KEY:
                self.openai_chat = ChatOpenAI(
                    openai_api_key=conversational_config.OPENAI_API_KEY,
                    model_name=conversational_config.OPENAI_MODEL,
                    temperature=conversational_config.TEMPERATURE,
                    max_tokens=conversational_config.MAX_TOKENS
                )
                logger.info("OpenAI model initialized successfully")

            if conversational_config.ANTHROPIC_API_KEY:
                self.anthropic_chat = ChatAnthropic(
                    anthropic_api_key=conversational_config.ANTHROPIC_API_KEY,
                    model=conversational_config.ANTHROPIC_MODEL,
                    temperature=conversational_config.TEMPERATURE,
                    max_tokens=conversational_config.MAX_TOKENS
                )
                logger.info("Anthropic model initialized successfully")

        except Exception as e:
            logger.error(f"Error initializing AI models: {e}")

    def _load_system_prompts(self) -> Dict[str, str]:
        """Load system prompts for different conversation contexts"""
        return {
            "default": """Você é um assistente de IA conversacional especializado em vendas e suporte para a plataforma Zaplify AI Flow.

Características da sua personalidade:
- Profissional, mas amigável e acessível
- Focado em resultados e soluções
- Conhecedor de automação de vendas e marketing
- Capaz de explicar conceitos técnicos de forma simples
- Proativo em sugerir melhorias e otimizações

Suas responsabilidades:
1. Ajudar usuários com dúvidas sobre a plataforma
2. Guiar através do processo de setup de funnels
3. Sugerir estratégias de automação
4. Resolver problemas técnicos
5. Qualificar leads e identificar oportunidades de upsell

Sempre responda de forma clara, objetiva e útil. Use exemplos práticos quando possível.""",

            "sales": """Você é um especialista em vendas conversacional da Zaplify AI Flow.

Seu objetivo é:
- Identificar necessidades do prospect
- Demonstrar valor da plataforma
- Guiar para trial ou demo
- Responder objeções com dados e casos de sucesso
- Criar senso de urgência apropriado

Sempre seja consultivo, não pressione demais. Foque no valor e ROI.""",

            "support": """Você é um especialista técnico em suporte da Zaplify AI Flow.

Seu foco é:
- Resolver problemas técnicos rapidamente
- Explicar funcionalidades de forma clara
- Guiar através de configurações
- Escalar para humanos quando necessário
- Coletar feedback para melhorias

Seja paciente, detalhado e sempre confirme se o problema foi resolvido.""",

            "onboarding": """Você é um especialista em onboarding da Zaplify AI Flow.

Seu papel é:
- Dar boas-vindas aos novos usuários
- Explicar primeiros passos
- Configurar integrações básicas
- Demonstrar features principais
- Garantir quick wins iniciais

Seja empolgante, encorajador e focado no sucesso rápido do usuário."""
        }

    async def process_message(
        self,
        message: str,
        conversation_id: str,
        user_id: str,
        context: Optional[Dict[str, Any]] = None,
        assistant_type: str = "default"
    ) -> Dict[str, Any]:
        """
        Process a conversational message with full AI pipeline
        """
        try:
            start_time = datetime.now()

            # Initialize conversation if not exists
            if conversation_id not in self.conversations:
                self.conversations[conversation_id] = ConversationBufferWindowMemory(
                    k=conversational_config.MAX_CONVERSATION_HISTORY,
                    return_messages=True
                )

            memory = self.conversations[conversation_id]

            # Step 1: Intent Classification
            intent_result = await self.intent_classifier.classify_intent(message, context or {})

            # Step 2: Sentiment Analysis
            sentiment_result = await self.sentiment_analyzer.analyze_sentiment(message)

            # Step 3: RAG - Retrieve relevant context
            rag_context = await self.rag_service.retrieve_context(
                query=message,
                top_k=conversational_config.RAG_TOP_K,
                threshold=conversational_config.RAG_THRESHOLD
            )

            # Step 4: Build context for AI
            enhanced_context = self._build_enhanced_context(
                message=message,
                intent=intent_result,
                sentiment=sentiment_result,
                rag_context=rag_context,
                conversation_history=memory.chat_memory.messages,
                user_context=context or {},
                assistant_type=assistant_type
            )

            # Step 5: Generate response
            response = await self._generate_response(
                enhanced_context=enhanced_context,
                assistant_type=assistant_type
            )

            # Step 6: Update conversation memory
            memory.chat_memory.add_user_message(message)
            memory.chat_memory.add_ai_message(response["content"])

            # Step 7: Extract action items and next steps
            actions = await self._extract_actions(response["content"], intent_result)

            # Calculate processing time
            processing_time = (datetime.now() - start_time).total_seconds()

            return {
                "response": response["content"],
                "intent": intent_result,
                "sentiment": sentiment_result,
                "rag_sources": rag_context.get("sources", []),
                "actions": actions,
                "confidence": response.get("confidence", 0.8),
                "processing_time": processing_time,
                "conversation_id": conversation_id,
                "metadata": {
                    "model_used": response.get("model", "unknown"),
                    "tokens_used": response.get("tokens", 0),
                    "rag_hits": len(rag_context.get("documents", [])),
                    "assistant_type": assistant_type
                }
            }

        except Exception as e:
            logger.error(f"Error processing message: {e}")
            return {
                "response": "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente em alguns momentos.",
                "error": str(e),
                "intent": {"intent": "error", "confidence": 1.0},
                "sentiment": {"label": "neutral", "score": 0.0},
                "rag_sources": [],
                "actions": [],
                "confidence": 0.0,
                "processing_time": 0.0,
                "conversation_id": conversation_id
            }

    def _build_enhanced_context(
        self,
        message: str,
        intent: Dict[str, Any],
        sentiment: Dict[str, Any],
        rag_context: Dict[str, Any],
        conversation_history: List[Any],
        user_context: Dict[str, Any],
        assistant_type: str
    ) -> Dict[str, Any]:
        """Build comprehensive context for AI response generation"""

        # Format conversation history
        history_text = ""
        if conversation_history:
            for msg in conversation_history[-6:]:  # Last 6 messages
                if hasattr(msg, 'content'):
                    role = "Usuário" if isinstance(msg, HumanMessage) else "Assistente"
                    history_text += f"{role}: {msg.content}\n"

        # Format RAG context
        rag_text = ""
        if rag_context.get("documents"):
            rag_text = "\n".join([doc.get("content", "") for doc in rag_context["documents"][:3]])

        return {
            "current_message": message,
            "conversation_history": history_text,
            "intent": intent,
            "sentiment": sentiment,
            "knowledge_context": rag_text,
            "user_context": user_context,
            "assistant_type": assistant_type,
            "system_prompt": self.system_prompts.get(assistant_type, self.system_prompts["default"])
        }

    async def _generate_response(
        self,
        enhanced_context: Dict[str, Any],
        assistant_type: str
    ) -> Dict[str, Any]:
        """Generate AI response using the configured model"""

        try:
            # Select AI provider
            provider = conversational_config.DEFAULT_AI_PROVIDER

            if provider == "openai" and self.openai_chat:
                return await self._generate_openai_response(enhanced_context)
            elif provider == "anthropic" and self.anthropic_chat:
                return await self._generate_anthropic_response(enhanced_context)
            else:
                # Fallback to available model
                if self.openai_chat:
                    return await self._generate_openai_response(enhanced_context)
                elif self.anthropic_chat:
                    return await self._generate_anthropic_response(enhanced_context)
                else:
                    raise Exception("No AI model available")

        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return {
                "content": "Desculpe, não consegui processar sua solicitação no momento. Tente novamente.",
                "confidence": 0.0,
                "model": "fallback"
            }

    async def _generate_openai_response(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate response using OpenAI"""

        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content=context["system_prompt"]),
            HumanMessage(content=f"""
Contexto da conversa: {context.get('conversation_history', 'Início da conversa')}

Intenção detectada: {context['intent']['intent']} (confiança: {context['intent']['confidence']:.2f})
Sentimento: {context['sentiment']['label']} (score: {context['sentiment']['score']:.2f})

Conhecimento relevante:
{context.get('knowledge_context', 'Nenhum contexto específico encontrado.')}

Contexto do usuário: {json.dumps(context.get('user_context', {}), ensure_ascii=False)}

Mensagem atual: {context['current_message']}

Responda de forma natural, útil e contextualizada. Se necessário, faça perguntas de esclarecimento ou sugira próximos passos.
            """)
        ])

        response = await self.openai_chat.agenerate([prompt.format_messages()])

        return {
            "content": response.generations[0][0].text,
            "confidence": 0.9,  # OpenAI doesn't provide confidence scores
            "model": "openai",
            "tokens": response.llm_output.get("token_usage", {}).get("total_tokens", 0)
        }

    async def _generate_anthropic_response(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate response using Anthropic Claude"""

        prompt = f"""
{context["system_prompt"]}

Contexto da conversa: {context.get('conversation_history', 'Início da conversa')}

Intenção detectada: {context['intent']['intent']} (confiança: {context['intent']['confidence']:.2f})
Sentimento: {context['sentiment']['label']} (score: {context['sentiment']['score']:.2f})

Conhecimento relevante:
{context.get('knowledge_context', 'Nenhum contexto específico encontrado.')}

Contexto do usuário: {json.dumps(context.get('user_context', {}), ensure_ascii=False)}

Mensagem atual: {context['current_message']}

Responda de forma natural, útil e contextualizada. Se necessário, faça perguntas de esclarecimento ou sugira próximos passos.
        """

        response = await self.anthropic_chat.agenerate([[HumanMessage(content=prompt)]])

        return {
            "content": response.generations[0][0].text,
            "confidence": 0.9,
            "model": "anthropic",
            "tokens": 0  # Anthropic doesn't provide token count directly
        }

    async def _extract_actions(self, response: str, intent: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract actionable items from the response"""

        actions = []

        # Based on intent, determine if actions are needed
        intent_name = intent.get("intent", "")

        if intent_name in ["schedule_demo", "request_trial"]:
            actions.append({
                "type": "schedule_follow_up",
                "priority": "high",
                "description": "Schedule demo or trial setup"
            })
        elif intent_name in ["technical_support", "bug_report"]:
            actions.append({
                "type": "escalate_to_support",
                "priority": "medium",
                "description": "Technical issue requiring human attention"
            })
        elif intent_name in ["pricing_inquiry", "feature_question"]:
            actions.append({
                "type": "send_resources",
                "priority": "low",
                "description": "Send relevant documentation or pricing"
            })

        # Check for specific action keywords in response
        action_keywords = {
            "agendar": {"type": "schedule", "priority": "high"},
            "configurar": {"type": "configuration", "priority": "medium"},
            "enviar": {"type": "send_resource", "priority": "low"},
            "conectar": {"type": "integration", "priority": "medium"}
        }

        for keyword, action_info in action_keywords.items():
            if keyword in response.lower():
                actions.append({
                    "type": action_info["type"],
                    "priority": action_info["priority"],
                    "description": f"Action triggered by keyword: {keyword}"
                })

        return actions

    def get_conversation_summary(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Get summary of conversation"""
        if conversation_id not in self.conversations:
            return None

        memory = self.conversations[conversation_id]
        messages = memory.chat_memory.messages

        return {
            "conversation_id": conversation_id,
            "message_count": len(messages),
            "last_activity": datetime.now().isoformat(),
            "summary": f"Conversa com {len(messages)} mensagens"
        }

    def clear_conversation(self, conversation_id: str) -> bool:
        """Clear conversation memory"""
        if conversation_id in self.conversations:
            del self.conversations[conversation_id]
            return True
        return False

    async def batch_process_messages(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process multiple messages in batch"""
        tasks = []

        for msg_data in messages:
            task = self.process_message(
                message=msg_data["message"],
                conversation_id=msg_data["conversation_id"],
                user_id=msg_data["user_id"],
                context=msg_data.get("context"),
                assistant_type=msg_data.get("assistant_type", "default")
            )
            tasks.append(task)

        results = await asyncio.gather(*tasks, return_exceptions=True)

        return [
            result if not isinstance(result, Exception) else {"error": str(result)}
            for result in results
        ]
