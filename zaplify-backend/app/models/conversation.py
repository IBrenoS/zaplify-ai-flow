from pydantic import BaseModel
import datetime


class Conversation(BaseModel):
    id: int
    customer_phone: str
    status: str = "active"
    handled_by: str = "IA"
    last_message_at: datetime.datetime
    created_at: datetime.datetime

    class Config:
        from_attributes = True
