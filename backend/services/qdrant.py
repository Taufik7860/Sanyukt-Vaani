from __future__ import annotations

from typing import Any

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from backend.config import settings
from backend.services.embeddings import embed_text


class QdrantService:
    def __init__(self):
        self.client = None
        if settings.QDRANT_URL:
            self.client = QdrantClient(
                url=settings.QDRANT_URL,
                api_key=settings.QDRANT_API_KEY or None,
            )

    def ensure_collection(self, collection_name: str | None = None):
        if not self.client:
            return False
        name = collection_name or settings.QDRANT_COLLECTION
        existing = [c.name for c in self.client.get_collections().collections]
        if name not in existing:
            self.client.create_collection(
                collection_name=name,
                vectors_config=VectorParams(
                    size=settings.EMBEDDING_DIMENSION,
                    distance=Distance.COSINE,
                ),
            )
        return True

    def upsert_documents(
        self,
        documents: list[dict[str, Any]],
        collection_name: str | None = None,
    ):
        if not self.client:
            raise RuntimeError("QDRANT_URL is not configured.")

        name = collection_name or settings.QDRANT_COLLECTION
        self.ensure_collection(name)

        points = []
        for doc in documents:
            vector = embed_text(
                doc["text"],
                task_type="RETRIEVAL_DOCUMENT",
            )
            points.append(
                PointStruct(
                    id=doc.get("id") or abs(hash(doc["text"])),
                    vector=vector,
                    payload=doc,
                )
            )

        self.client.upsert(collection_name=name, points=points)
        return len(points)

    def search(self, query: str, collection_name: str, limit: int = 5):
        if not self.client:
            return []

        try:
            vector = embed_text(query, task_type="RETRIEVAL_QUERY")
            result = self.client.query_points(
                collection_name=collection_name,
                query=vector,
                limit=limit,
                with_payload=True,
            )
        except Exception:
            return []

        output = []
        for point in result.points:
            payload = point.payload or {}
            output.append({
                **payload,
                "score": point.score,
                "text": payload.get("text", ""),
            })
        return [x for x in output if x["text"]]


qdrant_service = QdrantService()
