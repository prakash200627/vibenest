from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
from app.schemas.user import UserResponse

class MessageBase(BaseModel):
    content: str
    receiver_id: int

class MessageCreate(MessageBase):
    pass

class MessageResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: Optional[int] = None
    content: str
    is_read: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ConversationResponse(BaseModel):
    id: int
    created_at: datetime
    updated_at: datetime
    other_user: UserResponse
    last_message: Optional[MessageResponse] = None

    class Config:
        from_attributes = True
