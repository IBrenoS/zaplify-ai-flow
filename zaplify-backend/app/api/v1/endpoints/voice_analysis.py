from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks
from app.db.supabase_client import supabase_client
from app.services.openai_service import transcribe_audio, analyze_transcript_style
import io

router = APIRouter()


async def process_voice_reference(assistant_id: int, audio_content: bytes):
    """
    Tarefa de background para transcrever, analisar e salvar as instruções de voz.
    """
    print(f"---[VOICE TASK INICIADA para assistant_id: {assistant_id}]---")
    try:
        # 1. Transcrever o áudio para texto
        transcript = await transcribe_audio(io.BytesIO(audio_content))
        print(f"Transcrição gerada: '{transcript[:100]}...'")

        # 2. Analisar o estilo do texto transcrito
        style_instructions = await analyze_transcript_style(transcript)
        print(f"Instruções de estilo geradas: '{style_instructions}'")

        # 3. Salvar as instruções no banco de dados
        if style_instructions:
            response = (
                supabase_client.table("ai_assistants")
                .update({"instrucoes_de_voz": style_instructions})
                .eq("id", assistant_id)
                .execute()
            )

            if response.data:
                print("Instruções de voz salvas no banco de dados com sucesso.")

        print(f"---[VOICE TASK FINALIZADA para assistant_id: {assistant_id}]---")

    except Exception as e:
        print(f"Erro no background task de voz para o assistant_id {assistant_id}: {e}")


@router.post("/assistants/{assistant_id}/voice-reference", status_code=202)
async def upload_voice_reference(
    assistant_id: int, background_tasks: BackgroundTasks, file: UploadFile = File(...)
):
    """
    Recebe um arquivo de áudio de referência, e inicia a análise em background.
    """
    # Verifica se o arquivo é um formato de áudio aceitável
    if file.content_type not in ["audio/mpeg", "audio/wav", "audio/x-wav"]:
        raise HTTPException(
            status_code=400, detail="Formato de arquivo inválido. Use MP3 ou WAV."
        )

    audio_content = await file.read()
    background_tasks.add_task(process_voice_reference, assistant_id, audio_content)

    return {"message": "Audio file accepted and is being processed in the background."}
