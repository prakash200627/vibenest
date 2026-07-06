from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.db.session import get_db
from app.models.user import User
from app.models.social import Post
from app.schemas.user import UserProfile, UserResponse
from app.schemas.social import PostResponse
from app.api.dependencies import get_current_active_user, get_current_user, oauth2_scheme, settings
from jose import jwt, JWTError
from app.schemas.token import TokenPayload
from app.services.chat import manager
from app.utils.logging import logger
import json

router = APIRouter()

@router.get("/me", response_model=UserProfile)
def read_user_me(current_user: User = Depends(get_current_active_user)):
    return UserProfile(
        **current_user.__dict__,
        followers_count=len(current_user.followers),
        following_count=len(current_user.followed),
        is_following=False
    )

@router.get("/{username}", response_model=UserProfile)
def get_user_profile(
    username: str,
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    # Optional auth to check is_following
    current_user_id = None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        token_data = TokenPayload(**payload)
        current_user_id = int(token_data.sub)
    except (JWTError, ValueError):
        pass

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    is_following = False
    if current_user_id:
        curr = db.query(User).filter(User.id == current_user_id).first()
        if curr:
            is_following = user in curr.followed

    return UserProfile(
        **user.__dict__,
        followers_count=len(user.followers),
        following_count=len(user.followed),
        is_following=is_following
    )

@router.get("/{username}/posts", response_model=List[PostResponse])
def get_user_posts(
    username: str,
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    # Optional auth for is_liked
    current_user_id = None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        token_data = TokenPayload(**payload)
        current_user_id = int(token_data.sub)
    except (JWTError, ValueError):
        pass

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    posts = db.query(Post).filter(Post.author_id == user.id).options(joinedload(Post.author)).order_by(Post.created_at.desc()).all()
    for post in posts:
        post.likes_count = len(post.likes)
        post.comments_count = len(post.comments)
        post.is_liked = any(like.user_id == current_user_id for like in post.likes) if current_user_id else False
    return posts

@router.post("/{user_id}/toggle-follow", response_model=UserProfile)
async def toggle_follow_user(
    user_id: int, 
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
        
    user_to_follow = db.query(User).filter(User.id == user_id).first()
    if not user_to_follow:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user_to_follow in current_user.followed:
        current_user.followed.remove(user_to_follow)
    else:
        current_user.followed.append(user_to_follow)
        
    db.commit()
    db.refresh(user_to_follow)
    
    # Broadcast follow update
    try:
        await manager.broadcast(json.dumps({
            "type": "follow_update",
            "user_id": user_id,
            "followers_count": len(user_to_follow.followers)
        }))
        await manager.broadcast(json.dumps({
            "type": "follow_update",
            "user_id": current_user.id,
            "following_count": len(current_user.followed)
        }))
    except Exception as e:
        logger.error(f"Broadcast error: {e}")

    return UserProfile(
        **user_to_follow.__dict__,
        followers_count=len(user_to_follow.followers),
        following_count=len(user_to_follow.followed),
        is_following=user_to_follow in current_user.followed
    )