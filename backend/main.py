# main.py
from fastapi import FastAPI
from pydantic import BaseModel
from backend.services.rag import answer_with_context

app = FastAPI(title="Sanyukt Vaani RAG API")

class QueryRequest(BaseModel):
    query: str
    collection_name: str = "kb_docs"

@app.post("/api/query")
async def process_query(request: QueryRequest):
    response = await answer_with_context(
        query=request.query, 
        collection_name=request.collection_name
    )
    return {"answer": response}