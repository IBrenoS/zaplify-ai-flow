"""
Test conversation with memory integration
"""

from fastapi.testclient import TestClient

from app.main import app


def test_conversation_with_memory():
    client = TestClient(app)

    # First, create a test assistant
    print("Creating test assistant...")
    create_response = client.post(
        "/assistants/",
        json={
            "tenant_id": "demo",
            "config": {
                "name": "Test Assistant",
                "selected_archetype": "professional",
                "personality_instructions": "You are a helpful and friendly AI assistant with great memory.",
                "objective": "Help users with their questions and tasks.",
                "product_service": "AI Assistant Service",
                "main_benefits": "Efficient problem solving and information sharing",
                "target_audience": "General users",
                "can_qualify": True,
                "can_capture_data": True,
                "formality_level": 7,
                "detail_level": 6,
                "emoji_usage": 2,
            },
        },
    )

    if create_response.status_code == 201:
        assistant_data = create_response.json()
        assistant_id = assistant_data["id"]
        print(f"Test assistant created with ID: {assistant_id}")

        # Test conversation with memory
        print("\nTesting conversation with memory...")

        # First message (creates new conversation)
        response = client.post(
            "/conversation/",
            json={
                "assistantId": assistant_id,
                "message": "Hello, my name is John and I need help with my business",
            },
        )

        print(f"First response status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f'Reply: {data["reply"]}')
            print(f'Conversation ID: {data["meta"]["conversation_id"]}')
            print(f'Context used: {data["meta"].get("context_used", False)}')
            conversation_id = data["meta"]["conversation_id"]

            # Second message (uses existing conversation)
            response2 = client.post(
                "/conversation/",
                json={
                    "assistantId": assistant_id,
                    "message": "What did I tell you about my name?",
                    "conversation_id": conversation_id,
                },
            )

            print(f"\nSecond response status: {response2.status_code}")
            if response2.status_code == 200:
                data2 = response2.json()
                print(f'Reply: {data2["reply"]}')
                print(f'Context used: {data2["meta"].get("context_used", False)}')
                print(f'Total turns: {data2["meta"].get("total_turns", 0)}')

                # Test GET conversation endpoint
                response3 = client.get(f"/conversation/{conversation_id}")
                print(f"\nGET conversation status: {response3.status_code}")
                if response3.status_code == 200:
                    data3 = response3.json()
                    print(f'Total turns in conversation: {data3["total_turns"]}')
                    print(f'Number of turns returned: {len(data3["turns"])}')
                    print(f'First turn: {data3["turns"][0]}')

                    # Test DELETE conversation endpoint
                    response4 = client.delete(f"/conversation/{conversation_id}")
                    print(f"\nDELETE conversation status: {response4.status_code}")
                    if response4.status_code == 200:
                        data4 = response4.json()
                        print(f'Delete result: {data4["message"]}')
                    else:
                        print(f"Delete error: {response4.text}")

                else:
                    print(f"GET error: {response3.text}")
            else:
                print(f"Error in second response: {response2.text}")

        else:
            print(f"Error: {response.text}")
    else:
        print(f"Failed to create assistant: {create_response.text}")


if __name__ == "__main__":
    test_conversation_with_memory()
