"""
Conversation endpoints with personality-driven responses and memory management
Implements Prompt 4 + Prompt 9: assistantId + message → reply + meta with conversation context
"""

import uuid

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel

from app.api.assistants import get_tenant_storage
from app.core.logging import log_error, log_info
from app.core.metrics import (
    increment_errors,
    increment_messages_processed,
    measure_response_time,
)
from app.services.guardrails import guardrails_service
from app.services.history_index import history_index_service
from app.services.llm_service import llm_service
from app.services.memory_service import memory_service

router = APIRouter(prefix="/conversation", tags=["conversation"])


# Conversation request schema matching Prompt 4 requirements


class ConversationRequest(BaseModel):
    """Conversation request matching Prompt 4 spec with optional conversation_id for Prompt 9"""

    assistantId: str
    message: str
    conversation_id: str | None = None  # Optional for conversation continuity


class ConversationMeta(BaseModel):
    """Conversation metadata"""

    assistant_id: str
    tenant_id: str
    correlation_id: str
    conversation_id: str
    llm_available: bool
    response_type: str  # "llm" or "fallback"
    context_used: bool  # Whether conversation context was used
    total_turns: int  # Total turns in conversation


class ConversationResponseV4(BaseModel):
    """Conversation response matching Prompt 4 spec with Prompt 9 enhancements"""

    reply: str
    meta: ConversationMeta


@router.post("/", response_model=ConversationResponseV4)
async def conversation(
    request: ConversationRequest, req: Request
) -> ConversationResponseV4:
    """
    Send message to assistant and get personality-driven response
    Prompt 4 + 9 implementation: { assistantId, message, conversation_id? } → { reply, meta }

    Enhancements from Prompt 9:
    - Memory persistence with Redis/fallback
    - Context building (last N turns + summary)
    - Automatic conversation ID generation
    """

    correlation_id = getattr(req.state, "correlation_id", "unknown")
    tenant_id = getattr(req.state, "tenant_id", "demo")

    # Generate conversation ID if not provided
    conversation_id = request.conversation_id or str(uuid.uuid4())

    # Metrics: measure response time for conversation endpoint
    with measure_response_time("conversation", "POST", tenant_id):
        try:
            # Load AssistantConfig by assistantId from tenant storage
            tenant_storage = get_tenant_storage(tenant_id)

            if request.assistantId not in tenant_storage:
                increment_errors("conversation", "assistant_not_found", tenant_id)
                log_error(
                    f"Assistant not found: {request.assistantId}",
                    correlation_id=correlation_id,
                    tenant_id=tenant_id,
                    assistant_id=request.assistantId,
                )
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Assistant not found"
                )

            # Get assistant configuration
            from app.schemas.assistant import AssistantConfig

            config_data = tenant_storage[request.assistantId]
            assistant_config = AssistantConfig(**config_data)

            log_info(
                f"Processing conversation with assistant: {assistant_config.name}",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                assistant_id=request.assistantId,
                conversation_id=conversation_id,
                message_length=len(request.message),
            )

            # Apply input guardrails (Prompt 12) if configured
            advanced_settings = getattr(assistant_config, "advancedSettings", None)
            if advanced_settings:
                hard_rules = getattr(advanced_settings, "hardRules", [])

                input_guardrails_result = (
                    await guardrails_service.apply_input_guardrails(
                        text=request.message,
                        hard_rules=hard_rules,
                        tenant_id=tenant_id,
                        correlation_id=correlation_id,
                        assistant_id=request.assistantId,
                    )
                )

                if input_guardrails_result.is_blocked:
                    log_info(
                        f"Input blocked by guardrails: {input_guardrails_result.reason}",
                        correlation_id=correlation_id,
                        tenant_id=tenant_id,
                        assistant_id=request.assistantId,
                        conversation_id=conversation_id,
                    )

                    # Return fallback response
                    fallback_reply = (
                        "I cannot process that message due to policy restrictions."
                    )

                    # Still save to memory for audit trail
                    await memory_service.append_turn(
                        conversation_id=conversation_id,
                        role="user",
                        text=guardrails_service.mask_pii_for_logging(request.message),
                        tenant_id=tenant_id,
                    )

                    await memory_service.append_turn(
                        conversation_id=conversation_id,
                        role="assistant",
                        text=fallback_reply,
                        tenant_id=tenant_id,
                    )

                    # Build metadata for blocked response
                    meta = ConversationMeta(
                        assistant_id=request.assistantId,
                        tenant_id=tenant_id,
                        correlation_id=correlation_id,
                        conversation_id=conversation_id,
                        llm_available=llm_service.is_available(),
                        response_type="guardrails_blocked",
                        context_used=False,
                        total_turns=2,
                    )

                    return ConversationResponseV4(reply=fallback_reply, meta=meta)

            # Append user turn to memory first (with PII masking if enabled)
            await memory_service.append_turn(
                conversation_id=conversation_id,
                role="user",
                text=guardrails_service.mask_pii_for_logging(request.message),
                tenant_id=tenant_id,
            )

            # Get conversation context for prompt building
            context = await memory_service.get_context(
                conversation_id=conversation_id, tenant_id=tenant_id
            )

            # Build enhanced prompt with personality, objectives, KB brief, and context
            # Include hard rules in system prompt if configured
            enhanced_message = await _build_context_prompt(
                user_message=request.message,
                assistant_config=assistant_config,
                context=context,
                tenant_id=tenant_id,
            )

            log_info(
                "Context built for conversation",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                conversation_id=conversation_id,
                context_turns=len(context.get("turns", [])),
                has_summary=context.get("summary") is not None,
                total_turns=context.get("total_turns", 0),
            )

            # Generate reply using personality-driven LLM service with context
            reply = await llm_service.generate_reply(
                text=enhanced_message,
                assistant_config=assistant_config,
                correlation_id=correlation_id,
                tenant_id=tenant_id,
            )

            # Apply output guardrails (Prompt 12) if configured
            if advanced_settings:
                hard_rules = getattr(advanced_settings, "hardRules", [])

                output_guardrails_result = (
                    await guardrails_service.apply_output_guardrails(
                        text=reply,
                        hard_rules=hard_rules,
                        tenant_id=tenant_id,
                        correlation_id=correlation_id,
                        assistant_id=request.assistantId,
                    )
                )

                if output_guardrails_result.is_blocked:
                    log_info(
                        f"Output blocked by guardrails: {output_guardrails_result.reason}",
                        correlation_id=correlation_id,
                        tenant_id=tenant_id,
                        assistant_id=request.assistantId,
                        conversation_id=conversation_id,
                    )

                    # Use the fallback response
                    reply = (
                        output_guardrails_result.modified_content
                        or "I cannot provide that response due to policy restrictions."
                    )

            # Append assistant turn to memory (with PII masking if enabled)
            await memory_service.append_turn(
                conversation_id=conversation_id,
                role="assistant",
                text=guardrails_service.mask_pii_for_logging(reply),
                tenant_id=tenant_id,
            )

            # Determine response type
            response_type = "llm" if llm_service.is_available() else "fallback"

            # Build metadata
            meta = ConversationMeta(
                assistant_id=request.assistantId,
                tenant_id=tenant_id,
                correlation_id=correlation_id,
                conversation_id=conversation_id,
                llm_available=llm_service.is_available(),
                response_type=response_type,
                context_used=context.get("has_history", False),
                total_turns=context.get("total_turns", 0)
                + 2,  # +2 for current exchange
            )

            # Build response
            response = ConversationResponseV4(reply=reply, meta=meta)

            # Metrics: increment successful message processing
            increment_messages_processed(tenant_id, assistant_config.name)

            # Publish message generated event to Kafka
            try:
                from app.events.kafka import kafka_manager

                response_message_id = str(uuid.uuid4())
                await kafka_manager.publish_message_generated(
                    conversation_id=conversation_id,
                    message_id=response_message_id,
                    text=reply,
                    assistant_id=request.assistantId,
                    tenant_id=tenant_id,
                    correlation_id=correlation_id,
                    processing_time_ms=None,  # Could be calculated if needed
                    tokens_used=None,  # Could be added to LLM service
                    model_name=None,  # Could be added to LLM service
                    has_historical_context=context.get("has_historical_context", False),
                    meta={
                        "response_type": response_type,
                        "total_turns": meta.total_turns,
                        "assistant_name": assistant_config.name,
                    },
                )
            except Exception as kafka_error:
                # Don't fail the request if Kafka publishing fails
                log_error(
                    f"Failed to publish Kafka event: {kafka_error}",
                    correlation_id=correlation_id,
                    tenant_id=tenant_id,
                    conversation_id=conversation_id,
                )

            log_info(
                "Conversation processed successfully",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                assistant_id=request.assistantId,
                conversation_id=conversation_id,
                assistant_name=assistant_config.name,
                response_type=response_type,
                reply_length=len(reply),
                context_used=meta.context_used,
                total_turns=meta.total_turns,
            )

            return response

        except HTTPException:
            raise
        except Exception as e:
            increment_errors("conversation", "processing_error", tenant_id)
            log_error(
                f"Conversation processing failed: {e}",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                assistant_id=request.assistantId,
                conversation_id=conversation_id,
                error_type=type(e).__name__,
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to process conversation",
            ) from e


async def _build_context_prompt(
    user_message: str, assistant_config, context: dict, tenant_id: str
) -> str:
    """
    Build enhanced prompt with personality, objectives, KB brief, conversation context,
    historical conversation insights (Prompt 10), and hard rules (Prompt 12)

    Format:
    - Hard rules (if configured)
    - Personality and objectives
    - Knowledge base context (brief)
    - Historical conversation insights (if enabled)
    - Conversation history (if any)
    - Current user message
    """
    try:
        # Start with personality and objectives
        prompt_parts = []

        # Hard rules (Prompt 12) - prepend to system prompt for enforcement
        advanced_settings = getattr(assistant_config, "advancedSettings", None)
        if advanced_settings:
            hard_rules = getattr(advanced_settings, "hardRules", [])
            if hard_rules:
                from app.services.guardrails import guardrails_service

                rules_prompt = guardrails_service.build_system_prompt_with_rules(
                    "", hard_rules
                )
                if rules_prompt.strip():
                    prompt_parts.append(rules_prompt)

        # Personality instructions
        if assistant_config.personality_instructions:
            prompt_parts.append(
                f"Assistant Personality: {assistant_config.personality_instructions}"
            )

        if assistant_config.selected_archetype:
            prompt_parts.append(
                f"Communication Style: {assistant_config.selected_archetype.value}"
            )

        # Objectives and capabilities
        if assistant_config.objective:
            prompt_parts.append(f"Primary Objective: {assistant_config.objective}")

        capabilities = []
        if assistant_config.can_schedule:
            capabilities.append("schedule appointments")
        if assistant_config.can_sell:
            capabilities.append("handle sales processes")
        if assistant_config.can_qualify:
            capabilities.append("qualify leads")
        if assistant_config.can_capture_data:
            capabilities.append("capture customer data")

        if capabilities:
            prompt_parts.append(f"Capabilities: Can {', '.join(capabilities)}")

        # Knowledge base context (brief)
        kb_context = []
        if assistant_config.product_service:
            kb_context.append(
                f"Product/Service: {assistant_config.product_service[:200]}..."
            )
        if assistant_config.main_benefits:
            kb_context.append(
                f"Main Benefits: {assistant_config.main_benefits[:200]}..."
            )
        if assistant_config.target_audience:
            kb_context.append(f"Target Audience: {assistant_config.target_audience}")

        if kb_context:
            prompt_parts.append("Knowledge Base Context:")
            prompt_parts.extend(kb_context)

        # Historical conversation insights (Prompt 10)
        history_insights = []
        if (
            hasattr(assistant_config, "externalSources")
            and assistant_config.externalSources.previousConversations
        ):
            try:
                # Search for similar historical conversations
                similar_history = await history_index_service.search_similar_history(
                    query=user_message,
                    tenant_id=tenant_id,
                    assistant_id=assistant_config.id or "default",
                )

                if similar_history:
                    prompt_parts.append("\nRelevant Past Conversation Insights:")
                    for i, insight in enumerate(
                        similar_history[:3], 1
                    ):  # Limit to 3 insights
                        similarity = insight.get("similarity", 0)
                        content = insight.get("content", "")[
                            :300
                        ]  # Truncate for brevity
                        prompt_parts.append(
                            f"Insight {i} (similarity: {similarity:.2f}): {content}..."
                        )

                    log_info(
                        f"Added {len(similar_history)} historical insights to prompt",
                        tenant_id=tenant_id,
                        assistant_id=assistant_config.id,
                    )

            except Exception as e:
                log_error(
                    f"Failed to retrieve historical insights: {e}", tenant_id=tenant_id
                )
                # Continue without historical insights

        # Conversation context (last N turns + summary)
        if context.get("has_history"):
            prompt_parts.append("\nCurrent Conversation History:")

            # Add summary if available
            if context.get("summary"):
                prompt_parts.append(f"Previous Summary: {context['summary']}")

            # Add recent turns
            for turn in context.get("turns", []):
                role = turn["role"].title()
                content = turn["content"]
                prompt_parts.append(f"{role}: {content}")

        # Current user message
        prompt_parts.append(f"\nCurrent User Message: {user_message}")

        # Instructions for response
        prompt_parts.append(
            "\nPlease respond as the assistant, maintaining the personality and using all the context above:"
        )

        enhanced_prompt = "\n".join(prompt_parts)

        log_info(
            "Context prompt built",
            tenant_id=tenant_id,
            prompt_length=len(enhanced_prompt),
            has_personality=bool(assistant_config.personality_instructions),
            has_kb_context=len(kb_context) > 0,
            has_conversation_history=context.get("has_history", False),
            has_historical_insights=len(history_insights) > 0,
            has_hard_rules=advanced_settings
            and bool(getattr(advanced_settings, "hardRules", [])),
            context_turns=len(context.get("turns", [])),
        )

        return enhanced_prompt

    except Exception as e:
        log_error(f"Failed to build context prompt: {e}")
        # Fallback to simple message
        return user_message


# New utility endpoints for Prompt 9


@router.get("/{conversation_id}", response_model=dict)
async def get_conversation(conversation_id: str, req: Request):
    """
    Get conversation turns and summary
    Prompt 9 requirement: GET /conversations/{id} → returns turns + summary
    """
    correlation_id = getattr(req.state, "correlation_id", "unknown")
    tenant_id = getattr(req.state, "tenant_id", "demo")

    try:
        log_info(
            f"Getting conversation: {conversation_id}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            conversation_id=conversation_id,
        )

        # Get conversation context
        context = await memory_service.get_context(
            conversation_id=conversation_id,
            tenant_id=tenant_id,
            last_n=50,  # Get more turns for full view
        )

        if not context.get("has_history"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
            )

        response = {
            "conversation_id": conversation_id,
            "turns": context.get("turns", []),
            "summary": context.get("summary"),
            "total_turns": context.get("total_turns", 0),
            "created_at": context.get("created_at"),
            "updated_at": context.get("updated_at"),
        }

        log_info(
            "Conversation retrieved",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            conversation_id=conversation_id,
            total_turns=response["total_turns"],
            has_summary=response["summary"] is not None,
        )

        return response

    except HTTPException:
        raise
    except Exception as e:
        log_error(
            f"Failed to get conversation: {e}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            conversation_id=conversation_id,
            error_type=type(e).__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve conversation",
        ) from e


@router.delete("/{conversation_id}")
async def delete_conversation(conversation_id: str, req: Request):
    """
    Clear conversation memory
    Prompt 9 requirement: DELETE /conversations/{id} → clears memory (cache + banco)
    """
    correlation_id = getattr(req.state, "correlation_id", "unknown")
    tenant_id = getattr(req.state, "tenant_id", "demo")

    try:
        log_info(
            f"Deleting conversation: {conversation_id}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            conversation_id=conversation_id,
        )

        # Clear conversation memory
        success = await memory_service.clear_conversation(
            tenant_id=tenant_id, conversation_id=conversation_id
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or could not be deleted",
            )

        log_info(
            "Conversation deleted successfully",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            conversation_id=conversation_id,
        )

        return {
            "message": "Conversation deleted successfully",
            "conversation_id": conversation_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        log_error(
            f"Failed to delete conversation: {e}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            conversation_id=conversation_id,
            error_type=type(e).__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete conversation",
        ) from e
