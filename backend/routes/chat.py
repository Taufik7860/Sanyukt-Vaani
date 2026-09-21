from __future__ import annotations

import logging
import re
import uuid
from pathlib import Path
from typing import Any

from fastapi import (
    APIRouter,
    BackgroundTasks,
    File,
    Form,
    HTTPException,
    UploadFile,
)

from backend.services.bhashini import bhashini
from backend.services.rag import answer_with_context
from backend.services.supabase import supabase_service


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/api/chat",
    tags=["Chat"],
)


# ============================================================
# PROJECT / STATIC CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

STATIC_DIR = BASE_DIR / "static"
STATIC_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# ============================================================
# LANGUAGE CONFIGURATION
# ============================================================

SUPPORTED_LANGUAGES = {
    "en": "en",
    "english": "en",
    "eng": "en",
    "en-in": "en",
    "en-us": "en",

    "hi": "hi",
    "hindi": "hi",
    "hin": "hi",
    "hi-in": "hi",

    "mr": "mr",
    "marathi": "mr",
    "mar": "mr",
    "mr-in": "mr",

    "bn": "bn",
    "bengali": "bn",

    "ta": "ta",
    "tamil": "ta",

    "te": "te",
    "telugu": "te",

    "gu": "gu",
    "gujarati": "gu",

    "kn": "kn",
    "kannada": "kn",

    "ml": "ml",
    "malayalam": "ml",

    "pa": "pa",
    "punjabi": "pa",

    "or": "or",
    "odia": "or",

    "as": "as",
    "assamese": "as",

    "ur": "ur",
    "urdu": "ur",
}


LANGUAGE_ALIASES = {
    "मराठी": "mr",
    "हिंदी": "hi",
    "हिन्दी": "hi",
    "इंग्रजी": "en",
    "इंग्लिश": "en",

    "मराठि": "mr",
    "मराठी भाषा": "mr",
    "हिंदी भाषा": "hi",
    "हिन्दी भाषा": "hi",
}


def _clean_language(
    language: str | None,
    default: str = "hi",
) -> str:
    """
    Normalize language input to a stable language code.

    Examples:
        english -> en
        English -> en
        hindi -> hi
        Hindi -> hi
        marathi -> mr
        Marathi -> mr
        mr -> mr
        hi -> hi
        auto -> auto
    """

    value = str(language or "").strip().lower()

    if not value:
        return default

    if value == "auto":
        return "auto"

    if value in LANGUAGE_ALIASES:
        return LANGUAGE_ALIASES[value]

    return SUPPORTED_LANGUAGES.get(
        value,
        value,
    )


def _tts_language(
    language: str | None,
    default: str = "hi",
) -> str:
    """
    Convert any supported language representation into
    the language code expected by BHASHINI TTS.

    Never pass 'auto' to TTS.
    """

    normalized = _clean_language(
        language,
        default=default,
    )

    if normalized == "auto":
        return default

    return normalized


# ============================================================
# ANSWER CLEANING
# ============================================================

def _clean_answer_for_response(
    answer: Any,
) -> str:
    """
    Clean model output before returning it to the frontend.

    This prevents accidental retrieval wrappers, markdown
    separators, or internal response markers from reaching
    the UI and TTS layer.
    """

    if answer is None:
        return ""

    text = str(answer).strip()

    if not text:
        return ""

    # Remove common internal/source wrappers.
    text = re.sub(
        r"\[Source\s+\d+\]",
        "",
        text,
        flags=re.IGNORECASE,
    )

    text = re.sub(
        r"\[Document\s+\d+\]",
        "",
        text,
        flags=re.IGNORECASE,
    )

    text = re.sub(
        r"\[Chunk\s+\d+\]",
        "",
        text,
        flags=re.IGNORECASE,
    )

    # Remove common markdown separators.
    text = re.sub(
        r"^[\s_\-=+*#~`|]+$",
        "",
        text,
        flags=re.MULTILINE,
    )

    # Remove horizontal markdown rules.
    text = re.sub(
        r"(?m)^\s*[-_=*]{3,}\s*$",
        "",
        text,
    )

    # Remove excessive blank lines.
    text = re.sub(
        r"\n{3,}",
        "\n\n",
        text,
    )

    return text.strip()


def _clean_answer_for_tts(
    answer: Any,
) -> str:
    """
    Prepare the final answer for speech synthesis.

    TTS should receive only natural answer text.
    It should not read markdown, source labels,
    internal markers, or decorative symbols.
    """

    text = _clean_answer_for_response(answer)

    if not text:
        return ""

    # Remove markdown links while preserving visible text.
    text = re.sub(
        r"\[([^\]]+)\]\([^)]+\)",
        r"\1",
        text,
    )

    # Remove common markdown emphasis.
    text = text.replace("**", "")
    text = text.replace("__", "")
    text = text.replace("~~", "")
    text = text.replace("`", "")

    # Remove source-like labels.
    text = re.sub(
        r"(?im)^\s*(source|sources|reference|references)\s*:.*$",
        "",
        text,
    )

    # Remove decorative separators.
    text = re.sub(
        r"(?m)^\s*[-_=+*#~|]{3,}\s*$",
        "",
        text,
    )

    # Convert bullets to natural spoken text.
    text = re.sub(
        r"(?m)^\s*[-*•]\s+",
        "",
        text,
    )

    # Remove unusual repeated punctuation.
    text = re.sub(
        r"([!?.,])\1{2,}",
        r"\1",
        text,
    )

    # Remove invisible/control characters.
    text = "".join(
        character
        for character in text
        if character.isprintable() or character in "\n\t"
    )

    # Collapse excessive whitespace.
    text = re.sub(
        r"[ \t]{2,}",
        " ",
        text,
    )

    text = re.sub(
        r"\n{3,}",
        "\n\n",
        text,
    )

    return text.strip()


# ============================================================
# TTS FILE HANDLING
# ============================================================

def _save_tts_audio(
    audio_bytes: bytes,
) -> str:
    """
    Save generated TTS audio and return the public API path.
    """

    if not audio_bytes:
        raise ValueError(
            "TTS returned empty audio data"
        )

    filename = (
        f"tts_{uuid.uuid4().hex}.wav"
    )

    output_path = STATIC_DIR / filename

    output_path.write_bytes(
        audio_bytes
    )

    return f"/static/{filename}"


# ============================================================
# INPUT AUDIO FORMAT
# ============================================================

def _audio_format(
    content_type: str | None,
    filename: str | None,
) -> str:
    """
    Detect uploaded audio format.

    Browser recording normally produces WebM/Opus.
    """

    content_type_value = (
        content_type or ""
    ).lower()

    filename_value = (
        filename or ""
    ).lower()

    if (
        "wav" in content_type_value
        or filename_value.endswith(".wav")
    ):
        return "wav"

    if (
        "flac" in content_type_value
        or filename_value.endswith(".flac")
    ):
        return "flac"

    if (
        "webm" in content_type_value
        or filename_value.endswith(".webm")
    ):
        return "webm"

    if (
        "ogg" in content_type_value
        or filename_value.endswith(".ogg")
    ):
        return "ogg"

    if (
        "mp3" in content_type_value
        or filename_value.endswith(".mp3")
    ):
        return "mp3"

    # Preserve existing fallback behavior.
    return "wav"


# ============================================================
# TEXT CHAT BACKGROUND TASKS
# ============================================================

def _generate_text_chat_side_effects(
    answer: str,
    language: str,
    user_id: str,
    query: str,
    sources: list,
) -> None:
    """
    Generate TTS and save chat history after text response.

    These operations are intentionally performed as background
    tasks so text-chat response latency stays low.
    """

    clean_answer = _clean_answer_for_tts(
        answer
    )

    if not clean_answer:
        logger.warning(
            "Skipping text-chat TTS because answer is empty"
        )
    else:
        try:
            audio_bytes = bhashini.text_to_speech(
                clean_answer,
                language=_tts_language(language),
                gender="female",
            )

            audio_url = _save_tts_audio(
                audio_bytes
            )

            logger.info(
                "Background TTS generated at %s",
                audio_url,
            )

        except Exception:
            logger.exception(
                "BHASHINI TTS failed for text chat"
            )

    try:
        supabase_service.log_chat_history(
            user_id,
            query,
            answer,
            sources,
        )

    except Exception:
        logger.exception(
            "Chat history logging failed"
        )


# ============================================================
# TEXT CHAT
# ============================================================

@router.post("/text")
async def chat_text(
    background_tasks: BackgroundTasks,
    query: str = Form(...),
    language: str = Form("hi"),
    user_id: str = Form("guest_user"),
):
    """
    Process a typed multilingual user query.

    Flow:

        Frontend
            ↓
        query + language
            ↓
        RAG
            ↓
        grounded multilingual answer
            ↓
        frontend response

    TTS and history logging run in the background.
    """

    cleaned_query = (
        query or ""
    ).strip()

    selected_language = _clean_language(
        language,
        default="hi",
    )

    if not cleaned_query:
        raise HTTPException(
            status_code=400,
            detail="Query is required",
        )

    # --------------------------------------------------------
    # RAG / ANSWER GENERATION
    # --------------------------------------------------------

    try:
        result = await answer_with_context(
            cleaned_query,
            language=selected_language,
        )

    except Exception as exc:
        logger.exception(
            "Text chat processing failed"
        )

        raise HTTPException(
            status_code=502,
            detail="Unable to generate an answer right now.",
        ) from exc

    if not isinstance(result, dict):
        logger.error(
            "RAG returned invalid result type: %s",
            type(result).__name__,
        )

        raise HTTPException(
            status_code=502,
            detail="Invalid answer received from the knowledge system.",
        )

    # --------------------------------------------------------
    # ANSWER
    # --------------------------------------------------------

    answer = _clean_answer_for_response(
        result.get("answer")
    )

    if not answer:
        raise HTTPException(
            status_code=502,
            detail="The answer generator returned an empty answer.",
        )

    # --------------------------------------------------------
    # SOURCES
    # --------------------------------------------------------

    sources = result.get(
        "sources",
        [],
    )

    if not isinstance(sources, list):
        sources = []

    # --------------------------------------------------------
    # RESPONSE LANGUAGE
    # --------------------------------------------------------

    response_language = _clean_language(
        result.get("language"),
        default=selected_language,
    )

    if response_language == "auto":
        response_language = selected_language

    tts_language = _tts_language(
        response_language,
        default=selected_language,
    )

    # --------------------------------------------------------
    # BACKGROUND TTS + HISTORY
    # --------------------------------------------------------

    background_tasks.add_task(
        _generate_text_chat_side_effects,
        answer,
        tts_language,
        user_id,
        cleaned_query,
        sources,
    )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "query": cleaned_query,
        "answer": answer,
        "sources": sources,
        "language": response_language,
        "audio_response_path": None,
    }


# ============================================================
# VOICE CHAT
# ============================================================

@router.post("/voice")
async def chat_voice(
    file: UploadFile = File(...),
    user_id: str = Form("guest_user"),
    language: str = Form("auto"),
):
    """
    Process uploaded voice input.

    Flow:

        Browser microphone
              ↓
        audio upload
              ↓
        BHASHINI ASR
              ↓
        transcript
              ↓
        language detection
              ↓
        RAG
              ↓
        multilingual answer
              ↓
        frontend receives answer + language
              ↓
        frontend handles speech playback
    """

    # --------------------------------------------------------
    # VALIDATE FILE
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # LANGUAGE + AUDIO FORMAT
    # --------------------------------------------------------

    requested_language = _clean_language(
        language,
        default="auto",
    )

    audio_format = _audio_format(
        file.content_type,
        file.filename,
    )

    logger.info(
        "Voice request: language=%s format=%s filename=%s",
        requested_language,
        audio_format,
        file.filename,
    )

    # --------------------------------------------------------
    # SPEECH TO TEXT
    # --------------------------------------------------------

    try:
        # BHASHINI ASR needs a concrete source language.
        #
        # If frontend sends auto, English is used as the
        # initial ASR language. BHASHINI may return the
        # detected language in the response.
        asr_language = (
            "en"
            if requested_language == "auto"
            else _tts_language(
                requested_language,
                default="hi",
            )
        )

        stt = bhashini.speech_to_text(
            audio_bytes=audio,
            source_language=asr_language,
            audio_format=audio_format,
        )

    except Exception as exc:
        logger.exception(
            "BHASHINI ASR failed"
        )

        raise HTTPException(
            status_code=502,
            detail="Speech recognition failed.",
        ) from exc

    # --------------------------------------------------------
    # VALIDATE ASR RESPONSE
    # --------------------------------------------------------

    if not isinstance(stt, dict):
        logger.error(
            "Invalid BHASHINI ASR response: %r",
            stt,
        )

        raise HTTPException(
            status_code=502,
            detail="Invalid response received from speech recognition.",
        )

    transcript = str(
        stt.get("text") or ""
    ).strip()

    if not transcript:
        raise HTTPException(
            status_code=502,
            detail="Speech recognition returned an empty transcript.",
        )

    # --------------------------------------------------------
    # DETECT LANGUAGE
    # --------------------------------------------------------

    detected_language = _clean_language(
        stt.get("language"),
        default=(
            requested_language
            if requested_language != "auto"
            else "hi"
        ),
    )

    # Never allow "auto" to reach RAG.
    if detected_language == "auto":
        detected_language = "hi"

    logger.info(
        "Voice transcript='%s' detected_language=%s",
        transcript,
        detected_language,
    )

    # --------------------------------------------------------
    # RAG / ANSWER GENERATION
    # --------------------------------------------------------

    try:
        result = await answer_with_context(
            transcript,
            language=detected_language,
        )

    except Exception as exc:
        logger.exception(
            "Voice chat RAG processing failed"
        )

        raise HTTPException(
            status_code=502,
            detail="Unable to generate an answer right now.",
        ) from exc

    if not isinstance(result, dict):
        logger.error(
            "Voice RAG returned invalid result type: %s",
            type(result).__name__,
        )

        raise HTTPException(
            status_code=502,
            detail="Invalid answer received from the knowledge system.",
        )

    # --------------------------------------------------------
    # CLEAN ANSWER
    # --------------------------------------------------------

    answer = _clean_answer_for_response(
        result.get("answer")
    )

    if not answer:
        raise HTTPException(
            status_code=502,
            detail="The answer generator returned an empty answer.",
        )

    # --------------------------------------------------------
    # SOURCES
    # --------------------------------------------------------

    sources = result.get(
        "sources",
        [],
    )

    if not isinstance(sources, list):
        sources = []

    # --------------------------------------------------------
    # FINAL RESPONSE LANGUAGE
    # --------------------------------------------------------

    response_language = _clean_language(
        result.get("language"),
        default=detected_language,
    )

    if response_language == "auto":
        response_language = detected_language

    # --------------------------------------------------------
    # TEXT TO SPEECH
    # --------------------------------------------------------
    #
    # IMPORTANT:
    # Voice-chat TTS is intentionally handled by the frontend.
    # The frontend already knows the detected language and calls
    # speakText(answer, detected_language). Generating TTS here
    # would duplicate speech and adds unnecessary latency.
    #
    # Therefore this endpoint returns only the final text answer
    # and language metadata.
    # --------------------------------------------------------

    audio_url: str | None = None

    # --------------------------------------------------------
    # CHAT HISTORY
    # --------------------------------------------------------

    try:
        supabase_service.log_chat_history(
            user_id,
            transcript,
            answer,
            sources,
        )

    except Exception:
        logger.exception(
            "Voice chat history logging failed"
        )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "transcribed_text": transcript,
        "detected_language": detected_language,
        "answer": answer,
        "sources": sources,
        "audio_response": audio_url,
    }