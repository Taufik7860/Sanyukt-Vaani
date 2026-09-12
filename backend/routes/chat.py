from __future__ import annotations

import uuid
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from backend.services.bhashini import bhashini
from backend.services.rag import answer_with_context
from backend.services.supabase import supabase_service

router = APIRouter(prefix="/api/chat", tags=["Chat"])


@router.post("/text")
async def chat_text(
    query: str = Form(...),
    language: str = Form("hi"),
    user_id: str = Form("guest_user"),
):
    if not query.strip():
        raise HTTPException(status_code=400, detail="Query is required")

    result = await answer_with_context(query.strip(), language=language)

    # Optional history logging. It is a no-op if Supabase is not configured.
    supabase_service.log_chat_history(
        user_id, query.strip(), result["answer"], result.get("sources", [])
    )

    audio_url = None
    try:
        audio_bytes = bhashini.text_to_speech(
            result["answer"], language=language, gender="female"
        )
        filename = f"tts_{uuid.uuid4().hex}.wav"
        with open(f"static/{filename}", "wb") as f:
            f.write(audio_bytes)
        audio_url = f"/static/{filename}"
    except Exception:
        # Text chat still works when TTS is unavailable.
        audio_url = None

    return {
        "query": query,
        "answer": result["answer"],
        "sources": result.get("sources", []),
        "language": language,
        "audio_response_path": audio_url,
    }


@router.post("/voice")
async def chat_voice(
    file: UploadFile = File(...),
    user_id: str = Form("guest_user"),
    language: str = Form("auto"),
):
    audio = await file.read()
    if not audio:
        raise HTTPException(status_code=400, detail="Empty audio file")

    # BHASHINI ASR needs audio bytes encoded as base64.
    # Browser-recorded WebM/Opus may need conversion to WAV/FLAC before this call.
    try:
        stt = bhashini.speech_to_text(
            audio_bytes=audio,
            source_language=None if language == "auto" else language,
            audio_format=_audio_format(file.content_type, file.filename),
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"BHASHINI ASR failed: {exc}") from exc

    transcript = stt["text"]
    detected_language = stt.get("language") or (
        language if language != "auto" else "hi"
    )

    result = await answer_with_context(transcript, language=detected_language)

    audio_url = None
    try:
        tts_bytes = bhashini.text_to_speech(
            result["answer"], language=detected_language, gender="female"
        )
        output_name = f"tts_{uuid.uuid4().hex}.wav"
        with open(f"static/{output_name}", "wb") as f:
            f.write(tts_bytes)
        audio_url = f"/static/{output_name}"
    except Exception:
        pass

    supabase_service.log_chat_history(
        user_id, transcript, result["answer"], result.get("sources", [])
    )

    return {
        "transcribed_text": transcript,
        "detected_language": detected_language,
        "answer": result["answer"],
        "sources": result.get("sources", []),
        "audio_response": audio_url,
    }


def _audio_format(content_type: str | None, filename: str | None) -> str:
    value = (content_type or "").lower()
    name = (filename or "").lower()
    if "wav" in value or name.endswith(".wav"):
        return "wav"
    if "flac" in value or name.endswith(".flac"):
        return "flac"
    return "wav"
