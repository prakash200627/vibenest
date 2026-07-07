import time
from fastapi import FastAPI, Depends, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
from datetime import datetime

from app.db.session import engine, get_db
from app.db.base import Base
from app.core.config import settings
from app.utils.logging import logger
from prometheus_fastapi_instrumentator import Instrumentator

# Routers
from app.api.routes import auth, user, chat, post
from app.services.chat import manager

app = FastAPI(title=settings.PROJECT_NAME)

from app.core.limiter import limiter
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Error Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    from fastapi.exceptions import HTTPException
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.detail, "status": exc.status_code},
        )

    logger.error(f"Unhandled Exception: {str(exc)}", extra={
        "path": request.url.path,
        "method": request.method,
        "traceback": True # Assuming logger handles this or you can format it
    })

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal Server Error", "status": 500},
    )

# Request JSON Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    if request.url.path.startswith("/health"):
        return await call_next(request)

    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time

    logger.info("Incoming request", extra={
        "method": request.method,
        "path": request.url.path,
        "status": response.status_code,
        "duration": f"{duration:.4f}s"
    })
    return response

# Create tables
import os
if os.getenv("TESTING") == "True":
    Base.metadata.create_all(bind=engine)

# Include routes
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(user.router, prefix="/api/v1/users", tags=["users"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["chat"])
app.include_router(post.router, prefix="/api/v1/posts", tags=["posts"])

Instrumentator().instrument(app).expose(app)

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    db_status = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = "offline"
        logger.error(f"Database health check failed: {e}")

    return {
        "status": "ok",
        "service": "vibenest-api",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "details": {
            "database": db_status
        }
    }

@app.get("/health/ws")
def ws_health():
    return {
        "status": "ok",
        "active_connections": sum(len(conns) for conns in manager.active_connections.values())
    }

@app.get("/")
def root():
    return {"message": "API is running 🚀"}