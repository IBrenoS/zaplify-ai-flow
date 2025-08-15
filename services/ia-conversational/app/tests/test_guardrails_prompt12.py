"""
Test suite for Guardrails implementation (Prompt 12)
Tests hardRules, content moderation, PII masking, and audit logging
"""

from unittest.mock import AsyncMock, Mock, patch

import pytest

from app.services.guardrails import (
    AuditLogger,
    GuardrailsService,
    HardRulesValidator,
    ModerationResult,
    ModerationService,
    PIIMasker,
)


class TestPIIMasker:
    """Test PII detection and masking"""

    def setup_method(self):
        self.masker = PIIMasker()

    def test_mask_cpf(self):
        """Test CPF masking"""
        text = "Meu CPF é 123.456.789-10"
        masked = self.masker.mask_pii(text)
        assert "***.***.***-**" in masked
        assert "123.456.789-10" not in masked

    def test_mask_cnpj(self):
        """Test CNPJ masking"""
        text = "CNPJ da empresa: 12.345.678/0001-90"
        masked = self.masker.mask_pii(text)
        assert "**.***.***/****-**" in masked
        assert "12.345.678/0001-90" not in masked

    def test_mask_email(self):
        """Test email masking"""
        text = "Email: user@example.com"
        masked = self.masker.mask_pii(text)
        assert "***@example.com" in masked
        assert "user@example.com" not in masked

    def test_mask_phone(self):
        """Test phone masking"""
        text = "Telefone: (11) 99999-8888"
        masked = self.masker.mask_pii(text)
        assert "****-****" in masked
        assert "99999-8888" not in masked

    def test_mask_credit_card(self):
        """Test credit card masking"""
        text = "Cartão: 1234 5678 9012 3456"
        masked = self.masker.mask_pii(text)
        assert "**** **** **** ****" in masked
        assert "1234 5678 9012 3456" not in masked

    def test_mask_cep(self):
        """Test CEP masking"""
        text = "CEP: 01234-567"
        masked = self.masker.mask_pii(text)
        assert "*****-***" in masked
        assert "01234-567" not in masked

    def test_multiple_pii_types(self):
        """Test masking multiple PII types in same text"""
        text = "CPF: 123.456.789-10, Email: user@test.com, Telefone: 11999998888"
        masked = self.masker.mask_pii(text)

        assert "***.***.***-**" in masked
        assert "***@test.com" in masked
        assert "****-****" in masked

        assert "123.456.789-10" not in masked
        assert "user@test.com" not in masked

    def test_contains_pii(self):
        """Test PII detection"""
        text = "Meu CPF é 123.456.789-10 e email user@test.com"
        found_pii = self.masker.contains_pii(text)

        assert "cpf" in found_pii
        assert "email" in found_pii
        assert len(found_pii) == 2

    def test_no_pii(self):
        """Test text without PII"""
        text = "Olá, como você está hoje?"
        masked = self.masker.mask_pii(text)
        found_pii = self.masker.contains_pii(text)

        assert masked == text
        assert found_pii == []


class TestHardRulesValidator:
    """Test hard rules validation"""

    def setup_method(self):
        self.validator = HardRulesValidator()

    def test_validate_with_no_rules(self):
        """Test validation with no rules"""
        is_valid, reason = self.validator.validate_hard_rules("Hello world", [])
        assert is_valid is True
        assert reason is None

    def test_validate_custom_rule_violation(self):
        """Test custom rule violation"""
        rules = ["prohibited_word", "banned_term"]
        text = "This contains a prohibited_word in it"

        is_valid, reason = self.validator.validate_hard_rules(text, rules)
        assert is_valid is False
        assert "violated_hard_rule: prohibited_word" in reason

    def test_validate_policy_violation(self):
        """Test built-in policy violation"""
        text = "How to hack into a system"

        is_valid, reason = self.validator.validate_hard_rules(text, [])
        assert is_valid is False
        assert "violated_policy: illegal_activity" in reason

    def test_validate_self_harm_content(self):
        """Test self-harm content detection"""
        text = "I want to kill myself"

        is_valid, reason = self.validator.validate_hard_rules(text, [])
        assert is_valid is False
        assert "violated_policy: self_harm" in reason

    def test_validate_violence_content(self):
        """Test violence content detection"""
        text = "Let's make a bomb"

        is_valid, reason = self.validator.validate_hard_rules(text, [])
        assert is_valid is False
        assert "violated_policy: violence" in reason

    def test_validate_adult_content(self):
        """Test adult content detection"""
        text = "Send me some nude photos"

        is_valid, reason = self.validator.validate_hard_rules(text, [])
        assert is_valid is False
        assert "violated_policy: adult_content" in reason

    def test_validate_clean_text(self):
        """Test clean text passes validation"""
        text = "Hello, can you help me with customer service?"
        rules = ["prohibited", "banned"]

        is_valid, reason = self.validator.validate_hard_rules(text, rules)
        assert is_valid is True
        assert reason is None

    def test_build_system_rules(self):
        """Test system rules building"""
        rules = ["No violence", "No harmful content"]
        system_prompt = self.validator.build_system_rules(rules)

        assert "IMPORTANT HARD RULES" in system_prompt
        assert "No violence" in system_prompt
        assert "No harmful content" in system_prompt
        assert "policy restrictions" in system_prompt

    def test_build_system_rules_empty(self):
        """Test system rules with empty list"""
        system_prompt = self.validator.build_system_rules([])
        assert system_prompt == ""


@pytest.mark.asyncio
class TestModerationService:
    """Test content moderation service"""

    def setup_method(self):
        self.service = ModerationService()

    async def test_moderation_disabled(self):
        """Test when moderation is disabled"""
        with patch("app.services.guardrails.Config") as mock_config:
            mock_config.return_value.ENABLE_MODERATION = False
            service = ModerationService()

            result = await service.moderate_content("test content")

            assert result.is_flagged is False
            assert result.categories == {}
            assert result.category_scores == {}

    async def test_moderation_unavailable(self):
        """Test when OpenAI is unavailable"""
        with patch("app.services.guardrails.Config") as mock_config:
            mock_config.return_value.ENABLE_MODERATION = True
            service = ModerationService()
            service.openai_client = None

            result = await service.moderate_content("test content")

            assert result.is_flagged is False
            assert result.reason == "moderation_unavailable"

    async def test_moderation_flagged_content(self):
        """Test flagged content"""
        mock_openai_result = Mock()
        mock_openai_result.flagged = True
        mock_openai_result.categories.model_dump.return_value = {
            "hate": True,
            "violence": False,
        }
        mock_openai_result.category_scores.model_dump.return_value = {
            "hate": 0.8,
            "violence": 0.1,
        }

        mock_response = Mock()
        mock_response.results = [mock_openai_result]

        with patch("app.services.guardrails.Config") as mock_config:
            mock_config.return_value.ENABLE_MODERATION = True
            service = ModerationService()
            service.openai_client = Mock()
            service.openai_client.moderations.create.return_value = mock_response

            with patch("asyncio.get_event_loop") as mock_loop:
                mock_loop.return_value.run_in_executor = AsyncMock(
                    return_value=mock_response
                )

                result = await service.moderate_content("hate speech content")

                assert result.is_flagged is True
                assert "hate" in result.reason
                assert result.categories["hate"] is True
                assert result.category_scores["hate"] == 0.8

    async def test_moderation_clean_content(self):
        """Test clean content"""
        mock_openai_result = Mock()
        mock_openai_result.flagged = False
        mock_openai_result.categories.model_dump.return_value = {
            "hate": False,
            "violence": False,
        }
        mock_openai_result.category_scores.model_dump.return_value = {
            "hate": 0.1,
            "violence": 0.1,
        }

        mock_response = Mock()
        mock_response.results = [mock_openai_result]

        with patch("app.services.guardrails.Config") as mock_config:
            mock_config.return_value.ENABLE_MODERATION = True
            service = ModerationService()
            service.openai_client = Mock()

            with patch("asyncio.get_event_loop") as mock_loop:
                mock_loop.return_value.run_in_executor = AsyncMock(
                    return_value=mock_response
                )

                result = await service.moderate_content("clean content")

                assert result.is_flagged is False
                assert result.reason is None
                assert result.categories["hate"] is False

    async def test_moderation_api_error(self):
        """Test moderation API error handling"""
        with patch("app.services.guardrails.Config") as mock_config:
            mock_config.return_value.ENABLE_MODERATION = True
            service = ModerationService()
            service.openai_client = Mock()

            with patch("asyncio.get_event_loop") as mock_loop:
                mock_loop.return_value.run_in_executor = AsyncMock(
                    side_effect=Exception("API Error")
                )

                result = await service.moderate_content("test content")

                assert result.is_flagged is False
                assert result.reason == "moderation_error"


@pytest.mark.asyncio
class TestAuditLogger:
    """Test audit logging service"""

    def setup_method(self):
        self.logger = AuditLogger()

    async def test_audit_logging_disabled(self):
        """Test when audit logging is disabled"""
        with patch("app.services.guardrails.Config") as mock_config:
            mock_config.return_value.ENABLE_AUDIT_LOGGING = False
            logger = AuditLogger()

            with patch("app.services.guardrails.log_info") as mock_log:
                await logger.log_audit_event(
                    tenant_id="test",
                    correlation_id="123",
                    assistant_id="assistant1",
                    action="test_action",
                    status="success",
                )

                mock_log.assert_not_called()

    async def test_audit_logging_enabled(self):
        """Test when audit logging is enabled"""
        with patch("app.services.guardrails.Config") as mock_config:
            mock_config.return_value.ENABLE_AUDIT_LOGGING = True
            logger = AuditLogger()

            with patch("app.services.guardrails.log_info") as mock_log:
                await logger.log_audit_event(
                    tenant_id="test",
                    correlation_id="123",
                    assistant_id="assistant1",
                    action="input_validation",
                    status="blocked",
                    details={"reason": "hard_rule_violation"},
                )

                mock_log.assert_called_once()
                call_args = mock_log.call_args

                assert "AUDIT: input_validation" in call_args[0]
                assert call_args[1]["tenant_id"] == "test"
                assert call_args[1]["correlation_id"] == "123"
                assert call_args[1]["assistant_id"] == "assistant1"
                assert call_args[1]["action"] == "input_validation"
                assert call_args[1]["status"] == "blocked"
                assert call_args[1]["audit_details"]["reason"] == "hard_rule_violation"


@pytest.mark.asyncio
class TestGuardrailsService:
    """Test main guardrails service"""

    def setup_method(self):
        self.service = GuardrailsService()

    async def test_input_guardrails_blocked_by_hard_rules(self):
        """Test input blocked by hard rules"""
        with patch.object(
            self.service.hard_rules_validator, "validate_hard_rules"
        ) as mock_validate:
            mock_validate.return_value = (False, "violated_hard_rule: prohibited")

            with patch.object(
                self.service.audit_logger, "log_audit_event"
            ) as mock_audit:
                result = await self.service.apply_input_guardrails(
                    text="prohibited content",
                    hard_rules=["prohibited"],
                    tenant_id="test",
                    correlation_id="123",
                    assistant_id="assistant1",
                )

                assert result.is_blocked is True
                assert "violated_hard_rule: prohibited" in result.reason
                mock_audit.assert_called_once()

    async def test_input_guardrails_blocked_by_moderation(self):
        """Test input blocked by content moderation"""
        with patch.object(
            self.service.hard_rules_validator, "validate_hard_rules"
        ) as mock_validate:
            mock_validate.return_value = (True, None)

            with patch.object(
                self.service.moderation_service, "moderate_content"
            ) as mock_moderate:
                mock_moderate.return_value = ModerationResult(
                    is_flagged=True,
                    categories={"hate": True},
                    category_scores={"hate": 0.9},
                    reason="flagged_categories: ['hate']",
                )

                with patch.object(
                    self.service.audit_logger, "log_audit_event"
                ) as mock_audit:
                    result = await self.service.apply_input_guardrails(
                        text="hate content",
                        hard_rules=[],
                        tenant_id="test",
                        correlation_id="123",
                        assistant_id="assistant1",
                    )

                    assert result.is_blocked is True
                    assert "hate" in result.reason
                    assert result.moderation_result.is_flagged is True
                    mock_audit.assert_called_once()

    async def test_input_guardrails_allowed(self):
        """Test input allowed through guardrails"""
        with patch.object(
            self.service.hard_rules_validator, "validate_hard_rules"
        ) as mock_validate:
            mock_validate.return_value = (True, None)

            with patch.object(
                self.service.moderation_service, "moderate_content"
            ) as mock_moderate:
                mock_moderate.return_value = ModerationResult(
                    is_flagged=False, categories={}, category_scores={}
                )

                with patch.object(
                    self.service.audit_logger, "log_audit_event"
                ) as mock_audit:
                    result = await self.service.apply_input_guardrails(
                        text="clean content",
                        hard_rules=[],
                        tenant_id="test",
                        correlation_id="123",
                        assistant_id="assistant1",
                    )

                    assert result.is_blocked is False
                    assert result.reason is None
                    mock_audit.assert_called_once()

    async def test_output_guardrails_blocked_with_fallback(self):
        """Test output blocked with fallback response"""
        with patch.object(
            self.service.hard_rules_validator, "validate_hard_rules"
        ) as mock_validate:
            mock_validate.return_value = (False, "violated_hard_rule: prohibited")

            with patch.object(
                self.service.audit_logger, "log_audit_event"
            ) as mock_audit:
                result = await self.service.apply_output_guardrails(
                    text="prohibited response",
                    hard_rules=["prohibited"],
                    tenant_id="test",
                    correlation_id="123",
                    assistant_id="assistant1",
                )

                assert result.is_blocked is True
                assert "I cannot provide that response" in result.modified_content
                mock_audit.assert_called_once()

    def test_build_system_prompt_with_rules(self):
        """Test building system prompt with hard rules"""
        base_prompt = "You are a helpful assistant."
        hard_rules = ["No violence", "No harmful content"]

        enhanced_prompt = self.service.build_system_prompt_with_rules(
            base_prompt, hard_rules
        )

        assert "IMPORTANT HARD RULES" in enhanced_prompt
        assert "No violence" in enhanced_prompt
        assert "No harmful content" in enhanced_prompt
        assert base_prompt in enhanced_prompt

    def test_build_system_prompt_no_rules(self):
        """Test building system prompt without rules"""
        base_prompt = "You are a helpful assistant."

        enhanced_prompt = self.service.build_system_prompt_with_rules(base_prompt, [])

        assert enhanced_prompt == base_prompt

    def test_mask_pii_for_logging(self):
        """Test PII masking for logging"""
        with patch("app.services.guardrails.Config") as mock_config:
            mock_config.return_value.ENABLE_PII_MASKING = True
            service = GuardrailsService()

            text = "CPF: 123.456.789-10"
            masked = service.mask_pii_for_logging(text)

            assert "***.***.***-**" in masked
            assert "123.456.789-10" not in masked

    def test_mask_pii_disabled(self):
        """Test PII masking when disabled"""
        with patch("app.services.guardrails.Config") as mock_config:
            mock_config.return_value.ENABLE_PII_MASKING = False
            service = GuardrailsService()

            text = "CPF: 123.456.789-10"
            masked = service.mask_pii_for_logging(text)

            assert masked == text


@pytest.mark.asyncio
class TestGuardrailsIntegration:
    """Test guardrails integration scenarios"""

    async def test_full_pipeline_clean_content(self):
        """Test full pipeline with clean content"""
        service = GuardrailsService()

        # Mock all dependencies
        with patch.object(
            service.hard_rules_validator, "validate_hard_rules"
        ) as mock_validate:
            mock_validate.return_value = (True, None)

            with patch.object(
                service.moderation_service, "moderate_content"
            ) as mock_moderate:
                mock_moderate.return_value = ModerationResult(
                    is_flagged=False, categories={}, category_scores={}
                )

                with patch.object(service.audit_logger, "log_audit_event"):
                    # Test input guardrails
                    input_result = await service.apply_input_guardrails(
                        text="Hello, how can you help me?",
                        hard_rules=["violence", "hate"],
                        tenant_id="test",
                        correlation_id="123",
                        assistant_id="assistant1",
                    )

                    assert input_result.is_blocked is False

                    # Test output guardrails
                    output_result = await service.apply_output_guardrails(
                        text="I'm happy to help you with your questions!",
                        hard_rules=["violence", "hate"],
                        tenant_id="test",
                        correlation_id="123",
                        assistant_id="assistant1",
                    )

                    assert output_result.is_blocked is False

    async def test_full_pipeline_blocked_content(self):
        """Test full pipeline with blocked content"""
        service = GuardrailsService()

        # Mock hard rules violation
        with patch.object(
            service.hard_rules_validator, "validate_hard_rules"
        ) as mock_validate:
            mock_validate.return_value = (False, "violated_hard_rule: violence")

            with patch.object(service.audit_logger, "log_audit_event"):
                # Test input guardrails
                input_result = await service.apply_input_guardrails(
                    text="How to commit violence",
                    hard_rules=["violence"],
                    tenant_id="test",
                    correlation_id="123",
                    assistant_id="assistant1",
                )

                assert input_result.is_blocked is True
                assert "violence" in input_result.reason

                # Test output guardrails
                output_result = await service.apply_output_guardrails(
                    text="Here's how to commit violence...",
                    hard_rules=["violence"],
                    tenant_id="test",
                    correlation_id="123",
                    assistant_id="assistant1",
                )

                assert output_result.is_blocked is True
                assert (
                    "I cannot provide that response" in output_result.modified_content
                )

    def test_pii_detection_comprehensive(self):
        """Test comprehensive PII detection and masking"""
        masker = PIIMasker()

        # Complex text with multiple PII types
        text = """
        Olá, me chamo João Silva.
        Meu CPF é 123.456.789-10.
        CNPJ da empresa: 12.345.678/0001-90.
        Email: joao.silva@empresa.com.br
        Telefone: (11) 99999-8888
        Celular: +55 11 98765-4321
        Cartão de crédito: 1234 5678 9012 3456
        CEP residencial: 01234-567
        """

        # Test detection
        found_pii = masker.contains_pii(text)
        expected_types = ["cpf", "cnpj", "email", "phone", "credit_card", "cep"]

        for pii_type in expected_types:
            assert pii_type in found_pii

        # Test masking
        masked = masker.mask_pii(text)

        # Verify original PII is not present
        assert "123.456.789-10" not in masked
        assert "12.345.678/0001-90" not in masked
        assert "joao.silva@empresa.com.br" not in masked
        assert "99999-8888" not in masked
        assert "1234 5678 9012 3456" not in masked
        assert "01234-567" not in masked

        # Verify masked patterns are present
        assert "***.***.***-**" in masked
        assert "**.***.***/****-**" in masked
        assert "***@empresa.com.br" in masked
        assert "****-****" in masked
        assert "**** **** **** ****" in masked
        assert "*****-***" in masked


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])
