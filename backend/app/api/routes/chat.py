from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from fastapi import HTTPException
from typing import List
from app.api.dependencies import get_current_user_ws, get_current_active_user
from app.schemas.chat import MessageResponse
from app.services.chat import manager
from app.db.session import get_db, SessionLocal
from app.models.chat import Message, Conversation, ConversationParticipant
from app.models.user import User
import json
from app.utils.logging import logger

from app.schemas.chat import MessageResponse, ConversationResponse
from app.schemas.user import UserResponse

router = APIRouter()

@router.get("/conversations", response_model=List[ConversationResponse])
def list_conversations(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Find all conversations the user is in
    conversations = db.query(Conversation).join(ConversationParticipant).filter(
        ConversationParticipant.user_id == current_user.id
    ).all()
    
    results = []
    for conv in conversations:
        # Find the other participant
        other_participant = db.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == conv.id,
            ConversationParticipant.user_id != current_user.id
        ).options(joinedload(ConversationParticipant.user)).first()
        
        if other_participant:
            other_user = other_participant.user
            # Get last message
            last_msg = db.query(Message).filter(Message.conversation_id == conv.id).order_by(Message.created_at.desc()).first()
            results.append({
                "id": conv.id,
                "created_at": conv.created_at,
                "other_user": other_user,
                "last_message": last_msg
            })
            
    return sorted(results, key=lambda x: x['last_message'].created_at if x['last_message'] else x['created_at'], reverse=True)


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str):
    db: Session = SessionLocal()
    user = await get_current_user_ws(token, db)
    if not user:
        await websocket.close(code=1008)
        db.close()
        return
        
    await manager.connect(websocket, user.id)
    logger.info(f"WebSocket opened for user: {user.username}")
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            receiver_username = payload.get("receiver_username")
            content = payload.get("content")
            
            # Lookup receiver_id from username
            receiver = db.query(User).filter(User.username == receiver_username).first()
            if not receiver:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": f"User '{receiver_username}' not found."
                }))
                continue
            if receiver.id == user.id:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Cannot chat with yourself."
                }))
                continue
            receiver_id = receiver.id
            
            # Save to db synchronously in async route (not ideal for high load, but standard)
            # Find conversation or create
            conv = db.query(Conversation).join(ConversationParticipant).filter(
                ConversationParticipant.user_id.in_([user.id, receiver_id])
            ).group_by(Conversation.id).having(func.count() == 2).first()
            
            if not conv:
                conv = Conversation()
                db.add(conv)
                db.flush()
                db.add(ConversationParticipant(conversation_id=conv.id, user_id=user.id))
                db.add(ConversationParticipant(conversation_id=conv.id, user_id=receiver_id))
                
            msg = Message(
                conversation_id=conv.id,
                sender_id=user.id,
                content=content
            )
            db.add(msg)
            db.commit()
            
            # Broadcast
            await manager.send_personal_message(
                json.dumps({
                    "sender_id": user.id,
                    "content": content,
                    "conversation_id": conv.id
                }),
                receiver_id
            )
            logger.info(f"Message sent from {user.username} to {receiver_username}")
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, user.id)
        logger.info(f"WebSocket closed for user: {user.username}")
    finally:
        db.close()

@router.get("/history/{receiver_username}", response_model=List[MessageResponse])
def get_chat_history(
    receiver_username: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    receiver = db.query(User).filter(User.username == receiver_username).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="User not found")
        
    if receiver.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot chat with yourself")
        
    conv = db.query(Conversation).join(ConversationParticipant).filter(
        ConversationParticipant.user_id.in_([current_user.id, receiver.id])
    ).group_by(Conversation.id).having(func.count() == 2).first()
    
    if not conv:
        return []
        
    messages = db.query(Message).filter(Message.conversation_id == conv.id).order_by(Message.created_at.asc()).all()
    return messages

from app.schemas.chat import MessageCreate

@router.post("/send", response_model=MessageResponse)
def send_message_http(
    message_in: MessageCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    receiver = db.query(User).filter(User.id == message_in.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="User not found")
        
    if receiver.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot chat with yourself")
        
    conv = db.query(Conversation).join(ConversationParticipant).filter(
        ConversationParticipant.user_id.in_([current_user.id, receiver.id])
    ).group_by(Conversation.id).having(func.count() == 2).first()
    
    if not conv:
        conv = Conversation()
        db.add(conv)
        db.flush()
        db.add(ConversationParticipant(conversation_id=conv.id, user_id=current_user.id))
        db.add(ConversationParticipant(conversation_id=conv.id, user_id=receiver.id))
        
    msg = Message(
        conversation_id=conv.id,
        sender_id=current_user.id,
        content=message_in.content
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    
    msg.receiver_id = receiver.id
    
    return msg
