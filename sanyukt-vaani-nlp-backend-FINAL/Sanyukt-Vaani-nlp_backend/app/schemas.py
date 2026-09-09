from typing import Dict, List, Any
from pydantic import BaseModel, Field
class QueryRequest(BaseModel):
    query: str = Field(min_length=1)
    top_k: int = Field(default=5, ge=1, le=10)
class NLPAnalysis(BaseModel):
    language: str
    intent: str
    entities: Dict[str,str]
    normalized_query: str
class Source(BaseModel):
    score: float
    text: str
    metadata: Dict[str,Any]
class QueryResponse(BaseModel):
    analysis: NLPAnalysis
    answer: str
    sources: List[Source]
