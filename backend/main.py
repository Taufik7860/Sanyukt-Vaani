# main.py
from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from typing import Literal

from pydantic import BaseModel, Field
from backend.services.rag import answer_with_context
from backend.services.knowledge import approve_update, create_update, list_updates
from backend.services.officer_auth import authenticate_officer, create_session_token, verify_session_token

app = FastAPI(title="Sanyukt Vaani RAG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    query: str
    collection_name: str = "kb_docs"


class OfficerLoginRequest(BaseModel):
    email: str
    password: str


class KnowledgeUpdateRequest(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    category: Literal["policy", "insurance", "scheme", "law", "farmer_loan", "circular"]
    year: int = Field(ge=2000, le=2100)
    authority: str = Field(min_length=2, max_length=160)
    version: str = Field(default="1.0", min_length=1, max_length=40)
    summary: str = Field(default="", max_length=2000)
    source_url: str = Field(default="", max_length=500)


def require_officer(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Officer login required")
    officer = verify_session_token(authorization.removeprefix("Bearer ").strip())
    if not officer:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Officer session expired")
    return officer


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "Sanyukt Vaani AI"}


@app.post("/api/officer/login")
async def officer_login(request: OfficerLoginRequest):
    officer = authenticate_officer(request.email, request.password)
    if not officer:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid officer email or password")
    return {"access_token": create_session_token(officer), "token_type": "bearer", "email": officer.email}


@app.get("/api/officer/knowledge")
async def get_knowledge_updates(_officer=Depends(require_officer)):
    return {"items": list_updates()}


@app.post("/api/officer/knowledge")
async def add_knowledge_update(request: KnowledgeUpdateRequest, officer=Depends(require_officer)):
    try:
        item = create_update(request.model_dump(), officer.email)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error
    return item


@app.post("/api/officer/knowledge/{update_id}/approve")
async def approve_knowledge_update(update_id: str, officer=Depends(require_officer)):
    item = approve_update(update_id, officer.email)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge update not found")
    return item

@app.post("/api/query")
async def process_query(request: QueryRequest):
    response = await answer_with_context(
        query=request.query, 
        collection_name=request.collection_name
    )
    return {"answer": response}