from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import (
    assistants,
    whatsapp_webhook,
    knowledge,
    chat_ws,
    conversations,
    voice_analysis,
)

app = FastAPI(
    title="Zaplify AI Flow Backend",
    description="Backend para o sistema de automação de conversas com IA.",
    version="0.1.0",
)

# NOVO: Adicione o bloco de configuração do CORS
origins = [
    # Adicione aqui a URL do seu frontend de desenvolvimento.
    # A porta padrão do Vite/React é 5173.
    "http://localhost:5173",
    "http://localhost:3000",  # Porta padrão do create-react-app
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Permite todos os métodos (GET, POST, etc.)
    allow_headers=["*"],  # Permite todos os cabeçalhos
)


@app.get("/")
def read_root():
    """
    Endpoint raiz para verificar se a API está no ar.
    """
    return {"status": "ok", "message": "Zaplify AI Flow Backend is running!"}


# Inclui o roteador de assistentes na aplicação principal
app.include_router(assistants.router, prefix="/api/v1/assistants", tags=["Assistants"])

# Inclui o roteador do Webhook do WhatsApp
app.include_router(
    whatsapp_webhook.router,
    prefix="/webhook/whatsapp",  # Definimos um prefixo diferente
    tags=["WhatsApp Webhook"],
)

# NOVO: Inclui o roteador de conhecimento
app.include_router(
    knowledge.router,
    prefix="/api/v1",  # O prefixo já está no endpoint
    tags=["Knowledge"],
)

# NOVO: Inclui o roteador de WebSocket
app.include_router(chat_ws.router, tags=["WebSocket"])

# NOVO: Inclui o roteador de conversas
app.include_router(
    conversations.router, prefix="/api/v1/conversations", tags=["Conversations"]
)

# NOVO: Inclui o roteador de análise de voz
app.include_router(voice_analysis.router, prefix="/api/v1", tags=["Voice Analysis"])
