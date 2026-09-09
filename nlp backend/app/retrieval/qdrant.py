from qdrant_client import QdrantClient
from app.config import QDRANT_URL,QDRANT_API_KEY,COLLECTION_NAME
client=QdrantClient(url=QDRANT_URL,api_key=QDRANT_API_KEY or None)
def normalize_hit(hit):
    p=hit.payload or {}; m=p.get("metadata")
    if not isinstance(m,dict): m={}
    for k in ("source","document","page","chunk_id"):
        if k in p and k not in m: m[k]=p[k]
    return {"score":float(hit.score),"text":str(p.get("text","")),"metadata":m}
def search(vector,top_k=5,collection_name=COLLECTION_NAME):
    hits=client.query_points(collection_name=collection_name,query=vector,limit=top_k,with_payload=True).points
    return [normalize_hit(h) for h in hits]
