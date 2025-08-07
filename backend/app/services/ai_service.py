"""
AI Service for handling conversational AI with LangChain and OpenAI
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import json

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain.memory import ConversationBufferWindowMemory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from app.core.config import settings
from app.models.assistant import AssistantResponse, PersonalityType
from app.models.conversation import MessageResponse, MessageSender

logger = logging.getLogger(__name__)


class AIService:
    """Service for handling AI conversations"""

    def __init__(self):
        self.llm = ChatOpenAI(
            model=settings.OPENAI_MODEL,
            temperature=settings.OPENAI_TEMPERATURE,
            max_tokens=settings.OPENAI_MAX_TOKENS,
            openai_api_key=settings.OPENAI_API_KEY
        )
        self.conversation_memories: Dict[str, ConversationBufferWindowMemory] = {}

        # Personality prompts mapping
        self.personality_prompts = {
            PersonalityType.FRIENDLY: """
            Você é um assistente amigável e caloroso. Use uma linguagem descontraída,
            seja empático e crie uma conexão pessoal com o cliente. Demonstre interesse
            genuíno pelas necessidades do cliente e mantenha um tom positivo.
            """,
            PersonalityType.PROFESSIONAL: """
            Você é um assistente profissional e direto. Seja objetivo, use linguagem
            formal adequada e foque em eficiência e resultados. Mantenha-se focado
            nos objetivos de negócio e forneça informações precisas.
            """,
            PersonalityType.ENTHUSIASTIC: """
            Você é um assistente entusiasmado e persuasivo. Demonstre energia positiva,
            motive o cliente e use técnicas de persuasão ética. Seja contagiante e
            inspire confiança no produto/serviço.
            """,
            PersonalityType.EXPERT: """
            Você é um assistente especialista e consultivo. Forneça informações técnicas
            precisas, faça perguntas diagnósticas e ofereça soluções baseadas em expertise.
            Demonstre conhecimento profundo e autoridade no assunto.
            """
        }

    async def generate_response(
        self,
        message: str,
        conversation_id: str,
        assistant: AssistantResponse,
        conversation_history: List[MessageResponse],
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Generate AI response for a given message

        Args:
            message: User message
            conversation_id: Conversation ID
            assistant: Assistant configuration
            conversation_history: Previous messages
            context: Additional context information

        Returns:
            Dict with response, confidence, and metadata
        """
        try:
            start_time = datetime.now()

            # Get or create conversation memory
            memory = self._get_conversation_memory(conversation_id)

            # Build system prompt
            system_prompt = self._build_system_prompt(assistant, context)

            # Prepare conversation history
            messages = self._prepare_messages(system_prompt, conversation_history, message)

            # Generate response
            response = await self._call_llm(messages)

            # Calculate processing time
            processing_time = (datetime.now() - start_time).total_seconds()

            # Update memory
            memory.chat_memory.add_user_message(message)
            memory.chat_memory.add_ai_message(response)

            return {
                "response": response,
                "confidence": 0.9,  # TODO: Implement confidence calculation
                "processing_time": processing_time,
                "metadata": {
                    "model": settings.OPENAI_MODEL,
                    "tokens_used": len(response.split()),  # Rough estimate
                    "personality": assistant.personality
                }
            }

        except Exception as e:
            logger.error(f"Error generating AI response: {e}")
            return {
                "response": "Desculpe, ocorreu um erro técnico. Pode repetir sua pergunta?",
                "confidence": 0.0,
                "processing_time": 0.0,
                "metadata": {"error": str(e)}
            }

    def _get_conversation_memory(self, conversation_id: str) -> ConversationBufferWindowMemory:
        """Get or create conversation memory"""
        if conversation_id not in self.conversation_memories:
            self.conversation_memories[conversation_id] = ConversationBufferWindowMemory(
                k=10,  # Keep last 10 exchanges
                return_messages=True
            )
        return self.conversation_memories[conversation_id]

    def _build_system_prompt(self, assistant: AssistantResponse, context: Dict[str, Any] = None) -> str:
        """Build system prompt based on assistant configuration"""

        # Base personality prompt
        personality_prompt = self.personality_prompts.get(
            assistant.personality,
            self.personality_prompts[PersonalityType.FRIENDLY]
        )

        # Assistant specific instructions
        assistant_context = f"""
        INFORMAÇÕES DO ASSISTENTE:
        Nome: {assistant.name}
        Descrição: {assistant.description or "Assistente de vendas e atendimento"}

        OBJETIVOS:
        {', '.join(assistant.objectives) if assistant.objectives else "Atender e auxiliar clientes"}
        """

        # Business context from advanced settings
        business_context = ""
        if assistant.advanced_settings:
            settings_data = assistant.advanced_settings
            if settings_data.get("product_service"):
                business_context += f"\nProduto/Serviço: {settings_data['product_service']}"
            if settings_data.get("main_benefits"):
                business_context += f"\nPrincipais Benefícios: {settings_data['main_benefits']}"
            if settings_data.get("target_audience"):
                business_context += f"\nPúblico-alvo: {settings_data['target_audience']}"

        # Knowledge base
        knowledge_context = ""
        if assistant.knowledge_base:
            knowledge_context = f"\nBASE DE CONHECIMENTO:\n" + "\n".join(assistant.knowledge_base)

        # Combine all prompts
        full_prompt = f"""
        {personality_prompt}

        {assistant_context}

        {business_context}

        {knowledge_context}

        INSTRUÇÕES IMPORTANTES:
        - Sempre responda em português brasileiro
        - Mantenha o foco nos objetivos do assistente
        - Se não souber algo, seja honesto e ofereça alternativas
        - Use a base de conhecimento quando relevante
        - Mantenha as respostas concisas mas informativas
        - Se o cliente demonstrar interesse em compra, conduza-o ao processo de vendas
        """

        return full_prompt.strip()

    def _prepare_messages(
        self,
        system_prompt: str,
        conversation_history: List[MessageResponse],
        current_message: str
    ) -> List:
        """Prepare messages for LLM call"""

        messages = [SystemMessage(content=system_prompt)]

        # Add conversation history
        for msg in conversation_history[-10:]:  # Last 10 messages for context
            if msg.sender == MessageSender.USER:
                messages.append(HumanMessage(content=msg.content))
            elif msg.sender == MessageSender.ASSISTANT:
                messages.append(AIMessage(content=msg.content))

        # Add current message
        messages.append(HumanMessage(content=current_message))

        return messages

    async def _call_llm(self, messages: List) -> str:
        """Make async call to LLM"""
        try:
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.llm(messages).content
            )
            return response
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            raise

    def clear_conversation_memory(self, conversation_id: str) -> None:
        """Clear conversation memory"""
        if conversation_id in self.conversation_memories:
            del self.conversation_memories[conversation_id]

    async def analyze_sentiment(self, message: str) -> Dict[str, Any]:
        """Analyze sentiment of a message"""
        # TODO: Implement sentiment analysis
        return {
            "sentiment": "neutral",
            "confidence": 0.5,
            "emotions": []
        }

    async def extract_intent(self, message: str) -> Dict[str, Any]:
        """Extract intent from message"""
        # TODO: Implement intent recognition
        return {
            "intent": "general_inquiry",
            "confidence": 0.5,
            "entities": {}
        }


# Global AI service instance
ai_service = AIService()
