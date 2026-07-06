from typing import Dict, List
from fastapi import WebSocket
from sqlalchemy.orm import Session
from app.models.chat import Message, Conversation, ConversationParticipant
from app.api.dependencies import get_current_user_ws
from app.utils.logging import logger

class ConnectionManager:
    def __init__(self):
        # user_id -> List of WebSockets
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info(f"WebSocket connected", extra={"user_id": user_id, "active_user_connections": len(self.active_connections[user_id])})

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
                logger.info(f"WebSocket disconnected", extra={"user_id": user_id})
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: str, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(message)
                except Exception:
                    # Ignore dropping logic error for offline
                    pass
                
    async def broadcast(self, message: str):
        for user_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_text(message)
                except Exception:
                    pass

manager = ConnectionManager()
