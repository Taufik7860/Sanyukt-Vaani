from __future__ import annotations

from functools import lru_cache

from backend.config import settings


@lru_cache(maxsize=1)
def _get_embedding_model():
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(settings.EMBEDDING_MODEL)


def embed_text(text: str, task_type: str = "RETRIEVAL_QUERY") -> list[float]:
    if not text or not text.strip():
        raise ValueError("Text cannot be empty.")

    vector = _get_embedding_model().encode(
        text,
        normalize_embeddings=True,
    )
    values = vector.tolist()

    if len(values) != settings.EMBEDDING_DIMENSION:
        raise RuntimeError(
            f"Embedding model returned {len(values)} dimensions; "
            f"expected {settings.EMBEDDING_DIMENSION}."
        )

    return values
