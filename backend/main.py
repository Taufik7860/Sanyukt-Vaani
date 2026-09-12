from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Literal
import os

from backend.config import settings
from backend.routes.chat import router as chat_router
from backend.routes.officer import router as officer_router
from backend.services.knowledge import approve_update, create_update, list_updates
from backend.services.officer_auth import (
    Officer,
    authenticate_officer,
    create_session_token,
    verify_session_token,
)
from backend.services.rag import answer_with_context

app = FastAPI(
    title="Sanyukt Vaani AI Backend",
    version="1.0.0",
    description="Multilingual cooperative governance and legal assistance backend",
)

origins = [x.strip() for x in settings.FRONTEND_ORIGINS.split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(chat_router)
app.include_router(officer_router)


class QueryRequest(BaseModel):
    query: str = Field(min_length=1)
    language: str = "en"
    collection_name: str = settings.QDRANT_COLLECTION


class OfficerLoginRequest(BaseModel):
    email: str
    password: str


class KnowledgeUpdateRequest(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    category: Literal[
        "policy", "insurance", "scheme", "law", "farmer_loan", "circular"
    ]
    year: int = Field(ge=2000, le=2100)
    authority: str = Field(min_length=2, max_length=160)
    version: str = Field(default="1.0", min_length=1, max_length=40)
    summary: str = Field(default="", max_length=2000)
    source_url: str = Field(default="", max_length=500)


def require_officer(
    authorization: str | None = Header(default=None),
) -> Officer:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Officer login required.",
        )
    officer = verify_session_token(authorization.removeprefix("Bearer ").strip())
    if not officer:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Officer session expired or invalid.",
        )
    return officer


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "service": "Sanyukt Vaani AI Backend",
        "bhashini_configured": bool(
            settings.BHASHINI_USER_ID and settings.BHASHINI_API_KEY
        ),
        "gemini_configured": bool(settings.GEMINI_API_KEY),
        "qdrant_configured": bool(settings.QDRANT_URL),
        "supabase_configured": bool(
            settings.SUPABASE_URL and settings.SUPABASE_KEY
        ),
    }


@app.post("/api/query")
async def query(request: QueryRequest):
    result = await answer_with_context(
        request.query,
        language=request.language,
        collection_name=request.collection_name,
    )
    return result


@app.post("/api/officer/login")
async def officer_login(request: OfficerLoginRequest):
    officer = authenticate_officer(request.email, request.password)
    if not officer:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid officer email or password",
        )
    token = create_session_token(officer)
    return {
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "officer": {
            "email": officer.email,
            "role": "Verified Knowledge Officer",
        },
    }


@app.get("/api/officer/me")
async def officer_me(officer: Officer = Depends(require_officer)):
    return {"authenticated": True, "email": officer.email}


@app.get("/api/officer/knowledge")
async def get_knowledge(_officer: Officer = Depends(require_officer)):
    return {"items": list_updates()}


@app.post("/api/officer/knowledge")
async def add_knowledge(
    request: KnowledgeUpdateRequest,
    officer: Officer = Depends(require_officer),
):
    try:
        return create_update(request.model_dump(), officer.email)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/api/officer/knowledge/{update_id}/approve")
async def approve_knowledge(
    update_id: str,
    officer: Officer = Depends(require_officer),
):
    item = approve_update(update_id, officer.email)
    if not item:
        raise HTTPException(status_code=404, detail="Knowledge update not found")
    return item
