"""
Integration example for Prompt 11 - Kafka Event Flow
This demonstrates the complete event-driven conversation flow
"""

import asyncio

from app.events.kafka import MockKafkaManager


async def demo_event_flow():
    """
    Demonstrate complete event flow:
    1. Receive message_received event
    2. Process conversation internally
    3. Publish message_generated event
    """
    print("🚀 Starting Kafka Event Flow Demo")

    # Use mock manager for demonstration
    kafka_manager = MockKafkaManager()
    await kafka_manager.start()

    print("✅ Mock Kafka manager started")

    # Simulate receiving a message event
    print("\n📥 Simulating message_received event...")

    try:
        await kafka_manager.simulate_message_received(
            conversation_id="demo-conv-123",
            message_id="demo-msg-456",
            text="Hello, I need help with my business strategy",
            assistant_id="business-advisor",
            tenant_id="demo-tenant",
            correlation_id="demo-correlation-123",
            channel="whatsapp",
            user_id="demo-user-789",
        )

        print("✅ Message received event processed")

        # Check consumed events
        print(f"\n📊 Events consumed: {len(kafka_manager.consumed_events)}")
        if kafka_manager.consumed_events:
            consumed = kafka_manager.consumed_events[0]
            print(f"   Event: {consumed['event_name']}")
            print(f"   Conversation: {consumed['data']['conversation_id']}")
            print(f"   Text: {consumed['data']['text']}")

        # Check published events
        print(f"\n📤 Events published: {len(kafka_manager.published_events)}")
        if kafka_manager.published_events:
            published = kafka_manager.published_events[0]
            print(f"   Event: {published['event_name']}")
            print(f"   Response: {published['data']['text'][:50]}...")
            print(
                f"   Processing time: {published['data'].get('processing_time_ms', 'N/A')}ms"
            )

    except Exception as e:
        print(f"❌ Error in event processing: {e}")

    await kafka_manager.stop()
    print("\n🏁 Demo completed successfully!")


if __name__ == "__main__":
    asyncio.run(demo_event_flow())
