from __future__ import annotations

import logging
from typing import Any

from backend.config import settings
from backend.services.answer_generator import generate_grounded_answer
from rag.scripts.retriever import process_query


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
        "english": "en",
        "eng": "en",

        "hindi": "hi",
        "हिंदी": "hi",
        "हिन्दी": "hi",

        "marathi": "mr",
        "मराठी": "mr",

        "bengali": "bn",
        "bangla": "bn",

        "tamil": "ta",
        "தமிழ்": "ta",

        "telugu": "te",
        "తెలుగు": "te",

        "gujarati": "gu",
        "ગુજરાતી": "gu",

        "kannada": "kn",
        "ಕನ್ನಡ": "kn",

        "malayalam": "ml",
        "മലയാളം": "ml",

        "punjabi": "pa",
        "ਪੰਜਾਬੀ": "pa",

        "odia": "or",
        "oriya": "or",
        "ଓଡ଼ିଆ": "or",

        "assamese": "as",
        "অসমীয়া": "as",

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
    Detect the most likely language from the user's query.

    This is intentionally conservative.

    Hindi and Marathi both use Devanagari. Automatic
    Devanagari detection therefore defaults to Hindi.

    Explicit Marathi from the frontend/backend is preserved
    through _resolve_output_language().
    """

    text = _safe_text(query)

    if not text:
        return "en"

    # --------------------------------------------------------
    # Devanagari
    # --------------------------------------------------------

    devanagari_count = sum(
        1
        for character in text
        if "\u0900" <= character <= "\u097F"
    )

    # --------------------------------------------------------
    # Gujarati
    # --------------------------------------------------------

    gujarati_count = sum(
        1
        for character in text
        if "\u0A80" <= character <= "\u0AFF"
    )

    # --------------------------------------------------------
    # Bengali / Assamese
    # --------------------------------------------------------

    bengali_count = sum(
        1
        for character in text
        if "\u0980" <= character <= "\u09FF"
    )

    # --------------------------------------------------------
    # Gurmukhi / Punjabi
    # --------------------------------------------------------

    gurmukhi_count = sum(
        1
        for character in text
        if "\u0A00" <= character <= "\u0A7F"
    )

    # --------------------------------------------------------
    # Kannada
    # --------------------------------------------------------

    kannada_count = sum(
        1
        for character in text
        if "\u0C80" <= character <= "\u0CFF"
    )

    # --------------------------------------------------------
    # Telugu
    # --------------------------------------------------------

    telugu_count = sum(
        1
        for character in text
        if "\u0C00" <= character <= "\u0C7F"
    )

    # --------------------------------------------------------
    # Tamil
    # --------------------------------------------------------

    tamil_count = sum(
        1
        for character in text
        if "\u0B80" <= character <= "\u0BFF"
    )

    # --------------------------------------------------------
    # Malayalam
    # --------------------------------------------------------

    malayalam_count = sum(
        1
        for character in text
        if "\u0D00" <= character <= "\u0D7F"
    )

    script_counts = {
        "hi": devanagari_count,
        "mr": devanagari_count,
        "gu": gujarati_count,
        "bn": bengali_count,
        "pa": gurmukhi_count,
        "kn": kannada_count,
        "te": telugu_count,
        "ta": tamil_count,
        "ml": malayalam_count,
    }

    strongest_language = max(
        script_counts,
        key=script_counts.get,
    )

    strongest_count = script_counts[strongest_language]

    if strongest_count > 0:

        # Devanagari is shared by Hindi and Marathi.
        # Default to Hindi unless Marathi was explicitly selected.
        if strongest_language == "mr":
            return "hi"

        return strongest_language

    # --------------------------------------------------------
    # ASCII query
    # --------------------------------------------------------

    if text.isascii():
        return "en"

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

    1. Explicit language selection
    2. Automatic query-language detection
    """

    raw_language = _safe_text(language).lower()

    if raw_language in {
        "",
        "auto",
        "automatic",
        "detect",
    }:
        return _detect_query_language(query)

    return _normalise_language(language)


# ============================================================
# RETRIEVER EVIDENCE -> ANSWER GENERATOR DOCUMENT
# ============================================================

def _evidence_to_documents(
    evidence: list[Any],
) -> list[dict[str, Any]]:
    """
    Convert retriever evidence into the document structure
    expected by answer_generator.py.

    The retriever is the source of truth for evidence selection.
    """

    documents: list[dict[str, Any]] = []

    if not isinstance(evidence, list):
        return documents

    for item in evidence:

        if not isinstance(item, dict):
            continue

        text = _safe_text(
            item.get("text")
        )

        if not text:
            continue

        metadata = item.get("metadata")

        if not isinstance(metadata, dict):
            metadata = {}

        # ----------------------------------------------------
        # Preserve retriever metadata.
        # ----------------------------------------------------

        metadata = dict(metadata)

        for key in (
            "source_file",
            "chunk_id",
            "chunk_index",
            "page",
            "section",
            "title",
            "document",
        ):
            if key in item and key not in metadata:
                metadata[key] = item[key]

        source_file = (
            _safe_text(item.get("source_file"))
            or _safe_text(metadata.get("source_file"))
            or _safe_text(item.get("source"))
            or _safe_text(metadata.get("source"))
        )

        title = (
            _safe_text(item.get("title"))
            or _safe_text(metadata.get("title"))
            or _safe_text(metadata.get("document"))
            or source_file
            or "Official document"
        )

        source = (
            _safe_text(item.get("source"))
            or _safe_text(metadata.get("source"))
            or source_file
        )

        page = item.get(
            "page",
            metadata.get("page"),
        )

        section = (
            _safe_text(item.get("section"))
            or _safe_text(metadata.get("section"))
        )

        score = item.get(
            "score",
            item.get("final_score"),
        )

        pdf_url = (
            _safe_text(item.get("pdf_url"))
            or _safe_text(item.get("pdf"))
            or _safe_text(item.get("document_url"))
            or _safe_text(item.get("url"))
            or _safe_text(metadata.get("pdf_url"))
            or _safe_text(metadata.get("url"))
        )

        documents.append(
            {
                "text": text,
                "title": title,
                "source": source,
                "source_file": source_file,
                "page": page,
                "section": section,
                "score": score,
                "pdf_url": pdf_url,
                "metadata": metadata,
            }
        )

    return documents


# ============================================================
# FRONTEND SOURCES
# ============================================================

def _build_sources(
    documents: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Build the exact source-style objects used by the frontend.

    This keeps the existing website source rendering compatible.
    """

    sources: list[dict[str, Any]] = []

    for document in documents:

        if not isinstance(document, dict):
            continue

        text = _safe_text(
            document.get("text")
        )

        if not text:
            continue

        metadata = document.get("metadata")

        if not isinstance(metadata, dict):
            metadata = {}

        title = (
            _safe_text(document.get("title"))
            or _safe_text(metadata.get("title"))
            or _safe_text(metadata.get("document"))
            or _safe_text(document.get("source_file"))
            or "Official document"
        )

        source = (
            _safe_text(document.get("source"))
            or _safe_text(document.get("source_file"))
            or _safe_text(metadata.get("source"))
            or _safe_text(metadata.get("source_file"))
        )

        page = document.get(
            "page",
            metadata.get("page"),
        )

        section = (
            _safe_text(document.get("section"))
            or _safe_text(metadata.get("section"))
        )

        score = document.get("score")

        pdf_url = (
            _safe_text(document.get("pdf_url"))
            or _safe_text(document.get("pdf"))
            or _safe_text(document.get("document_url"))
            or _safe_text(document.get("url"))
            or _safe_text(metadata.get("pdf_url"))
            or _safe_text(metadata.get("url"))
        )

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

    return sources


# ============================================================
# FALLBACK ANSWER
# ============================================================

def _fallback_answer(
    language: str,
) -> str:
    """
    Safe user-facing fallback.

    Never exposes internal errors or retrieval details.
    """

    language = _normalise_language(language)

    if language == "hi":
        return (
            "क्षमा करें, उपलब्ध सत्यापित जानकारी के आधार पर "
            "अभी विश्वसनीय उत्तर तैयार नहीं किया जा सका। "
            "कृपया अपना प्रश्न दोबारा पूछें।"
        )

    if language == "mr":
        return (
            "क्षमस्व, उपलब्ध सत्यापित माहितीच्या आधारे "
            "सध्या विश्वसनीय उत्तर तयार करता आले नाही. "
            "कृपया आपला प्रश्न पुन्हा विचारा."
        )

    return (
        "I’m sorry, but I could not generate a reliable "
        "answer from the available verified information "
        "right now. Please try the question again."
    )


# ============================================================
# ANSWER ONE RETRIEVED QUESTION
# ============================================================

async def _answer_single_question(
    question_result: dict[str, Any],
    language: str,
) -> tuple[str, list[dict[str, Any]]]:
    """
    Generate an answer for one retriever result.

    Gemini is called only when the retriever explicitly allows it.
    """

    if not isinstance(question_result, dict):
        return (
            _fallback_answer(language),
            [],
        )

    question = _safe_text(
        question_result.get("question")
    )

    if not question:
        question = _safe_text(
            question_result.get("original_question")
        )

    question_language = _safe_text(
        question_result.get("tts_language")
    )

    if not question_language:
        question_language = language

    question_language = _normalise_language(
        question_language
    )

    # --------------------------------------------------------
    # Retriever safety gate
    # --------------------------------------------------------

    gemini_allowed = bool(
        question_result.get(
            "gemini_allowed",
            False,
        )
    )

    answerable = bool(
        question_result.get(
            "answerable",
            False,
        )
    )

    evidence = question_result.get(
        "evidence",
        [],
    )

    documents = _evidence_to_documents(
        evidence
    )

    sources = _build_sources(
        documents
    )

    # --------------------------------------------------------
    # Do not send unsupported/insufficient evidence to Gemini.
    # --------------------------------------------------------

    if not gemini_allowed or not answerable or not documents:
        return (
            _fallback_answer(question_language),
            sources,
        )

    # --------------------------------------------------------
    # Generate grounded answer.
    # --------------------------------------------------------

    try:
        generated = await generate_grounded_answer(
            query=question,
            documents=documents,
            language=question_language,
        )

    except Exception:
        logger.exception(
            "Grounded answer generation failed for question."
        )

        return (
            _fallback_answer(question_language),
            sources,
        )

    # --------------------------------------------------------
    # Validate generator output.
    # --------------------------------------------------------

    if not isinstance(generated, dict):
        logger.error(
            "Answer generator returned invalid result."
        )

        return (
            _fallback_answer(question_language),
            sources,
        )

    answer = _safe_text(
        generated.get("answer")
    )

    if not answer:
        return (
            _fallback_answer(question_language),
            sources,
        )

    # --------------------------------------------------------
    # Use generator sources only when they are valid.
    # Otherwise preserve retriever sources.
    # --------------------------------------------------------

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

    return (
        answer,
        final_sources,
    )


# ============================================================
# MAIN RAG ANSWER FUNCTION
# ============================================================

async def answer_with_context(
    query: str,
    language: str = "auto",
    collection_name: str | None = None,
) -> dict[str, Any]:
    """
    Main Sanyukt Vaani RAG pipeline.

    IMPORTANT:

    This function intentionally keeps the existing public
    backend response shape:

        {
            "query": str,
            "language": str,
            "answer": str,
            "sources": list,
        }

    The frontend therefore does not need to change.

    New retrieval flow:

        User Query
             |
             v
        Language Resolution
             |
             v
        retriever.process_query()
             |
             +-------------------------------+
             |                               |
             v                               v
        Evidence / Gate                 Retrieval Status
             |
             v
        answer_generator.py
             |
             v
        Existing frontend response

    The advanced retriever is now responsible for:

        - language detection
        - question splitting
        - query cleaning
        - domain classification
        - intent classification
        - query expansion
        - Qdrant semantic retrieval
        - lexical retrieval
        - candidate merging
        - hard domain filtering
        - scoring
        - Jina reranking
        - duplicate removal
        - neighbor expansion
        - diversity/MMR selection
        - evidence completeness
        - answerability
        - Gemini permission gate
        - TTS language
    """

    # ========================================================
    # 1. VALIDATE QUERY
    # ========================================================

    clean_query = _safe_text(
        query
    )

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
    # 3. COLLECTION COMPATIBILITY
    # ========================================================
    #
    # The current advanced retriever uses its configured
    # Qdrant collection from its own environment/configuration.
    #
    # The existing API still accepts collection_name because
    # main.py exposes it.
    #
    # We therefore do NOT change the frontend/API contract.
    #
    # A caller may provide the default configured collection.
    # The advanced retriever remains the retrieval source of truth.
    # ========================================================

    requested_collection = (
        _safe_text(collection_name)
        or settings.QDRANT_COLLECTION
    )

    configured_collection = _safe_text(
        getattr(
            settings,
            "QDRANT_COLLECTION",
            "",
        )
    )

    if (
        requested_collection
        and configured_collection
        and requested_collection != configured_collection
    ):
        logger.warning(
            "Requested collection '%s' differs from configured "
            "retriever collection '%s'. The advanced retriever "
            "will use its configured collection.",
            requested_collection,
            configured_collection,
        )

    # ========================================================
    # 4. ADVANCED RETRIEVAL
    # ========================================================

    try:

        retrieval_result = process_query(
            clean_query,
            forced_language=requested_language,
        )

    except Exception:

        logger.exception(
            "Advanced retriever failed for query: %s",
            clean_query,
        )

        return {
            "query": clean_query,
            "language": requested_language,
            "answer": _fallback_answer(
                requested_language
            ),
            "sources": [],
        }

    # ========================================================
    # 5. VALIDATE RETRIEVER RESULT
    # ========================================================

    if not isinstance(
        retrieval_result,
        dict,
    ):

        logger.error(
            "Retriever returned invalid result."
        )

        return {
            "query": clean_query,
            "language": requested_language,
            "answer": _fallback_answer(
                requested_language
            ),
            "sources": [],
        }

    questions = retrieval_result.get(
        "questions",
        [],
    )

    if not isinstance(
        questions,
        list,
    ):
        questions = []

    # ========================================================
    # 6. NO QUESTION RESULT
    # ========================================================

    if not questions:

        return {
            "query": clean_query,
            "language": requested_language,
            "answer": _fallback_answer(
                requested_language
            ),
            "sources": [],
        }

    # ========================================================
    # 7. PROCESS EACH QUESTION
    # ========================================================
    #
    # The retriever supports multi-question queries.
    #
    # Each question gets its own:
    #
    #     evidence
    #     answerability check
    #     Gemini gate
    #     answer generation
    #
    # This prevents one unsupported question from being silently
    # answered from evidence belonging to another question.
    # ========================================================

    answers: list[str] = []
    all_sources: list[dict[str, Any]] = []

    for index, question_result in enumerate(
        questions,
        start=1,
    ):

        if not isinstance(
            question_result,
            dict,
        ):
            continue

        question_language = _safe_text(
            question_result.get(
                "tts_language"
            )
        )

        if not question_language:
            question_language = requested_language

        question_language = _normalise_language(
            question_language
        )

        answer, sources = await _answer_single_question(
            question_result=question_result,
            language=question_language,
        )

        if answer:
            # ------------------------------------------------
            # Preserve simple output for one question.
            #
            # For multiple questions, label each answer so
            # the existing frontend still receives ONE string.
            # ------------------------------------------------

            if len(questions) > 1:
                answers.append(
                    f"**Question {index}:**\n\n{answer}"
                )
            else:
                answers.append(
                    answer
                )

        all_sources.extend(
            sources
        )

    # ========================================================
    # 8. REMOVE DUPLICATE SOURCES
    # ========================================================

    unique_sources: list[dict[str, Any]] = []
    seen_sources: set[str] = set()

    for source in all_sources:

        if not isinstance(
            source,
            dict,
        ):
            continue

        source_file = _safe_text(
            source.get("source_file")
        )

        title = _safe_text(
            source.get("title")
        )

        page = source.get(
            "page"
        )

        key = (
            f"{source_file}|"
            f"{title}|"
            f"{page}"
        )

        if key in seen_sources:
            continue

        seen_sources.add(key)
        unique_sources.append(
            source
        )

    # ========================================================
    # 9. BUILD FINAL ANSWER
    # ========================================================

    final_answer = "\n\n".join(
        answer
        for answer in answers
        if _safe_text(answer)
    ).strip()

    if not final_answer:
        final_answer = _fallback_answer(
            requested_language
        )

    # ========================================================
    # 10. FINAL LANGUAGE
    # ========================================================
    #
    # Preserve the requested language for the frontend.
    # For automatic mode, retriever language is preferred.
    # ========================================================

    final_language = _safe_text(
        retrieval_result.get(
            "language"
        )
    )

    if not final_language:
        final_language = requested_language

    final_language = _normalise_language(
        final_language
    )

    # ========================================================
    # 11. FINAL RESPONSE
    # ========================================================
    #
    # IMPORTANT:
    #
    # This structure intentionally matches the previous
    # rag.py response so the website does not need changes.
    # ========================================================

    return {
        "query": clean_query,
        "language": final_language,
        "answer": final_answer,
        "sources": unique_sources,
    }