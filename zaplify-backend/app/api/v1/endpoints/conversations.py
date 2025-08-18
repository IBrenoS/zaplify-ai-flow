from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db.supabase_client import supabase_client
from app.models.conversation import Conversation  # Importamos nosso modelo

router = APIRouter()


class TakeoverRequest(BaseModel):
    agent_id: str


@router.post("/{conversation_id}/takeover", response_model=Conversation)
def takeover_conversation(conversation_id: int, takeover_request: TakeoverRequest):
    """
    Permite que um agente humano assuma o controle de uma conversa.
    """
    try:
        update_data = {"handled_by": takeover_request.agent_id}

        response = (
            supabase_client.table("conversations")
            .update(update_data)
            .eq("id", conversation_id)
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Conversation not found.")

        return response.data[0]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- NOVA ROTA AQUI ---
@router.get("/{conversation_id}/messages")
def get_conversation_messages(conversation_id: int):
    """
    Busca todas as mensagens de uma conversa específica.
    """
    try:
        response = (
            supabase_client.table("messages")
            .select("*")
            .eq("conversation_id", conversation_id)
            .order("created_at", desc=False)
            .execute()
        )
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
