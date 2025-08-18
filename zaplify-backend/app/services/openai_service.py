from openai import AsyncOpenAI
from app.core.config import settings
from typing import List
import io

# Inicializa o cliente assíncrono da OpenAI
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


# --- FUNÇÃO DE CONVERSA COM IA ---
async def get_ai_response(user_message: str, assistant_instructions: str) -> str:
    """
    Envia uma mensagem para a OpenAI e retorna a resposta do assistente.
    """
    try:
        response = await client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": assistant_instructions},
                {"role": "user", "content": user_message},
            ],
        )
        ai_response = response.choices[0].message.content
        return ai_response.strip()
    except Exception as e:
        print(f"Erro ao chamar a API da OpenAI: {e}")
        return "Desculpe, não consegui processar sua solicitação no momento."


# --- FUNÇÃO DE CRIAÇÃO DE EMBEDDINGS ---
async def create_embeddings(text_chunks: List[str]) -> List[List[float]]:
    """
    Gera embeddings para uma lista de pedaços de texto usando a nova interface OpenAI >=1.0.0.
    """
    try:
        response = await client.embeddings.create(
            model="text-embedding-ada-002", input=text_chunks
        )
        embeddings = [item.embedding for item in response.data]
        return embeddings
    except Exception as e:
        print(f"Erro ao criar embeddings: {e}")
        return []


# --- FUNÇÃO DE TRANSCRIÇÃO DE ÁUDIO ---
async def transcribe_audio(audio_file: io.BytesIO) -> str:
    """
    Transcreve um arquivo de áudio usando o modelo Whisper da OpenAI.
    """
    try:
        audio_file.name = "audio.mp3"  # Nome necessário para upload
        transcript = await client.audio.transcriptions.create(
            model="whisper-1", file=audio_file
        )
        return transcript.text
    except Exception as e:
        print(f"Erro ao transcrever o áudio: {e}")
        return ""


# --- FUNÇÃO DE ANÁLISE DE ESTILO ---
async def analyze_transcript_style(transcript: str) -> str:
    """
    Analisa um texto e gera instruções de estilo de comunicação para um chatbot.
    """
    if not transcript:
        return ""

    system_prompt = (
        "Você é um especialista em análise de comunicação. Analise o texto a seguir, "
        "que é uma transcrição de uma fala, e descreva o estilo de comunicação do autor. "
        "Sua descrição deve ser em formato de instruções diretas para um assistente de IA. "
        "Foque em: tom de voz (ex: calmo, enérgico), ritmo (ex: pausado, rápido), "
        "vocabulário (ex: formal, informal, técnico), e estrutura das frases (ex: curtas, longas). "
        "Seja conciso e direto nas instruções geradas."
    )

    try:
        response = await client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": f"Analise esta transcrição:\n\n---\n{transcript}\n---",
                },
            ],
        )
        style_instructions = response.choices[0].message.content
        return style_instructions.strip()
    except Exception as e:
        print(f"Erro ao analisar o estilo do texto: {e}")
        return ""
