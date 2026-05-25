# app/models/schemas.py
from pydantic import BaseModel
from typing import List, Any

class ChatRequest(BaseModel):
    message: str
    thread_id: str

class ChatResponse(BaseModel):
    response: str
    citations: List[Any] = []