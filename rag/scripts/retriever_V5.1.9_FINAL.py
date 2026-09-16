# ============================================================
# SANYUKT VAANI
# RETRIEVER V5.1.9 FINAL
# ============================================================
#
# FINAL CONSOLIDATED VERSION
#
# Includes all agreed V4 -> V5 -> V5.1 -> V5.1.7 changes:
#
# 1. Multilingual language detection
#    - English
#    - Hindi
#    - Marathi
#
# 2. Multi-question detection
#    - numbered questions
#    - multiple ?
#    - English question cues
#    - Hindi question cues
#    - Marathi question cues
#    - known topic boundaries
#    - maximum 4 questions
#
# 3. Domain classification
#
# 4. Intent classification
#
# 5. Sub-intent classification
#    - KCC
#    - NABARD refinance
#    - PMFBY enrollment
#    - PMFBY claim
#    - PMFBY eligibility
#    - PMFBY premium
#    - PMFBY loss
#    - PMFBY deadline
#    - cooperative complaint
#    - PACS membership
#
# 6. Query expansion
#
# 7. Qdrant semantic retrieval
#
# 8. Local lexical retrieval
#
# 9. Candidate merging
#
# 10. Hard domain filtering
#
# 11. Conflict / old-scheme filtering
#
# 12. Jina multilingual reranking
#
# 13. Conservative final scoring
#
# 14. KCC-specific ranking
#
# 15. PMFBY enrollment-vs-claim ranking
#
# 16. Cooperative complaint ranking
#
# 17. Deduplication
#
# 18. Neighbor expansion
#
# 19. Diversity selection
#
# 20. Evidence completeness
#
# 21. Answerability
#
# 22. STRONG / PARTIAL / INSUFFICIENT / OUT_OF_SCOPE
#
# 23. Gemini gate
#
# 24. Same-language answer instruction
#
# 25. Per-question TTS language
#
# ============================================================
#
# IMPORTANT:
# This is the FINAL retrieval layer.
#
# Existing:
#   18,890 embeddings
#   384 dimensions
#   Qdrant collection: sanyuktvaani_kb
#
# No embedding regeneration is required.
# No Qdrant re-upload is required.
#
# ============================================================


import os
import re
import json
import math
from pathlib import Path
from typing import List, Dict, Any

import numpy as np
from dotenv import load_dotenv

from sentence_transformers import (
    SentenceTransformer,
    CrossEncoder
)

from qdrant_client import QdrantClient


# ============================================================
# 1. PATH CONFIGURATION
# ============================================================

SCRIPT_DIR = Path(__file__).resolve().parent

RAG_DIR = SCRIPT_DIR.parent

PROJECT_ROOT = RAG_DIR.parent

KB_DIR = RAG_DIR / "knowledge_base"

EMBEDDINGS_DIR = KB_DIR / "embeddings"

EMBEDDINGS_FILE = (
    EMBEDDINGS_DIR / "embeddings.npy"
)

EMBEDDING_METADATA_FILE = (
    EMBEDDINGS_DIR / "embedding_metadata.json"
)

ENV_FILE = PROJECT_ROOT / ".env"


# ============================================================
# 2. LOAD ENVIRONMENT
# ============================================================

if ENV_FILE.exists():
    load_dotenv(ENV_FILE)


# ============================================================
# 3. MODEL CONFIGURATION
# ============================================================

EMBEDDING_MODEL_NAME = os.getenv(
    "EMBEDDING_MODEL_NAME",
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
)

RERANKER_MODEL_NAME = os.getenv(
    "RERANKER_MODEL_NAME",
    "jinaai/jina-reranker-v2-base-multilingual"
)


# ============================================================
# 4. QDRANT CONFIGURATION
# ============================================================

QDRANT_URL = os.getenv(
    "QDRANT_URL",
    ""
)

QDRANT_API_KEY = os.getenv(
    "QDRANT_API_KEY",
    ""
)

COLLECTION_NAME = os.getenv(
    "QDRANT_COLLECTION",
    "sanyuktvaani_kb"
)


# ============================================================
# 5. RETRIEVAL CONFIGURATION
# ============================================================

VECTOR_DIMENSION = 384

QDRANT_TOP_K = 50

LEXICAL_TOP_K = 50

MAX_RERANK_CANDIDATES = 30

FINAL_TOP_K = 8

MAX_QUESTIONS = 4

MAX_NEIGHBORS_PER_RESULT = 1

MAX_RESULTS_PER_SOURCE = 3

QDRANT_TIMEOUT = 300


# ============================================================
# 6. STARTUP
# ============================================================

print("=" * 80)

print(
    "SANYUKT VAANI - V5.1.9 FINAL RETRIEVER"
)

print("=" * 80)


# ============================================================
# 7. LOAD EMBEDDING MODEL
# ============================================================

print("\n[1/7] Loading embedding model...")

embedding_model = SentenceTransformer(
    EMBEDDING_MODEL_NAME
)

print(
    "Embedding model:",
    EMBEDDING_MODEL_NAME
)


# ============================================================
# 8. LOAD JINA RERANKER
# ============================================================

print("\n[2/7] Loading Jina multilingual reranker...")

reranker = CrossEncoder(
    RERANKER_MODEL_NAME,
    trust_remote_code=True
)

print(
    "Reranker:",
    RERANKER_MODEL_NAME
)


# ============================================================
# 9. LOAD EMBEDDINGS
# ============================================================

print("\n[3/7] Loading embeddings...")

if not EMBEDDINGS_FILE.exists():

    raise FileNotFoundError(
        f"Embeddings file not found:\n"
        f"{EMBEDDINGS_FILE}"
    )


embeddings = np.load(
    EMBEDDINGS_FILE
)


if embeddings.ndim != 2:

    raise ValueError(
        "Embeddings must be a 2D array."
    )


if embeddings.shape[1] != VECTOR_DIMENSION:

    raise ValueError(
        f"Embedding dimension mismatch.\n"
        f"Expected: {VECTOR_DIMENSION}\n"
        f"Found: {embeddings.shape[1]}"
    )


print(
    "Embeddings shape:",
    embeddings.shape
)


# ============================================================
# 10. LOAD METADATA
# ============================================================

print("\n[4/7] Loading embedding metadata...")

if not EMBEDDING_METADATA_FILE.exists():

    raise FileNotFoundError(
        f"Metadata file not found:\n"
        f"{EMBEDDING_METADATA_FILE}"
    )


with open(
    EMBEDDING_METADATA_FILE,
    "r",
    encoding="utf-8"
) as file:

    embedding_metadata = json.load(
        file
    )


if not isinstance(
    embedding_metadata,
    dict
):

    raise ValueError(
        "embedding_metadata.json must contain a dictionary."
    )


if "chunks" not in embedding_metadata:

    raise ValueError(
        "embedding_metadata.json does not contain 'chunks'."
    )


chunks = embedding_metadata["chunks"]


if not isinstance(
    chunks,
    list
):

    raise ValueError(
        "'chunks' must be a list."
    )


if len(chunks) != len(embeddings):

    raise ValueError(
        "Embedding/metadata count mismatch.\n"
        f"Embeddings: {len(embeddings)}\n"
        f"Metadata: {len(chunks)}"
    )


print(
    "Total chunks:",
    len(chunks)
)


# ============================================================
# 11. QDRANT CONNECTION
# ============================================================

print("\n[5/7] Connecting to Qdrant...")

if not QDRANT_URL:

    raise ValueError(
        "QDRANT_URL missing from .env"
    )


if not QDRANT_API_KEY:

    raise ValueError(
        "QDRANT_API_KEY missing from .env"
    )


qdrant = QdrantClient(
    url=QDRANT_URL,
    api_key=QDRANT_API_KEY,
    timeout=QDRANT_TIMEOUT
)


try:

    qdrant.get_collection(
        collection_name=COLLECTION_NAME
    )

except Exception as error:

    raise RuntimeError(
        f"Qdrant collection '{COLLECTION_NAME}' "
        f"could not be accessed.\n"
        f"{error}"
    )


print(
    "Qdrant collection:",
    COLLECTION_NAME
)


# ============================================================
# 12. LOCAL CHUNK INDEX
# ============================================================

print("\n[6/7] Building local chunk index...")

chunk_by_id = {}

chunk_by_source = {}


for chunk in chunks:

    chunk_id = str(
        chunk.get(
            "chunk_id",
            ""
        )
    )

    if not chunk_id:
        continue

    chunk_by_id[
        chunk_id
    ] = chunk

    source_file = str(
        chunk.get(
            "source_file",
            ""
        )
    )

    if source_file not in chunk_by_source:

        chunk_by_source[
            source_file
        ] = []

    chunk_by_source[
        source_file
    ].append(chunk)


for source_file in chunk_by_source:

    chunk_by_source[
        source_file
    ].sort(
        key=lambda item: int(
            item.get(
                "chunk_index",
                0
            )
        )
    )


print(
    "Sources indexed:",
    len(chunk_by_source)
)


# ============================================================
# 13. FINAL STARTUP
# ============================================================

print("\n[7/7] Retriever initialization complete.")

print(
    "Vectors:",
    len(embeddings)
)

print(
    "Dimension:",
    embeddings.shape[1]
)

print(
    "Collection:",
    COLLECTION_NAME
)

print("=" * 80)


# ============================================================
# 14. TEXT NORMALIZATION
# ============================================================

def normalize(
    text: str
) -> str:

    if not text:
        return ""

    text = str(text).lower()

    text = text.replace(
        "\u200c",
        " "
    )

    text = text.replace(
        "\u200d",
        " "
    )

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


def tokenize(
    text: str
) -> List[str]:

    text = normalize(
        text
    )

    return re.findall(
        r"[a-zA-Z0-9\u0900-\u097F]+",
        text
    )


def clip(
    value: float,
    low: float = 0.0,
    high: float = 1.0
) -> float:

    return max(
        low,
        min(
            high,
            float(value)
        )
    )


def sigmoid(
    value: float
) -> float:

    try:

        value = float(
            value
        )

        if value >= 0:

            z = math.exp(
                -value
            )

            return 1.0 / (
                1.0 + z
            )

        z = math.exp(
            value
        )

        return z / (
            1.0 + z
        )

    except Exception:

        return 0.0


# ============================================================
# 15. LANGUAGE DETECTION
# ============================================================

HINDI_MARKERS = [

    "है",
    "और",
    "क्या",
    "कैसे",
    "कैसी",
    "कौन",
    "कौन-कौन",
    "के लिए",
    "होने",
    "दर्ज",
    "करें",
    "करना",
    "किसान",
    "कागजात",
    "दस्तावेज",
    "चाहिए",
]


MARATHI_MARKERS = [

    "आहे",
    "आणि",
    "काय",
    "कसे",
    "कशी",
    "कसा",
    "कोणती",
    "कोणते",
    "कोण",
    "कधी",
    "कुठे",
    "साठी",
    "होण्यासाठी",
    "तक्रार",
    "नोंदवायची",
    "शेतकरी",
    "कागदपत्रे",
    "म्हणजे",
    "लागतात",
    "करावे",
    "करायची",
    "विरुद्ध",
    "संस्थेविरुद्ध",
]


def detect_language(
    text: str
) -> str:

    text = str(
        text or ""
    ).strip()

    if not text:

        return "en"

    devanagari_count = len(
        re.findall(
            r"[\u0900-\u097F]",
            text
        )
    )

    latin_count = len(
        re.findall(
            r"[A-Za-z]",
            text
        )
    )

    total = (
        devanagari_count
        + latin_count
    )

    if total == 0:

        return "en"

    devanagari_ratio = (
        devanagari_count
        / total
    )

    # Mostly Latin = English
    if devanagari_ratio < 0.25:

        return "en"

    normalized_text = normalize(
        text
    )

    hindi_score = 0.0

    marathi_score = 0.0

    for marker in HINDI_MARKERS:

        if normalize(marker) in normalized_text:

            hindi_score += 1.0

    for marker in MARATHI_MARKERS:

        if normalize(marker) in normalized_text:

            marathi_score += 1.0

    # Strong Marathi indicators
    strong_marathi = [

        "आहे",
        "आणि",
        "कागदपत्रे",
        "तक्रार",
        "नोंदवायची",
        "शेतकरी",
        "लागतात",
        "करावे",
        "करायची",
        "संस्थेविरुद्ध",

    ]

    for marker in strong_marathi:

        if marker in normalized_text:

            marathi_score += 1.5

    # Strong Hindi indicators
    strong_hindi = [

        "है",
        "और",
        "कौन",
        "कौन-कौन",
        "दस्तावेज",
        "कागजात",
        "चाहिए",
        "किसान",
        "करें",
        "करना",

    ]

    for marker in strong_hindi:

        if marker in normalized_text:

            hindi_score += 1.2

    if marathi_score > hindi_score:

        return "mr"

    if hindi_score > marathi_score:

        return "hi"

    # Conservative default for
    # ambiguous Devanagari
    return "hi"


LANGUAGE_NAMES = {

    "en": "English",

    "hi": "Hindi",

    "mr": "Marathi",

}


def language_name(
    code: str
) -> str:

    return LANGUAGE_NAMES.get(
        code,
        "English"
    )


def answer_language_instruction(
    language: str
) -> str:
    """Strict language policy for the downstream Gemini answer generator."""
    language = (language or "en").lower().strip()

    if language == "hi":
        return (
            "Respond ONLY in Hindi (Devanagari script). "
            "Do not answer in English or Marathi. "
            "Keep official scheme names, acronyms, numbers, dates and "
            "document names unchanged where necessary."
        )

    if language == "mr":
        return (
            "Respond ONLY in Marathi (Devanagari script). "
            "Do not answer in English or Hindi. "
            "Keep official scheme names, acronyms, numbers, dates and "
            "document names unchanged where necessary."
        )

    return (
        "Respond ONLY in English. "
        "Do not translate the answer into Hindi or Marathi. "
        "Keep official scheme names, acronyms, numbers and dates unchanged."
    )


def answer_language_contract(language: str) -> Dict[str, Any]:
    """Machine-readable contract for the Gemini/API layer."""
    code = (language or "en").lower().strip()
    if code not in {"en", "hi", "mr"}:
        code = "en"
    return {
        "language_code": code,
        "language_name": language_name(code),
        "instruction": answer_language_instruction(code),
        "must_match_user_language": True,
        "allow_language_mixing": False,
        "tts_language": code,
    }


# ============================================================
# 16. QUESTION CLEANING
# ============================================================

def clean_question(
    text: str
) -> str:

    text = str(
        text or ""
    ).strip()

    text = re.sub(
        r"^\s*(?:Q(?:uestion)?\s*)?"
        r"\d+\s*[\)\.\-:]\s*",
        "",
        text,
        flags=re.IGNORECASE
    )

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


# ============================================================
# 17. MULTI-QUESTION SPLITTER
# ============================================================

ENGLISH_QUESTION_CUES = [

    "what is",
    "what are",
    "what documents",
    "which documents",
    "how can",
    "how do",
    "how to",
    "where can",
    "where do",
    "when is",
    "when can",
    "who can",
    "which",

]


HINDI_QUESTION_CUES = [

    "क्या",
    "कैसे",
    "कौन",
    "कौन-कौन",
    "कौनसे",
    "कौन से",
    "किस",
    "किसके",
    "कब",
    "कहाँ",

]


MARATHI_QUESTION_CUES = [

    "काय",
    "कसे",
    "कशी",
    "कसा",
    "कोणती",
    "कोणते",
    "कोण",
    "कधी",
    "कुठे",
    "कशासाठी",

]


KNOWN_TOPIC_STARTS = [

    "kcc",
    "kisan credit card",
    "nabard",
    "refinance",
    "pmfby",
    "crop insurance",
    "cooperative complaint",
    "cooperative grievance",
    "pacs",

    "what is kcc",
    "what is nabard",
    "what is refinance",
    "what documents",
    "how can i complain",

    "किसान क्रेडिट कार्ड",
    "नाबार्ड",
    "पुनर्वित्त",
    "फसल बीमा",
    "सहकारी समिति",
    "सहकारी समिती",
    "सहकारी संस्था",
    "सहकारी संस्थे",

]


def split_by_question_marks(
    text: str
) -> List[str]:

    parts = re.split(
        r"\?+",
        text
    )

    result = []

    for part in parts:

        part = clean_question(
            part
        )

        if part:

            result.append(
                part
            )

    return result


def split_multi_question(text: str) -> List[str]:
    """Conservative splitter: never fragments an ordinary single question."""
    text = str(text or "").strip()
    if not text:
        return []

    # Numbered questions: 1) ... 2) ...
    numbered = re.split(
        r"(?:^|\s)(?:Q(?:uestion)?\s*)?\d+\s*[\)\.\-:]\s*",
        text,
        flags=re.IGNORECASE,
    )
    numbered = [clean_question(x) for x in numbered if clean_question(x)]
    if len(numbered) > 1:
        return numbered[:MAX_QUESTIONS]

    # Split only on real question marks. Do not split on question cues
    # occurring inside a normal sentence.
    parts = [clean_question(x) for x in re.split(r"\?+", text) if clean_question(x)]
    if len(parts) > 1:
        return parts[:MAX_QUESTIONS]

    # Explicit line/semicolon-separated questions only when each segment
    # looks like a meaningful question.
    segments = [clean_question(x) for x in re.split(r"[;\n；]+", text) if clean_question(x)]
    if len(segments) > 1 and all(len(x.split()) >= 3 for x in segments):
        return segments[:MAX_QUESTIONS]

    return [clean_question(text)]


# ============================================================
# 18. DOMAIN CLASSIFICATION
# ============================================================

DOMAIN_MARKERS = {

    "agricultural_loan": [

        "agricultural loan",
        "agri loan",
        "crop loan",
        "farm loan",
        "farmer loan",
        "agriculture loan",

        "kcc",
        "kisan credit card",
        "credit card for farmers",

        "nabard",
        "refinance",

        "पुनर्वित्त",
        "कृषि ऋण",
        "फसल ऋण",
        "किसान ऋण",
        "कृषी कर्ज",
        "शेतकरी कर्ज",

    ],

    "pmfby": [

        "pmfby",
        "pradhan mantri fasal bima",
        "fasal bima",
        "crop insurance",
        "crop insurance scheme",

        "फसल बीमा",
        "फसल बिमा",
        "पीएमएफबीवाई",
        "पीएम फसल बीमा",
        "पीक विमा",
        "पिक विमा",

    ],

    "grievance_redressal": [

        "complaint",
        "complain",
        "grievance",
        "grievance redressal",
        "complaint against",
        "complaint about",
        "report a complaint",

        "शिकायत",
        "शिकायत कैसे",
        "शिकायत दर्ज",

        "तक्रार",
        "तक्रार कशी",
        "तक्रार नोंद",

    ],

    "pacs": [

        "pacs",
        "primary agricultural credit society",
        "primary agriculture credit society",
        "cooperative society membership",
        "member of cooperative",
        "membership of cooperative",

        "सहकारी समिति सदस्य",
        "सहकारी समिती सदस्य",
        "पॅक्स",
        "पॅक्स सदस्य",

        # PACS loan / credit / document routing
        "pacs loan",
        "pacs credit",
        "loan from pacs",
        "credit from pacs",
        "pacs ऋण",
        "pacs कर्ज",
        "पॅक्स कर्ज",
        "पॅक्स ऋण",
        "पॅक्स कर्जासाठी",

    ],

    "cooperative_laws": [

        "cooperative law",
        "cooperative laws",
        "cooperative act",
        "cooperative society act",
        "co-operative law",
        "co-operative act",

        "सहकारी कानून",
        "सहकारी कायदा",
        "सहकारी संस्था कायदा",

    ],

    "government_schemes": [

        "government scheme",
        "government schemes",
        "scheme",
        "yojana",

        "सरकारी योजना",
        "सरकारी योजनाएं",
        "शासकीय योजना",

    ],

    "financial_literacy": [

        "financial literacy",
        "financial education",
        "financial awareness",

        "वित्तीय साक्षरता",
        "आर्थिक साक्षरता",

    ],

}


def classify_domains(
    query: str
) -> List[str]:

    q = normalize(
        query
    )

    scores = {}

    for domain, markers in (
        DOMAIN_MARKERS.items()
    ):

        score = 0.0

        for marker in markers:

            if normalize(marker) in q:

                score += 1.0

        if score > 0:

            scores[
                domain
            ] = score

    if not scores:

        return []

    sorted_domains = sorted(

        scores.items(),

        key=lambda item: item[1],

        reverse=True

    )

    best_score = (
        sorted_domains[0][1]
    )

    selected = [

        domain

        for domain, score
        in sorted_domains

        if score >= max(
            1.0,
            best_score * 0.45
        )

    ]

    return selected


# ============================================================
# 19. INTENT CLASSIFICATION
# ============================================================

def classify_intents(
    query: str
) -> List[str]:

    q = normalize(
        query
    )

    intents = []

    if any(

        marker in q

        for marker in [

            "what is",
            "meaning",
            "define",
            "definition",
            "क्या है",
            "म्हणजे काय",
            "काय आहे",

        ]

    ):

        intents.append(
            "definition"
        )

    if any(

        marker in q

        for marker in [

            "document",
            "documents",
            "required",
            "required documents",

            "कागजात",
            "दस्तावेज",
            "कागदपत्र",
            "कागदपत्रे",
            "लागतात",

        ]

    ):

        intents.append(
            "documents"
        )

    if any(

        marker in q

        for marker in [

            "how",
            "how can",
            "how do",
            "procedure",
            "process",

            "कैसे",
            "कैसे करें",

            "कसे",
            "कशी",
            "प्रक्रिया",

        ]

    ):

        intents.append(
            "procedure"
        )

    if any(

        marker in q

        for marker in [

            "complaint",
            "complain",
            "grievance",

            "शिकायत",
            "तक्रार",

        ]

    ):

        intents.append(
            "complaint"
        )

    if any(

        marker in q

        for marker in [

            "eligible",
            "eligibility",
            "who can",

            "पात्र",
            "पात्रता",
            "पात्र कोण",

        ]

    ):

        intents.append(
            "eligibility"
        )

    if any(

        marker in q

        for marker in [

            "premium",
            "प्रीमियम",
            "हप्ता",

        ]

    ):

        intents.append(
            "premium"
        )

    if any(

        marker in q

        for marker in [

            "deadline",
            "last date",
            "cut off",
            "cut-off",

            "अंतिम तारीख",
            "अंतिम दिनांक",
            "शेवटची तारीख",

        ]

    ):

        intents.append(
            "deadline"
        )

    if not intents:

        intents.append(
            "general"
        )

    return list(
        dict.fromkeys(
            intents
        )
    )


# ============================================================
# 20. PMFBY SUB-INTENT
# ============================================================

def classify_pmfby_subintent(
    query: str
) -> str:

    q = normalize(
        query
    )

    # Claim / loss first
    if any(

        marker in q

        for marker in [

            "claim",
            "claim documents",
            "claim assessment",
            "loss intimation",
            "loss claim",
            "loss occurrence",
            "damage claim",

            "क्लेम",
            "दावा",
            "नुकसान",
            "नुकसानाची तक्रार",

        ]

    ):

        return (
            "pmfby_claim_documents"
        )

    if any(

        marker in q

        for marker in [

            "premium",
            "प्रीमियम",
            "हप्ता",

        ]

    ):

        return (
            "pmfby_premium"
        )

    if any(

        marker in q

        for marker in [

            "eligible",
            "eligibility",
            "who is eligible",

            "पात्र",
            "पात्रता",

        ]

    ):

        return (
            "pmfby_eligibility"
        )

    if any(

        marker in q

        for marker in [

            "loss",
            "loss assessment",
            "crop loss",

            "नुकसान",
            "पीक नुकसान",

        ]

    ):

        return (
            "pmfby_loss"
        )

    if any(

        marker in q

        for marker in [

            "deadline",
            "last date",
            "cut off",
            "cut-off",

            "अंतिम तारीख",
            "शेवटची तारीख",

        ]

    ):

        return (
            "pmfby_deadline"
        )

    # Important default:
    # "documents required for crop insurance"
    # = enrollment documents
    return (
        "pmfby_enrollment_documents"
    )


# ============================================================
# 21. SUB-INTENT CLASSIFICATION
# ============================================================

def classify_subintents(
    query: str,
    domains: List[str],
    intents: List[str]
) -> List[str]:

    q = normalize(
        query
    )

    sub_intents = []

    # --------------------------------------------------------
    # KCC
    # --------------------------------------------------------

    if (

        "kcc" in q

        or "kisan credit card" in q

        or "किसान क्रेडिट कार्ड" in q

    ):

        sub_intents.append(
            "agri_kcc"
        )

    # --------------------------------------------------------
    # NABARD / REFINANCE
    # --------------------------------------------------------

    if (

        "nabard" in q

        or "refinance" in q

        or "पुनर्वित्त" in q

    ):

        if (
            "agricultural_loan"
            in domains
        ):

            sub_intents.extend([

                "agri_refinance",

                "nabard",

            ])

    # --------------------------------------------------------
    # PMFBY
    # --------------------------------------------------------

    if "pmfby" in domains:

        sub_intents.append(

            classify_pmfby_subintent(
                query
            )

        )

    # --------------------------------------------------------
    # COOPERATIVE COMPLAINT
    # --------------------------------------------------------

    complaint_words = [

        "complaint",
        "complain",
        "grievance",
        "शिकायत",
        "तक्रार",

    ]

    cooperative_words = [

        "cooperative",
        "co-operative",
        "cooperative society",
        "cooperative institution",

        "सहकारी समिति",
        "सहकारी समिती",
        "सहकारी संस्था",
        "सहकारी संस्थे",

    ]

    if (

        any(
            item in q
            for item in complaint_words
        )

        and

        any(
            item in q
            for item in cooperative_words
        )

    ):

        sub_intents.append(
            "cooperative_complaint"
        )

    # --------------------------------------------------------
    # PACS LOAN / DOCUMENTS
    # Keep this separate from PACS membership.
    # --------------------------------------------------------

    pacs_present = any(item in q for item in [
        "pacs", "पॅक्स", "पैक्स", "पैक्स", "पॅक्स",
    ])

    loan_present = any(item in q for item in [
        "loan", "loans", "credit", "ऋण", "कर्ज", "कर्जा",
    ])

    document_present = any(item in q for item in [
        "document", "documents", "required document",
        "कागजात", "दस्तावेज", "कागदपत्र", "कागदपत्रे",
    ])

    if pacs_present and loan_present:
        sub_intents.append("pacs_loan")

    if pacs_present and loan_present and document_present:
        sub_intents.append("pacs_loan_documents")

    # --------------------------------------------------------
    # PACS MEMBERSHIP
    # --------------------------------------------------------

    if (

        "pacs" in q

        and any(

            item in q

            for item in [

                "member",
                "membership",
                "join",
                "eligibility",

            ]

        )

    ):

        sub_intents.append(
            "pacs_membership"
        )

    if (

        "सदस्य" in q

        and (

            "सहकारी" in q

            or "पॅक्स" in q

            or "pacs" in q

        )

    ):

        sub_intents.append(
            "pacs_membership"
        )

    return list(
        dict.fromkeys(
            sub_intents
        )
    )


# ============================================================
# 22. QUERY EXPANSION
# ============================================================

QUERY_EXPANSIONS = {

    "agri_kcc": [

        "Kisan Credit Card Scheme",
        "KCC",
        "purpose of KCC",
        "features of KCC",
        "credit requirements",
        "cultivation",
        "post-harvest",
        "marketing",

    ],

    "agri_refinance": [

        "NABARD refinance",
        "refinance facility",
        "agricultural refinance",
        "refinance loans",
        "NABARD",

    ],

    "nabard": [

        "NABARD",
        "National Bank for Agriculture and Rural Development",
        "refinance",
        "agricultural refinance",

    ],

    "pmfby_enrollment_documents": [

        "PMFBY enrollment documents",
        "application proposal",
        "Aadhaar",
        "bank passbook",
        "land record",
        "land ownership",
        "sowing certificate",
        "self declaration",
        "cultivable land",
        "e-KYC",

    ],

    "pmfby_claim_documents": [

        "PMFBY claim documents",
        "claim assessment",
        "loss intimation",
        "IMD report",
        "media report",
        "newspaper cutting",
        "loss occurrence",

    ],

    "cooperative_complaint": [

        "submission of complaints",
        "complaint register",
        "grievance redressal",
        "managing committee",
        "State Registrar",
        "acknowledgment",
        "complaint received",

    ],

    "pacs_loan": [

        "PACS loan",
        "PACS credit facility",
        "primary agricultural credit society loan",
        "agricultural credit society lending",
        "farmer loan documents",

    ],

    "pacs_loan_documents": [

        "PACS loan documents",
        "documents required for PACS loan",
        "loan application documents",
        "KYC documents",
        "identity proof",
        "land record",
        "7/12 extract",
        "bank passbook",

    ],

    "pacs_membership": [

        "PACS membership",
        "membership application",
        "KYC",
        "identity proof",
        "residence proof",
        "land holding proof",

    ],

}


def expand_query(
    query: str,
    sub_intents: List[str]
) -> List[str]:

    terms = []

    for sub_intent in sub_intents:

        terms.extend(
            QUERY_EXPANSIONS.get(
                sub_intent,
                []
            )
        )

    if not terms:

        terms.append(
            query
        )

    result = []

    seen = set()

    for term in terms:

        key = normalize(
            term
        )

        if key not in seen:

            seen.add(
                key
            )

            result.append(
                term
            )

    return result


# ============================================================
# 23. SOURCE → DOMAIN MAP
# ============================================================

SOURCE_DOMAIN_MAP = {

    "cooperative_laws": {

        "cooperative_laws",
        "pacs",
        "grievance_redressal",

    },

    "pacs": {

        "pacs",
        "cooperative_laws",

    },

    "crop_insurance": {

        "pmfby",

    },

    "financial_literacy": {

        "financial_literacy",
        "agricultural_loan",
        "government_schemes",

    },

    "government_schemes": {

        "government_schemes",
        "agricultural_loan",
        "pmfby",

    },

    "grievance_redressal": {

        "grievance_redressal",
        "cooperative_laws",

    },

    "maharashtra_cooperation": {

        "agricultural_loan",
        "pacs",
        "cooperative_laws",
        "grievance_redressal",

    },

    "official_government_documents": {

        "grievance_redressal",
        "government_schemes",
        "cooperative_laws",

    },

}


def source_category(
    source_file: str
) -> str:

    source = normalize(
        source_file
    )

    if "__" in source:

        return source.split(
            "__"
        )[0]

    return source.split(
        "_"
    )[0]


def source_domains(
    source_file: str
) -> set:

    category = source_category(
        source_file
    )

    return SOURCE_DOMAIN_MAP.get(
        category,
        set()
    )


def candidate_matches_domain(
    source_file: str,
    query_domains: List[str]
) -> bool:

    if not query_domains:

        return False

    candidate_domains = source_domains(
        source_file
    )

    return bool(

        candidate_domains.intersection(
            set(query_domains)
        )

    )


# ============================================================
# 24. REQUIRED TOPICS
# ============================================================

REQUIRED_TOPIC_MARKERS = {

    "kcc": [

        "kcc",
        "kisan credit card",
        "kisan credit card scheme",
        "किसान क्रेडिट कार्ड",

    ],

    "nabard": [

        "nabard",
        "national bank for agriculture",
        "नाबार्ड",

    ],

    "refinance": [

        "refinance",
        "refinancing",
        "पुनर्वित्त",

    ],

    "pmfby": [

        "pmfby",
        "pradhan mantri fasal bima",
        "fasal bima",
        "crop insurance",

        "पीएमएफबीवाई",
        "फसल बीमा",
        "पीक विमा",

    ],

    "documents": [

        "document",
        "documents",
        "aadhaar",
        "aadhar",
        "passbook",
        "land record",
        "land ownership",
        "sowing certificate",
        "self declaration",

        "कागजात",
        "दस्तावेज",
        "कागदपत्र",
        "कागदपत्रे",

    ],

    "complaint": [

        "complaint",
        "complaints",
        "grievance",
        "complaint register",
        "submission of complaints",

        "शिकायत",
        "तक्रार",

    ],

}


def required_topics(
    sub_intents: List[str],
    intents: List[str]
) -> List[str]:

    topics = []

    if "agri_kcc" in sub_intents:

        topics.append(
            "kcc"
        )

    if "agri_refinance" in sub_intents:

        topics.append(
            "refinance"
        )

    if "nabard" in sub_intents:

        topics.append(
            "nabard"
        )

    if any(

        item.startswith(
            "pmfby_"
        )

        for item in sub_intents

    ):

        topics.append(
            "pmfby"
        )

    if "documents" in intents:

        topics.append(
            "documents"
        )

    if "pacs_loan" in sub_intents or "pacs_loan_documents" in sub_intents:
        topics.append("pacs_loan")
    if "pacs_membership" in sub_intents:
        topics.append("pacs_membership")
    if "cooperative_complaint" in sub_intents:

        topics.append(
            "complaint"
        )

    return list(
        dict.fromkeys(
            topics
        )
    )


def topic_score(
    text: str,
    topics: List[str]
) -> float:

    if not topics:

        return 0.0

    text = normalize(
        text
    )

    matched = 0

    for topic in topics:

        markers = REQUIRED_TOPIC_MARKERS.get(
            topic,
            []
        )

        if any(

            normalize(marker) in text

            for marker in markers

        ):

            matched += 1

    return clip(
        matched / len(topics)
    )


# ============================================================
# 25. LEXICAL SEARCH
# ============================================================

STOPWORDS = {

    "what",
    "is",
    "are",
    "the",
    "a",
    "an",
    "for",
    "to",
    "of",
    "and",
    "how",
    "can",
    "i",
    "me",
    "my",
    "do",
    "does",
    "in",
    "on",

    "के",
    "का",
    "की",
    "और",
    "क्या",
    "है",
    "से",
    "में",
    "को",

    "कसे",
    "काय",
    "आहे",
    "आणि",

}


def lexical_score(
    query: str,
    text: str
) -> float:

    query_tokens = [

        token

        for token in tokenize(
            query
        )

        if token not in STOPWORDS

    ]

    text_tokens = set(
        tokenize(
            text
        )
    )

    if not query_tokens:

        return 0.0

    matched = sum(

        1

        for token in query_tokens

        if token in text_tokens

    )

    base = (
        matched
        / len(query_tokens)
    )

    phrase_bonus = 0.0

    important_phrases = [

        "kisan credit card",
        "nabard refinance",
        "crop insurance",
        "cooperative complaint",
        "grievance redressal",
        "complaint register",
        "bank passbook",
        "land record",
        "sowing certificate",

    ]

    normalized_query = normalize(
        query
    )

    normalized_text = normalize(
        text
    )

    for phrase in important_phrases:

        if phrase in normalized_query:

            if phrase in normalized_text:

                phrase_bonus += 0.12

    return clip(
        base + phrase_bonus
    )


# ============================================================
# 26. CONFLICT FACTOR
# ============================================================

OLD_INSURANCE_MARKERS = [

    "nais",
    "mnais",
    "wbcis",
    "rwbcis",

]


def conflict_factor(
    text: str,
    source_file: str,
    domains: List[str]
) -> float:

    if "pmfby" not in domains:

        return 1.0

    text = normalize(
        text
    )

    factor = 1.0

    old_hits = sum(

        1

        for marker in OLD_INSURANCE_MARKERS

        if marker in text

    )

    if old_hits >= 2:

        factor *= 0.78

    elif old_hits == 1:

        factor *= 0.88

    return clip(
        factor,
        0.70,
        1.00
    )


# ============================================================
# 27. KCC RANKING FACTOR
# ============================================================

def kcc_relevance_factor(
    text: str,
    source_file: str,
    sub_intents: List[str],
    intents: List[str]
) -> float:

    if (

        "agri_kcc" not in sub_intents

        or

        "definition" not in intents

    ):

        return 1.0

    text = normalize(
        text
    )

    source = normalize(
        source_file
    )

    factor = 1.0

    # Direct known KCC source
    if (
        "financial_literacy__03farmers20042018"
        in source
    ):

        factor *= 1.08

    direct_markers = [

        "kisan credit card scheme",
        "features of kcc",
        "purpose of kcc",
        "purpose of the kcc",
        "kcc borrowers",
        "credit requirements",
        "working capital",
        "cultivation",
        "post-harvest",
        "marketing",

    ]

    direct_hits = sum(

        1

        for marker in direct_markers

        if marker in text

    )

    if direct_hits >= 3:

        factor *= 1.10

    elif direct_hits == 2:

        factor *= 1.07

    elif direct_hits == 1:

        factor *= 1.04

    # Insurance context mentioning KCC
    insurance_source = (
        "crop_insurance__"
        in source
    )

    insurance_context = any(

        marker in text

        for marker in [

            "compulsory coverage",
            "insurance coverage",
            "covered under",
            "loanee farmer",
            "seasonality discipline",
            "cut-off date",
            "cut off date",
            "insurance",

        ]

    )

    if (

        insurance_source

        and insurance_context

        and direct_hits == 0

    ):

        factor *= 0.75

    # Old insurance scheme terminology
    if any(

        marker in text

        for marker in [

            "nais",
            "wbcis",
            "mnais",
            "rwbcis",

        ]

    ):

        factor *= 0.82

    return clip(
        factor,
        0.65,
        1.15
    )


# ============================================================
# 28. PMFBY SUB-INTENT RANKING FACTOR
# ============================================================

def pmfby_subintent_factor(
    text: str,
    source_file: str,
    sub_intents: List[str]
) -> float:

    pmfby_subintents = [

        item

        for item in sub_intents

        if item.startswith(
            "pmfby_"
        )

    ]

    if not pmfby_subintents:

        return 1.0

    text = normalize(
        text
    )

    source = normalize(
        source_file
    )

    sub_intent = (
        pmfby_subintents[0]
    )

    factor = 1.0

    # Primary PMFBY source
    primary_source = (

        "crop_insurance__revamped"
        in source

        or

        "crop_insurance__operational_guidelines_pmfby"
        in source

    )

    if primary_source:

        factor *= 1.04

    # --------------------------------------------------------
    # PMFBY ENROLLMENT DOCUMENTS
    # --------------------------------------------------------

    if (
        sub_intent
        == "pmfby_enrollment_documents"
    ):

        enrollment_markers = [

            "aadhaar",
            "aadhar",
            "bank passbook",
            "passbook",
            "land record",
            "land ownership",
            "ownership",
            "cultivable land",
            "sowing certificate",
            "self declaration",
            "application",
            "proposal",
            "e-kyc",
            "lpc",
            "contract",
            "land possession",

        ]

        enrollment_hits = sum(

            1

            for marker in enrollment_markers

            if marker in text

        )

        if enrollment_hits >= 4:

            factor *= 1.12

        elif enrollment_hits >= 2:

            factor *= 1.08

        elif enrollment_hits == 1:

            factor *= 1.03

        # Claim / loss markers
        claim_markers = [

            "claim assessment",
            "loss intimation",
            "imd report",
            "media report",
            "newspaper cutting",
            "occurrence of loss",
            "severity of loss",
            "loss event",
            "assessment of loss",

        ]

        claim_hits = sum(

            1

            for marker in claim_markers

            if marker in text

        )

        if claim_hits >= 2:

            factor *= 0.70

        elif claim_hits == 1:

            factor *= 0.80

        # Generic insurance-agent text
        generic_agent_markers = [

            "educate and assist",
            "awareness",
            "collect premium",
            "insurance intermediaries",
            "responsible for verification",
            "verification of documents",

        ]

        generic_hits = sum(

            1

            for marker in generic_agent_markers

            if marker in text

        )

        if (

            generic_hits >= 1

            and enrollment_hits == 0

        ):

            factor *= 0.85

    # --------------------------------------------------------
    # PMFBY CLAIM DOCUMENTS
    # --------------------------------------------------------

    elif (
        sub_intent
        == "pmfby_claim_documents"
    ):

        claim_markers = [

            "claim assessment",
            "loss intimation",
            "imd report",
            "media report",
            "newspaper cutting",
            "occurrence of loss",
            "severity of loss",
            "loss event",
            "assessment of loss",

        ]

        claim_hits = sum(

            1

            for marker in claim_markers

            if marker in text

        )

        if claim_hits >= 3:

            factor *= 1.12

        elif claim_hits >= 1:

            factor *= 1.07

        enrollment_markers = [

            "aadhaar",
            "bank passbook",
            "sowing certificate",
            "self declaration",
            "land ownership",

        ]

        enrollment_hits = sum(

            1

            for marker in enrollment_markers

            if marker in text

        )

        if (

            enrollment_hits >= 3

            and claim_hits == 0

        ):

            factor *= 0.82

    return clip(
        factor,
        0.65,
        1.15
    )


# ============================================================
# 29. COOPERATIVE COMPLAINT RANKING FACTOR
# ============================================================

def cooperative_complaint_relevance_factor(
    text: str,
    source_file: str,
    sub_intents: List[str]
) -> float:

    if (
        "cooperative_complaint"
        not in sub_intents
    ):

        return 1.0

    text = normalize(
        text
    )

    source = normalize(
        source_file
    )

    factor = 1.0

    # Direct cooperative grievance evidence
    direct_markers = [

        "submission of complaints",
        "redressal of members",
        "members' complaints",
        "member complaints",
        "complaint register",
        "grievance redressal committee",
        "grievance committee",
        "managing committee",
        "state registrar",
        "complaint received",
        "complaints received",
        "acknowledgment",
        "acknowledgement",

    ]

    direct_hits = sum(

        1

        for marker in direct_markers

        if marker in text

    )

    if direct_hits >= 3:

        factor *= 1.12

    elif direct_hits == 2:

        factor *= 1.09

    elif direct_hits == 1:

        factor *= 1.05

    # Direct source preference
    if "grievance_redressal__" in source:

        factor *= 1.04

    if "cooperative_laws__" in source:

        factor *= 1.03

    # --------------------------------------------------------
    # False-positive contexts
    # --------------------------------------------------------

    irrelevant_markers = [

        "lost or destroyed",
        "lost or damaged",
        "share certificate",
        "lost share certificate",
        "police complaint",
        "non-cognizable complaint",
        "fir",
        "insurance grievance",
        "crop insurance",
        "farmer grievance",
        "insurance company",

    ]

    irrelevant_hits = sum(

        1

        for marker in irrelevant_markers

        if marker in text

    )

    if irrelevant_hits >= 3:

        factor *= 0.70

    elif irrelevant_hits == 2:

        factor *= 0.76

    elif irrelevant_hits == 1:

        factor *= 0.84

    return clip(
        factor,
        0.70,
        1.12
    )


# ============================================================
# 30. SOURCE QUALITY FACTOR
# ============================================================

def source_quality_factor(
    source_file: str
) -> float:

    source = normalize(
        source_file
    )

    factor = 1.0

    if (

        "official_government_documents__"
        in source

        or

        "government_schemes__"
        in source

    ):

        factor *= 1.04

    if "cooperative_laws__" in source:

        factor *= 1.04

    if "pacs__" in source:

        factor *= 1.04

    if "crop_insurance__" in source:

        factor *= 1.03

    if "maharashtra_cooperation__" in source:

        factor *= 1.03

    return clip(
        factor,
        0.90,
        1.08
    )


# ============================================================
# 31. QDRANT SEARCH
# ============================================================

def semantic_search(
    query_vector: np.ndarray,
    limit: int = QDRANT_TOP_K
) -> List[Dict[str, Any]]:

    try:

        response = qdrant.query_points(

            collection_name=COLLECTION_NAME,

            query=query_vector.tolist(),

            limit=limit,

            with_payload=True,

            timeout=QDRANT_TIMEOUT,

        )

        points = response.points

    except Exception as error:

        print(
            "Qdrant search error:",
            error
        )

        return []

    results = []

    for point in points:

        payload = (
            point.payload
            or {}
        )

        text = payload.get(
            "text",
            ""
        )

        metadata = payload.get(
            "metadata",
            {}
        )

        results.append({

            "point_id": str(
                point.id
            ),

            "semantic_score": clip(
                float(
                    point.score
                )
            ),

            "lexical_score": 0.0,

            "rerank_score": 0.0,

            "text": text,

            "metadata": metadata,

            "source_file": metadata.get(
                "source_file",
                ""
            ),

            "chunk_id": metadata.get(
                "chunk_id",
                ""
            ),

            "chunk_index": metadata.get(
                "chunk_index",
                0
            ),

            "is_neighbor": False,

        })

    return results


# ============================================================
# 32. LOCAL LEXICAL SEARCH
# ============================================================

def local_lexical_search(
    query: str,
    limit: int = LEXICAL_TOP_K
) -> List[Dict[str, Any]]:

    scored = []

    for chunk in chunks:

        text = chunk.get(
            "text",
            ""
        )

        if not text:

            continue

        score = lexical_score(
            query,
            text
        )

        if score <= 0:

            continue

        scored.append({

            "point_id": "",

            "semantic_score": 0.0,

            "lexical_score": score,

            "rerank_score": 0.0,

            "text": text,

            "metadata": chunk,

            "source_file": chunk.get(
                "source_file",
                ""
            ),

            "chunk_id": chunk.get(
                "chunk_id",
                ""
            ),

            "chunk_index": chunk.get(
                "chunk_index",
                0
            ),

            "is_neighbor": False,

        })

    scored.sort(

        key=lambda item:
        item.get(
            "lexical_score",
            0.0
        ),

        reverse=True

    )

    return scored[
        :limit
    ]


# ============================================================
# 33. MERGE SEMANTIC + LEXICAL
# ============================================================

def merge_candidates(
    semantic_results: List[Dict[str, Any]],
    lexical_results: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:

    merged = {}

    for item in semantic_results:

        key = (

            item.get(
                "chunk_id"
            )

            or

            item.get(
                "point_id"
            )

        )

        if not key:

            continue

        merged[key] = dict(
            item
        )

    for item in lexical_results:

        key = (

            item.get(
                "chunk_id"
            )

            or

            item.get(
                "point_id"
            )

        )

        if not key:

            continue

        if key not in merged:

            merged[key] = dict(
                item
            )

        else:

            merged[key][
                "lexical_score"
            ] = max(

                merged[key].get(
                    "lexical_score",
                    0.0
                ),

                item.get(
                    "lexical_score",
                    0.0
                )

            )

    return list(
        merged.values()
    )


# ============================================================
# 34. HARD DOMAIN FILTER
# ============================================================

def hard_domain_filter(
    candidates: List[Dict[str, Any]],
    domains: List[str]
) -> List[Dict[str, Any]]:

    if not domains:

        return []

    result = []

    for candidate in candidates:

        source_file = candidate.get(
            "source_file",
            ""
        )

        if candidate_matches_domain(
            source_file,
            domains
        ):

            result.append(
                candidate
            )

    return result


# ============================================================
# 35. JINA RERANKING
# ============================================================

def rerank_candidates(
    query: str,
    candidates: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:

    if not candidates:

        return []

    candidates = candidates[
        :MAX_RERANK_CANDIDATES
    ]

    pairs = [

        (
            query,
            candidate.get(
                "text",
                ""
            )
        )

        for candidate in candidates

    ]

    try:

        scores = reranker.predict(

            pairs,

            batch_size=8,

            show_progress_bar=False

        )

    except Exception as error:

        raise RuntimeError(
            "Jina reranking failed:\n"
            f"{error}"
        )

    scores = np.asarray(
        scores,
        dtype=float
    )

    for candidate, raw_score in zip(
        candidates,
        scores
    ):

        raw_score = float(
            np.asarray(
                raw_score
            ).reshape(
                -1
            )[0]
        )

        # Handle logits or probability-like output
        if (
            raw_score < 0.0
            or raw_score > 1.0
        ):

            rerank_score = sigmoid(
                raw_score
            )

        else:

            rerank_score = raw_score

        candidate[
            "rerank_score"
        ] = clip(
            rerank_score
        )

    candidates.sort(

        key=lambda item:
        item.get(
            "rerank_score",
            0.0
        ),

        reverse=True

    )

    return candidates


# ============================================================
# 36. FINAL SCORE
# ============================================================

def calculate_final_score(
    candidate: Dict[str, Any],
    domains: List[str],
    intents: List[str],
    sub_intents: List[str],
    topics: List[str]
) -> float:

    rerank = candidate.get(
        "rerank_score",
        0.0
    )

    semantic = candidate.get(
        "semantic_score",
        0.0
    )

    lexical = candidate.get(
        "lexical_score",
        0.0
    )

    text = candidate.get(
        "text",
        ""
    )

    source_file = candidate.get(
        "source_file",
        ""
    )

    topic = topic_score(
        text,
        topics
    )

    # --------------------------------------------------------
    # Conservative V5.1 scoring
    # --------------------------------------------------------

    base_score = (

        0.55 * rerank

        + 0.20 * semantic

        + 0.15 * lexical

        + 0.10 * topic

    )

    # Source quality
    quality_factor = (
        source_quality_factor(
            source_file
        )
    )

    # KCC
    kcc_factor = (
        kcc_relevance_factor(

            text,

            source_file,

            sub_intents,

            intents

        )
    )

    # PMFBY
    pmfby_factor = (
        pmfby_subintent_factor(

            text,

            source_file,

            sub_intents

        )
    )

    # Cooperative complaint
    complaint_factor = (
        cooperative_complaint_relevance_factor(

            text,

            source_file,

            sub_intents

        )
    )

    # Conflict
    conflict = (
        conflict_factor(

            text,

            source_file,

            domains

        )
    )

    final_score = (

        base_score

        * quality_factor

        * kcc_factor

        * pmfby_factor

        * complaint_factor

        * conflict

    )

    # --------------------------------------------------------
    # Conservative upper bound
    #
    # Ranking factors must not inflate score excessively.
    # --------------------------------------------------------

    upper_bound = min(
        1.0,
        rerank + 0.12
    )

    final_score = min(
        final_score,
        upper_bound
    )

    return clip(
        final_score
    )


def score_candidates(
    candidates: List[Dict[str, Any]],
    domains: List[str],
    intents: List[str],
    sub_intents: List[str],
    topics: List[str]
) -> List[Dict[str, Any]]:

    for candidate in candidates:

        candidate[
            "topic_score"
        ] = topic_score(

            candidate.get(
                "text",
                ""
            ),

            topics

        )

        candidate[
            "quality_factor"
        ] = source_quality_factor(

            candidate.get(
                "source_file",
                ""
            )

        )

        candidate[
            "final_score"
        ] = calculate_final_score(

            candidate,

            domains,

            intents,

            sub_intents,

            topics

        )

    candidates.sort(

        key=lambda item:
        item.get(
            "final_score",
            0.0
        ),

        reverse=True

    )

    return candidates


# ============================================================
# 37. DEDUPLICATION
# ============================================================

def text_fingerprint(
    text: str
) -> str:

    text = normalize(
        text
    )

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text[
        :1200
    ]


def deduplicate_candidates(
    candidates: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:

    seen_chunk_ids = set()

    seen_texts = set()

    unique = []

    for candidate in candidates:

        chunk_id = candidate.get(
            "chunk_id",
            ""
        )

        fingerprint = text_fingerprint(

            candidate.get(
                "text",
                ""
            )

        )

        if (

            chunk_id

            and

            chunk_id in seen_chunk_ids

        ):

            continue

        if (

            fingerprint

            and

            fingerprint in seen_texts

        ):

            continue

        if chunk_id:

            seen_chunk_ids.add(
                chunk_id
            )

        if fingerprint:

            seen_texts.add(
                fingerprint
            )

        unique.append(
            candidate
        )

    return unique


# ============================================================
# 38. NEIGHBOR EXPANSION
# ============================================================

def get_neighbor_chunks(
    candidate: Dict[str, Any],
    topics: List[str]
) -> List[Dict[str, Any]]:

    source_file = candidate.get(
        "source_file",
        ""
    )

    try:

        chunk_index = int(
            candidate.get(
                "chunk_index",
                0
            )
        )

    except Exception:

        chunk_index = 0

    source_chunks = (
        chunk_by_source.get(
            source_file,
            []
        )
    )

    if not source_chunks:

        return []

    neighbors = []

    target_indices = [

        chunk_index + 1

    ]

    for target_index in target_indices:

        for chunk in source_chunks:

            try:

                index = int(
                    chunk.get(
                        "chunk_index",
                        -1
                    )
                )

            except Exception:

                continue

            if index != target_index:

                continue

            text = chunk.get(
                "text",
                ""
            )

            # Neighbor must still be relevant
            if topics:

                if topic_score(
                    text,
                    topics
                ) <= 0:

                    continue

            neighbors.append({

                "point_id": "",

                "semantic_score": 0.0,

                "lexical_score": 0.0,

                "rerank_score": (
                    candidate.get(
                        "rerank_score",
                        0.0
                    ) * 0.75
                ),

                "text": text,

                "metadata": chunk,

                "source_file": chunk.get(
                    "source_file",
                    ""
                ),

                "chunk_id": chunk.get(
                    "chunk_id",
                    ""
                ),

                "chunk_index": chunk.get(
                    "chunk_index",
                    index
                ),

                "is_neighbor": True,

                "final_score": (

                    candidate.get(
                        "final_score",
                        0.0
                    ) * 0.70

                ),

            })

            break

    return neighbors[
        :MAX_NEIGHBORS_PER_RESULT
    ]


# ============================================================
# 39. DIVERSITY / MMR-STYLE SELECTION
# ============================================================

def diversity_select(
    candidates: List[Dict[str, Any]],
    limit: int = FINAL_TOP_K
) -> List[Dict[str, Any]]:

    selected = []

    source_counts = {}

    for candidate in candidates:

        source = candidate.get(
            "source_file",
            ""
        )

        current_count = source_counts.get(
            source,
            0
        )

        if (
            current_count
            >= MAX_RESULTS_PER_SOURCE
        ):

            continue

        selected.append(
            candidate
        )

        source_counts[
            source
        ] = current_count + 1

        if len(selected) >= limit:

            break

    return selected


# ============================================================
# 40. EVIDENCE COMPLETENESS
# ============================================================

def evidence_completeness(
    candidates: List[Dict[str, Any]],
    topics: List[str]
) -> float:

    if not topics:

        return 0.0

    if not candidates:

        return 0.0

    covered = 0

    for topic in topics:

        markers = (
            REQUIRED_TOPIC_MARKERS.get(
                topic,
                []
            )
        )

        found = False

        for candidate in candidates:

            text = normalize(
                candidate.get(
                    "text",
                    ""
                )
            )

            if any(

                normalize(marker)
                in text

                for marker in markers

            ):

                found = True

                break

        if found:

            covered += 1

    return clip(
        covered / len(topics)
    )


# ============================================================
# 41. DIRECT EVIDENCE
# ============================================================

def has_direct_evidence(
    candidates: List[Dict[str, Any]],
    sub_intents: List[str],
    intents: List[str]
) -> bool:

    if not candidates:

        return False

    for candidate in candidates:

        text = normalize(
            candidate.get(
                "text",
                ""
            )
        )

        rerank = candidate.get(
            "rerank_score",
            0.0
        )

        final_score = candidate.get(
            "final_score",
            0.0
        )

        # ----------------------------------------------------
        # KCC
        # ----------------------------------------------------

        if "agri_kcc" in sub_intents:

            direct_markers = [

                "kisan credit card scheme",
                "purpose of kcc",
                "features of kcc",
                "kcc borrowers",
                "credit requirements",

            ]

            if (

                any(
                    marker in text
                    for marker in direct_markers
                )

                and

                rerank >= 0.40

            ):

                return True

        # ----------------------------------------------------
        # NABARD / REFINANCE
        # ----------------------------------------------------

        if (

            "agri_refinance"
            in sub_intents

            or

            "nabard"
            in sub_intents

        ):

            if (

                "nabard" in text

                or

                "refinance" in text

                or

                "पुनर्वित्त" in text

            ):

                if rerank >= 0.35:

                    return True

        # ----------------------------------------------------
        # PMFBY
        # ----------------------------------------------------

        if any(

            item.startswith(
                "pmfby_"
            )

            for item in sub_intents

        ):

            if any(

                marker in text

                for marker in [

                    "pmfby",
                    "pradhan mantri fasal bima",
                    "fasal bima",
                    "crop insurance",
                    "पीएमएफबीवाई",
                    "फसल बीमा",
                    "पीक विमा",

                ]

            ):

                if rerank >= 0.35:

                    return True

        # ----------------------------------------------------
        # COOPERATIVE COMPLAINT
        # ----------------------------------------------------

        if (
            "cooperative_complaint"
            in sub_intents
        ):

            direct_markers = [

                "submission of complaints",
                "complaint register",
                "grievance redressal",
                "grievance committee",
                "managing committee",
                "state registrar",
                "complaint received",
                "complaints received",
                "acknowledgment",
                "acknowledgement",

            ]

            if (

                any(
                    marker in text
                    for marker in direct_markers
                )

                and

                rerank >= 0.35

            ):

                return True

        # ----------------------------------------------------
        # PACS LOAN DIRECT EVIDENCE
        # ----------------------------------------------------

        if (
            "pacs_loan" in sub_intents
            or "pacs_loan_documents" in sub_intents
        ):
            pacs_loan_markers = [
                "pacs",
                "primary agricultural credit society",
                "loan",
                "credit",
                "कर्ज",
                "ऋण",
                "कागदपत्र",
                "कागजात",
                "दस्तावेज",
            ]
            marker_hits = sum(
                1 for marker in pacs_loan_markers
                if marker in text
            )
            if marker_hits >= 2 and (
                rerank >= 0.35 or final_score >= 0.30
            ):
                return True

        # ----------------------------------------------------
        # DOCUMENTS
        # ----------------------------------------------------

        if "documents" in intents:

            if any(

                marker in text

                for marker in [

                    "aadhaar",
                    "aadhar",
                    "bank passbook",
                    "land record",
                    "land ownership",
                    "sowing certificate",
                    "self declaration",
                    "application",
                    "proposal",

                    "कागजात",
                    "दस्तावेज",
                    "कागदपत्र",

                ]

            ):

                if final_score >= 0.30:

                    return True

    return False


# ============================================================
# 42. ANSWERABILITY
# ============================================================

def determine_answerability(
    candidates: List[Dict[str, Any]],
    topics: List[str],
    sub_intents: List[str],
    intents: List[str]
) -> bool:

    if not candidates:

        return False

    completeness = (
        evidence_completeness(
            candidates,
            topics
        )
    )

    direct = has_direct_evidence(

        candidates,

        sub_intents,

        intents

    )

    if not direct:

        return False

    if completeness < 0.50:

        return False

    best_rerank = max(

        (

            candidate.get(
                "rerank_score",
                0.0
            )

            for candidate in candidates

        ),

        default=0.0

    )

    if best_rerank < 0.40:

        return False

    return True


# ============================================================
# 43. STATUS
# ============================================================

def determine_status(
    domains: List[str],
    candidates: List[Dict[str, Any]],
    topics: List[str],
    sub_intents: List[str],
    intents: List[str]
) -> str:

    if not domains:

        return "OUT_OF_SCOPE"

    if not candidates:

        return "INSUFFICIENT"

    completeness = (
        evidence_completeness(
            candidates,
            topics
        )
    )

    direct = has_direct_evidence(

        candidates,

        sub_intents,

        intents

    )

    if not direct:

        return "INSUFFICIENT"

    best_rerank = max(

        (

            candidate.get(
                "rerank_score",
                0.0
            )

            for candidate in candidates

        ),

        default=0.0

    )

    if (

        completeness >= 0.80

        and

        best_rerank >= 0.55

    ):

        return "STRONG"

    if (

        completeness >= 0.50

        and

        best_rerank >= 0.40

    ):

        return "PARTIAL"

    return "INSUFFICIENT"


# ============================================================
# 44. FINAL GEMINI GATE
# ============================================================

def final_gemini_gate(
    status: str,
    answerable: bool,
    candidates: List[Dict[str, Any]],
    topics: List[str]
) -> bool:

    # Never send unsupported queries to Gemini
    if status in {

        "OUT_OF_SCOPE",

        "INSUFFICIENT",

    }:

        return False

    if not answerable:

        return False

    if not candidates:

        return False

    best_rerank = max(

        (

            candidate.get(
                "rerank_score",
                0.0
            )

            for candidate in candidates

        ),

        default=0.0

    )

    completeness = (
        evidence_completeness(
            candidates,
            topics
        )
    )

    # STRONG
    if status == "STRONG":

        return (

            best_rerank >= 0.50

            and

            completeness >= 0.80

        )

    # PARTIAL
    if status == "PARTIAL":

        return (

            best_rerank >= 0.40

            and

            completeness >= 0.65

        )

    return False


# ============================================================
# 45. BUILD EVIDENCE
# ============================================================

def build_evidence(
    candidates: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:

    evidence = []

    for rank, candidate in enumerate(

        candidates,

        start=1

    ):

        evidence.append({

            "rank": rank,

            "chunk_id": candidate.get(
                "chunk_id",
                ""
            ),

            "source_file": candidate.get(
                "source_file",
                ""
            ),

            "chunk_index": candidate.get(
                "chunk_index",
                0
            ),

            "text": candidate.get(
                "text",
                ""
            ),

            "semantic_score": round(

                candidate.get(
                    "semantic_score",
                    0.0
                ),

                4

            ),

            "lexical_score": round(

                candidate.get(
                    "lexical_score",
                    0.0
                ),

                4

            ),

            "rerank_score": round(

                candidate.get(
                    "rerank_score",
                    0.0
                ),

                4

            ),

            "final_score": round(

                candidate.get(
                    "final_score",
                    0.0
                ),

                4

            ),

            "is_neighbor": candidate.get(
                "is_neighbor",
                False
            ),

        })

    return evidence


# ============================================================
# 46. PROCESS ONE QUESTION
# ============================================================

def process_question(
    query: str,
    forced_language: str = None
) -> Dict[str, Any]:

    original_query = query

    query = clean_question(
        query
    )

    # --------------------------------------------------------
    # LANGUAGE
    # --------------------------------------------------------

    if forced_language:

        language = forced_language

    else:

        language = detect_language(
            query
        )

    # --------------------------------------------------------
    # DOMAIN
    # --------------------------------------------------------

    domains = classify_domains(
        query
    )

    # --------------------------------------------------------
    # INTENT
    # --------------------------------------------------------

    intents = classify_intents(
        query
    )

    # --------------------------------------------------------
    # SUB-INTENT
    # --------------------------------------------------------

    sub_intents = classify_subintents(

        query,

        domains,

        intents

    )

    # --------------------------------------------------------
    # REQUIRED TOPICS
    # --------------------------------------------------------

    topics = required_topics(

        sub_intents,

        intents

    )

    # --------------------------------------------------------
    # QUERY EXPANSION
    # --------------------------------------------------------

    expanded_terms = expand_query(

        query,

        sub_intents

    )

    # --------------------------------------------------------
    # OUT OF SCOPE
    # --------------------------------------------------------

    if not domains:

        return {

            "question": query,

            "original_question":
                original_query,

            "language":
                language,

            "language_name":
                language_name(
                    language
                ),

            "domains": [],

            "intents":
                intents,

            "sub_intents":
                sub_intents,

            "required_topics":
                topics,

            "expanded_terms":
                expanded_terms,

            "qdrant_candidates": 0,

            "lexical_candidates": 0,

            "combined_candidates": 0,

            "domain_filtered_candidates": 0,

            "final_evidence_count": 0,

            "evidence": [],

            "status":
                "OUT_OF_SCOPE",

            "evidence_completeness":
                0.0,

            "answerable":
                False,

            "gemini_allowed":
                False,

            "tts_language":
                language,

            "answer_language_instruction":
                answer_language_instruction(
                    language
                ),

            "answer_language_contract":
                answer_language_contract(language),

        }

    # --------------------------------------------------------
    # QUERY USED FOR RETRIEVAL
    # --------------------------------------------------------

    expanded_query = (

        query

        + " "

        + " ".join(
            expanded_terms
        )

    )

    # --------------------------------------------------------
    # QUERY EMBEDDING
    # --------------------------------------------------------

    query_vector = embedding_model.encode(

        expanded_query,

        convert_to_numpy=True,

        normalize_embeddings=True

    )

    # --------------------------------------------------------
    # QDRANT
    # --------------------------------------------------------

    semantic_results = semantic_search(

        query_vector,

        QDRANT_TOP_K

    )

    # --------------------------------------------------------
    # LOCAL LEXICAL
    # --------------------------------------------------------

    lexical_results = local_lexical_search(

        expanded_query,

        LEXICAL_TOP_K

    )

    # --------------------------------------------------------
    # MERGE
    # --------------------------------------------------------

    combined = merge_candidates(

        semantic_results,

        lexical_results

    )

    # --------------------------------------------------------
    # DOMAIN FILTER
    # --------------------------------------------------------

    domain_filtered = hard_domain_filter(

        combined,

        domains

    )

    # --------------------------------------------------------
    # PRELIMINARY CANDIDATE RANKING
    # --------------------------------------------------------

    for candidate in domain_filtered:

        topic = topic_score(

            candidate.get(
                "text",
                ""
            ),

            topics

        )

        candidate[
            "topic_score"
        ] = topic

        preliminary_score = (

            0.55
            * candidate.get(
                "semantic_score",
                0.0
            )

            +

            0.30
            * candidate.get(
                "lexical_score",
                0.0
            )

            +

            0.15
            * topic

        )

        candidate[
            "preliminary_score"
        ] = clip(
            preliminary_score
        )

    domain_filtered.sort(

        key=lambda item:
        item.get(
            "preliminary_score",
            0.0
        ),

        reverse=True

    )

    # --------------------------------------------------------
    # JINA
    # --------------------------------------------------------

    reranked = rerank_candidates(

        query,

        domain_filtered

    )

    # --------------------------------------------------------
    # FINAL SCORING
    # --------------------------------------------------------

    scored = score_candidates(

        reranked,

        domains,

        intents,

        sub_intents,

        topics

    )

    # --------------------------------------------------------
    # DEDUP
    # --------------------------------------------------------

    deduped = deduplicate_candidates(

        scored

    )

    # --------------------------------------------------------
    # NEIGHBOR EXPANSION
    # --------------------------------------------------------

    direct_candidates = deduped[

        :min(
            5,
            len(deduped)
        )

    ]

    expanded_candidates = list(

        direct_candidates

    )

    for candidate in direct_candidates:

        rerank = candidate.get(

            "rerank_score",

            0.0

        )

        # Only good evidence can pull
        # a neighboring chunk.
        if rerank < 0.40:

            continue

        neighbors = get_neighbor_chunks(

            candidate,

            topics

        )

        expanded_candidates.extend(
            neighbors
        )

    # --------------------------------------------------------
    # DEDUP AFTER NEIGHBORS
    # --------------------------------------------------------

    expanded_candidates = (
        deduplicate_candidates(
            expanded_candidates
        )
    )

    # --------------------------------------------------------
    # SORT
    # --------------------------------------------------------

    expanded_candidates.sort(

        key=lambda item:
        item.get(
            "final_score",
            0.0
        ),

        reverse=True

    )

    # --------------------------------------------------------
    # DIVERSITY
    # --------------------------------------------------------

    final_candidates = diversity_select(

        expanded_candidates,

        FINAL_TOP_K

    )

    # --------------------------------------------------------
    # COMPLETENESS
    # --------------------------------------------------------

    completeness = (
        evidence_completeness(

            final_candidates,

            topics

        )
    )

    # --------------------------------------------------------
    # ANSWERABILITY
    # --------------------------------------------------------

    answerable = determine_answerability(

        final_candidates,

        topics,

        sub_intents,

        intents

    )

    # --------------------------------------------------------
    # STATUS
    # --------------------------------------------------------

    status = determine_status(

        domains,

        final_candidates,

        topics,

        sub_intents,

        intents

    )

    # --------------------------------------------------------
    # GEMINI GATE
    # --------------------------------------------------------

    gemini_allowed = final_gemini_gate(

        status,

        answerable,

        final_candidates,

        topics

    )

    # --------------------------------------------------------
    # EVIDENCE
    # --------------------------------------------------------

    evidence = build_evidence(

        final_candidates

    )

    # --------------------------------------------------------
    # FINAL STRUCTURED RESULT
    # --------------------------------------------------------

    return {

        "question":
            query,

        "original_question":
            original_query,

        "language":
            language,

        "language_name":
            language_name(
                language
            ),

        "domains":
            domains,

        "intents":
            intents,

        "sub_intents":
            sub_intents,

        "required_topics":
            topics,

        "expanded_terms":
            expanded_terms,

        "qdrant_candidates":
            len(
                semantic_results
            ),

        "lexical_candidates":
            len(
                lexical_results
            ),

        "combined_candidates":
            len(
                combined
            ),

        "domain_filtered_candidates":
            len(
                domain_filtered
            ),

        "final_evidence_count":
            len(
                evidence
            ),

        "evidence":
            evidence,

        "status":
            status,

        "evidence_completeness":
            round(
                completeness,
                4
            ),

        "answerable":
            answerable,

        "gemini_allowed":
            gemini_allowed,

        "tts_language":
            language,

        "answer_language_instruction":
            answer_language_instruction(
                language
            ),

    }


# ============================================================
# 47. PROCESS MULTI-QUESTION QUERY
# ============================================================

def process_query(
    query: str,
    forced_language: str = None
) -> Dict[str, Any]:

    detected_language = (

        forced_language

        if forced_language

        else detect_language(
            query
        )

    )

    questions = split_multi_question(

        query

    )

    if not questions:

        questions = [

            clean_question(
                query
            )

        ]

    questions = questions[
        :MAX_QUESTIONS
    ]

    results = []

    for question in questions:

        result = process_question(

            question,

            forced_language=forced_language

        )

        results.append(
            result
        )

    # Important:
    # One unsupported question does not
    # block other supported questions.
    batch_gemini_allowed = any(

        result.get(
            "gemini_allowed",
            False
        )

        for result in results

    )

    return {

        "original_query":
            query,

        "language":
            detected_language,

        "language_name":
            language_name(
                detected_language
            ),

        "answer_language_contract":
            answer_language_contract(detected_language),

        "question_count":
            len(
                results
            ),

        "questions":
            results,

        "gemini_allowed":
            batch_gemini_allowed,

        "tts_languages": [

            result.get(
                "tts_language"
            )

            for result in results

        ],

    }


# ============================================================
# 48. TERMINAL OUTPUT
# ============================================================

def print_result(
    result: Dict[str, Any]
):

    print("\n")

    print("=" * 80)

    print(
        "SANYUKT VAANI RETRIEVAL RESULT"
    )

    print("=" * 80)

    print(

        "Original Query:",

        result.get(
            "original_query",
            ""
        )

    )

    print(

        "Detected Language:",

        result.get(
            "language_name",
            ""
        ),

        f"({result.get('language', '')})"

    )

    print(

        "Question Count:",

        result.get(
            "question_count",
            0
        )

    )

    print(

        "Batch Gemini Allowed:",

        result.get(
            "gemini_allowed",
            False
        )

    )

    for index, question in enumerate(

        result.get(
            "questions",
            []
        ),

        start=1

    ):

        print("\n")

        print("-" * 80)

        print(
            f"QUESTION {index}"
        )

        print("-" * 80)

        print(

            "Question      :",

            question.get(
                "question",
                ""
            )

        )

        print(

            "Language      :",

            question.get(
                "language_name",
                ""
            ),

            f"({question.get('language', '')})"

        )

        print(

            "Domains       :",

            question.get(
                "domains",
                []
            )

        )

        print(

            "Intents       :",

            question.get(
                "intents",
                []
            )

        )

        print(

            "Sub-Intents   :",

            question.get(
                "sub_intents",
                []
            )

        )

        print(

            "Required Topics:",

            question.get(
                "required_topics",
                []
            )

        )

        print(

            "Expanded Terms:",

            len(
                question.get(
                    "expanded_terms",
                    []
                )
            )

        )

        print(

            "Qdrant candidates:",

            question.get(
                "qdrant_candidates",
                0
            )

        )

        print(

            "Lexical candidates:",

            question.get(
                "lexical_candidates",
                0
            )

        )

        print(

            "Combined candidates:",

            question.get(
                "combined_candidates",
                0
            )

        )

        print(

            "After hard domain filter:",

            question.get(
                "domain_filtered_candidates",
                0
            )

        )

        print(

            "Final evidence count:",

            question.get(
                "final_evidence_count",
                0
            )

        )

        print(

            "STATUS        :",

            question.get(
                "status",
                ""
            )

        )

        print(

            "Evidence Completeness:",

            f"{question.get('evidence_completeness', 0):.4f}"

        )

        print(

            "Answerable    :",

            question.get(
                "answerable",
                False
            )

        )

        print(

            "Gemini Allowed:",

            question.get(
                "gemini_allowed",
                False
            )

        )

        print(

            "TTS Language  :",

            question.get(
                "tts_language",
                ""
            )

        )

        print(

            "Answer Rule   :",

            question.get(
                "answer_language_instruction",
                ""
            )

        )

        print("\nTOP EVIDENCE")

        print("-" * 80)

        for evidence in question.get(

            "evidence",

            []

        ):

            print(
                f"\n#{evidence['rank']}"
            )

            print(

                "Chunk ID:",

                evidence[
                    "chunk_id"
                ]

            )

            print(

                "Source:",

                evidence[
                    "source_file"
                ]

            )

            print(

                "Chunk Index:",

                evidence[
                    "chunk_index"
                ]

            )

            print(

                "Semantic:",

                evidence[
                    "semantic_score"
                ]

            )

            print(

                "Lexical:",

                evidence[
                    "lexical_score"
                ]

            )

            print(

                "Jina:",

                evidence[
                    "rerank_score"
                ]

            )

            print(

                "Final:",

                evidence[
                    "final_score"
                ]

            )

            print(

                "Neighbor:",

                evidence[
                    "is_neighbor"
                ]

            )

            text = evidence[
                "text"
            ]

            if len(text) > 1200:

                text = (
                    text[:1200]
                    + "..."
                )

            print(
                "Text:"
            )

            print(
                text
            )

    print("\n")

    print("=" * 80)

    print(
        "END RESULT"
    )

    print("=" * 80)


# ============================================================
# 49. FINAL TEST QUERIES
# ============================================================

TEST_QUERIES = [

    # ========================================================
    # TEST 1
    # English multi-question
    # ========================================================

    (
        "What is KCC?, "
        "what is NABARD refinance, "
        "what documents are needed for crop insurance "
        "and how can I complain against a cooperative?"
    ),

    # ========================================================
    # TEST 2
    # Hindi multi-question
    # ========================================================

    (
        "किसान क्रेडिट कार्ड क्या है, "
        "NABARD पुनर्वित्त क्या है, "
        "फसल बीमा के लिए कौन से दस्तावेज चाहिए "
        "और सहकारी समिति के खिलाफ शिकायत कैसे करें?"
    ),

    # ========================================================
    # TEST 3
    # Marathi
    # ========================================================

    (
        "किसान क्रेडिट कार्ड म्हणजे काय?"
    ),

    # ========================================================
    # TEST 4
    # Cooperative complaint
    # ========================================================

    (
        "how can I complain against a cooperative?"
    ),

    # ========================================================
    # TEST 5
    # NABARD
    # ========================================================

    (
        "what is NABARD refinance"
    ),

    # ========================================================
    # TEST 6
    # PMFBY enrollment
    # ========================================================

    (
        "What documents are required for PMFBY crop insurance?"
    ),

    # ========================================================
    # TEST 7
    # PMFBY claim
    # ========================================================

    (
        "What documents are required for a PMFBY claim?"
    ),

    # ========================================================
    # TEST 8
    # PACS membership
    # ========================================================

    (
        "What documents are required for PACS membership?"
    ),

    # ========================================================
    # TEST 9
    # Out of scope
    # ========================================================

    (
        "Who won the FIFA World Cup?"
    ),

    # ========================================================
    # TEST 10
    # Weather out of scope
    # ========================================================

    (
        "what about today's weather?"
    ),

]


# ============================================================
# 50. MAIN
# ============================================================

if __name__ == "__main__":

    print("\n")

    print("=" * 80)

    print(
        "V5.1.9 FINAL RETRIEVER TEST"
    )

    print("=" * 80)

    for test_number, query in enumerate(

        TEST_QUERIES,

        start=1

    ):

        print("\n")

        print("#" * 80)

        print(

            f"TEST {test_number}"
            f"/{len(TEST_QUERIES)}"

        )

        print("#" * 80)

        print(
            "\nQuery:",
            query
        )

        try:

            result = process_query(
                query
            )

            print_result(
                result
            )

        except Exception as error:

            print("\nERROR:")

            print(
                error
            )

            import traceback

            traceback.print_exc()

    print("\n")

    print("=" * 80)

    print(
        "V5.1.9 FINAL RETRIEVER TESTING COMPLETE"
    )

    print("=" * 80)