from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.websocket_manager import manager

router = APIRouter()


@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        # Envia uma mensagem de boas-vindas ao cliente recém-conectado
        await manager.send_personal_message(
            f"Olá, {client_id}! Você está conectado.", client_id
        )

        # Loop para escutar mensagens do cliente
        while True:
            data = await websocket.receive_text()
            print(f"Mensagem recebida de {client_id}: {data}")
            # Echo: envia a mesma mensagem de volta para o cliente
            await manager.send_personal_message(f"Você escreveu: {data}", client_id)

    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        print(f"Erro no WebSocket para o cliente {client_id}: {e}")
        manager.disconnect(client_id)
