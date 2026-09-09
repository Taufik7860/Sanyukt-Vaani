from fastapi import FastAPI, HTTPException
from app.schemas import QueryRequest, QueryResponse
from app.nlp.processor import analyze
from app.embeddings.service import embed_query
from app.retrieval.qdrant import search
from app.services.gemini import answer
app=FastAPI(title="Sanyukt Vaani NLP Backend",version="1.0.0")
@app.get("/health")
def health(): return {"status":"ok","service":"sanyukt-vaani-nlp"}
@app.post("/api/nlp/process",response_model=QueryResponse)
def process(req:QueryRequest):
    try:
        a=analyze(req.query)
        v=embed_query(a["normalized_query"])
        s=search(v,req.top_k)
        return {"analysis":a,"answer":answer(req.query,a,s),"sources":s}
    except Exception as exc:
        raise HTTPException(status_code=500,detail=str(exc))
