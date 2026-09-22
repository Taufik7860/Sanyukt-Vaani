from __future__ import annotations

import logging
from typing import Any

from backend.config import settings
from backend.services.answer_generator import generate_grounded_answer
from backend.services.language_detector import detect_language
from backend.services.qdrant import qdrant_service


logger = logging.getLogger(__name__)


# ============================================================
# SUPPORTED LANGUAGES
# ============================================================

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "mr": "Marathi",
    "bn": "Bengali",
    "ta": "Tamil",
    "te": "Telugu",
    "gu": "Gujarati",
    "kn": "Kannada",
    "ml": "Malayalam",
    "pa": "Punjabi",
    "or": "Odia",
    "as": "Assamese",
    "ur": "Urdu",
}


# ============================================================
# SAFE TEXT
# ============================================================

def _safe_text(value: Any) -> str:
    """
    Convert a value into clean text.

    Prevents None from appearing in the user-facing response.
    """

    if value is None:
        return ""

    return str(value).strip()


# ============================================================
# LANGUAGE NORMALIZATION
# ============================================================

def _normalise_language(language: str | None) -> str:
    """
    Normalize language code or language name.

    Examples:
        en       -> en
        English  -> en
        hi       -> hi
        Hindi    -> hi
        mr       -> mr
        Marathi  -> mr

    Unknown values fall back to English.
    """

    value = _safe_text(language).lower()

    aliases = {
        # English
        "english": "en",
        "eng": "en",

        # Hindi
        "hindi": "hi",
        "हिंदी": "hi",
        "हिन्दी": "hi",

        # Marathi
        "marathi": "mr",
        "मराठी": "mr",

        # Bengali
        "bengali": "bn",
        "bangla": "bn",

        # Tamil
        "tamil": "ta",
        "தமிழ்": "ta",

        # Telugu
        "telugu": "te",
        "తెలుగు": "te",

        # Gujarati
        "gujarati": "gu",
        "ગુજરાતી": "gu",

        # Kannada
        "kannada": "kn",
        "ಕನ್ನಡ": "kn",

        # Malayalam
        "malayalam": "ml",
        "മലയാളം": "ml",

        # Punjabi
        "punjabi": "pa",
        "ਪੰਜਾਬੀ": "pa",

        # Odia
        "odia": "or",
        "oriya": "or",
        "ଓଡ଼ିଆ": "or",

        # Assamese
        "assamese": "as",
        "অসমীয়া": "as",

        # Urdu
        "urdu": "ur",
        "اردو": "ur",
    }

    value = aliases.get(value, value)

    if value not in LANGUAGE_NAMES:
        return "en"

    return value


# ============================================================
# LANGUAGE DETECTION FROM QUERY
# ============================================================

def _detect_query_language(query: str) -> str:
    """
    Detect the user's query language.

    IMPORTANT:
    Language detection is delegated to the dedicated
    language_detector.py service.

    Supported automatic detection:
        English -> en
        Hindi   -> hi
        Marathi -> mr

    This keeps language detection in one centralized service
    instead of duplicating detection logic inside RAG.
    """

    text = _safe_text(query)

    if not text:
        return "en"

    try:
        detected = detect_language(text)

        detected = _safe_text(detected).lower()

        if detected in LANGUAGE_NAMES:
            return detected

    except Exception:
        logger.exception(
            "Language detection failed for query: %r",
            text,
        )

    # Safe fallback
    return "en"


# ============================================================
# OUTPUT LANGUAGE RESOLUTION
# ============================================================

def _resolve_output_language(
    query: str,
    language: str | None,
) -> str:
    """
    Decide the language used by the answer generator.

    Priority:

        1. Automatic detection when language is auto/detect
        2. Explicit language selection

    Examples:

        query="What is PMFBY?", language="auto"
            -> en

        query="PMFBY के लिए कौन से दस्तावेज चाहिए?",
        language="auto"
            -> hi

        query="PMFBY साठी कोणती कागदपत्रे आवश्यक आहेत?",
        language="auto"
            -> mr

        query="anything", language="mr"
            -> mr

        query="anything", language="hi"
            -> hi
    """

    raw_language = _safe_text(language).lower()

    # --------------------------------------------------------
    # Automatic language detection
    # --------------------------------------------------------

    if raw_language in {
        "",
        "auto",
        "automatic",
        "detect",
    }:
        return _detect_query_language(query)

    # --------------------------------------------------------
    # Explicit language
    # --------------------------------------------------------

    requested = _normalise_language(language)

    return requested


# ============================================================
# RETRIEVED DOCUMENT CONTEXT
# ============================================================

def _build_context(
    docs: list[dict[str, Any]],
) -> tuple[str, list[dict[str, Any]]]:
    """
    Convert retrieved Qdrant documents into:

        1. LLM evidence context
        2. Source metadata for the frontend

    IMPORTANT:
    Source metadata is returned separately.

    It should never be placed inside the generated answer.
    """

    context_parts: list[str] = []
    sources: list[dict[str, Any]] = []

    for index, document in enumerate(
        docs,
        start=1,
    ):
        if not isinstance(document, dict):
            continue

        text = _safe_text(
            document.get("text")
        )

        if not text:
            continue

        # ----------------------------------------------------
        # Metadata
        # ----------------------------------------------------

        metadata = document.get("metadata")

        if not isinstance(metadata, dict):
            metadata = {}

        # ----------------------------------------------------
        # Title
        # ----------------------------------------------------

        title = (
            _safe_text(document.get("title"))
            or _safe_text(metadata.get("title"))
            or _safe_text(metadata.get("document"))
            or _safe_text(metadata.get("source_file"))
            or "Official document"
        )

        # ----------------------------------------------------
        # Source
        # ----------------------------------------------------

        source = (
            _safe_text(document.get("source"))
            or _safe_text(metadata.get("source"))
            or _safe_text(metadata.get("source_file"))
            or _safe_text(document.get("source_file"))
        )

        # ----------------------------------------------------
        # Page
        # ----------------------------------------------------

        page = document.get(
            "page",
            metadata.get("page"),
        )

        # ----------------------------------------------------
        # Section
        # ----------------------------------------------------

        section = (
            _safe_text(document.get("section"))
            or _safe_text(metadata.get("section"))
        )

        # ----------------------------------------------------
        # Score
        # ----------------------------------------------------

        score = document.get("score")

        # ----------------------------------------------------
        # PDF / Document URL
        # ----------------------------------------------------

        pdf_url = (
            _safe_text(document.get("pdf_url"))
            or _safe_text(document.get("pdf"))
            or _safe_text(document.get("pdfUrl"))
            or _safe_text(document.get("document_url"))
            or _safe_text(document.get("documentUrl"))
            or _safe_text(document.get("url"))
            or _safe_text(metadata.get("pdf_url"))
            or _safe_text(metadata.get("pdf"))
            or _safe_text(metadata.get("url"))
        )

        # ----------------------------------------------------
        # Evidence for LLM
        # ----------------------------------------------------

        context_parts.append(
            f"[Evidence {index}]\n"
            f"Document: {title}\n"
            f"Source: {source or 'Not provided'}\n"
            f"Page: {page if page is not None else 'Not provided'}\n"
            f"Section: {section or 'Not provided'}\n"
            f"Text:\n{text}"
        )

        # ----------------------------------------------------
        # Frontend source object
        # ----------------------------------------------------

        sources.append(
            {
                "title": title,
                "source": source,
                "source_file": source,
                "page": page,
                "section": section,
                "score": score,
                "pdf_url": pdf_url,
                "metadata": metadata,
                "excerpt": text[:1800],
            }
        )

    # ========================================================
    # NO EVIDENCE
    # ========================================================

    if not context_parts:
        context = (
            "No verified document evidence is currently available "
            "for this question.\n\n"
            "The assistant must not invent information."
        )

        return context, []

    # ========================================================
    # NORMAL EVIDENCE
    # ========================================================

    context = "\n\n".join(
        context_parts
    )

    return context, sources


# ============================================================
# MAIN RAG ANSWER FUNCTION
# ============================================================

async def answer_with_context(
    query: str,
    language: str = "auto",
    collection_name: str | None = None,
) -> dict[str, Any]:
    """
    Main RAG pipeline.

    Flow:

        User Query
             |
             v
        Language Detection
             |
             v
        Qdrant Retrieval
             |
             v
        Evidence Context
             |
             v
        answer_generator.py
             |
             +----------------------+
             |                      |
             v                      v
        Clean Answer             Sources
             |                      |
             v                      v
          Frontend              References

    Returns:

        {
            "query": str,
            "language": str,
            "answer": str,
            "sources": list[dict],
        }

    Language behavior:

        English query  -> English answer
        Hindi query    -> Hindi answer
        Marathi query  -> Marathi answer

    Explicit language selection is also supported.
    """

    # ========================================================
    # 1. VALIDATE QUERY
    # ========================================================

    clean_query = _safe_text(query)

    if not clean_query:
        raise ValueError(
            "Query cannot be empty."
        )

    # ========================================================
    # 2. RESOLVE OUTPUT LANGUAGE
    # ========================================================

    requested_language = _resolve_output_language(
        query=clean_query,
        language=language,
    )

    logger.info(
        "RAG language resolved: query=%r language=%s",
        clean_query,
        requested_language,
    )

    # ========================================================
    # 3. RESOLVE QDRANT COLLECTION
    # ========================================================

    collection = (
        _safe_text(collection_name)
        or settings.QDRANT_COLLECTION
    )

    # ========================================================
    # 4. RETRIEVE FROM QDRANT
    # ========================================================

    try:
        docs = qdrant_service.search(
            clean_query,
            collection,
        )

    except Exception:
        logger.exception(
            "Qdrant retrieval failed for query: %s",
            clean_query,
        )
        raise

    # ========================================================
    # 5. SAFETY CHECK
    # ========================================================

    if not isinstance(docs, list):
        docs = []

    logger.info(
        "Qdrant returned %d documents.",
        len(docs),
    )

    # ========================================================
    # 6. BUILD EVIDENCE
    # ========================================================

    context, sources = _build_context(
        docs
    )

    # ========================================================
    # 7. GENERATE GROUNDED ANSWER
    #
    # IMPORTANT:
    #
    # answer_generator.py is the single source of truth for
    # answer generation and formatting.
    #
    # The resolved language is explicitly passed to it.
    # ========================================================

    try:
        generated = await generate_grounded_answer(
            query=clean_query,
            documents=docs,
            language=requested_language,
        )

    except Exception:
        logger.exception(
            "Grounded answer generation failed."
        )

        # ----------------------------------------------------
        # Safe fallback.
        #
        # Do NOT expose:
        #
        # - raw evidence
        # - Qdrant information
        # - internal errors
        # - model errors
        # - source metadata
        # ----------------------------------------------------

        if requested_language == "hi":
            fallback_answer = (
                "क्षमा करें, उपलब्ध सत्यापित जानकारी के आधार पर "
                "अभी विश्वसनीय उत्तर तैयार नहीं किया जा सका। "
                "कृपया अपना प्रश्न दोबारा पूछें।"
            )

        elif requested_language == "mr":
            fallback_answer = (
                "क्षमस्व, उपलब्ध सत्यापित माहितीच्या आधारे "
                "सध्या विश्वसनीय उत्तर तयार करता आले नाही. "
                "कृपया आपला प्रश्न पुन्हा विचारा."
            )

        else:
            fallback_answer = (
                "I’m sorry, but I could not generate a reliable "
                "answer from the available verified information "
                "right now. Please try the question again."
            )

        return {
            "query": clean_query,
            "language": requested_language,
            "answer": fallback_answer,
            "sources": sources,
        }

    # ========================================================
    # 8. VALIDATE GENERATED RESULT
    # ========================================================

    if not isinstance(
        generated,
        dict,
    ):
        logger.error(
            "Answer generator returned an invalid result."
        )

        if requested_language == "hi":
            invalid_answer = (
                "क्षमा करें, अभी विश्वसनीय उत्तर तैयार नहीं किया जा सका। "
                "कृपया अपना प्रश्न दोबारा पूछें।"
            )

        elif requested_language == "mr":
            invalid_answer = (
                "क्षमस्व, सध्या विश्वसनीय उत्तर तयार करता आले नाही. "
                "कृपया आपला प्रश्न पुन्हा विचारा."
            )

        else:
            invalid_answer = (
                "I’m sorry, but I could not generate a reliable "
                "answer right now. Please try again."
            )

        return {
            "query": clean_query,
            "language": requested_language,
            "answer": invalid_answer,
            "sources": sources,
        }

    # ========================================================
    # 9. GET ANSWER
    # ========================================================

    answer = _safe_text(
        generated.get("answer")
    )

    # ========================================================
    # 10. FINAL LANGUAGE
    #
    # IMPORTANT:
    #
    # The language resolved from the user query is authoritative.
    #
    # Even if answer_generator.py returns another language value,
    # RAG keeps the language requested/detected here.
    #
    # This prevents:
    #
    #     Marathi query -> Hindi response
    #     Hindi query   -> English response
    #     English query -> Hindi response
    #
    # The actual generator output should still follow the
    # requested_language instruction.
    # ========================================================

    generated_language = _safe_text(
        generated.get("language")
    )

    if generated_language:
        normalized_generated_language = _normalise_language(
            generated_language
        )

        if normalized_generated_language != requested_language:
            logger.warning(
                "Answer generator returned language '%s', "
                "but RAG requested '%s'. Keeping requested language.",
                normalized_generated_language,
                requested_language,
            )

    final_language = requested_language

    # ========================================================
    # 11. GET SOURCES
    #
    # answer_generator normally returns its own sources.
    #
    # If it does not, keep the sources generated here.
    # ========================================================

    generated_sources = generated.get(
        "sources"
    )

    if isinstance(
        generated_sources,
        list,
    ):
        final_sources = generated_sources

    else:
        final_sources = sources

    # ========================================================
    # 12. EMPTY ANSWER SAFETY
    # ========================================================

    if not answer:
        logger.warning(
            "Answer generator returned an empty answer."
        )

        if final_language == "hi":
            answer = (
                "क्षमा करें, उपलब्ध सत्यापित जानकारी के आधार पर "
                "अभी विश्वसनीय उत्तर तैयार नहीं किया जा सका। "
                "कृपया अपना प्रश्न दोबारा पूछें।"
            )

        elif final_language == "mr":
            answer = (
                "क्षमस्व, उपलब्ध सत्यापित माहितीच्या आधारे "
                "सध्या विश्वसनीय उत्तर तयार करता आले नाही. "
                "कृपया आपला प्रश्न पुन्हा विचारा."
            )

        else:
            answer = (
                "I’m sorry, but I could not generate a reliable "
                "answer from the available verified information "
                "right now. Please try the question again."
            )

    # ========================================================
    # 13. FINAL RESPONSE
    # ========================================================

    return {
        "query": clean_query,
        "language": final_language,
        "answer": answer,
        "sources": final_sources,
    }