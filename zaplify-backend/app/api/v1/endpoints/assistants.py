from fastapi import APIRouter, HTTPException
from typing import List

# Importamos os modelos atualizados
from app.models.assistant import Assistant, AssistantCreate
from app.db.supabase_client import supabase_client
from uuid import UUID

router = APIRouter()


@router.post("/", response_model=Assistant, status_code=201)
def create_assistant(assistant_in: AssistantCreate):
    """
    Cria um novo assistente no banco de dados com todos os campos de configuração.
    """
    try:
        # ⚠️ ID de um usuário válido da tabela auth.users
        user_id_fake = UUID(
            "6bedd3c6-853f-4787-b0c4-fdc073dde969"
        )  # substitua por um user_id real

        assistant_data = assistant_in.model_dump()
        assistant_data["user_id"] = str(user_id_fake)

        response = (
            supabase_client.table("ai_assistants").insert(assistant_data).execute()
        )

        if response.data:
            return response.data[0]
        else:
            raise HTTPException(status_code=400, detail="Failed to create assistant.")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[Assistant])
def list_assistants():
    """
    Retorna uma lista de todos os assistentes com todos os seus dados.
    """
    try:
        # O select("*") agora busca todas as novas colunas que adicionamos
        response = (
            supabase_client.table("ai_assistants")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
