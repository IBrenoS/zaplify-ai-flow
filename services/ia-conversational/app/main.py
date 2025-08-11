from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel

load_dotenv()
app = FastAPI(title="ia-conversational")


class MessageIn(BaseModel):
    text: str
    tenant_id: str | None = None


@app.get("/health")
def health():
    return {"ok": True, "service": "ia-conversational"}


@app.post("/conversation")
def conversation(msg: MessageIn):
    # TODO: Intent + RAG + OpenAI
    reply = f"Echo IA: {msg.text}"
    return {"reply": reply, "tenant_id": msg.tenant_id}
