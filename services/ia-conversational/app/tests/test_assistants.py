"""
Test assistant CRUD endpoints with complete validation
Tests: create → get → update → list → delete + validation scenarios
"""

import uuid

from fastapi.testclient import TestClient

from app.main import app
from app.schemas.assistant import AssistantConfig, AssistantCreateRequest

client = TestClient(app)


def test_create_assistant_minimal():
    """Test creating a minimal assistant"""
    config = AssistantConfig(name="Test Assistant", description="A test assistant")

    request_data = AssistantCreateRequest(config=config)

    response = client.post(
        "/assistants/",
        json=request_data.model_dump(),
        headers={"x-tenant-id": "test-tenant"},
    )

    assert response.status_code == 201
    data = response.json()

    assert data["config"]["name"] == "Test Assistant"
    assert data["config"]["tenant_id"] == "test-tenant"
    assert data["config"]["can_qualify"] is True  # Default
    assert data["config"]["can_capture_data"] is True  # Default
    assert "id" in data
    assert data["status"] == "active"
    assert "created_at" in data["config"]
    assert "updated_at" in data["config"]


def test_create_assistant_full():
    """Test creating a full assistant with all fields"""
    config = AssistantConfig(
        name="Sales Assistant",
        description="AI assistant for sales processes",
        selected_archetype="enthusiastic",
        personality_instructions="Be energetic and helpful",
        objective="Qualify leads and schedule demos",
        can_schedule=True,
        can_sell=True,
        can_qualify=True,
        can_capture_data=True,
        product_service="CRM Software",
        main_benefits="Increase sales efficiency",
        target_audience="Small businesses",
        formality_level=6,
        detail_level=7,
        emoji_usage=4,
        whatsapp_connected=False,
    )

    request_data = AssistantCreateRequest(config=config)

    response = client.post(
        "/assistants/",
        json=request_data.model_dump(),
        headers={"x-tenant-id": "sales-tenant"},
    )

    assert response.status_code == 201
    data = response.json()

    assert data["config"]["name"] == "Sales Assistant"
    assert data["config"]["selected_archetype"] == "enthusiastic"
    assert data["config"]["formality_level"] == 6
    assert data["config"]["detail_level"] == 7
    assert data["config"]["emoji_usage"] == 4
    assert data["config"]["can_schedule"] is True
    assert data["config"]["can_sell"] is True


def test_create_assistant_validation_missing_name():
    """Test assistant creation validation - missing name"""
    invalid_config = {"config": {"description": "Missing name"}}

    response = client.post(
        "/assistants/", json=invalid_config, headers={"x-tenant-id": "test-tenant"}
    )

    assert response.status_code == 422  # Validation error


def test_create_assistant_validation_invalid_archetype():
    """Test assistant creation validation - invalid archetype"""
    config_data = {
        "config": {
            "name": "Test Assistant",
            "selected_archetype": "invalid_archetype",  # Not in enum
        }
    }

    response = client.post(
        "/assistants/", json=config_data, headers={"x-tenant-id": "test-tenant"}
    )

    assert response.status_code == 422  # Validation error


def test_create_assistant_validation_invalid_range():
    """Test assistant creation validation - invalid ranges"""
    config_data = {
        "config": {
            "name": "Test Assistant",
            "formality_level": 15,  # Out of range (1-10)
            "detail_level": 0,  # Out of range (1-10)
            "emoji_usage": -1,  # Out of range (1-10)
        }
    }

    response = client.post(
        "/assistants/", json=config_data, headers={"x-tenant-id": "test-tenant"}
    )

    assert response.status_code == 422  # Validation error


def test_create_assistant_validation_required_flags():
    """Test assistant creation validation - required flags"""
    config_data = {
        "config": {
            "name": "Test Assistant",
            "can_qualify": False,  # Must be True
            "can_capture_data": False,  # Must be True
        }
    }

    response = client.post(
        "/assistants/", json=config_data, headers={"x-tenant-id": "test-tenant"}
    )

    assert response.status_code == 422  # Validation error


def test_get_assistant():
    """Test getting an assistant by ID"""
    # First create an assistant
    config = AssistantConfig(name="Get Test Assistant")
    request_data = AssistantCreateRequest(config=config)

    create_response = client.post(
        "/assistants/",
        json=request_data.model_dump(),
        headers={"x-tenant-id": "get-test-tenant"},
    )
    assert create_response.status_code == 201
    assistant_id = create_response.json()["id"]

    # Now get it
    get_response = client.get(
        f"/assistants/{assistant_id}", headers={"x-tenant-id": "get-test-tenant"}
    )

    assert get_response.status_code == 200
    data = get_response.json()
    assert data["id"] == assistant_id
    assert data["config"]["name"] == "Get Test Assistant"


def test_get_assistant_not_found():
    """Test getting non-existent assistant"""
    fake_id = str(uuid.uuid4())
    response = client.get(
        f"/assistants/{fake_id}", headers={"x-tenant-id": "test-tenant"}
    )

    assert response.status_code == 404


def test_get_assistant_tenant_isolation():
    """Test that assistants are isolated by tenant"""
    # Create assistant in tenant A
    config = AssistantConfig(name="Tenant A Assistant")
    request_data = AssistantCreateRequest(config=config)

    create_response = client.post(
        "/assistants/",
        json=request_data.model_dump(),
        headers={"x-tenant-id": "tenant-a"},
    )
    assert create_response.status_code == 201
    assistant_id = create_response.json()["id"]

    # Try to get it from tenant B - should not find it
    get_response = client.get(
        f"/assistants/{assistant_id}", headers={"x-tenant-id": "tenant-b"}
    )

    assert get_response.status_code == 404


def test_update_assistant():
    """Test updating an assistant"""
    # Create assistant
    config = AssistantConfig(name="Original Name")
    request_data = AssistantCreateRequest(config=config)

    create_response = client.post(
        "/assistants/",
        json=request_data.model_dump(),
        headers={"x-tenant-id": "update-test-tenant"},
    )
    assert create_response.status_code == 201
    assistant_id = create_response.json()["id"]

    # Update it
    updated_config = AssistantConfig(
        name="Updated Name",
        description="Updated description",
        selected_archetype="professional",
        formality_level=8,
    )
    update_request = {"config": updated_config.model_dump()}

    update_response = client.put(
        f"/assistants/{assistant_id}",
        json=update_request,
        headers={"x-tenant-id": "update-test-tenant"},
    )

    assert update_response.status_code == 200
    data = update_response.json()
    assert data["config"]["name"] == "Updated Name"
    assert data["config"]["description"] == "Updated description"
    assert data["config"]["selected_archetype"] == "professional"
    assert data["config"]["formality_level"] == 8


def test_update_assistant_not_found():
    """Test updating non-existent assistant"""
    fake_id = str(uuid.uuid4())
    config = AssistantConfig(name="Doesn't matter")
    update_request = {"config": config.model_dump()}

    response = client.put(
        f"/assistants/{fake_id}",
        json=update_request,
        headers={"x-tenant-id": "test-tenant"},
    )

    assert response.status_code == 404


def test_delete_assistant():
    """Test deleting an assistant"""
    # Create assistant
    config = AssistantConfig(name="To Be Deleted")
    request_data = AssistantCreateRequest(config=config)

    create_response = client.post(
        "/assistants/",
        json=request_data.model_dump(),
        headers={"x-tenant-id": "delete-test-tenant"},
    )
    assert create_response.status_code == 201
    assistant_id = create_response.json()["id"]

    # Delete it
    delete_response = client.delete(
        f"/assistants/{assistant_id}", headers={"x-tenant-id": "delete-test-tenant"}
    )

    assert delete_response.status_code == 204

    # Verify it's gone
    get_response = client.get(
        f"/assistants/{assistant_id}", headers={"x-tenant-id": "delete-test-tenant"}
    )
    assert get_response.status_code == 404


def test_delete_assistant_not_found():
    """Test deleting non-existent assistant"""
    fake_id = str(uuid.uuid4())
    response = client.delete(
        f"/assistants/{fake_id}", headers={"x-tenant-id": "test-tenant"}
    )

    assert response.status_code == 404


def test_list_assistants_empty():
    """Test listing assistants when none exist"""
    response = client.get("/assistants/", headers={"x-tenant-id": "empty-tenant"})

    assert response.status_code == 200
    data = response.json()
    assert data["assistants"] == []
    assert data["total"] == 0
    assert data["page"] == 1
    assert data["page_size"] == 10
    assert data["total_pages"] == 1


def test_list_assistants_with_data():
    """Test listing assistants with data"""
    tenant_id = "list-test-tenant"

    # Create multiple assistants
    for i in range(3):
        config = AssistantConfig(name=f"Assistant {i+1}")
        request_data = AssistantCreateRequest(config=config)

        response = client.post(
            "/assistants/",
            json=request_data.model_dump(),
            headers={"x-tenant-id": tenant_id},
        )
        assert response.status_code == 201

    # List them
    response = client.get("/assistants/", headers={"x-tenant-id": tenant_id})

    assert response.status_code == 200
    data = response.json()
    assert len(data["assistants"]) == 3
    assert data["total"] == 3
    assert data["page"] == 1
    assert data["page_size"] == 10
    assert data["total_pages"] == 1


def test_list_assistants_pagination():
    """Test listing assistants with pagination"""
    tenant_id = "pagination-test-tenant"

    # Create 5 assistants
    for i in range(5):
        config = AssistantConfig(name=f"Paginated Assistant {i+1}")
        request_data = AssistantCreateRequest(config=config)

        response = client.post(
            "/assistants/",
            json=request_data.model_dump(),
            headers={"x-tenant-id": tenant_id},
        )
        assert response.status_code == 201

    # Get first page (2 items per page)
    response = client.get(
        "/assistants/?page=1&page_size=2", headers={"x-tenant-id": tenant_id}
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["assistants"]) == 2
    assert data["total"] == 5
    assert data["page"] == 1
    assert data["page_size"] == 2
    assert data["total_pages"] == 3

    # Get second page
    response = client.get(
        "/assistants/?page=2&page_size=2", headers={"x-tenant-id": tenant_id}
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["assistants"]) == 2
    assert data["page"] == 2


def test_list_assistants_tenant_isolation():
    """Test that listing is isolated by tenant"""
    # Create assistants in different tenants
    config1 = AssistantConfig(name="Tenant 1 Assistant")
    config2 = AssistantConfig(name="Tenant 2 Assistant")

    # Create in tenant 1
    response1 = client.post(
        "/assistants/",
        json=AssistantCreateRequest(config=config1).model_dump(),
        headers={"x-tenant-id": "isolation-tenant-1"},
    )
    assert response1.status_code == 201

    # Create in tenant 2
    response2 = client.post(
        "/assistants/",
        json=AssistantCreateRequest(config=config2).model_dump(),
        headers={"x-tenant-id": "isolation-tenant-2"},
    )
    assert response2.status_code == 201

    # List for tenant 1 - should only see tenant 1's assistant
    list_response1 = client.get(
        "/assistants/", headers={"x-tenant-id": "isolation-tenant-1"}
    )
    assert list_response1.status_code == 200
    data1 = list_response1.json()
    assert len(data1["assistants"]) == 1
    assert data1["assistants"][0]["config"]["name"] == "Tenant 1 Assistant"

    # List for tenant 2 - should only see tenant 2's assistant
    list_response2 = client.get(
        "/assistants/", headers={"x-tenant-id": "isolation-tenant-2"}
    )
    assert list_response2.status_code == 200
    data2 = list_response2.json()
    assert len(data2["assistants"]) == 1
    assert data2["assistants"][0]["config"]["name"] == "Tenant 2 Assistant"


def test_full_crud_cycle():
    """Test complete CRUD cycle: create → get → update → list → delete"""
    tenant_id = "crud-cycle-tenant"

    # 1. CREATE
    config = AssistantConfig(
        name="CRUD Test Assistant",
        description="Testing full cycle",
        selected_archetype="friendly",
        formality_level=5,
    )

    create_response = client.post(
        "/assistants/",
        json=AssistantCreateRequest(config=config).model_dump(),
        headers={"x-tenant-id": tenant_id},
    )
    assert create_response.status_code == 201
    assistant_id = create_response.json()["id"]

    # 2. GET
    get_response = client.get(
        f"/assistants/{assistant_id}", headers={"x-tenant-id": tenant_id}
    )
    assert get_response.status_code == 200
    assert get_response.json()["config"]["name"] == "CRUD Test Assistant"

    # 3. UPDATE
    updated_config = AssistantConfig(
        name="Updated CRUD Assistant",
        description="Updated description",
        selected_archetype="professional",
        formality_level=8,
    )

    update_response = client.put(
        f"/assistants/{assistant_id}",
        json={"config": updated_config.model_dump()},
        headers={"x-tenant-id": tenant_id},
    )
    assert update_response.status_code == 200
    assert update_response.json()["config"]["name"] == "Updated CRUD Assistant"
    assert update_response.json()["config"]["formality_level"] == 8

    # 4. LIST (verify updated assistant appears)
    list_response = client.get("/assistants/", headers={"x-tenant-id": tenant_id})
    assert list_response.status_code == 200
    assistants = list_response.json()["assistants"]
    assert len(assistants) == 1
    assert assistants[0]["config"]["name"] == "Updated CRUD Assistant"

    # 5. DELETE
    delete_response = client.delete(
        f"/assistants/{assistant_id}", headers={"x-tenant-id": tenant_id}
    )
    assert delete_response.status_code == 204

    # 6. VERIFY DELETION (list should be empty)
    final_list_response = client.get("/assistants/", headers={"x-tenant-id": tenant_id})
    assert final_list_response.status_code == 200
    assert len(final_list_response.json()["assistants"]) == 0
