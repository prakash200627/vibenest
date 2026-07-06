from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.db.session import get_db
from app.models.social import Post, Comment, Like
from app.models.user import User
from app.schemas.social import PostCreate, PostUpdate, PostResponse, CommentCreate, CommentResponse
from app.api.dependencies import get_current_active_user, get_current_user, oauth2_scheme, settings
from jose import jwt, JWTError
from app.schemas.token import TokenPayload
from app.services.chat import manager
from app.utils.logging import logger
import json

router = APIRouter()

@router.get("/", response_model=List[PostResponse])
def get_posts(
    db: Session = Depends(get_db), 
    token: str = Depends(oauth2_scheme)
):
    # Manually check user to not fail if unauthenticated, but oauth2_scheme is required.
    # In a full app you might handle optional auth better.
    current_user_id = None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        token_data = TokenPayload(**payload)
        current_user_id = int(token_data.sub)
    except (JWTError, ValueError):
        pass

    posts = db.query(Post).options(joinedload(Post.author)).order_by(Post.created_at.desc()).all()
    # Simple counting for mapped schema
    for post in posts:
        post.likes_count = len(post.likes)
        post.comments_count = len(post.comments)
        post.is_liked = any(like.user_id == current_user_id for like in post.likes) if current_user_id else False
    return posts

@router.post("/", response_model=PostResponse)
async def create_post(
    post_in: PostCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    post = Post(content=post_in.content, media_url=post_in.media_url, author_id=current_user.id)
    db.add(post)
    db.commit()
    db.refresh(post)
    
    # Must load author to satisfy PostResponse schema
    db.refresh(post, ['author', 'likes', 'comments'])
    post.likes_count = 0
    post.comments_count = 0
    
    # Broadcast to all connected clients
    try:
        post_data = PostResponse.model_validate(post).model_dump(mode="json")
        await manager.broadcast(json.dumps({
            "type": "new_post",
            "post": post_data
        }))
    except Exception as e:
        logger.error(f"Failed to broadcast: {e}")
    
    return post

@router.put("/{post_id}", response_model=PostResponse)
def update_post(
    post_id: int,
    post_in: PostUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    post = db.query(Post).options(joinedload(Post.author)).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this post")
        
    if post_in.content is not None:
        post.content = post_in.content
    if post_in.media_url is not None:
        post.media_url = post_in.media_url
        
    db.commit()
    db.refresh(post)
    post.likes_count = len(post.likes)
    post.comments_count = len(post.comments)
    return post

@router.delete("/{post_id}")
async def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")
        
    db.delete(post)
    db.commit()

    # Broadcast deletion
    try:
        await manager.broadcast(json.dumps({
            "type": "delete_post",
            "post_id": post_id
        }))
    except Exception as e:
        logger.error(f"Broadcast error: {e}")

    return {"detail": "Post deleted successfully"}

@router.post("/{post_id}/like")
async def like_post(
    post_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    like = db.query(Like).filter(Like.post_id == post_id, Like.user_id == current_user.id).first()
    is_liked = False
    if like:
        db.delete(like)
        db.commit()
    else:
        like = Like(post_id=post_id, user_id=current_user.id)
        db.add(like)
        db.commit()
        is_liked = True
    
    # Broadcast like update
    try:
        await manager.broadcast(json.dumps({
            "type": "like_update",
            "post_id": post_id,
            "likes_count": db.query(Like).filter(Like.post_id == post_id).count()
        }))
    except Exception as e:
        logger.error(f"Broadcast error: {e}")
        
    return {"is_liked": is_liked}

@router.post("/{post_id}/comments", response_model=CommentResponse)
async def create_comment(
    post_id: int,
    comment_in: CommentCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    comment = Comment(content=comment_in.content, author_id=current_user.id, post_id=post_id)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    db.refresh(comment, ['author'])
    
    # Broadcast comment
    try:
        comment_data = CommentResponse.model_validate(comment).model_dump(mode="json")
        await manager.broadcast(json.dumps({
            "type": "new_comment",
            "post_id": post_id,
            "comment": comment_data
        }))
    except Exception as e:
        logger.error(f"Broadcast error: {e}")
        
    return comment

@router.get("/{post_id}/comments", response_model=List[CommentResponse])
def get_comments(
    post_id: int,
    db: Session = Depends(get_db)
):
    comments = db.query(Comment).filter(Comment.post_id == post_id).options(joinedload(Comment.author)).order_by(Comment.created_at.asc()).all()
    return comments
