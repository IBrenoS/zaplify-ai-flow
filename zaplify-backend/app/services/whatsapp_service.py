import httpx
from app.core.config import settings

WHATSAPP_API_URL = "https://graph.facebook.com/v19.0/me/messages"


async def send_whatsapp_message(to: str, message: str):
    """
    Envia uma mensagem de texto para um número de WhatsApp.
    """
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_API_TOKEN}",
        "Content-Type": "application/json",
    }
    json_data = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": message},
    }

    # Simulação: imprime a resposta da IA no terminal
    print(f"\n📤 [SIMULADO] Resposta da IA para {to}:\n{message}\n")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                WHATSAPP_API_URL, headers=headers, json=json_data
            )
            response.raise_for_status()  # Lança um erro se a resposta for 4xx ou 5xx
            print(
                f"Mensagem enviada com sucesso para {to}. Status: {response.status_code}"
            )
        except httpx.HTTPStatusError as e:
            print(f"Erro ao enviar mensagem para {to}: {e.response.text}")
