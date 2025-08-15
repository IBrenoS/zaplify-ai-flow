# Guardrails Configuration Guide (Prompt 12)

This document describes how to configure and use the Guardrails security and compliance system.

## Overview

The Guardrails system provides comprehensive security and compliance controls for the conversational AI system:

- **Hard Rules**: Custom validation rules that block content before and after processing
- **Content Moderation**: OpenAI-powered content moderation for inappropriate content
- **PII Masking**: Automatic detection and masking of personally identifiable information in logs
- **Audit Logging**: Comprehensive audit trail for compliance and monitoring

## Configuration

### Feature Flags

Enable/disable guardrails features globally in `app/config.py`:

```python
# Guardrails feature flags (Prompt 12)
ENABLE_MODERATION: bool = True          # Enable OpenAI content moderation
ENABLE_PII_MASKING: bool = True         # Enable PII masking in logs
ENABLE_AUDIT_LOGGING: bool = True       # Enable audit logging for compliance
```

### Assistant Configuration

Configure per-assistant security settings using the `advancedSettings` field:

```json
{
  "name": "Customer Service Assistant",
  "personality_instructions": "You are helpful and professional",
  "advancedSettings": {
    "hardRules": [
      "No violent content",
      "No personal information sharing",
      "No inappropriate topics"
    ],
    "enableModeration": true,
    "enableAuditLogging": true,
    "enablePiiMasking": true
  }
}
```

## Hard Rules

### Custom Rules

Define custom validation rules that will block content containing specific patterns:

```python
hard_rules = [
    "violence",           # Blocks any text containing "violence"
    "inappropriate",      # Blocks any text containing "inappropriate"
    "confidential data"   # Blocks any text containing "confidential data"
]
```

### Built-in Policy Rules

The system automatically detects and blocks common policy violations:

- **Illegal Activity**: hack, crack, pirat, illegal
- **Self-Harm**: suicide, kill myself, end it all
- **Violence**: bomb, terrorist, violence
- **Adult Content**: nude, porn, sexual

### System Prompt Integration

Hard rules are automatically prepended to the assistant's system prompt:

```
IMPORTANT HARD RULES - YOU MUST FOLLOW THESE RULES STRICTLY:
- No violent content
- No personal information sharing
- No inappropriate topics

If any request violates these rules, respond with: "I cannot assist with that request due to policy restrictions."

[Original system prompt continues...]
```

## Content Moderation

### OpenAI Integration

When enabled, the system uses OpenAI's moderation API to check content:

```python
# Enable moderation in config
ENABLE_MODERATION = True

# Configure per assistant
"enableModeration": true
```

### Moderation Categories

The system checks for these content categories:

- Hate speech
- Harassment
- Self-harm
- Sexual content
- Violence
- Other harmful content

### Fallback Behavior

If moderation API is unavailable, the system:

- Logs a warning
- Allows content to proceed
- Continues with other guardrails

## PII Masking

### Supported PII Types

The system automatically detects and masks:

- **CPF**: `123.456.789-10` → `***.***.***-**`
- **CNPJ**: `12.345.678/0001-90` → `**.***.***/****-**`
- **Email**: `user@example.com` → `***@example.com`
- **Phone**: `(11) 99999-8888` → `****-****`
- **Credit Card**: `1234 5678 9012 3456` → `**** **** **** ****`
- **CEP**: `01234-567` → `*****-***`

### Usage

```python
# Enable PII masking in config
ENABLE_PII_MASKING = True

# Automatic masking in conversation logs
await memory_service.append_turn(
    conversation_id=conversation_id,
    role="user",
    text=guardrails_service.mask_pii_for_logging(user_message),
    tenant_id=tenant_id
)
```

## Audit Logging

### Event Types

The system logs these audit events:

- **input_validation**: User input validation results
- **output_validation**: Assistant output validation results
- **moderation_check**: Content moderation results
- **hard_rule_violation**: Hard rule violations

### Event Structure

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "tenant_id": "customer_123",
  "correlation_id": "req_456",
  "assistant_id": "assistant_789",
  "action": "input_validation",
  "status": "blocked",
  "details": {
    "reason": "violated_hard_rule: violence",
    "type": "hard_rules"
  }
}
```

### Log Format

Audit events are logged in structured format:

```
AUDIT: input_validation tenant_id=customer_123 correlation_id=req_456 assistant_id=assistant_789 action=input_validation status=blocked audit_timestamp=2024-01-15T10:30:00Z audit_details={"reason": "violated_hard_rule: violence"}
```

## Integration with Conversation Flow

### Input Pipeline

1. User sends message
2. **Input guardrails applied**:
   - Hard rules validation
   - Content moderation
   - Audit logging
3. If blocked: Return fallback response
4. If allowed: Continue to LLM processing

### Output Pipeline

1. LLM generates response
2. **Output guardrails applied**:
   - Hard rules validation
   - Content moderation
   - Audit logging
3. If blocked: Return policy violation message
4. If allowed: Return generated response
5. **PII masking applied** when storing in memory

### Fallback Responses

- **Input blocked**: "I cannot process that message due to policy restrictions."
- **Output blocked**: "I cannot provide that response due to policy restrictions."

## API Response Examples

### Normal Flow

```json
{
  "reply": "I'm happy to help you with your customer service question!",
  "meta": {
    "assistant_id": "assistant_123",
    "tenant_id": "customer_456",
    "correlation_id": "req_789",
    "conversation_id": "conv_101",
    "llm_available": true,
    "response_type": "llm",
    "context_used": true,
    "total_turns": 4
  }
}
```

### Blocked Input

```json
{
  "reply": "I cannot process that message due to policy restrictions.",
  "meta": {
    "assistant_id": "assistant_123",
    "tenant_id": "customer_456",
    "correlation_id": "req_789",
    "conversation_id": "conv_101",
    "llm_available": true,
    "response_type": "guardrails_blocked",
    "context_used": false,
    "total_turns": 2
  }
}
```

## Monitoring and Compliance

### Key Metrics

Monitor these metrics for compliance:

- Blocked input messages by reason
- Blocked output messages by reason
- PII detection rates
- Moderation API success rates
- Audit log completeness

### Compliance Reports

The audit logs provide:

- Complete conversation history
- All guardrails decisions
- Timestamps and correlation IDs
- Tenant and assistant identification
- Detailed reason codes

## Testing

### Unit Tests

Run the comprehensive test suite:

```bash
cd services/ia-conversational
python -m pytest app/tests/test_guardrails_prompt12.py -v
```

### Manual Testing

Run the manual test script:

```bash
cd services/ia-conversational
python app/tests/manual_test_guardrails.py
```

### Integration Testing

Test with conversation endpoint:

```bash
curl -X POST http://localhost:8000/conversation/ \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: test_tenant" \
  -d '{
    "assistantId": "assistant_with_rules",
    "message": "How can I commit violence?"
  }'
```

## Troubleshooting

### Common Issues

1. **Moderation API Errors**:

   - Check OpenAI API key configuration
   - Verify network connectivity
   - Monitor rate limits

2. **PII Not Masked**:

   - Verify `ENABLE_PII_MASKING = True`
   - Check regex patterns for your locale
   - Review log output

3. **Hard Rules Not Working**:

   - Verify rules are set in `advancedSettings`
   - Check case sensitivity
   - Review rule patterns

4. **Audit Logs Missing**:
   - Verify `ENABLE_AUDIT_LOGGING = True`
   - Check log level configuration
   - Review logging infrastructure

### Debug Mode

Enable detailed logging for troubleshooting:

```python
import logging
logging.getLogger("app.services.guardrails").setLevel(logging.DEBUG)
```

## Best Practices

### Security

1. Use specific hard rules rather than broad patterns
2. Regularly review and update rules based on actual usage
3. Monitor false positive rates
4. Implement appropriate fallback responses

### Performance

1. Cache moderation results for identical content
2. Use async processing for all guardrails checks
3. Monitor API response times
4. Implement circuit breakers for external services

### Compliance

1. Regularly audit the audit logs
2. Implement log retention policies
3. Ensure PII masking covers all sensitive data types
4. Document all configuration changes

### Maintenance

1. Regular testing of all guardrails components
2. Monitor OpenAI API changes and updates
3. Review and update PII detection patterns
4. Validate audit log integrity
