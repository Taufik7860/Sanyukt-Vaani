from __future__ import annotations

from google import genai
from google.genai import types

from backend.config import settings

_client = genai.Client(api_key=settings.GEMINI_API_KEY)


def embed_text(text: str, task_type: str = "RETRIEVAL_QUERY") -> list[float]:
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is missing.")
    result = _client.models.embed_content(
        model=settings.GEMINI_EMBEDDING_MODEL,
        contents=text,
        config=types.EmbedContentConfig(
            task_type=task_type,
            output_dimensionality=settings.EMBEDDING_DIMENSION,
        ),
    )
    return result.embeddings[0].values
