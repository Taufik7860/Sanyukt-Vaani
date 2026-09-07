# backend/services/llm.py
from google import genai
from backend.config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)

async def generate_response(prompt: str) -> str:
    """Generates response text using Gemini 2.5 Flash."""
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )
    return response.text