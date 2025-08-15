"""
Simple Kafka Event Schema Demo
Shows the event envelope format and serialization
"""

import json

from app.events.schemas import (
    MessageGeneratedEvent,
    MessageGeneratedEventData,
    MessageReceivedEvent,
    MessageReceivedEventData,
)


def demo_event_schemas():
    """Demonstrate event schema structure and serialization"""
    print("🚀 Kafka Event Schema Demo")
    print("=" * 50)

    # Demo message received event
    print("\n📥 MESSAGE RECEIVED EVENT")
    print("-" * 30)

    received_event = MessageReceivedEvent(
        tenant_id="customer-abc",
        correlation_id="req-12345",
        data=MessageReceivedEventData(
            conversation_id="conv-789",
            message_id="msg-456",
            text="I need help with my business strategy",
            assistant_id="business-advisor",
            channel="whatsapp",
            user_id="user-123",
            meta={"priority": "high", "language": "en"},
        ),
    )

    print("Event Structure:")
    print(f"  📋 Event Name: {received_event.event_name}")
    print(f"  🏢 Tenant ID: {received_event.tenant_id}")
    print(f"  🔗 Correlation ID: {received_event.correlation_id}")
    print(f"  🕒 Timestamp: {received_event.timestamp}")
    print(f"  🏷️ Source: {received_event.source}")
    print(f"  💬 Message: {received_event.data.text}")
    print(f"  📱 Channel: {received_event.data.channel}")

    # Serialize to JSON
    event_json = json.dumps(received_event.model_dump(), default=str, indent=2)
    print(f"\nJSON (first 200 chars):\n{event_json[:200]}...")

    # Demo message generated event
    print("\n\n📤 MESSAGE GENERATED EVENT")
    print("-" * 30)

    generated_event = MessageGeneratedEvent(
        tenant_id="customer-abc",
        correlation_id="req-12345",
        data=MessageGeneratedEventData(
            conversation_id="conv-789",
            message_id="response-321",
            text="I'd be happy to help with your business strategy! Let's start by understanding your current goals...",
            assistant_id="business-advisor",
            processing_time_ms=250,
            tokens_used=45,
            model_name="gpt-4",
            has_historical_context=True,
            meta={"confidence": 0.95, "intent": "business_advice"},
        ),
    )

    print("Event Structure:")
    print(f"  📋 Event Name: {generated_event.event_name}")
    print(f"  🏢 Tenant ID: {generated_event.tenant_id}")
    print(f"  🔗 Correlation ID: {generated_event.correlation_id}")
    print(f"  🕒 Timestamp: {generated_event.timestamp}")
    print(f"  🏷️ Source: {generated_event.source}")
    print(f"  💬 Response: {generated_event.data.text[:50]}...")
    print(f"  ⚡ Processing Time: {generated_event.data.processing_time_ms}ms")
    print(f"  🧠 Model: {generated_event.data.model_name}")
    print(f"  📚 Has History: {generated_event.data.has_historical_context}")

    # Serialize to JSON
    response_json = json.dumps(generated_event.model_dump(), default=str, indent=2)
    print(f"\nJSON (first 200 chars):\n{response_json[:200]}...")

    # Demo configuration
    print("\n\n⚙️ CONFIGURATION")
    print("-" * 20)
    print("Environment Variables:")
    print("  ENABLE_KAFKA=true")
    print("  KAFKA_BROKER=redpanda:9092")
    print("  KAFKA_MESSAGE_RECEIVED_TOPIC=conversation.message_received")
    print("  KAFKA_MESSAGE_GENERATED_TOPIC=conversation.message_generated")

    print("\n✅ Demo completed! Events ready for Kafka/Redpanda integration")


if __name__ == "__main__":
    demo_event_schemas()
