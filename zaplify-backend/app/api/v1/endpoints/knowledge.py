from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks
from app.db.supabase_client import supabase_client
from app.services.openai_service import create_embeddings  # Importe a nova função
import pypdf
import io

router = APIRouter()


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """Quebra um texto longo em pedaços menores com sobreposição."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks


async def process_and_index_document(source_id: int, file_content: bytes):
    """
    Função de background para processar o arquivo, criar embeddings e salvar.
    """
    print(f"---[BACKGROUND TASK INICIADA para source_id: {source_id}]---")

    try:
        # 1. Extrair texto do PDF
        reader = pypdf.PdfReader(io.BytesIO(file_content))
        full_text = "".join(page.extract_text() for page in reader.pages)
        print(f"Texto extraído: {len(full_text)} caracteres.")

        # 2. Quebrar o texto em pedaços (chunks)
        text_chunks = chunk_text(full_text)
        print(f"Texto dividido em {len(text_chunks)} chunks.")

        # 3. Gerar embeddings para todos os chunks
        embeddings = await create_embeddings(text_chunks)
        if not embeddings:
            raise Exception("Falha ao gerar embeddings.")
        print(f"{len(embeddings)} embeddings gerados.")

        # 4. Preparar os dados para salvar no Supabase
        chunks_to_insert = [
            {"source_id": source_id, "content": chunk, "embedding": embedding}
            for chunk, embedding in zip(text_chunks, embeddings)
        ]

        # 5. Salvar os chunks e seus embeddings no banco de dados
        response = (
            supabase_client.table("knowledge_chunks").insert(chunks_to_insert).execute()
        )
        if response.data:
            print(f"{len(response.data)} chunks salvos no banco de dados com sucesso.")

        print(f"---[BACKGROUND TASK FINALIZADA para source_id: {source_id}]---")

    except Exception as e:
        print(f"Erro no background task para source_id {source_id}: {e}")
        pass


# ... (código do endpoint de upload, sem alterações)
@router.post("/assistants/{assistant_id}/knowledge/upload-file", status_code=202)
async def upload_knowledge_file(
    assistant_id: int, background_tasks: BackgroundTasks, file: UploadFile = File(...)
):
    # ... (código existente, sem alterações)
    try:
        source_data = {
            "assistant_id": assistant_id,
            "source_type": "file",
            "source_name": file.filename,
        }
        response = (
            supabase_client.table("knowledge_sources").insert(source_data).execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=500, detail="Could not save knowledge source."
            )

        source_id = response.data[0]["id"]
        file_content = await file.read()

        background_tasks.add_task(process_and_index_document, source_id, file_content)

        return {
            "message": "File accepted and is being processed in the background.",
            "source_id": source_id,
            "filename": file.filename,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
