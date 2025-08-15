"""
LLM Service with OpenAI integration and personality-driven responses
"""

import asyncio
import os

from openai import AsyncOpenAI

from app.core.logging import log_error, log_info
from app.schemas.assistant import AssistantConfig

"""
LLM Service with OpenAI integration and personality-driven responses
"""


class LLMService:
    """LLM service with personality-driven prompt engineering"""

    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.client = None
        self._available = False

        if self.api_key:
            try:
                self.client = AsyncOpenAI(api_key=self.api_key)
                self._available = True
                log_info("OpenAI client initialized")
            except Exception as e:
                log_error(f"OpenAI client initialization failed: {e}")
                self._available = False
        else:
            log_info(
                "OPENAI_API_KEY not set - LLM features disabled, using fallback responses"
            )

    def is_available(self) -> bool:
        """Check if LLM is available"""
        return self._available

    async def generate_reply(
        self,
        text: str,
        assistant_config: AssistantConfig,
        correlation_id: str,
        tenant_id: str,
    ) -> str:
        """
        Generate personality-driven reply based on assistant configuration
        Implements Prompt 4 requirements: personality + objectives + style
        """

        if not self.is_available():
            # Fallback stub response as per Prompt 4 requirements
            fallback_response = f"(stub) Resposta para: {text}"
            log_info(
                "LLM fallback response used - no OpenAI API key",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                input_text=text[:100],
            )
            return fallback_response

        try:
            # Build personality-driven system prompt
            system_prompt = self._build_system_prompt(assistant_config)

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text},
            ]

            # Call OpenAI with 5s timeout as per requirements
            response = await asyncio.wait_for(
                self.client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=messages,
                    max_tokens=500,
                    temperature=0.7,
                ),
                timeout=5.0,  # 5s timeout as required
            )

            content = response.choices[0].message.content

            log_info(
                "LLM response generated successfully",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                assistant_id=assistant_config.id,
                assistant_name=assistant_config.name,
                tokens_used=response.usage.total_tokens if response.usage else 0,
            )

            return content

        except TimeoutError:
            # Timeout fallback as per requirements
            log_error(
                "LLM request timeout (5s) - using fallback",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                error_type="timeout",
            )
            return f"(stub) Resposta para: {text}"

        except Exception as e:
            # Error fallback as per requirements
            log_error(
                f"LLM generation failed: {e}",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                error_type=type(e).__name__,
            )
            return f"(stub) Resposta para: {text}"

    def _build_system_prompt(self, config: AssistantConfig) -> str:
        """Build personality-driven system prompt from assistant configuration"""

        prompt_parts = []

        # Base identity
        prompt_parts.append(f"Você é {config.name}, um assistente de IA especializado.")

        # Personality archetype
        if config.selected_archetype:
            archetype_map = {
                "friendly": "Seja amigável, acolhedor e conversacional",
                "professional": "Mantenha um tom profissional, formal e competente",
                "enthusiastic": "Seja entusiasmado, energético e motivador",
                "expert": "Demonstre expertise, precisão técnica e autoridade",
            }
            if config.selected_archetype in archetype_map:
                prompt_parts.append(archetype_map[config.selected_archetype])

        # Personality instructions (custom)
        if config.personality_instructions:
            prompt_parts.append(
                f"Instruções de personalidade: {config.personality_instructions}"
            )

        # Objectives and capabilities
        if config.objective:
            prompt_parts.append(f"Seu objetivo principal: {config.objective}")

        capabilities = []
        if config.can_schedule:
            capabilities.append("agendar reuniões")
        if config.can_sell:
            capabilities.append("conduzir vendas")
        if config.can_qualify:
            capabilities.append("qualificar leads")
        if config.can_capture_data:
            capabilities.append("capturar dados dos clientes")

        if capabilities:
            prompt_parts.append(f"Suas capacidades incluem: {', '.join(capabilities)}")

        # Knowledge base (short version)
        knowledge_parts = []
        if config.product_service:
            knowledge_parts.append(f"Produto/Serviço: {config.product_service[:200]}")
        if config.main_benefits:
            knowledge_parts.append(
                f"Benefícios principais: {config.main_benefits[:200]}"
            )
        if config.target_audience:
            knowledge_parts.append(f"Público-alvo: {config.target_audience[:100]}")

        if knowledge_parts:
            prompt_parts.append("Conhecimento sobre negócio:")
            prompt_parts.extend(knowledge_parts)

        # Communication style dosing
        formality_guidance = self._get_formality_guidance(config.formality_level)
        detail_guidance = self._get_detail_guidance(config.detail_level)
        emoji_guidance = self._get_emoji_guidance(config.emoji_usage)

        prompt_parts.append(
            f"Estilo de comunicação: {formality_guidance} {detail_guidance} {emoji_guidance}"
        )

        # Hard rules
        if config.hard_rules:
            prompt_parts.append(f"REGRAS IMPORTANTES: {config.hard_rules}")

        prompt_parts.append(
            "Responda de forma útil, seguindo sua personalidade e objetivos."
        )

        return "\n".join(prompt_parts)

    def _get_formality_guidance(self, level: int) -> str:
        """Get formality guidance based on level (1-10)"""
        if level <= 3:
            return "Use linguagem muito casual e descontraída."
        elif level <= 6:
            return "Use linguagem moderadamente formal."
        else:
            return "Use linguagem formal e profissional."

    def _get_detail_guidance(self, level: int) -> str:
        """Get detail guidance based on level (1-10)"""
        if level <= 3:
            return "Seja muito breve e direto."
        elif level <= 6:
            return "Forneça detalhes moderados."
        else:
            return "Seja detalhado e explicativo."

    def _get_emoji_guidance(self, level: int) -> str:
        """Get emoji guidance based on level (1-10)"""
        if level <= 2:
            return "Não use emojis."
        elif level <= 5:
            return "Use poucos emojis ocasionalmente."
        else:
            return "Use emojis frequentemente para expressividade."


# Global LLM service instance
llm_service = LLMService()
