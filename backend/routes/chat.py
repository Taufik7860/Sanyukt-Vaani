from __future__ import annotations

import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile

from backend.services.bhashini import bhashini
from backend.services.rag import answer_with_context
from backend.services.supabase import supabase_service

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/chat", tags=["Chat"])

# Project-root/static directory.
BASE_DIR = Path(__file__).resolve().parents[2]
STATIC_DIR = BASE_DIR / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)


def _clean_language(language: str | None, default: str = "hi") -> str:
    """
    Normalize language input without changing the application's
    existing language-code convention.
    """
    value = (language or "").strip().lower()
    return value or default


def _save_tts_audio(audio_bytes: bytes) -> str:
    """
    Save generated TTS audio and return the public API path.
    """
    if not audio_bytes:
        raise ValueError("TTS returned empty audio data")

    filename = f"tts_{uuid.uuid4().hex}.wav"
    output_path = STATIC_DIR / filename
    output_path.write_bytes(audio_bytes)

    return f"/static/{filename}"


def _audio_format(
    content_type: str | None,
    filename: str | None,
) -> str:
    """
    Detect the input audio format.

    Note:
    Browser-recorded WebM/Opus audio may require conversion to WAV
    or FLAC before BHASHINI ASR can process it.
    """
    content_type_value = (content_type or "").lower()
    filename_value = (filename or "").lower()

    if "wav" in content_type_value or filename_value.endswith(".wav"):
        return "wav"

    if "flac" in content_type_value or filename_value.endswith(".flac"):
        return "flac"

    if "webm" in content_type_value or filename_value.endswith(".webm"):
        return "webm"

    if "ogg" in content_type_value or filename_value.endswith(".ogg"):
        return "ogg"

    if "mp3" in content_type_value or filename_value.endswith(".mp3"):
        return "mp3"

    # Preserve the previous fallback behavior.
    return "wav"


def _generate_text_chat_side_effects(
    answer: str,
    language: str,
    user_id: str,
    query: str,
    sources: list,
) -> None:
    try:
        audio_bytes = bhashini.text_to_speech(
            answer,
            language=language,
            gender="female",
        )
        audio_url = _save_tts_audio(audio_bytes)
        logger.info("Background TTS generated at %s", audio_url)
    except Exception:
        logger.exception("BHASHINI TTS failed for text chat")

    try:
        supabase_service.log_chat_history(
            user_id,
            query,
            answer,
            sources,
        )
    except Exception:
        logger.exception("Chat history logging failed")


@router.post("/text")
async def chat_text(
    background_tasks: BackgroundTasks,
    query: str = Form(...),
    language: str = Form("hi"),
    user_id: str = Form("guest_user"),
):
    """
    Process a typed multilingual user query.
    """
    cleaned_query = query.strip()
    selected_language = _clean_language(language)

    if not cleaned_query:
        raise HTTPException(
            status_code=400,
            detail="Query is required",
        )

    try:
        result = await answer_with_context(
            cleaned_query,
            language=selected_language,
        )
    except Exception as exc:
        logger.exception("Text chat processing failed")
        raise HTTPException(
            status_code=502,
            detail="Unable to generate an answer right now.",
        ) from exc

    answer = result.get("answer", "")
    sources = result.get("sources", [])
    response_language = result.get("language") or selected_language
    tts_language = {
        "english": "en",
        "hindi": "hi",
        "marathi": "mr",
    }.get(str(response_language).lower(), response_language)

    background_tasks.add_task(
        _generate_text_chat_side_effects,
        answer,
        tts_language,
        user_id,
        cleaned_query,
        sources,
    )

    return {
        "query": cleaned_query,
        "answer": answer,
        "sources": sources,
        "language": response_language,
        "audio_response_path": None,
    }


@router.post("/voice")
async def chat_voice(
    file: UploadFile = File(...),
    user_id: str = Form("guest_user"),
    language: str = Form("auto"),
):
    """
    Process uploaded voice input:

    1. Read audio file.
    2. Convert speech to text using BHASHINI ASR.
    3. Send transcript to the RAG pipeline.
    4. Generate optional BHASHINI TTS audio.
    """
    if file is None:
        raise HTTPException(
            status_code=400,
            detail="Audio file is required",
        )

    audio = await file.read()

    if not audio:
        raise HTTPException(
            status_code=400,
            detail="Empty audio file",
        )

    requested_language = _clean_language(language, default="auto")
    audio_format = _audio_format(
        file.content_type,
        file.filename,
    )

    try:
        stt = bhashini.speech_to_text(
            audio_bytes=audio,
            source_language=(
                "en"
                if requested_language in {"auto", "en", "english"}
                else requested_language
            ),
            audio_format=audio_format,
        )
    except Exception as exc:
        logger.exception("BHASHINI ASR failed")
        raise HTTPException(
            status_code=502,
            detail="Speech recognition failed.",
        ) from exc

    if not isinstance(stt, dict):
        raise HTTPException(
            status_code=502,
            detail="Invalid response received from speech recognition.",
        )

    transcript = str(stt.get("text") or "").strip()

    if not transcript:
        raise HTTPException(
            status_code=502,
            detail="Speech recognition returned an empty transcript.",
        )

    detected_language = _clean_language(
        stt.get("language"),
        default=(
            requested_language
            if requested_language != "auto"
            else "hi"
        ),
    )

    try:
        result = await answer_with_context(
            transcript,
            language=detected_language,
        )
    except Exception as exc:
        logger.exception("Voice chat RAG processing failed")
        raise HTTPException(
            status_code=502,
            detail="Unable to generate an answer right now.",
        ) from exc

    answer = result.get("answer", "")
    sources = result.get("sources", [])

    audio_url: str | None = None

    try:
        tts_bytes = bhashini.text_to_speech(
            answer,
            language=detected_language,
            gender="female",
        )
        audio_url = _save_tts_audio(tts_bytes)
    except Exception:
        # Voice response still returns text if TTS is unavailable.
        logger.exception("BHASHINI TTS failed for voice chat")

    try:
        supabase_service.log_chat_history(
            user_id,
            transcript,
            answer,
            sources,
        )
    except Exception:
        logger.exception("Voice chat history logging failed")

    return {
        "transcribed_text": transcript,
        "detected_language": detected_language,
        "answer": answer,
        "sources": sources,
        "audio_response": audio_url,
    }