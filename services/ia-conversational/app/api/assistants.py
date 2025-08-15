"""
Assistant CRUD endpoints with full multi-tenant support
OpenAPI documentation with examples and validation
"""

import math
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query, Request, status

from app.core.logging import log_error, log_info
from app.schemas.assistant import (
    AssistantConfig,
    AssistantCreateRequest,
    AssistantListResponse,
    AssistantResponse,
    AssistantUpdateRequest,
)
from app.services.history_index import history_index_service

router = APIRouter(prefix="/assistants", tags=["assistants"])

# In-memory storage by tenant (would be replaced by database)
# Structure: {tenant_id: {assistant_id: assistant_data}}
assistants_storage = {}


def get_tenant_storage(tenant_id: str) -> dict:
    """Get or create tenant-specific storage"""
    if tenant_id not in assistants_storage:
        assistants_storage[tenant_id] = {}
    return assistants_storage[tenant_id]


@router.post(
    "/",
    response_model=AssistantResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Assistant",
    description="Create a new AI assistant configuration with validation",
    responses={
        201: {
            "description": "Assistant created successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "config": {
                            "name": "Sales Assistant",
                            "selected_archetype": "enthusiastic",
                            "can_qualify": True,
                            "can_capture_data": True,
                        },
                        "status": "active",
                    }
                }
            },
        },
        422: {"description": "Validation error"},
    },
)
async def create_assistant(
    request: AssistantCreateRequest, req: Request
) -> AssistantResponse:
    """
    Create new assistant configuration

    - **name**: Required, 1-100 characters
    - **selected_archetype**: Must be one of: friendly, professional, enthusiastic, expert
    - **formality_level**: 1-10 scale (1=casual, 10=formal)
    - **detail_level**: 1-10 scale (1=brief, 10=detailed)
    - **emoji_usage**: 1-10 scale (1=none, 10=lots)
    - **can_qualify**: Must be True
    - **can_capture_data**: Must be True
    """
    correlation_id = getattr(req.state, "correlation_id", "unknown")
    tenant_id = getattr(req.state, "tenant_id", "demo")

    try:
        # Generate ID and set metadata
        assistant_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()

        # Update config with metadata
        config = request.config
        config.id = assistant_id
        config.tenant_id = tenant_id
        config.created_at = now
        config.updated_at = now

        # Store assistant with multi-tenant isolation
        tenant_storage = get_tenant_storage(tenant_id)
        tenant_storage[assistant_id] = config.model_dump()

        log_info(
            "Assistant stored in memory",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            assistant_id=assistant_id,
            storage_type="memory",
        )

        response = AssistantResponse(id=assistant_id, config=config, status="active")

        log_info(
            "Assistant created successfully",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            assistant_id=assistant_id,
            assistant_name=config.name,
            archetype=config.selected_archetype,
        )

        return response

    except ValueError as e:
        log_error(
            f"Assistant validation failed: {e}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            error_type="validation",
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)
        ) from e
    except Exception as e:
        log_error(
            f"Assistant creation failed: {e}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            error_type=type(e).__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create assistant",
        ) from e


@router.get(
    "/{assistant_id}",
    response_model=AssistantResponse,
    summary="Get Assistant",
    description="Retrieve assistant configuration by ID",
    responses={
        200: {"description": "Assistant found"},
        404: {"description": "Assistant not found"},
    },
)
async def get_assistant(assistant_id: str, req: Request) -> AssistantResponse:
    """Get assistant configuration by ID"""

    correlation_id = getattr(req.state, "correlation_id", "unknown")
    tenant_id = getattr(req.state, "tenant_id", "demo")

    try:
        # Look for assistant in tenant-specific storage
        tenant_storage = get_tenant_storage(tenant_id)

        if assistant_id not in tenant_storage:
            log_info(
                f"Assistant not found: {assistant_id}",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                assistant_id=assistant_id,
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Assistant not found"
            )

        config_data = tenant_storage[assistant_id]
        config = AssistantConfig(**config_data)

        response = AssistantResponse(id=assistant_id, config=config, status="active")

        log_info(
            f"Assistant retrieved: {assistant_id}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            assistant_id=assistant_id,
            assistant_name=config.name,
        )

        return response

    except HTTPException:
        raise
    except Exception as e:
        log_error(
            f"Assistant retrieval failed: {e}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            assistant_id=assistant_id,
            error_type=type(e).__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve assistant",
        ) from e


@router.put(
    "/{assistant_id}",
    response_model=AssistantResponse,
    summary="Update Assistant",
    description="Update entire assistant configuration",
    responses={
        200: {"description": "Assistant updated successfully"},
        404: {"description": "Assistant not found"},
        422: {"description": "Validation error"},
    },
)
async def update_assistant(
    assistant_id: str, request: AssistantUpdateRequest, req: Request
) -> AssistantResponse:
    """Update assistant configuration (full document replacement)"""

    correlation_id = getattr(req.state, "correlation_id", "unknown")
    tenant_id = getattr(req.state, "tenant_id", "demo")

    try:
        tenant_storage = get_tenant_storage(tenant_id)

        # Check if assistant exists in tenant storage
        if assistant_id not in tenant_storage:
            log_info(
                f"Assistant not found for update: {assistant_id}",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                assistant_id=assistant_id,
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Assistant not found"
            )

        # Update config
        config = request.config
        config.id = assistant_id
        config.tenant_id = tenant_id
        config.updated_at = datetime.utcnow().isoformat()

        # Preserve created_at
        existing = tenant_storage[assistant_id]
        config.created_at = existing.get("created_at")

        tenant_storage[assistant_id] = config.model_dump()

        response = AssistantResponse(id=assistant_id, config=config, status="active")

        log_info(
            f"Assistant updated: {assistant_id}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            assistant_id=assistant_id,
            assistant_name=config.name,
        )

        return response

    except HTTPException:
        raise
    except ValueError as e:
        log_error(
            f"Assistant update validation failed: {e}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            assistant_id=assistant_id,
            error_type="validation",
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)
        ) from e
    except Exception as e:
        log_error(
            f"Assistant update failed: {e}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            assistant_id=assistant_id,
            error_type=type(e).__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update assistant",
        ) from e


@router.delete(
    "/{assistant_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Assistant",
    description="Delete assistant configuration",
    responses={
        204: {"description": "Assistant deleted successfully"},
        404: {"description": "Assistant not found"},
    },
)
async def delete_assistant(assistant_id: str, req: Request):
    """Delete assistant configuration"""

    correlation_id = getattr(req.state, "correlation_id", "unknown")
    tenant_id = getattr(req.state, "tenant_id", "demo")

    try:
        tenant_storage = get_tenant_storage(tenant_id)

        if assistant_id not in tenant_storage:
            log_info(
                f"Assistant not found for deletion: {assistant_id}",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                assistant_id=assistant_id,
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Assistant not found"
            )

        del tenant_storage[assistant_id]

        log_info(
            f"Assistant deleted: {assistant_id}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            assistant_id=assistant_id,
        )

    except HTTPException:
        raise
    except Exception as e:
        log_error(
            f"Assistant deletion failed: {e}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            assistant_id=assistant_id,
            error_type=type(e).__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete assistant",
        ) from e


@router.get(
    "/",
    response_model=AssistantListResponse,
    summary="List Assistants",
    description="List all assistants for the tenant with pagination",
    responses={
        200: {
            "description": "List of assistants",
            "content": {
                "application/json": {
                    "example": {
                        "assistants": [
                            {
                                "id": "123e4567-e89b-12d3-a456-426614174000",
                                "config": {"name": "Support Assistant"},
                                "status": "active",
                            }
                        ],
                        "total": 1,
                        "page": 1,
                        "page_size": 10,
                        "total_pages": 1,
                    }
                }
            },
        }
    },
)
async def list_assistants(
    req: Request,
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page (1-100)"),
) -> AssistantListResponse:
    """
    List all assistants for the current tenant with pagination

    - **page**: Page number (starting from 1)
    - **page_size**: Number of items per page (1-100)
    """
    correlation_id = getattr(req.state, "correlation_id", "unknown")
    tenant_id = getattr(req.state, "tenant_id", "demo")

    try:
        tenant_storage = get_tenant_storage(tenant_id)

        # Get all assistants for this tenant
        all_assistants = []
        for assistant_id, config_data in tenant_storage.items():
            config = AssistantConfig(**config_data)
            assistant_response = AssistantResponse(
                id=assistant_id, config=config, status="active"
            )
            all_assistants.append(assistant_response)

        # Sort by created_at (newest first)
        all_assistants.sort(key=lambda x: x.config.created_at or "", reverse=True)

        # Calculate pagination
        total = len(all_assistants)
        total_pages = math.ceil(total / page_size) if total > 0 else 1

        # Apply pagination
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        assistants = all_assistants[start_idx:end_idx]

        response = AssistantListResponse(
            assistants=assistants,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

        log_info(
            f"Listed {len(assistants)} assistants (page {page})",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            total_assistants=total,
            page=page,
            page_size=page_size,
        )

        return response

    except HTTPException:
        raise
    except Exception as e:
        log_error(
            f"Assistant listing failed: {e}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            error_type=type(e).__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list assistants",
        ) from e


# Prompt 10 - History Reindexing Endpoint
@router.post(
    "/{assistant_id}/reindex-history",
    response_model=dict,
    summary="Reindex Historical Conversations",
    description="Manually trigger reindexing of historical conversations for improved responses",
    responses={
        200: {
            "description": "Reindex operation completed",
            "content": {
                "application/json": {
                    "example": {
                        "message": "History reindex completed successfully",
                        "assistant_id": "123e4567-e89b-12d3-a456-426614174000",
                        "stats": {
                            "conversations_processed": 15,
                            "chunks_created": 45,
                            "chunks_indexed": 45,
                            "errors": 0,
                            "duration_seconds": 12.34,
                        },
                    }
                }
            },
        },
        404: {"description": "Assistant not found"},
        500: {"description": "Internal server error"},
    },
)
async def reindex_assistant_history(
    assistant_id: str, req: Request, force: bool = False
):
    """
    Manually trigger reindexing of historical conversations for an assistant

    This endpoint scans historical conversation data and creates embeddings
    for similarity search to enhance future responses with relevant past insights.

    **Prompt 10 Implementation**: Enables learning from previous conversations
    when `externalSources.previousConversations=true` is set on the assistant.
    """
    correlation_id = getattr(req.state, "correlation_id", "unknown")
    tenant_id = getattr(req.state, "tenant_id", "demo")

    try:
        log_info(
            "Manual history reindex requested",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            assistant_id=assistant_id,
            force=force,
        )

        # Verify assistant exists
        tenant_storage = get_tenant_storage(tenant_id)
        if assistant_id not in tenant_storage:
            log_error(
                f"Assistant not found for history reindex: {assistant_id}",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Assistant not found"
            )

        # Trigger reindex in background
        reindex_stats = await history_index_service.reindex_history(
            tenant_id=tenant_id, assistant_id=assistant_id, force=force
        )

        log_info(
            "History reindex completed successfully",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            assistant_id=assistant_id,
            stats=reindex_stats,
        )

        return {
            "message": "History reindex completed successfully",
            "assistant_id": assistant_id,
            "tenant_id": tenant_id,
            "stats": reindex_stats,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        log_error(
            f"History reindex failed: {e}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            assistant_id=assistant_id,
            error_type=type(e).__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reindex history",
        ) from e
