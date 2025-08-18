from fastapi import APIRouter, Request, HTTPException, Response
from app.core.config import settings
from app.services.openai_service import get_ai_response, create_embeddings
from app.services.whatsapp_service import send_whatsapp_message
from app.db.supabase_client import supabase_client
from app.core.websocket_manager import manager
from app.models.assistant import Assistant
from app.services.prompt_builder import create_system_prompt
import json
from typing import Dict


# NOVO: Função auxiliar para parsear as regras
def parse_hard_rules(rules_text: str) -> Dict[str, str]:
    """Converte o texto de regras em um dicionário de {keyword: action}."""
    if not rules_text:
        return {}
    rules = {}
    for line in rules_text.strip().split("\n"):
        if ":" in line:
            keyword, action = line.split(":", 1)
            rules[keyword.strip().lower()] = action.strip().lower()
    return rules


router = APIRouter()


# --- Endpoint GET (Sem alterações) ---
@router.get("/")
def verify_webhook(request: Request):
    # ... (código existente, sem alterações)
    VERIFY_TOKEN = settings.WHATSAPP_VERIFY_TOKEN
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")
    if mode and token and mode == "subscribe" and token == VERIFY_TOKEN:
        return Response(content=challenge, status_code=200)
    raise HTTPException(status_code=403)


@router.post("/")
async def receive_message(request: Request):
    body = await request.json()
    print(json.dumps(body, indent=2))

    try:
        if (
            body.get("entry")
            and body["entry"][0].get("changes")
            and body["entry"][0]["changes"][0].get("value")
            and body["entry"][0]["changes"][0]["value"].get("messages")
        ):

            message_data = body["entry"][0]["changes"][0]["value"]["messages"][0]
            if message_data.get("type") == "text":
                sender_phone = message_data["from"]
                message_body = message_data["text"]["body"]

                # --- LÓGICA DE GERENCIAMENTO DE CONVERSA (EXISTENTE) ---
                current_conversation = (
                    supabase_client.table("conversations")
                    .upsert(
                        {"customer_phone": sender_phone, "last_message_at": "now()"},
                        on_conflict="customer_phone",
                    )
                    .execute()
                    .data[0]
                )
                conversation_id = current_conversation["id"]

                # NOVO: Salva a mensagem do cliente no banco
                supabase_client.table("messages").insert(
                    {
                        "conversation_id": conversation_id,
                        "sender": sender_phone,
                        "content": message_body,
                    }
                ).execute()

                # --- INÍCIO DA NOVA LÓGICA DE REGRAS INQUEBRÁVEIS ---

                # 1. Busca todos os dados do assistente primeiro
                assistant_response = (
                    supabase_client.table("ai_assistants")
                    .select("*")
                    .eq("id", 1)
                    .single()
                    .execute()
                )
                if not assistant_response.data:
                    raise Exception("Assistente com id=1 não encontrado.")
                assistant = Assistant.model_validate(assistant_response.data)

                # 2. Parseia as regras
                hard_rules = parse_hard_rules(assistant.regras_inquebraveis or "")

                # 3. Verifica se alguma regra foi acionada
                for keyword, action in hard_rules.items():
                    if keyword in message_body.lower():
                        print(
                            f"---[REGRA INQUEBRÁVEL ACIONADA! Keyword: '{keyword}', Ação: '{action}']---"
                        )

                        if action == "transferir_humano":
                            # Atualiza a conversa para requerer um humano
                            supabase_client.table("conversations").update(
                                {"handled_by": "HUMAN_REQUIRED"}
                            ).eq("id", current_conversation["id"]).execute()

                            # Notifica o frontend via WebSocket
                            await manager.broadcast(
                                json.dumps(
                                    {
                                        "type": "handoff_required",
                                        "conversation_id": current_conversation["id"],
                                        "customer_phone": sender_phone,
                                        "reason": f"Regra inquebrável acionada pela palavra: '{keyword}'",
                                    }
                                )
                            )

                        # Para o processamento e retorna uma resposta OK para o WhatsApp
                        return Response(status_code=200)

                # --- FIM DA LÓGICA DE REGRAS INQUEBRÁVEIS ---

                # Se nenhuma regra foi acionada, continua o fluxo normal
                await manager.broadcast(
                    json.dumps(
                        {
                            "type": "new_message",
                            "from": sender_phone,
                            "text": message_body,
                            "conversation_id": conversation_id,
                        }
                    )
                )

                if current_conversation["handled_by"] == "IA":
                    print("---[CONVERSA SENDO GERENCIADA PELA IA]---")

                    # Lógica RAG (Existente)
                    query_embedding = (await create_embeddings([message_body]))[0]
                    params = {
                        "query_embedding": query_embedding,
                        "match_threshold": 0.78,
                        "match_count": 3,
                    }
                    context_response = supabase_client.rpc(
                        "match_knowledge_chunks", params
                    ).execute()
                    context_str = (
                        "\n".join([item["content"] for item in context_response.data])
                        if context_response.data
                        else ""
                    )

                    final_prompt = create_system_prompt(assistant, context_str)
                    ai_response = await get_ai_response(
                        user_message=message_body, assistant_instructions=final_prompt
                    )

                    # NOVO: Salva a resposta da IA no banco
                    supabase_client.table("messages").insert(
                        {
                            "conversation_id": conversation_id,
                            "sender": "IA",
                            "content": ai_response,
                        }
                    ).execute()

                    await manager.broadcast(
                        json.dumps(
                            {
                                "type": "ai_response",
                                "to": sender_phone,
                                "text": ai_response,
                                "conversation_id": conversation_id,
                            }
                        )
                    )
                    await send_whatsapp_message(to=sender_phone, message=ai_response)
                else:
                    print(
                        f"---[CONVERSA SENDO GERENCIADA POR HUMANO: {current_conversation['handled_by']}]---"
                    )

    except Exception as e:
        print(f"Erro no processamento principal do webhook: {e}")

    return Response(status_code=200)
