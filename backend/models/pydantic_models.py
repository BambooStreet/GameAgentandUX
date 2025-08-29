from pydantic import BaseModel
from typing import Optional

class ChatMessage(BaseModel):
    sender: str
    content: str
    timestamp: str
    role: Optional[str] = None

class GameAction(BaseModel):
    action_type: str  # "chat", "vote", "night_action"
    player_id: str
    target_id: Optional[str] = None
    content: Optional[str] = None

class GameStartRequest(BaseModel):
    player_name: str

class VoteRequest(BaseModel):
    voter: str
    target: str
