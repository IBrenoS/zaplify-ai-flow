from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel

load_dotenv()
app = FastAPI(title="analytics-service")


@app.get("/health")
def health():
    return {"ok": True, "service": "analytics-service"}


class Event(BaseModel):
    type: str
    payload: dict


# Endpoint simples para ingestão HTTP (até plugar um bus de eventos)
@app.post("/events")
def ingest(event: Event):
    # TODO: armazenar/agregar; por enquanto só loga
    print("[analytics] event:", event.type, event.payload)
    return {"ingested": True}
