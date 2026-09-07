# backend/services/embeddings.py
from google import genai
from backend.config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)

def get_query_embedding(text: str) -> list[float]:
    """Generates a text vector embedding using Gemini text-embedding-004."""
    response = client.models.embed_content(
        model="text-embedding-004",
        contents=text
    )
    return response.embedding.values