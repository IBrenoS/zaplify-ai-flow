"""
Manual test script for Guardrails (Prompt 12)
Tests the complete guardrails functionality including hardRules, moderation, PII masking, and audit logging
"""

import asyncio
import os
import sys

# Add the parent directory to the path so we can import the app modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.schemas.assistant import AdvancedSettings, AssistantConfig
from app.services.guardrails import (
    AuditLogger,
    GuardrailsService,
    HardRulesValidator,
    ModerationService,
    PIIMasker,
)


async def test_pii_masking():
    """Test PII masking functionality"""
    print("\n=== Testing PII Masking ===")

    masker = PIIMasker()

    # Test cases with different PII types
    test_cases = [
        "Meu CPF é 123.456.789-10",
        "CNPJ: 12.345.678/0001-90",
        "Email: usuario@exemplo.com",
        "Telefone: (11) 99999-8888",
        "Cartão: 1234 5678 9012 3456",
        "CEP: 01234-567",
        "Dados completos: CPF 987.654.321-00, email teste@test.com, fone (21) 98765-4321",
    ]

    for i, text in enumerate(test_cases, 1):
        print(f"\nTest {i}:")
        print(f"Original: {text}")

        # Detect PII
        found_pii = masker.contains_pii(text)
        print(f"Found PII: {found_pii}")

        # Mask PII
        masked = masker.mask_pii(text)
        print(f"Masked:   {masked}")


async def test_hard_rules():
    """Test hard rules validation"""
    print("\n=== Testing Hard Rules Validation ===")

    validator = HardRulesValidator()

    # Test cases
    test_cases = [
        {
            "text": "Hello, how are you?",
            "rules": ["violence", "hate"],
            "should_pass": True,
        },
        {
            "text": "I want to learn about violence prevention",
            "rules": ["violence"],
            "should_pass": False,
        },
        {
            "text": "How to hack a system?",
            "rules": [],
            "should_pass": False,  # Built-in policy violation
        },
        {
            "text": "I'm feeling suicidal",
            "rules": [],
            "should_pass": False,  # Built-in policy violation
        },
        {
            "text": "Can you help with customer service?",
            "rules": ["prohibited_word"],
            "should_pass": True,
        },
    ]

    for i, case in enumerate(test_cases, 1):
        print(f"\nTest {i}:")
        print(f"Text: {case['text']}")
        print(f"Rules: {case['rules']}")

        is_valid, reason = validator.validate_hard_rules(case["text"], case["rules"])
        print(f"Valid: {is_valid}")
        print(f"Reason: {reason}")
        print(f"Expected: {'Pass' if case['should_pass'] else 'Fail'}")
        print(f"Result: {'✓' if is_valid == case['should_pass'] else '✗'}")

    # Test system prompt building
    print("\n--- System Prompt Building ---")
    rules = ["No violence", "No harmful content", "No inappropriate requests"]
    system_prompt = validator.build_system_rules(rules)
    print("Generated system prompt:")
    print(system_prompt)


async def test_moderation_service():
    """Test content moderation service"""
    print("\n=== Testing Content Moderation ===")

    service = ModerationService()

    # Test cases (these won't actually call OpenAI in test mode)
    test_cases = [
        "Hello, how can I help you today?",
        "I hate everyone and everything",
        "Can you provide customer support?",
        "This is extremely violent content",
    ]

    for i, text in enumerate(test_cases, 1):
        print(f"\nTest {i}:")
        print(f"Text: {text}")

        try:
            result = await service.moderate_content(text)
            print(f"Flagged: {result.is_flagged}")
            print(f"Reason: {result.reason}")
            if result.categories:
                print(f"Categories: {result.categories}")
        except Exception as e:
            print(f"Error: {e}")


async def test_audit_logging():
    """Test audit logging functionality"""
    print("\n=== Testing Audit Logging ===")

    logger = AuditLogger()

    # Test audit events
    events = [
        {
            "tenant_id": "test_tenant",
            "correlation_id": "corr_123",
            "assistant_id": "assistant_1",
            "action": "input_validation",
            "status": "success",
        },
        {
            "tenant_id": "test_tenant",
            "correlation_id": "corr_124",
            "assistant_id": "assistant_1",
            "action": "input_validation",
            "status": "blocked",
            "details": {"reason": "hard_rule_violation", "rule": "violence"},
        },
        {
            "tenant_id": "test_tenant",
            "correlation_id": "corr_125",
            "assistant_id": "assistant_1",
            "action": "output_validation",
            "status": "blocked",
            "details": {"reason": "moderation_flagged", "categories": ["hate"]},
        },
    ]

    for i, event in enumerate(events, 1):
        print(f"\nAudit Event {i}:")
        print(f"Action: {event['action']}")
        print(f"Status: {event['status']}")

        try:
            await logger.log_audit_event(**event)
            print("✓ Event logged successfully")
        except Exception as e:
            print(f"✗ Error logging event: {e}")


async def test_guardrails_service():
    """Test the main guardrails service integration"""
    print("\n=== Testing Guardrails Service Integration ===")

    service = GuardrailsService()

    # Test scenarios
    scenarios = [
        {
            "name": "Clean input",
            "text": "Hello, can you help me with customer service?",
            "hard_rules": ["violence", "hate"],
            "expected_blocked": False,
        },
        {
            "name": "Hard rule violation",
            "text": "How can I commit violence?",
            "hard_rules": ["violence"],
            "expected_blocked": True,
        },
        {
            "name": "Built-in policy violation",
            "text": "How to hack into systems?",
            "hard_rules": [],
            "expected_blocked": True,
        },
        {
            "name": "Clean response",
            "text": "I'm happy to help you with your customer service questions.",
            "hard_rules": ["inappropriate"],
            "expected_blocked": False,
        },
    ]

    for scenario in scenarios:
        print(f"\n--- {scenario['name']} ---")
        print(f"Text: {scenario['text']}")
        print(f"Rules: {scenario['hard_rules']}")

        # Test input guardrails
        print("\nInput Guardrails:")
        try:
            input_result = await service.apply_input_guardrails(
                text=scenario["text"],
                hard_rules=scenario["hard_rules"],
                tenant_id="test_tenant",
                correlation_id="test_corr",
                assistant_id="test_assistant",
            )

            print(f"Blocked: {input_result.is_blocked}")
            print(f"Reason: {input_result.reason}")
            print(
                f"Expected: {'Blocked' if scenario['expected_blocked'] else 'Allowed'}"
            )
            print(
                f"Result: {'✓' if input_result.is_blocked == scenario['expected_blocked'] else '✗'}"
            )
        except Exception as e:
            print(f"Error: {e}")

        # Test output guardrails
        print("\nOutput Guardrails:")
        try:
            output_result = await service.apply_output_guardrails(
                text=scenario["text"],
                hard_rules=scenario["hard_rules"],
                tenant_id="test_tenant",
                correlation_id="test_corr",
                assistant_id="test_assistant",
            )

            print(f"Blocked: {output_result.is_blocked}")
            print(f"Reason: {output_result.reason}")
            if output_result.modified_content:
                print(f"Modified: {output_result.modified_content}")
        except Exception as e:
            print(f"Error: {e}")


async def test_system_prompt_building():
    """Test system prompt building with hard rules"""
    print("\n=== Testing System Prompt Building ===")

    service = GuardrailsService()

    base_prompt = "You are a helpful customer service assistant."
    hard_rules = [
        "Never provide violent content",
        "Do not share personal information",
        "Avoid inappropriate topics",
    ]

    enhanced_prompt = service.build_system_prompt_with_rules(base_prompt, hard_rules)

    print("Base prompt:")
    print(base_prompt)
    print("\nHard rules:")
    for rule in hard_rules:
        print(f"- {rule}")
    print("\nEnhanced prompt:")
    print("=" * 50)
    print(enhanced_prompt)
    print("=" * 50)


async def test_assistant_config_integration():
    """Test integration with assistant configuration"""
    print("\n=== Testing Assistant Config Integration ===")

    # Create test assistant config with advanced settings
    advanced_settings = AdvancedSettings(
        hardRules=["No violence", "No hate speech", "No inappropriate content"],
        enableModeration=True,
        enableAuditLogging=True,
        enablePiiMasking=True,
    )

    assistant_config = AssistantConfig(
        name="Test Assistant",
        personality_instructions="You are a helpful and safe assistant",
        objective="Provide customer support",
        advancedSettings=advanced_settings,
    )

    print("Assistant Configuration:")
    print(f"Name: {assistant_config.name}")
    print(f"Hard Rules: {assistant_config.advancedSettings.hardRules}")
    print(f"Moderation Enabled: {assistant_config.advancedSettings.enableModeration}")
    print(
        f"Audit Logging Enabled: {assistant_config.advancedSettings.enableAuditLogging}"
    )
    print(f"PII Masking Enabled: {assistant_config.advancedSettings.enablePiiMasking}")

    # Test guardrails with this configuration
    service = GuardrailsService()

    print("\nTesting with assistant configuration:")
    test_message = "I want to discuss violence against others"

    result = await service.apply_input_guardrails(
        text=test_message,
        hard_rules=assistant_config.advancedSettings.hardRules,
        tenant_id="test_tenant",
        correlation_id="test_corr",
        assistant_id="test_assistant",
    )

    print(f"Message: {test_message}")
    print(f"Blocked: {result.is_blocked}")
    print(f"Reason: {result.reason}")


async def main():
    """Run all tests"""
    print("Starting Guardrails (Prompt 12) Manual Tests")
    print("=" * 60)

    try:
        await test_pii_masking()
        await test_hard_rules()
        await test_moderation_service()
        await test_audit_logging()
        await test_guardrails_service()
        await test_system_prompt_building()
        await test_assistant_config_integration()

        print("\n" + "=" * 60)
        print("All tests completed successfully!")

    except Exception as e:
        print(f"\nError during testing: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
