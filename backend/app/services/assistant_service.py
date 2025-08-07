"""
Assistant Service for managing AI assistants
"""

import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

from app.core.database import get_supabase
from app.models.assistant import (
    AssistantCreate,
    AssistantUpdate,
    AssistantResponse,
    AssistantWithStats,
    AssistantStats
)

logger = logging.getLogger(__name__)


class AssistantService:
    """Service for managing assistants"""

    def __init__(self):
        self.supabase = get_supabase()

    async def create_assistant(self, assistant_data: AssistantCreate, user_id: str) -> AssistantResponse:
        """Create a new assistant"""
        try:
            # Prepare data for Supabase
            assistant_dict = {
                "user_id": user_id,
                "name": assistant_data.name,
                "description": assistant_data.description,
                "personality": assistant_data.personality,
                "voice_tone": assistant_data.voice_tone,
                "objectives": assistant_data.objectives,
                "knowledge_base": assistant_data.knowledge_base,
                "whatsapp_phone": assistant_data.whatsapp_phone,
                "advanced_settings": {
                    "personality_instructions": assistant_data.personality_instructions,
                    "can_schedule": assistant_data.can_schedule,
                    "can_sell": assistant_data.can_sell,
                    "can_qualify": assistant_data.can_qualify,
                    "can_capture_data": assistant_data.can_capture_data,
                    "formality_level": assistant_data.formality_level,
                    "detail_level": assistant_data.detail_level,
                    "emoji_usage": assistant_data.emoji_usage,
                    "product_service": assistant_data.product_service,
                    "main_benefits": assistant_data.main_benefits,
                    "target_audience": assistant_data.target_audience,
                    "competitive_differentials": assistant_data.competitive_differentials,
                    "products_and_prices": assistant_data.products_and_prices,
                    "payment_link": assistant_data.payment_link,
                },
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }

            # Insert into Supabase
            result = self.supabase.table('assistants').insert(assistant_dict).execute()

            if result.data:
                return AssistantResponse(**result.data[0])
            else:
                raise Exception("Failed to create assistant")

        except Exception as e:
            logger.error(f"Error creating assistant: {e}")
            raise

    async def get_assistant(self, assistant_id: str, user_id: str) -> Optional[AssistantResponse]:
        """Get assistant by ID"""
        try:
            result = self.supabase.table('assistants').select('*').eq('id', assistant_id).eq('user_id', user_id).execute()

            if result.data:
                return AssistantResponse(**result.data[0])
            return None

        except Exception as e:
            logger.error(f"Error getting assistant: {e}")
            raise

    async def get_user_assistants(self, user_id: str) -> List[AssistantResponse]:
        """Get all assistants for a user"""
        try:
            result = self.supabase.table('assistants').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()

            return [AssistantResponse(**assistant) for assistant in result.data]

        except Exception as e:
            logger.error(f"Error getting user assistants: {e}")
            raise

    async def update_assistant(self, assistant_id: str, user_id: str, update_data: AssistantUpdate) -> Optional[AssistantResponse]:
        """Update an assistant"""
        try:
            # Prepare update data
            update_dict = {}

            if update_data.name is not None:
                update_dict["name"] = update_data.name
            if update_data.description is not None:
                update_dict["description"] = update_data.description
            if update_data.personality is not None:
                update_dict["personality"] = update_data.personality
            if update_data.voice_tone is not None:
                update_dict["voice_tone"] = update_data.voice_tone
            if update_data.objectives is not None:
                update_dict["objectives"] = update_data.objectives
            if update_data.knowledge_base is not None:
                update_dict["knowledge_base"] = update_data.knowledge_base
            if update_data.whatsapp_phone is not None:
                update_dict["whatsapp_phone"] = update_data.whatsapp_phone
            if update_data.advanced_settings is not None:
                update_dict["advanced_settings"] = update_data.advanced_settings

            update_dict["updated_at"] = datetime.utcnow().isoformat()

            # Update in Supabase
            result = self.supabase.table('assistants').update(update_dict).eq('id', assistant_id).eq('user_id', user_id).execute()

            if result.data:
                return AssistantResponse(**result.data[0])
            return None

        except Exception as e:
            logger.error(f"Error updating assistant: {e}")
            raise

    async def delete_assistant(self, assistant_id: str, user_id: str) -> bool:
        """Delete an assistant"""
        try:
            result = self.supabase.table('assistants').delete().eq('id', assistant_id).eq('user_id', user_id).execute()
            return True

        except Exception as e:
            logger.error(f"Error deleting assistant: {e}")
            raise

    async def get_assistant_stats(self, assistant_id: str, user_id: str) -> AssistantStats:
        """Get assistant statistics"""
        try:
            # TODO: Implement actual statistics calculation
            # For now, return mock data
            return AssistantStats(
                total_conversations=0,
                active_conversations=0,
                conversion_rate=0.0,
                avg_response_time=0.0,
                last_activity=None
            )

        except Exception as e:
            logger.error(f"Error getting assistant stats: {e}")
            raise

    async def get_assistant_with_stats(self, assistant_id: str, user_id: str) -> Optional[AssistantWithStats]:
        """Get assistant with statistics"""
        try:
            assistant = await self.get_assistant(assistant_id, user_id)
            if not assistant:
                return None

            stats = await self.get_assistant_stats(assistant_id, user_id)

            return AssistantWithStats(**assistant.dict(), stats=stats)

        except Exception as e:
            logger.error(f"Error getting assistant with stats: {e}")
            raise


# Global assistant service instance
assistant_service = AssistantService()
