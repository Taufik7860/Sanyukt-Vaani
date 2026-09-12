from __future__ import annotations

from google import genai
from google.genai import types

from backend.config import settings

_client = genai.Client(api_key=settings.GEMINI_API_KEY)


async def generate_response(prompt: str) -> str:
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is missing.")

    response = _client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.2,
        ),
    )
    return response.text or ""
