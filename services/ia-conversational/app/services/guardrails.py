"""
Guardrails service for security and compliance (Prompt 12)
Implements hardRules, content moderation, PII masking, and audit logging
"""

import asyncio
import re
from dataclasses import dataclass
from datetime import datetime
from typing import Any

try:
    import openai

    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    openai = None

from app.config import Config
from app.core.logging import log_error, log_info


@dataclass
class ModerationResult:
    """Result of content moderation"""

    is_flagged: bool
    categories: dict[str, bool]
    category_scores: dict[str, float]
    reason: str | None = None


@dataclass
class GuardrailsResult:
    """Result of guardrails evaluation"""

    is_blocked: bool
    reason: str | None = None
    modified_content: str | None = None
    moderation_result: ModerationResult | None = None


@dataclass
class AuditEvent:
    """Audit event for compliance logging"""

    timestamp: datetime
    tenant_id: str
    correlation_id: str
    assistant_id: str
    action: str
    status: str
    details: dict[str, Any] | None = None


class PIIMasker:
    """PII detection and masking for logs"""

    def __init__(self):
        # Regex patterns for common PII
        self.patterns = {
            "cpf": re.compile(
                r"\b\d{3}[\.\-]?\d{3}[\.\-]?\d{3}[\.\-]\d{2}\b"
            ),  # Requires at least one separator
            "cnpj": re.compile(r"\b\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}\b"),
            "email": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"),
            "phone": re.compile(
                r"\b(?:\+55\s?)?(?:\(\d{2}\)\s?)?\d{4,5}-?\d{4}\b|\b(?:11|21|31|41|51|61|71|81|85|91)\d{8,9}\b"
            ),  # Brazilian phone numbers
            "credit_card": re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b"),
            "cep": re.compile(r"\b\d{5}-?\d{3}\b"),
        }

    def mask_pii(self, text: str) -> str:
        """
        Mask PII in text for logging

        Args:
            text: Text to mask

        Returns:
            Text with PII masked
        """
        if not text:
            return text

        masked_text = text

        # Apply masking for each PII type
        for pii_type, pattern in self.patterns.items():
            if pii_type == "cpf":
                masked_text = pattern.sub("***.***.***-**", masked_text)
            elif pii_type == "cnpj":
                masked_text = pattern.sub("**.***.***/****-**", masked_text)
            elif pii_type == "email":
                masked_text = pattern.sub(
                    lambda m: f"***@{m.group().split('@')[1]}", masked_text
                )
            elif pii_type == "phone":
                masked_text = pattern.sub("****-****", masked_text)
            elif pii_type == "credit_card":
                masked_text = pattern.sub("**** **** **** ****", masked_text)
            elif pii_type == "cep":
                masked_text = pattern.sub("*****-***", masked_text)

        return masked_text

    def contains_pii(self, text: str) -> list[str]:
        """
        Check if text contains PII

        Args:
            text: Text to check

        Returns:
            List of PII types found
        """
        if not text:
            return []

        found_pii = []
        for pii_type, pattern in self.patterns.items():
            if pattern.search(text):
                found_pii.append(pii_type)

        return found_pii


class ModerationService:
    """Content moderation service"""

    def __init__(self):
        self.config = Config()
        self.openai_client = None

        if self.config.ENABLE_MODERATION and OPENAI_AVAILABLE:
            try:
                self.openai_client = openai.OpenAI()
                log_info("OpenAI moderation service initialized")
            except Exception as e:
                log_error(f"Failed to initialize OpenAI moderation: {e}")

    async def moderate_content(self, text: str) -> ModerationResult:
        """
        Moderate content using OpenAI moderation API

        Args:
            text: Text to moderate

        Returns:
            Moderation result
        """
        if not self.config.ENABLE_MODERATION:
            return ModerationResult(is_flagged=False, categories={}, category_scores={})

        if not self.openai_client:
            log_info("OpenAI moderation not available, allowing content")
            return ModerationResult(
                is_flagged=False,
                categories={},
                category_scores={},
                reason="moderation_unavailable",
            )

        try:
            # Run moderation in executor to avoid blocking
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None, lambda: self.openai_client.moderations.create(input=text)
            )

            result = response.results[0]

            flagged_categories = [
                category
                for category, flagged in result.categories.model_dump().items()
                if flagged
            ]

            return ModerationResult(
                is_flagged=result.flagged,
                categories=result.categories.model_dump(),
                category_scores=result.category_scores.model_dump(),
                reason=(
                    f"flagged_categories: {flagged_categories}"
                    if result.flagged
                    else None
                ),
            )

        except Exception as e:
            log_error(f"Moderation API error: {e}")
            # Allow content if moderation fails
            return ModerationResult(
                is_flagged=False,
                categories={},
                category_scores={},
                reason="moderation_error",
            )


class HardRulesValidator:
    """Hard rules validation service"""

    def __init__(self):
        # Common violation patterns
        self.violation_patterns = [
            (re.compile(r"\bhack(?:ing|er|ed)?\b", re.IGNORECASE), "illegal_activity"),
            (re.compile(r"\bcrack(?:ing|er|ed)?\b", re.IGNORECASE), "illegal_activity"),
            (re.compile(r"\bpirat(?:e|ed|ing)\b", re.IGNORECASE), "illegal_activity"),
            (re.compile(r"\billegal\b", re.IGNORECASE), "illegal_activity"),
            (re.compile(r"\bsuicide\b", re.IGNORECASE), "self_harm"),
            (re.compile(r"\bkill myself\b", re.IGNORECASE), "self_harm"),
            (re.compile(r"\bend it all\b", re.IGNORECASE), "self_harm"),
            (re.compile(r"\bbomb\b", re.IGNORECASE), "violence"),
            (re.compile(r"\bterrorist\b", re.IGNORECASE), "violence"),
            (re.compile(r"\bviolence\b", re.IGNORECASE), "violence"),
            (re.compile(r"\bnude\b", re.IGNORECASE), "adult_content"),
            (re.compile(r"\bporn\b", re.IGNORECASE), "adult_content"),
            (re.compile(r"\bsexual\b", re.IGNORECASE), "adult_content"),
        ]

    def validate_hard_rules(
        self, text: str, rules: list[str]
    ) -> tuple[bool, str | None]:
        """
        Validate text against hard rules

        Args:
            text: Text to validate
            rules: List of hard rules

        Returns:
            Tuple of (is_valid, violation_reason)
        """
        text_lower = text.lower()

        # Check custom rules first
        for rule in rules:
            if rule.lower() in text_lower:
                return False, f"violated_hard_rule: {rule}"

        # Always check common violation patterns regardless of custom rules
        for pattern, violation_type in self.violation_patterns:
            if pattern.search(text):
                return False, f"violated_policy: {violation_type}"

        return True, None

    def build_system_rules(self, rules: list[str]) -> str:
        """
        Build system prompt with hard rules

        Args:
            rules: List of hard rules

        Returns:
            System prompt with rules
        """
        if not rules:
            return ""

        rules_text = "\n".join(f"- {rule}" for rule in rules)

        return f"""
IMPORTANT HARD RULES - YOU MUST FOLLOW THESE RULES STRICTLY:
{rules_text}

If any request violates these rules, respond with: "I cannot assist with that request due to policy restrictions."
"""


class AuditLogger:
    """Audit logging service for compliance"""

    def __init__(self):
        self.config = Config()

    async def log_audit_event(
        self,
        tenant_id: str,
        correlation_id: str,
        assistant_id: str,
        action: str,
        status: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        """
        Log audit event for compliance

        Args:
            tenant_id: Tenant identifier
            correlation_id: Request correlation ID
            assistant_id: Assistant identifier
            action: Action performed
            status: Action status (success, blocked, error)
            details: Additional details
        """
        if not self.config.ENABLE_AUDIT_LOGGING:
            return

        event = AuditEvent(
            timestamp=datetime.utcnow(),
            tenant_id=tenant_id,
            correlation_id=correlation_id,
            assistant_id=assistant_id,
            action=action,
            status=status,
            details=details or {},
        )

        # Log structured audit event
        log_info(
            f"AUDIT: {action}",
            tenant_id=tenant_id,
            correlation_id=correlation_id,
            assistant_id=assistant_id,
            action=action,
            status=status,
            audit_timestamp=event.timestamp.isoformat(),
            audit_details=event.details,
        )

        # TODO: In production, also store in dedicated audit table/file
        # await self._store_audit_event(event)


class GuardrailsService:
    """Main guardrails service coordinating all security controls"""

    def __init__(self):
        self.config = Config()
        self.pii_masker = PIIMasker()
        self.moderation_service = ModerationService()
        self.hard_rules_validator = HardRulesValidator()
        self.audit_logger = AuditLogger()

    async def apply_input_guardrails(
        self,
        text: str,
        hard_rules: list[str],
        tenant_id: str,
        correlation_id: str,
        assistant_id: str,
    ) -> GuardrailsResult:
        """
        Apply guardrails to input text

        Args:
            text: Input text to validate
            hard_rules: Hard rules to enforce
            tenant_id: Tenant identifier
            correlation_id: Request correlation ID
            assistant_id: Assistant identifier

        Returns:
            Guardrails result
        """
        # Validate hard rules
        is_valid, violation_reason = self.hard_rules_validator.validate_hard_rules(
            text, hard_rules
        )

        if not is_valid:
            await self.audit_logger.log_audit_event(
                tenant_id=tenant_id,
                correlation_id=correlation_id,
                assistant_id=assistant_id,
                action="input_validation",
                status="blocked",
                details={"reason": violation_reason, "type": "hard_rules"},
            )

            return GuardrailsResult(is_blocked=True, reason=violation_reason)

        # Apply content moderation
        moderation_result = await self.moderation_service.moderate_content(text)

        if moderation_result.is_flagged:
            await self.audit_logger.log_audit_event(
                tenant_id=tenant_id,
                correlation_id=correlation_id,
                assistant_id=assistant_id,
                action="input_validation",
                status="blocked",
                details={
                    "reason": moderation_result.reason,
                    "type": "moderation",
                    "categories": moderation_result.categories,
                },
            )

            return GuardrailsResult(
                is_blocked=True,
                reason=moderation_result.reason,
                moderation_result=moderation_result,
            )

        # Log successful validation
        await self.audit_logger.log_audit_event(
            tenant_id=tenant_id,
            correlation_id=correlation_id,
            assistant_id=assistant_id,
            action="input_validation",
            status="success",
        )

        return GuardrailsResult(is_blocked=False, moderation_result=moderation_result)

    async def apply_output_guardrails(
        self,
        text: str,
        hard_rules: list[str],
        tenant_id: str,
        correlation_id: str,
        assistant_id: str,
    ) -> GuardrailsResult:
        """
        Apply guardrails to output text

        Args:
            text: Output text to validate
            hard_rules: Hard rules to enforce
            tenant_id: Tenant identifier
            correlation_id: Request correlation ID
            assistant_id: Assistant identifier

        Returns:
            Guardrails result with potentially modified content
        """
        # Validate hard rules
        is_valid, violation_reason = self.hard_rules_validator.validate_hard_rules(
            text, hard_rules
        )

        if not is_valid:
            await self.audit_logger.log_audit_event(
                tenant_id=tenant_id,
                correlation_id=correlation_id,
                assistant_id=assistant_id,
                action="output_validation",
                status="blocked",
                details={"reason": violation_reason, "type": "hard_rules"},
            )

            return GuardrailsResult(
                is_blocked=True,
                reason=violation_reason,
                modified_content="I cannot provide that response due to policy restrictions.",
            )

        # Apply content moderation
        moderation_result = await self.moderation_service.moderate_content(text)

        if moderation_result.is_flagged:
            await self.audit_logger.log_audit_event(
                tenant_id=tenant_id,
                correlation_id=correlation_id,
                assistant_id=assistant_id,
                action="output_validation",
                status="blocked",
                details={
                    "reason": moderation_result.reason,
                    "type": "moderation",
                    "categories": moderation_result.categories,
                },
            )

            return GuardrailsResult(
                is_blocked=True,
                reason=moderation_result.reason,
                modified_content="I cannot provide that response due to content policy restrictions.",
                moderation_result=moderation_result,
            )

        # Log successful validation
        await self.audit_logger.log_audit_event(
            tenant_id=tenant_id,
            correlation_id=correlation_id,
            assistant_id=assistant_id,
            action="output_validation",
            status="success",
        )

        return GuardrailsResult(is_blocked=False, moderation_result=moderation_result)

    def build_system_prompt_with_rules(
        self, base_prompt: str, hard_rules: list[str]
    ) -> str:
        """
        Build system prompt with hard rules prepended

        Args:
            base_prompt: Base system prompt
            hard_rules: Hard rules to prepend

        Returns:
            Enhanced system prompt
        """
        rules_prompt = self.hard_rules_validator.build_system_rules(hard_rules)

        if rules_prompt:
            return f"{rules_prompt}\n\n{base_prompt}"

        return base_prompt

    def mask_pii_for_logging(self, text: str) -> str:
        """
        Mask PII in text for secure logging

        Args:
            text: Text to mask

        Returns:
            Text with PII masked
        """
        if not self.config.ENABLE_PII_MASKING:
            return text

        return self.pii_masker.mask_pii(text)


# Global guardrails service instance
guardrails_service = GuardrailsService()
