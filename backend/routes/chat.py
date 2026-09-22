from __future__ import annotations

import logging
import re
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import quote

from fastapi import (
    APIRouter,
    BackgroundTasks,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from fastapi.responses import FileResponse

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

# PDF directories supported by this route.
PDF_DIRECTORIES = (
    STATIC_DIR / "documents",
    STATIC_DIR / "pdfs",
    STATIC_DIR,
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
    Convert supported language representation into the
    language code expected by BHASHINI TTS.

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
# SOURCE / PDF HELPERS
# ============================================================

def _safe_filename(value: Any) -> str:
    """
    Return only a safe filename.

    Prevents paths such as:
        ../../secret.pdf
        C:\\private\\file.pdf
    from being used by the PDF endpoint.
    """

    value = str(value or "").strip()

    if not value:
        return ""

    return Path(value).name


def _find_pdf_for_filename(
    filename: str | None,
) -> Path | None:
    """
    Find a real PDF file corresponding to a source filename.

    Supported examples:

        document.pdf
        document.txt -> document.pdf

    Search locations:

        static/documents/
        static/pdfs/
        static/
    """

    safe_name = _safe_filename(filename)

    if not safe_name:
        return None

    candidates: list[str] = []

    # Direct PDF filename.
    if safe_name.lower().endswith(".pdf"):
        candidates.append(safe_name)
    else:
        # Same filename with .pdf extension.
        candidates.append(
            f"{Path(safe_name).stem}.pdf"
        )

    for directory in PDF_DIRECTORIES:

        if not directory.exists():
            continue

        for candidate in candidates:

            pdf_path = (
                directory / candidate
            )

            if (
                pdf_path.exists()
                and pdf_path.is_file()
                and pdf_path.suffix.lower() == ".pdf"
            ):
                return pdf_path.resolve()

    return None


def _resolve_pdf_url(
    source: dict[str, Any],
) -> str | None:
    """
    Resolve a safe PDF URL.

    Priority:

    1. Existing explicit pdf_url
    2. Existing pdfUrl
    3. Existing document_url
    4. Existing documentUrl
    5. Existing url if it points to a PDF
    6. A real PDF found in the backend filesystem

    IMPORTANT:

    We never invent a PDF URL for a TXT file.
    """

    explicit_url = (
        source.get("pdf_url")
        or source.get("pdfUrl")
        or source.get("document_url")
        or source.get("documentUrl")
    )

    if explicit_url:
        return str(explicit_url).strip()

    generic_url = source.get("url")

    if generic_url:
        generic_url = str(
            generic_url
        ).strip()

        if generic_url.lower().endswith(".pdf"):
            return generic_url

    filename = (
        source.get("filename")
        or source.get("file_name")
        or source.get("file")
        or source.get("source")
        or source.get("title")
    )

    pdf_path = _find_pdf_for_filename(
        filename
    )

    if pdf_path is None:
        return None

    pdf_filename = pdf_path.name

    return (
        "/api/chat/documents/"
        + quote(
            pdf_filename,
            safe="",
        )
    )


# ============================================================
# PDF DOWNLOAD ENDPOINT
# ============================================================

@router.get("/documents/{filename}")
async def download_reference_pdf(
    filename: str,
):
    """
    Open/download a verified reference PDF.

    The endpoint only allows PDF files from the configured
    backend PDF directories.

    It never accepts arbitrary filesystem paths.
    """

    safe_name = _safe_filename(
        filename
    )

    if not safe_name:
        raise HTTPException(
            status_code=400,
            detail="Invalid document filename.",
        )

    if not safe_name.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF documents are supported.",
        )

    pdf_path = _find_pdf_for_filename(
        safe_name
    )

    if pdf_path is None:
        raise HTTPException(
            status_code=404,
            detail="PDF document not found.",
        )

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=pdf_path.name,
        headers={
            "Content-Disposition": (
                f'attachment; filename="{pdf_path.name}"'
            )
        },
    )


# ============================================================
# ANSWER CLEANING
# ============================================================

def _remove_source_reference_section(
    text: str,
) -> str:
    """
    Remove accidental source/document reference sections
    generated by the LLM.

    Examples removed:

        Source/Document Reference:
        - file1.txt
        - file2.txt

        Reference Documents:
        - file1.pdf

        Sources:
        - document.pdf

    Source metadata is still returned separately through
    the 'sources' response field.
    """

    if not text:
        return ""

    lines = text.splitlines()

    output_lines: list[str] = []

    inside_reference_section = False

    reference_heading_patterns = [
        r"source\s*/?\s*document\s+reference",
        r"source\s+reference",
        r"document\s+reference",
        r"reference\s+documents?",
        r"source\s+documents?",
        r"references?",
        r"स्रोत\s*/?\s*दस्तावेज़\s+संदर्भ",
        r"दस्तावेज़\s+संदर्भ",
        r"संदर्भ",
    ]

    for line in lines:

        stripped = line.strip()

        if not stripped:
            if inside_reference_section:
                inside_reference_section = False
                continue

            output_lines.append(line)
            continue

        # ----------------------------------------------------
        # Detect source/reference heading.
        # ----------------------------------------------------

        normalized_heading = re.sub(
            r"[*_#:`]+",
            " ",
            stripped,
        )

        normalized_heading = re.sub(
            r"\s+",
            " ",
            normalized_heading,
        ).strip()

        is_reference_heading = any(
            re.fullmatch(
                pattern,
                normalized_heading,
                flags=re.IGNORECASE,
            )
            for pattern in reference_heading_patterns
        )

        if is_reference_heading:

            inside_reference_section = True

            continue

        # ----------------------------------------------------
        # Remove content inside reference section.
        # ----------------------------------------------------

        if inside_reference_section:

            # New markdown heading means a new normal section.
            if re.match(
                r"^#{1,6}\s+",
                stripped,
            ):
                inside_reference_section = False
                output_lines.append(line)
                continue

            # List item.
            if re.match(
                r"^(?:[-*•]|\d+[.)])\s+",
                stripped,
            ):
                continue

            # Filename.
            if re.search(
                r"\.(?:pdf|txt|doc|docx|csv|json)\b",
                stripped,
                flags=re.IGNORECASE,
            ):
                continue

            # URL.
            if re.search(
                r"https?://",
                stripped,
                flags=re.IGNORECASE,
            ):
                continue

            # Another reference/source label.
            if re.search(
                r"\b(source|document|reference|references)\b",
                stripped,
                flags=re.IGNORECASE,
            ):
                continue

            # Otherwise normal answer text begins.
            inside_reference_section = False

            output_lines.append(line)

            continue

        output_lines.append(line)

    return "\n".join(
        output_lines
    )


def _clean_answer_for_response(
    answer: Any,
) -> str:
    """
    Clean model output before returning it to the frontend.

    IMPORTANT:

    This does NOT remove useful markdown.

    It removes:
        - source markers
        - document markers
        - internal retrieval labels
        - source/reference sections
        - excessive separators
        - excessive blank lines

    The frontend remains responsible for visual markdown rendering.
    """

    if answer is None:
        return ""

    text = str(answer).strip()

    if not text:
        return ""

    # --------------------------------------------------------
    # Remove [Source 1], [Document 1], [Chunk 1]
    # --------------------------------------------------------

    text = re.sub(
        r"\[\s*(?:Source|Document|Chunk)\s+\d+\s*\]",
        "",
        text,
        flags=re.IGNORECASE,
    )

    # --------------------------------------------------------
    # Remove internal retrieval labels.
    # --------------------------------------------------------

    text = re.sub(
        r"(?im)^\s*"
        r"(?:retrieval|retrieved|embedding|"
        r"reranker|qdrant|context|metadata)"
        r"\s*[:=].*$",
        "",
        text,
    )

    # --------------------------------------------------------
    # Remove source/document reference section.
    # --------------------------------------------------------

    text = _remove_source_reference_section(
        text
    )

    # --------------------------------------------------------
    # Remove horizontal separator lines.
    # --------------------------------------------------------

    text = re.sub(
        r"(?m)^\s*[-_=+~*]{3,}\s*$",
        "",
        text,
    )

    # --------------------------------------------------------
    # Remove excessive blank lines.
    # --------------------------------------------------------

    text = re.sub(
        r"\n{3,}",
        "\n\n",
        text,
    )

    # --------------------------------------------------------
    # Remove trailing spaces.
    # --------------------------------------------------------

    text = "\n".join(
        line.rstrip()
        for line in text.splitlines()
    )

    return text.strip()


# ============================================================
# TTS ANSWER CLEANING
# ============================================================

def _clean_answer_for_tts(
    answer: Any,
) -> str:
    """
    Prepare ONLY the natural answer for speech synthesis.

    TTS receives:

        answer text only

    TTS does NOT receive:

        - source references
        - filenames
        - PDF names
        - URLs
        - retrieval metadata
        - confidence scores
        - debug information
        - document references
        - source labels
    """

    text = _clean_answer_for_response(
        answer
    )

    if not text:
        return ""

    # --------------------------------------------------------
    # Remove URLs.
    # --------------------------------------------------------

    text = re.sub(
        r"https?://[^\s]+",
        " ",
        text,
        flags=re.IGNORECASE,
    )

    text = re.sub(
        r"\bwww\.[^\s]+",
        " ",
        text,
        flags=re.IGNORECASE,
    )

    # --------------------------------------------------------
    # Convert markdown links to visible text.
    #
    # [PACS information](https://...)
    #
    # becomes:
    #
    # PACS information
    # --------------------------------------------------------

    text = re.sub(
        r"\[([^\]]+)\]\([^)]+\)",
        r"\1",
        text,
    )

    # --------------------------------------------------------
    # Remove markdown headings.
    # --------------------------------------------------------

    text = re.sub(
        r"(?m)^\s*#{1,6}\s+",
        "",
        text,
    )

    # --------------------------------------------------------
    # Remove bold / italic markers.
    # --------------------------------------------------------

    text = text.replace(
        "**",
        "",
    )

    text = text.replace(
        "__",
        "",
    )

    text = text.replace(
        "*",
        "",
    )

    text = text.replace(
        "_",
        "",
    )

    # --------------------------------------------------------
    # Remove inline code markers.
    # --------------------------------------------------------

    text = text.replace(
        "`",
        "",
    )

    # --------------------------------------------------------
    # Remove strikethrough markers.
    # --------------------------------------------------------

    text = text.replace(
        "~~",
        "",
    )

    # --------------------------------------------------------
    # Remove bullet markers.
    # --------------------------------------------------------

    text = re.sub(
        r"(?m)^\s*[-•]\s+",
        "",
        text,
    )

    # --------------------------------------------------------
    # Remove numbered-list formatting.
    # --------------------------------------------------------

    text = re.sub(
        r"(?m)^\s*\d+[.)]\s+",
        "",
        text,
    )

    # --------------------------------------------------------
    # Remove blockquote formatting.
    # --------------------------------------------------------

    text = re.sub(
        r"(?m)^\s*>\s?",
        "",
        text,
    )

    # --------------------------------------------------------
    # Remove markdown table separator rows.
    # --------------------------------------------------------

    text = re.sub(
        r"(?m)^\s*\|?\s*:?-{2,}:?\s*"
        r"(?:\|\s*:?-{2,}:?\s*)+\|?\s*$",
        "",
        text,
    )

    # --------------------------------------------------------
    # Remove table pipes.
    # --------------------------------------------------------

    text = text.replace(
        "|",
        " ",
    )

    # --------------------------------------------------------
    # Remove decorative symbols.
    # --------------------------------------------------------

    text = re.sub(
        r"[★☆✦✧◆◇▪▫►▶✔✓✕✖❖●○■□]",
        " ",
        text,
    )

    # --------------------------------------------------------
    # Remove source/document labels.
    # --------------------------------------------------------

    text = re.sub(
        r"(?im)^\s*"
        r"(?:source|sources|reference|references|"
        r"document|documents|pdf|"
        r"document reference|source reference)"
        r"\s*[:\-].*$",
        "",
        text,
    )

    # --------------------------------------------------------
    # Remove filename-only lines.
    # --------------------------------------------------------

    text = re.sub(
        r"(?im)^\s*"
        r"[\w.\- ]+\."
        r"(?:txt|pdf|doc|docx|csv|json)"
        r"\s*$",
        "",
        text,
    )

    # --------------------------------------------------------
    # Remove confidence/debug lines.
    # --------------------------------------------------------

    text = re.sub(
        r"(?im)^\s*"
        r"(?:final score|similarity score|"
        r"rerank score|retrieval score|confidence score|score)"
        r"\s*[:=]?\s*"
        r"\d+(?:\.\d+)?%?"
        r"\s*$",
        "",
        text,
    )

    # --------------------------------------------------------
    # Remove internal system labels.
    # --------------------------------------------------------

    text = re.sub(
        r"\b(?:qdrant|reranker|embedding|retrieval|"
        r"retrieved|metadata|chunk|gemini)"
        r"\s*[:=]\s*[^\n]+",
        " ",
        text,
        flags=re.IGNORECASE,
    )

    # --------------------------------------------------------
    # Remove repeated punctuation.
    # --------------------------------------------------------

    text = re.sub(
        r"!{2,}",
        "!",
        text,
    )

    text = re.sub(
        r"\?{2,}",
        "?",
        text,
    )

    text = re.sub(
        r"\.{4,}",
        "...",
        text,
    )

    # --------------------------------------------------------
    # Remove invisible/control characters.
    # --------------------------------------------------------

    text = "".join(
        character
        for character in text
        if character.isprintable()
        or character in "\n\t"
    )

    # --------------------------------------------------------
    # Normalize spaces.
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # Remove spaces before punctuation.
    # --------------------------------------------------------

    text = re.sub(
        r"\s+([,.!?;:])",
        r"\1",
        text,
    )

    # --------------------------------------------------------
    # Clean lines.
    # --------------------------------------------------------

    text = "\n".join(
        line.strip()
        for line in text.splitlines()
        if line.strip()
    )

    return text.strip()


# ============================================================
# SOURCE NORMALIZATION
# ============================================================

def _normalize_sources(
    sources: Any,
) -> list[dict[str, Any]]:
    """
    Normalize source metadata returned by the RAG layer.

    Source metadata is kept completely separate from the answer.

    Supported fields:

        title
        source
        filename
        file_name
        page
        page_number
        section
        heading
        score
        confidence
        pdf_url
        pdfUrl
        document_url
        documentUrl
        url
        excerpt
        content
        text
        path
        file_path

    PDF URL behavior:

        If an actual PDF exists, pdf_url is generated.

        If no actual PDF exists, pdf_url remains None.

    We NEVER fake:

        document.txt -> document.pdf

    unless the real PDF actually exists.
    """

    if not isinstance(
        sources,
        list,
    ):
        return []

    normalized: list[
        dict[str, Any]
    ] = []

    for index, source in enumerate(
        sources
    ):

        if not source:
            continue

        # ====================================================
        # STRING SOURCE
        # ====================================================

        if isinstance(
            source,
            str,
        ):

            source_name = source.strip()

            if not source_name:
                continue

            source_item = {
                "id": f"source-{index}",
                "title": source_name,
                "source": source_name,
                "filename": source_name,
                "page": None,
                "section": None,
                "score": None,
                "confidence": None,
                "pdf_url": None,
                "excerpt": "",
                "path": "",
            }

            # Try to find a real PDF.
            source_item["pdf_url"] = (
                _resolve_pdf_url(
                    source_item
                )
            )

            normalized.append(
                source_item
            )

            continue

        # ====================================================
        # DICTIONARY SOURCE
        # ====================================================

        if not isinstance(
            source,
            dict,
        ):
            continue

        title = (
            source.get("title")
            or source.get("document_title")
            or source.get("name")
            or source.get("filename")
            or source.get("file_name")
            or source.get("source")
            or f"Reference Document {index + 1}"
        )

        source_name = (
            source.get("source")
            or source.get("filename")
            or source.get("file_name")
            or source.get("name")
            or ""
        )

        filename = (
            source.get("filename")
            or source.get("file_name")
            or source.get("file")
            or source_name
            or title
        )

        page = (
            source.get("page")
            if source.get("page") is not None
            else source.get("page_number")
        )

        section = (
            source.get("section")
            or source.get("heading")
        )

        score = source.get(
            "score"
        )

        confidence = source.get(
            "confidence"
        )

        excerpt = (
            source.get("excerpt")
            or source.get("content")
            or source.get("text")
            or ""
        )

        path = (
            source.get("path")
            or source.get("file_path")
            or source.get("filepath")
            or ""
        )

        source_item = {
            "id": (
                source.get("id")
                or source.get("source_id")
                or f"source-{index}"
            ),
            "title": str(title),
            "source": str(source_name),
            "filename": str(filename),
            "page": page,
            "section": section,
            "score": score,
            "confidence": confidence,
            "pdf_url": (
                source.get("pdf_url")
                or source.get("pdfUrl")
                or source.get("document_url")
                or source.get("documentUrl")
                or source.get("url")
                or None
            ),
            "excerpt": str(excerpt),
            "path": str(path),
        }

        # Resolve actual PDF only when explicit URL is absent.
        if not source_item["pdf_url"]:

            source_item["pdf_url"] = (
                _resolve_pdf_url(
                    source_item
                )
            )

        normalized.append(
            source_item
        )

    return normalized


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

    output_path = (
        STATIC_DIR / filename
    )

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

    These operations run in background tasks so the main
    text-chat response remains fast.

    IMPORTANT:

    Only the answer is sent to TTS.

    Sources are never passed to TTS.
    """

    clean_answer = _clean_answer_for_tts(
        answer
    )

    # --------------------------------------------------------
    # BACKGROUND TTS
    # --------------------------------------------------------

    if not clean_answer:

        logger.warning(
            "Skipping text-chat TTS because answer is empty"
        )

    else:

        try:

            audio_bytes = (
                bhashini.text_to_speech(
                    clean_answer,
                    language=_tts_language(
                        language
                    ),
                    gender="female",
                )
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

    # --------------------------------------------------------
    # CHAT HISTORY
    # --------------------------------------------------------

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
        answer + sources + language
            ↓
        Frontend

    TTS and history logging run in the background.
    """

    # ========================================================
    # CLEAN INPUT
    # ========================================================

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

    # ========================================================
    # RAG / ANSWER GENERATION
    # ========================================================

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
            detail=(
                "Unable to generate an answer "
                "right now."
            ),
        ) from exc

    if not isinstance(
        result,
        dict,
    ):

        logger.error(
            "RAG returned invalid result type: %s",
            type(result).__name__,
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Invalid answer received from "
                "the knowledge system."
            ),
        )

    # ========================================================
    # ANSWER
    # ========================================================

    answer = _clean_answer_for_response(
        result.get("answer")
    )

    if not answer:

        raise HTTPException(
            status_code=502,
            detail=(
                "The answer generator returned "
                "an empty answer."
            ),
        )

    # ========================================================
    # SOURCES
    # ========================================================

    sources = _normalize_sources(
        result.get(
            "sources",
            [],
        )
    )

    # ========================================================
    # RESPONSE LANGUAGE
    # ========================================================

    response_language = _clean_language(
        result.get("language"),
        default=selected_language,
    )

    if response_language == "auto":

        response_language = (
            selected_language
        )

    tts_language = _tts_language(
        response_language,
        default=selected_language,
    )

    # ========================================================
    # BACKGROUND TTS + HISTORY
    # ========================================================

    background_tasks.add_task(
        _generate_text_chat_side_effects,
        answer,
        tts_language,
        user_id,
        cleaned_query,
        sources,
    )

    # ========================================================
    # RESPONSE
    # ========================================================

    return {
        "query": cleaned_query,

        # ONLY the user-facing answer.
        "answer": answer,

        # Completely separate document metadata.
        "sources": sources,

        # Final language.
        "language": response_language,

        # Text chat TTS remains background-only.
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
        detected language
              ↓
        RAG
              ↓
        multilingual answer
              ↓
        answer + sources + language
              ↓
        frontend speech playback
    """

    # ========================================================
    # VALIDATE FILE
    # ========================================================

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

    # ========================================================
    # LANGUAGE + AUDIO FORMAT
    # ========================================================

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

    # ========================================================
    # SPEECH TO TEXT
    # ========================================================

    try:

        # BHASHINI ASR requires a concrete source language.

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

    # ========================================================
    # VALIDATE ASR RESPONSE
    # ========================================================

    if not isinstance(
        stt,
        dict,
    ):

        logger.error(
            "Invalid BHASHINI ASR response: %r",
            stt,
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Invalid response received from "
                "speech recognition."
            ),
        )

    transcript = str(
        stt.get("text") or ""
    ).strip()

    if not transcript:

        raise HTTPException(
            status_code=502,
            detail=(
                "Speech recognition returned "
                "an empty transcript."
            ),
        )

    # ========================================================
    # DETECT LANGUAGE
    # ========================================================

    detected_language = _clean_language(
        stt.get("language"),
        default=(
            requested_language
            if requested_language != "auto"
            else "hi"
        ),
    )

    # Never allow auto to reach RAG.

    if detected_language == "auto":

        detected_language = (
            requested_language
            if requested_language != "auto"
            else "hi"
        )

    logger.info(
        "Voice transcript='%s' detected_language=%s",
        transcript,
        detected_language,
    )

    # ========================================================
    # RAG / ANSWER GENERATION
    # ========================================================

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
            detail=(
                "Unable to generate an answer "
                "right now."
            ),
        ) from exc

    if not isinstance(
        result,
        dict,
    ):

        logger.error(
            "Voice RAG returned invalid result type: %s",
            type(result).__name__,
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Invalid answer received from "
                "the knowledge system."
            ),
        )

    # ========================================================
    # CLEAN ANSWER
    # ========================================================

    answer = _clean_answer_for_response(
        result.get("answer")
    )

    if not answer:

        raise HTTPException(
            status_code=502,
            detail=(
                "The answer generator returned "
                "an empty answer."
            ),
        )

    # ========================================================
    # SOURCES
    # ========================================================

    sources = _normalize_sources(
        result.get(
            "sources",
            [],
        )
    )

    # ========================================================
    # FINAL RESPONSE LANGUAGE
    # ========================================================

    response_language = _clean_language(
        result.get("language"),
        default=detected_language,
    )

    if response_language == "auto":

        response_language = (
            detected_language
        )

    # ========================================================
    # FRONTEND TTS
    # ========================================================
    #
    # IMPORTANT:
    #
    # Voice-chat TTS is intentionally NOT generated here.
    #
    # Chat.jsx receives:
    #
    #     answer
    #     detected_language
    #
    # and performs frontend speech playback.
    #
    # This prevents:
    #
    #     backend speech + frontend speech
    #
    # from playing simultaneously.
    # ========================================================

    audio_url: str | None = None

    # ========================================================
    # CHAT HISTORY
    # ========================================================

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

    # ========================================================
    # RESPONSE
    # ========================================================

    return {
        # Original recognized speech.
        "transcribed_text": transcript,

        # Language detected from voice.
        "detected_language": detected_language,

        # ONLY the user-facing answer.
        "answer": answer,

        # Completely separate source metadata.
        "sources": sources,

        # Final language.
        "language": response_language,

        # Backend voice TTS intentionally disabled.
        "audio_response": audio_url,
    }