from __future__ import annotations

import asyncio
import logging
from functools import lru_cache

from google import genai
from google.genai import types

from backend.config import settings


logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_gemini_client() -> genai.Client:
    """
    Create and cache one Gemini client.

    The client is created only when first needed.
    """

    api_key = settings.GEMINI_API_KEY

    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is missing. "
            "Please add it to the .env file."
        )

    return genai.Client(api_key=api_key)


def _generate_response_sync(prompt: str) -> str:
    """
    Synchronous Gemini API call.

    This function is executed in a background thread by
    the async generate_response() function below.
    """

    if not prompt or not prompt.strip():
        raise ValueError("Prompt cannot be empty.")

    client = get_gemini_client()

    model_name = settings.GEMINI_MODEL or "gemini-3.6-flash"

    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.2,
            max_output_tokens=2048,
        ),
    )

    answer = response.text or ""

    if not answer.strip():
        logger.warning("Gemini returned an empty response.")
        raise RuntimeError("Gemini returned an empty response.")

    return answer.strip()


async def generate_response(prompt: str) -> str:
    """
    Generate a response from Gemini asynchronously.

    Existing backend code can call:

        answer = await generate_response(prompt)
    """

    try:
        return await asyncio.to_thread(
            _generate_response_sync,
            prompt,
        )

    except Exception:
        logger.exception("Gemini response generation failed.")
        raise