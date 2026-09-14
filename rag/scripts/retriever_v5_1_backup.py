"""
SANYUKT VAANI - V5.1 FINAL RETRIEVER

Architecture:
    Query normalization
        ↓
    Domain detection
        ↓
    Intent + Sub-intent detection
        ↓
    OUT_OF_SCOPE gate
        ↓
    Query expansion
        ↓
    Qdrant semantic retrieval
        +
    Local lexical retrieval
        ↓
    Candidate merge
        ↓
    Hard domain filter
        ↓
    Negative-topic penalty
        ↓
    PMFBY sub-intent filtering
        ↓
    Jina multilingual reranking
        ↓
    Duplicate removal
        ↓
    Neighbor chunk expansion
        ↓
    Diversity/MMR-style selection
        ↓
    Evidence completeness
        ↓
    STRONG / PARTIAL / INSUFFICIENT
        ↓
    Gemini gate

IMPORTANT:
- Existing Qdrant collection is NOT modified.
- Existing embeddings are NOT regenerated.
- Existing 18,890 vectors are NOT uploaded again.
"""

import os
import re
import json
import glob
import hashlib
from pathlib import Path
from collections import Counter, defaultdict

import numpy as np
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer, CrossEncoder


# ============================================================
# 1. CONFIGURATION
# ============================================================

BASE_DIR = Path(r"C:\SIH\sanyukt-vaani")

CHUNKS_DIR = BASE_DIR / "rag" / "knowledge_base" / "chunks"

EMBEDDING_MODEL_NAME = (
    "sentence-transformers/"
    "paraphrase-multilingual-MiniLM-L12-v2"
)

RERANKER_MODEL_NAME = "jinaai/jina-reranker-v2-base-multilingual"

COLLECTION_NAME = "sanyuktvaani_kb"

EMBEDDING_DIM = 384

QDRANT_TOP_K = 40
LEXICAL_TOP_K = 40
FINAL_TOP_K = 8

RERANK_TOP_K = 30
NEIGHBOR_RADIUS = 1

QDRANT_TIMEOUT = 300

# Final confidence thresholds.
STRONG_FINAL_SCORE = 0.62
PARTIAL_FINAL_SCORE = 0.48

STRONG_RERANK_SCORE = 0.58
PARTIAL_RERANK_SCORE = 0.42

# Evidence threshold.
STRONG_EVIDENCE = 0.70
PARTIAL_EVIDENCE = 0.40

load_dotenv(BASE_DIR / ".env")


# ============================================================
# 2. QDRANT
# ============================================================

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

if not QDRANT_URL:
    raise RuntimeError(
        "QDRANT_URL not found in .env file."
    )

if not QDRANT_API_KEY:
    raise RuntimeError(
        "QDRANT_API_KEY not found in .env file."
    )


client = QdrantClient(
    url=QDRANT_URL,
    api_key=QDRANT_API_KEY,
    timeout=QDRANT_TIMEOUT,
)


# ============================================================
# 3. MODELS
# ============================================================

print("\nLoading embedding model...")

embedding_model = SentenceTransformer(
    EMBEDDING_MODEL_NAME
)

print("Embedding model loaded.")

print("\nLoading Jina multilingual reranker...")

reranker = CrossEncoder(
    RERANKER_MODEL_NAME,
    trust_remote_code=True,
)

print("Jina reranker loaded.")


# ============================================================
# 4. DOMAIN DEFINITIONS
# ============================================================

SUPPORTED_DOMAINS = [
    "pacs_membership",
    "pacs_services",
    "pacs_computerization",
    "cooperative_laws",
    "cooperative_governance",
    "membership_documents",
    "agricultural_loan",
    "kcc",
    "pmfby",
    "financial_literacy",
    "cooperative_schemes",
    "cooperative_grievance",
]


DOMAIN_KEYWORDS = {

    "pacs_membership": [
        "pacs membership",
        "pacs member",
        "become a member",
        "join pacs",
        "membership of pacs",
        "admission as member",
        "member admission",
        "pacs members",
    ],

    "pacs_services": [
        "pacs services",
        "services provided by pacs",
        "service provided by pacs",
        "pacs facilities",
        "pacs benefit",
        "services of pacs",
    ],

    "pacs_computerization": [
        "pacs computerization",
        "computerisation of pacs",
        "computerization of pacs",
        "digital pacs",
        "pacs software",
        "pacs data migration",
        "data migration",
        "dcdc",
        "rupay kisan credit card",
        "common accounting system",
        "hardware for pacs",
    ],

    "cooperative_laws": [
        "cooperative law",
        "co-operative law",
        "cooperative laws",
        "co-operative laws",
        "bylaw",
        "byelaw",
        "bye law",
        "bye-law",
        "cooperative act",
        "co-operative act",
        "rules of cooperative",
        "legal provision",
        "legal provisions",
        "section of cooperative act",
    ],

    "cooperative_governance": [
        "cooperative governance",
        "governance of cooperative",
        "managing committee",
        "management committee",
        "board of directors",
        "board meeting",
        "general body",
        "general body meeting",
        "election of cooperative",
        "election in cooperative",
        "audit of cooperative",
    ],

    "membership_documents": [
        "membership documents",
        "documents for membership",
        "documents required for membership",
        "membership application",
        "membership form",
        "documents to become member",
        "kyc for membership",
    ],

    "agricultural_loan": [
        "agricultural loan",
        "agriculture loan",
        "agri loan",
        "farm loan",
        "crop loan",
        "crop loans",
        "agricultural credit",
        "agriculture credit",
        "loan for farmer",
        "loan to farmer",
        "farmer loan",
        "short term crop loan",
    ],

    "kcc": [
        "kcc",
        "kisan credit card",
        "kisan credit",
        "kcc loan",
        "kcc limit",
        "kcc eligibility",
    ],

    "pmfby": [
        "pmfby",
        "pradhan mantri fasal bima yojana",
        "pradhan mantri fasal bima",
        "fasal bima",
        "crop insurance",
        "crop insurance scheme",
        "crop insurance claim",
        "crop insurance premium",
        "crop insurance enrollment",
        "crop insurance enrolment",
    ],

    "financial_literacy": [
        "financial literacy",
        "financial education",
        "financial awareness",
        "digital financial literacy",
        "financial inclusion",
        "money management",
        "financial knowledge",
    ],

    "cooperative_schemes": [
        "cooperative scheme",
        "cooperative schemes",
        "co-operation scheme",
        "ministry of cooperation scheme",
        "ministry of cooperation schemes",
        "government scheme for cooperative",
        "scheme for cooperative",
        "scheme for cooperatives",
    ],

    "cooperative_grievance": [
        "cooperative complaint",
        "complaint against cooperative",
        "complaint against a cooperative",
        "complaint about cooperative",
        "cooperative grievance",
        "grievance against cooperative",
        "grievance redressal",
        "grievance redressal cooperative",
        "register complaint",
        "file complaint",
        "complaint registration",
    ],
}


# ============================================================
# 5. INTENT KEYWORDS
# ============================================================

INTENT_KEYWORDS = {

    "definition": [
        "what is",
        "what are",
        "define",
        "meaning",
        "explain",
        "definition",
    ],

    "documents": [
        "document",
        "documents",
        "paper",
        "papers",
        "required documents",
        "proof",
        "certificate",
        "form",
    ],

    "procedure": [
        "how to",
        "how can",
        "procedure",
        "process",
        "steps",
        "apply",
        "application",
        "register",
        "registration",
        "enroll",
        "enrol",
    ],

    "eligibility": [
        "eligible",
        "eligibility",
        "who can",
        "qualification",
        "qualifications",
        "criteria",
        "requirements",
    ],

    "claim": [
        "claim",
        "loss",
        "damage",
        "crop loss",
        "loss assessment",
        "claim settlement",
        "claim payment",
    ],

    "premium": [
        "premium",
        "insurance premium",
        "premium rate",
        "premium amount",
    ],

    "complaint": [
        "complaint",
        "complaints",
        "grievance",
        "grievances",
        "redressal",
        "register complaint",
        "file complaint",
    ],

    "benefits": [
        "benefit",
        "benefits",
        "advantage",
        "advantages",
        "facility",
        "facilities",
    ],
}


# ============================================================
# 6. PMFBY SUB-INTENTS
# ============================================================

PMFBY_SUB_INTENTS = {

    "pmfby_claim_documents": [
        "claim documents",
        "documents required for claim",
        "documents for claim",
        "documentary evidence required for claim",
        "claim assessment documents",
        "loss assessment documents",
        "documents required to claim",
    ],

    "pmfby_claim_procedure": [
        "claim procedure",
        "how to claim",
        "how can i claim",
        "claim process",
        "process for claim",
        "loss intimation",
        "report crop loss",
        "report loss",
    ],

    "pmfby_premium": [
        "premium",
        "premium amount",
        "premium rate",
        "farmer premium",
    ],

    "pmfby_eligibility": [
        "pmfby eligibility",
        "eligible for pmfby",
        "who is eligible",
        "eligibility for crop insurance",
    ],

    "pmfby_enrollment_documents": [
        "documents required for pmfby",
        "documents for pmfby",
        "documents required for enrollment",
        "documents required for enrolment",
        "documents required to enroll",
        "documents required to enrol",
        "documents for enrollment",
        "documents for enrolment",
        "application documents",
        "pmfby application",
        "pmfby enrollment",
        "pmfby enrolment",
    ],

    "pmfby_general_information": [
        "about pmfby",
        "pmfby information",
        "crop insurance information",
        "what is pmfby",
        "pmfby scheme",
    ],
}


# ============================================================
# 7. NEGATIVE / CONFLICT TOPICS
# ============================================================

NEGATIVE_TOPICS = {

    "pacs_membership": [
        "computerization",
        "computerisation",
        "dcdc",
        "data migration",
        "rupay",
        "infrastructure",
        "hardware",
        "software",
    ],

    "pacs_services": [
        "computerization",
        "computerisation",
        "dcdc",
        "data migration",
    ],

    "agricultural_loan": [
        "pmfby",
        "fasal bima",
        "crop insurance",
        "insurance premium",
        "claim assessment",
        "loss intimation",
        "insurance claim",
    ],

    "pmfby_enrollment_documents": [
        "claim assessment",
        "claim documents",
        "loss assessment",
        "loss intimation",
        "imd report",
        "newspaper cutting",
        "media report",
    ],

    "pmfby_claim_documents": [
        "enrollment",
        "enrolment",
        "application for insurance",
        "land ownership document",
        "sowing certificate",
        "bank passbook",
    ],

    "pmfby_claim_procedure": [
        "enrollment",
        "enrolment",
        "application documents",
        "land ownership",
    ],
}


# ============================================================
# 8. QUERY NORMALIZATION
# ============================================================

def normalize_query(query: str) -> str:
    """
    Clean user query without changing its meaning.
    """

    if not query:
        return ""

    query = str(query).strip()

    # Remove leading numbering:
    # 1. question
    # 2) question
    # 5 - question
    query = re.sub(
        r"^\s*\d+\s*[\.\)\-:]\s*",
        "",
        query,
    )

    # Collapse whitespace.
    query = re.sub(r"\s+", " ", query)

    return query.strip()


# ============================================================
# 9. TEXT NORMALIZATION
# ============================================================

def normalize_text(text: str) -> str:
    text = str(text or "").lower()

    text = re.sub(
        r"[^a-z0-9\u0900-\u097f\s]",
        " ",
        text,
    )

    text = re.sub(r"\s+", " ", text)

    return text.strip()


# ============================================================
# 10. DOMAIN DETECTION
# ============================================================

def detect_domains(query: str):
    """
    Conservative domain detection.

    Important:
    Intent alone NEVER makes a query in-scope.
    """

    q = normalize_text(query)

    scores = Counter()

    for domain, keywords in DOMAIN_KEYWORDS.items():

        for keyword in keywords:

            k = normalize_text(keyword)

            if not k:
                continue

            if k in q:
                # Longer phrases receive more weight.
                weight = 3 if len(k.split()) >= 2 else 1
                scores[domain] += weight

    # Special rules to prevent domain confusion.

    # PACS computerization must win over generic PACS topics.
    if any(
        x in q
        for x in [
            "pacs computerization",
            "pacs computerisation",
            "data migration",
            "dcdc",
            "rupay",
            "digital pacs",
        ]
    ):
        scores["pacs_computerization"] += 10

    # PMFBY is highly specific.
    if any(
        x in q
        for x in [
            "pmfby",
            "pradhan mantri fasal bima",
            "fasal bima",
        ]
    ):
        scores["pmfby"] += 10

    # Complaint against cooperative.
    if (
        "complaint" in q
        or "grievance" in q
    ) and (
        "cooperative" in q
        or "co-operative" in q
        or "pacs" in q
    ):
        scores["cooperative_grievance"] += 8

    # PACS membership.
    if (
        "pacs" in q
        and (
            "member" in q
            or "membership" in q
            or "join" in q
        )
        and "computer" not in q
        and "migration" not in q
    ):
        scores["pacs_membership"] += 8

    if not scores:
        return []

    max_score = max(scores.values())

    # Keep domains close to the best score.
    selected = [
        domain
        for domain, score in scores.items()
        if score >= max_score * 0.55
    ]

    # Maximum two domains.
    selected = sorted(
        selected,
        key=lambda d: scores[d],
        reverse=True,
    )[:2]

    return selected


# ============================================================
# 11. INTENT DETECTION
# ============================================================

def detect_intents(query: str):

    q = normalize_text(query)

    scores = Counter()

    for intent, keywords in INTENT_KEYWORDS.items():

        for keyword in keywords:

            k = normalize_text(keyword)

            if k and k in q:
                scores[intent] += (
                    2 if len(k.split()) >= 2 else 1
                )

    if not scores:
        return []

    max_score = max(scores.values())

    return [
        intent
        for intent, score in scores.items()
        if score >= max_score * 0.55
    ]


# ============================================================
# 12. PMFBY SUB-INTENT DETECTION
# ============================================================

def detect_pmfby_sub_intents(query: str, intents):

    q = normalize_text(query)

    if "pmfby" not in q and "crop insurance" not in q:
        return []

    scores = Counter()

    for sub_intent, keywords in PMFBY_SUB_INTENTS.items():

        for keyword in keywords:

            k = normalize_text(keyword)

            if k in q:
                scores[sub_intent] += (
                    3 if len(k.split()) >= 2 else 1
                )

    # Very important rule:
    # "documents required for PMFBY"
    # means enrollment/application documents,
    # NOT claim documents.
    if (
        "document" in q
        and (
            "pmfby" in q
            or "crop insurance" in q
        )
        and not any(
            x in q
            for x in [
                "claim",
                "loss assessment",
                "loss intimation",
                "crop loss",
            ]
        )
    ):
        scores["pmfby_enrollment_documents"] += 10

    # Explicit claim wins.
    if "claim" in q:
        scores["pmfby_claim_documents"] += 8

    if (
        "how to claim" in q
        or "claim procedure" in q
        or "claim process" in q
        or "loss intimation" in q
    ):
        scores["pmfby_claim_procedure"] += 12

    if "premium" in q:
        scores["pmfby_premium"] += 10

    if "eligible" in q or "eligibility" in q:
        scores["pmfby_eligibility"] += 10

    if not scores:
        return ["pmfby_general_information"]

    max_score = max(scores.values())

    return [
        sub
        for sub, score in scores.items()
        if score >= max_score * 0.60
    ][:2]


# ============================================================
# 13. QUERY EXPANSION
# ============================================================

QUERY_EXPANSIONS = {

    "pmfby": [
        "Pradhan Mantri Fasal Bima Yojana",
        "crop insurance",
        "fasal bima",
    ],

    "pacs": [
        "Primary Agricultural Credit Society",
        "PACS",
        "cooperative society",
    ],

    "kcc": [
        "Kisan Credit Card",
        "Kisan Credit",
    ],

    "financial literacy": [
        "financial education",
        "financial awareness",
        "financial inclusion",
    ],

    "grievance": [
        "complaint",
        "grievance redressal",
        "complaint registration",
    ],

    "cooperative": [
        "co-operative society",
        "cooperative society",
    ],
}


def expand_query(query: str, domains, intents, sub_intents):

    terms = [query]

    q = normalize_text(query)

    for trigger, expansions in QUERY_EXPANSIONS.items():

        if trigger in q:

            for expansion in expansions:

                terms.append(expansion)

    # Domain-specific expansions.
    for domain in domains:

        if domain == "pacs_membership":
            terms.extend([
                "PACS membership",
                "member admission",
                "membership application",
                "KYC",
            ])

        elif domain == "pacs_computerization":
            terms.extend([
                "PACS computerization",
                "computerisation",
                "data migration",
                "DCDC",
            ])

        elif domain == "agricultural_loan":
            terms.extend([
                "agricultural credit",
                "farm credit",
                "crop loan",
                "short term crop loan",
            ])

        elif domain == "cooperative_grievance":
            terms.extend([
                "cooperative complaint",
                "grievance redressal",
                "Registrar of Cooperative Societies",
            ])

        elif domain == "financial_literacy":
            terms.extend([
                "financial education",
                "financial awareness",
                "digital financial literacy",
            ])

    # Keep unique terms.
    output = []

    seen = set()

    for term in terms:

        key = normalize_text(term)

        if key and key not in seen:
            seen.add(key)
            output.append(term)

    return output


# ============================================================
# 14. LOCAL CHUNK LOADER
# ============================================================

def extract_chunk_records(obj):

    records = []

    if isinstance(obj, list):
        records.extend(obj)

    elif isinstance(obj, dict):

        # Common structures.
        for key in [
            "chunks",
            "documents",
            "data",
            "records",
            "items",
        ]:

            value = obj.get(key)

            if isinstance(value, list):
                records.extend(value)

        # Single chunk object.
        if (
            "text" in obj
            or "content" in obj
        ):
            records.append(obj)

    return records


def load_local_chunks():

    print("\nLoading local chunks for lexical retrieval...")

    if not CHUNKS_DIR.exists():

        print(
            f"WARNING: Chunk directory not found: "
            f"{CHUNKS_DIR}"
        )

        return []

    all_records = []

    # JSON files.
    for path in CHUNKS_DIR.rglob("*.json"):

        try:

            with open(
                path,
                "r",
                encoding="utf-8",
            ) as f:

                data = json.load(f)

            all_records.extend(
                extract_chunk_records(data)
            )

        except Exception as e:

            print(
                f"WARNING: Could not read {path.name}: {e}"
            )

    # JSONL files.
    for path in CHUNKS_DIR.rglob("*.jsonl"):

        try:

            with open(
                path,
                "r",
                encoding="utf-8",
            ) as f:

                for line in f:

                    line = line.strip()

                    if not line:
                        continue

                    try:
                        data = json.loads(line)
                        all_records.extend(
                            extract_chunk_records(data)
                        )

                    except Exception:
                        continue

        except Exception as e:

            print(
                f"WARNING: Could not read {path.name}: {e}"
            )

    cleaned = []

    for record in all_records:

        if not isinstance(record, dict):
            continue

        text = (
            record.get("text")
            or record.get("content")
            or ""
        )

        if not text:
            continue

        metadata = record.get(
            "metadata",
            {},
        )

        if not isinstance(metadata, dict):
            metadata = {}

        merged = dict(metadata)

        for key, value in record.items():

            if key not in [
                "text",
                "content",
                "metadata",
            ]:

                merged[key] = value

        cleaned.append({
            "text": str(text),
            "metadata": merged,
        })

    print(
        f"Local chunk records loaded: {len(cleaned)}"
    )

    return cleaned


LOCAL_CHUNKS = load_local_chunks()


# ============================================================
# 15. LOCAL LEXICAL INDEX
# ============================================================

LOCAL_INDEX = []

for item in LOCAL_CHUNKS:

    text = item["text"]

    LOCAL_INDEX.append({
        "text": text,
        "metadata": item["metadata"],
        "normalized": normalize_text(text),
    })


def lexical_score(query, text):

    q_tokens = [
        x for x in normalize_text(query).split()
        if len(x) > 1
    ]

    if not q_tokens:
        return 0.0

    text_tokens = set(
        normalize_text(text).split()
    )

    matched = sum(
        1
        for token in q_tokens
        if token in text_tokens
    )

    coverage = matched / len(
        set(q_tokens)
    )

    # Phrase boost.
    nq = normalize_text(query)
    nt = normalize_text(text)

    phrase_bonus = 0.0

    if nq and nq in nt:
        phrase_bonus = 0.30

    return min(
        1.0,
        coverage + phrase_bonus,
    )


def local_lexical_search(
    query_terms,
    top_k=LEXICAL_TOP_K,
):

    candidates = {}

    for query in query_terms:

        for item in LOCAL_INDEX:

            score = lexical_score(
                query,
                item["text"],
            )

            if score <= 0:
                continue

            key = hashlib.md5(
                normalize_text(
                    item["text"]
                ).encode("utf-8")
            ).hexdigest()

            if (
                key not in candidates
                or score > candidates[key]["lexical_score"]
            ):

                candidates[key] = {
                    "text": item["text"],
                    "metadata": item["metadata"],
                    "lexical_score": score,
                    "source": "lexical",
                }

    results = sorted(
        candidates.values(),
        key=lambda x: x["lexical_score"],
        reverse=True,
    )

    return results[:top_k]


# ============================================================
# 16. QDRANT SEARCH
# ============================================================

def qdrant_search(query, top_k=QDRANT_TOP_K):

    query_vector = embedding_model.encode(
        query,
        normalize_embeddings=True,
    )

    query_vector = np.asarray(
        query_vector,
        dtype=np.float32,
    ).tolist()

    results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        limit=top_k,
        with_payload=True,
    ).points

    output = []

    for point in results:

        payload = point.payload or {}

        text = payload.get(
            "text",
            "",
        )

        metadata = payload.get(
            "metadata",
            {},
        )

        if not isinstance(metadata, dict):
            metadata = {}

        output.append({
            "id": point.id,
            "text": text,
            "metadata": metadata,
            "semantic_score": float(point.score),
            "source": "qdrant",
        })

    return output


# ============================================================
# 17. CANDIDATE MERGING
# ============================================================

def candidate_key(item):

    text = normalize_text(
        item.get("text", "")
    )

    return hashlib.md5(
        text.encode("utf-8")
    ).hexdigest()


def merge_candidates(
    qdrant_results,
    lexical_results,
):

    merged = {}

    for item in qdrant_results:

        key = candidate_key(item)

        merged[key] = dict(item)

        merged[key].setdefault(
            "lexical_score",
            0.0,
        )

    for item in lexical_results:

        key = candidate_key(item)

        if key in merged:

            merged[key]["lexical_score"] = max(
                merged[key].get(
                    "lexical_score",
                    0.0,
                ),
                item.get(
                    "lexical_score",
                    0.0,
                ),
            )

        else:

            merged[key] = dict(item)

            merged[key].setdefault(
                "semantic_score",
                0.0,
            )

    return list(merged.values())


# ============================================================
# 18. CANDIDATE DOMAIN CLASSIFICATION
# ============================================================

def classify_candidate_domain(item):

    text = item.get(
        "text",
        "",
    )

    metadata = item.get(
        "metadata",
        {},
    )

    source_file = str(
        metadata.get(
            "source_file",
            "",
        )
    )

    combined = (
        source_file
        + " "
        + text
    )

    q = normalize_text(combined)

    scores = Counter()

    # --------------------------------------------------------
    # Filename/source-specific classification
    # --------------------------------------------------------

    if "crop_insurance" in q:
        scores["pmfby"] += 8

    if "financial_literacy" in q:
        scores["financial_literacy"] += 8

    if "kcc" in q or "kisan_credit" in q:
        scores["kcc"] += 8

    if (
        "agricultural_loan" in q
        or "agri_loan" in q
    ):
        scores["agricultural_loan"] += 8

    if (
        "grievance" in q
        or "complaint" in q
    ):
        scores["cooperative_grievance"] += 8

    if (
        "cooperative_scheme" in q
        or "cooperative_schemes" in q
    ):
        scores["cooperative_schemes"] += 8

    if "cooperative_laws" in q:
        scores["cooperative_laws"] += 7

    if "model_bye" in q or "model_byelaw" in q:
        scores["cooperative_governance"] += 3
        scores["pacs_membership"] += 3
        scores["pacs_services"] += 2

    # --------------------------------------------------------
    # Text anchors
    # --------------------------------------------------------

    if "pacs" in q:

        if any(
            x in q
            for x in [
                "membership",
                "member admission",
                "admission of member",
                "kyc",
            ]
        ):
            scores["pacs_membership"] += 5

        if any(
            x in q
            for x in [
                "service",
                "services",
                "facility",
                "facilities",
            ]
        ):
            scores["pacs_services"] += 4

        if any(
            x in q
            for x in [
                "computerization",
                "computerisation",
                "data migration",
                "dcdc",
                "rupay",
            ]
        ):
            scores["pacs_computerization"] += 8

    if "cooperative society" in q:

        if any(
            x in q
            for x in [
                "board",
                "general body",
                "election",
                "audit",
                "managing committee",
            ]
        ):
            scores["cooperative_governance"] += 4

        if any(
            x in q
            for x in [
                "section",
                "act",
                "rule",
                "bylaw",
                "bye-law",
                "legal",
            ]
        ):
            scores["cooperative_laws"] += 4

    if any(
        x in q
        for x in [
            "crop insurance",
            "pmfby",
            "fasal bima",
        ]
    ):
        scores["pmfby"] += 6

    if any(
        x in q
        for x in [
            "agricultural loan",
            "crop loan",
            "farm loan",
            "agricultural credit",
        ]
    ):
        scores["agricultural_loan"] += 4

    if not scores:
        return None

    return max(
        scores,
        key=scores.get,
    )


# ============================================================
# 19. HARD DOMAIN FILTER
# ============================================================

def hard_domain_filter(
    candidates,
    query_domains,
):

    if not query_domains:
        return []

    filtered = []

    for item in candidates:

        candidate_domain = classify_candidate_domain(
            item
        )

        item["candidate_domain"] = candidate_domain

        # Exact domain match.
        if candidate_domain in query_domains:

            item["domain_match"] = True
            filtered.append(item)
            continue

        # Controlled compatibility.
        compatible = False

        for domain in query_domains:

            if domain == "membership_documents":

                if candidate_domain in [
                    "pacs_membership",
                    "cooperative_laws",
                ]:
                    compatible = True

            elif domain == "pacs_membership":

                if candidate_domain == "cooperative_laws":

                    text = normalize_text(
                        item.get("text", "")
                    )

                    if any(
                        x in text
                        for x in [
                            "member",
                            "membership",
                            "admission",
                            "kyc",
                        ]
                    ):
                        compatible = True

            elif domain == "agricultural_loan":

                if candidate_domain == "cooperative_laws":

                    text = normalize_text(
                        item.get("text", "")
                    )

                    if any(
                        x in text
                        for x in [
                            "loan",
                            "credit",
                            "borrower",
                            "agricultural loan",
                        ]
                    ):
                        compatible = True

        if compatible:

            item["domain_match"] = True
            filtered.append(item)

    return filtered


# ============================================================
# 20. NEGATIVE TOPIC PENALTY
# ============================================================

def apply_negative_penalty(
    candidates,
    query_domains,
    sub_intents,
):

    output = []

    negative_terms = set()

    for domain in query_domains:

        for term in NEGATIVE_TOPICS.get(
            domain,
            [],
        ):

            negative_terms.add(
                normalize_text(term)
            )

    for sub_intent in sub_intents:

        for term in NEGATIVE_TOPICS.get(
            sub_intent,
            [],
        ):

            negative_terms.add(
                normalize_text(term)
            )

    for item in candidates:

        text = normalize_text(
            item.get("text", "")
        )

        hits = [
            term
            for term in negative_terms
            if term and term in text
        ]

        item["negative_hits"] = hits

        # Don't completely delete every result.
        # Strong negative conflict gets a substantial penalty.
        penalty = min(
            0.35,
            len(hits) * 0.08,
        )

        item["negative_penalty"] = penalty

        output.append(item)

    return output


# ============================================================
# 21. PMFBY SUB-INTENT FILTER
# ============================================================

def apply_pmfby_subintent_filter(
    candidates,
    sub_intents,
):

    if not sub_intents:
        return candidates

    if not any(
        x.startswith("pmfby_")
        for x in sub_intents
    ):
        return candidates

    output = []

    for item in candidates:

        text = normalize_text(
            item.get("text", "")
        )

        boost = 0.0
        penalty = 0.0

        # ----------------------------------------------------
        # Enrollment documents
        # ----------------------------------------------------

        if "pmfby_enrollment_documents" in sub_intents:

            enrollment_terms = [
                "application",
                "proposal",
                "aadhaar",
                "aadhar",
                "bank passbook",
                "land record",
                "land ownership",
                "lpc",
                "sowing certificate",
                "self declaration",
                "e-kyc",
            ]

            claim_terms = [
                "claim assessment",
                "loss assessment",
                "loss intimation",
                "imd report",
                "media report",
                "newspaper cutting",
                "claim payment",
            ]

            enrollment_hits = sum(
                term in text
                for term in enrollment_terms
            )

            claim_hits = sum(
                term in text
                for term in claim_terms
            )

            boost += min(
                0.30,
                enrollment_hits * 0.05,
            )

            penalty += min(
                0.45,
                claim_hits * 0.10,
            )

        # ----------------------------------------------------
        # Claim documents
        # ----------------------------------------------------

        if "pmfby_claim_documents" in sub_intents:

            claim_terms = [
                "claim assessment",
                "documentary evidence",
                "loss assessment",
                "loss intimation",
                "imd report",
                "media report",
                "newspaper cutting",
                "claim",
            ]

            enrollment_terms = [
                "application",
                "proposal",
                "aadhaar",
                "bank passbook",
                "land ownership",
                "sowing certificate",
            ]

            claim_hits = sum(
                term in text
                for term in claim_terms
            )

            enrollment_hits = sum(
                term in text
                for term in enrollment_terms
            )

            boost += min(
                0.35,
                claim_hits * 0.07,
            )

            # Only penalize if clearly enrollment-oriented.
            if (
                enrollment_hits >= 3
                and claim_hits == 0
            ):
                penalty += 0.30

        # ----------------------------------------------------
        # Claim procedure
        # ----------------------------------------------------

        if "pmfby_claim_procedure" in sub_intents:

            procedure_terms = [
                "loss intimation",
                "claim",
                "loss assessment",
                "report loss",
                "intimation",
                "claim settlement",
            ]

            hits = sum(
                term in text
                for term in procedure_terms
            )

            boost += min(
                0.30,
                hits * 0.06,
            )

        # ----------------------------------------------------
        # Premium
        # ----------------------------------------------------

        if "pmfby_premium" in sub_intents:

            if "premium" in text:
                boost += 0.25

        # ----------------------------------------------------
        # Eligibility
        # ----------------------------------------------------

        if "pmfby_eligibility" in sub_intents:

            if any(
                x in text
                for x in [
                    "eligible",
                    "eligibility",
                    "loanee farmer",
                    "non-loanee farmer",
                ]
            ):
                boost += 0.25

        item["subintent_boost"] = boost
        item["subintent_penalty"] = penalty

        output.append(item)

    return output


# ============================================================
# 22. JINA RERANKING
# ============================================================

def rerank_candidates(
    query,
    candidates,
    top_k=RERANK_TOP_K,
):

    if not candidates:
        return []

    candidates = candidates[:top_k]

    pairs = [
        (
            query,
            item.get("text", ""),
        )
        for item in candidates
    ]

    try:

        scores = reranker.predict(
            pairs,
            batch_size=8,
            show_progress_bar=False,
        )

    except TypeError:

        # Compatibility fallback.
        scores = reranker.predict(
            pairs,
            batch_size=8,
        )

    scores = np.asarray(
        scores,
        dtype=float,
    )

    # Jina scores can vary by model/version.
    # Sigmoid converts arbitrary logits to 0-1.
    if (
        np.min(scores) < 0
        or np.max(scores) > 1
    ):

        scores = 1.0 / (
            1.0 + np.exp(
                -np.clip(
                    scores,
                    -20,
                    20,
                )
            )
        )

    for item, score in zip(
        candidates,
        scores,
    ):

        item["rerank_score"] = float(
            score
        )

        semantic = float(
            item.get(
                "semantic_score",
                0.0,
            )
        )

        lexical = float(
            item.get(
                "lexical_score",
                0.0,
            )
        )

        sub_boost = float(
            item.get(
                "subintent_boost",
                0.0,
            )
        )

        sub_penalty = float(
            item.get(
                "subintent_penalty",
                0.0,
            )
        )

        negative_penalty = float(
            item.get(
                "negative_penalty",
                0.0,
            )
        )

        # V5.1 final score.
        #
        # Reranker is the strongest signal.
        # Semantic + lexical provide retrieval support.
        # Topic/subintent rules adjust the score.
        final_score = (
            0.60 * float(score)
            + 0.20 * semantic
            + 0.20 * lexical
            + sub_boost
            - sub_penalty
            - negative_penalty
        )

        item["final_score"] = max(
            0.0,
            min(
                1.0,
                final_score,
            ),
        )

    return sorted(
        candidates,
        key=lambda x: x["final_score"],
        reverse=True,
    )


# ============================================================
# 23. DUPLICATE REMOVAL
# ============================================================

def remove_duplicates(candidates):

    seen_text = set()
    output = []

    for item in candidates:

        normalized = normalize_text(
            item.get("text", "")
        )

        if not normalized:
            continue

        key = hashlib.md5(
            normalized.encode("utf-8")
        ).hexdigest()

        if key in seen_text:
            continue

        seen_text.add(key)

        output.append(item)

    return output


# ============================================================
# 24. NEIGHBOR CHUNK EXPANSION
# ============================================================

def build_local_neighbor_index():

    index = defaultdict(dict)

    for item in LOCAL_CHUNKS:

        metadata = item.get(
            "metadata",
            {},
        )

        source_file = str(
            metadata.get(
                "source_file",
                "",
            )
        )

        chunk_index = metadata.get(
            "chunk_index"
        )

        if not source_file:
            continue

        try:
            chunk_index = int(
                chunk_index
            )
        except Exception:
            continue

        index[source_file][chunk_index] = item

    return index


NEIGHBOR_INDEX = build_local_neighbor_index()


def expand_neighbors(candidates):

    if not NEIGHBOR_INDEX:
        return candidates

    expanded = list(candidates)

    existing_keys = {
        candidate_key(x)
        for x in expanded
    }

    strong_candidates = [
        item
        for item in candidates
        if item.get(
            "final_score",
            0.0,
        ) >= PARTIAL_FINAL_SCORE
    ]

    for item in strong_candidates:

        metadata = item.get(
            "metadata",
            {},
        )

        source_file = str(
            metadata.get(
                "source_file",
                "",
            )
        )

        chunk_index = metadata.get(
            "chunk_index"
        )

        try:
            chunk_index = int(
                chunk_index
            )
        except Exception:
            continue

        source_chunks = NEIGHBOR_INDEX.get(
            source_file,
            {},
        )

        for offset in range(
            -NEIGHBOR_RADIUS,
            NEIGHBOR_RADIUS + 1,
        ):

            if offset == 0:
                continue

            neighbor_index = (
                chunk_index + offset
            )

            neighbor = source_chunks.get(
                neighbor_index
            )

            if not neighbor:
                continue

            new_item = {
                "text": neighbor.get(
                    "text",
                    "",
                ),
                "metadata": neighbor.get(
                    "metadata",
                    {},
                ),
                "semantic_score": 0.0,
                "lexical_score": 0.0,
                "rerank_score": 0.0,
                "final_score": max(
                    0.0,
                    item.get(
                        "final_score",
                        0.0
                    ) - 0.08,
                ),
                "source": "neighbor",
                "neighbor_of": item.get(
                    "metadata",
                    {},
                ).get(
                    "chunk_index"
                ),
            }

            key = candidate_key(
                new_item
            )

            if key not in existing_keys:

                expanded.append(
                    new_item
                )

                existing_keys.add(key)

    return expanded


# ============================================================
# 25. DIVERSITY / MMR-STYLE SELECTION
# ============================================================

def token_set(text):

    return set(
        normalize_text(text).split()
    )


def text_similarity(a, b):

    sa = token_set(a)
    sb = token_set(b)

    if not sa or not sb:
        return 0.0

    intersection = len(
        sa.intersection(sb)
    )

    union = len(
        sa.union(sb)
    )

    return intersection / union


def diverse_select(
    candidates,
    top_k=FINAL_TOP_K,
):

    if not candidates:
        return []

    selected = []

    remaining = list(candidates)

    while remaining and len(selected) < top_k:

        if not selected:

            best = max(
                remaining,
                key=lambda x: x.get(
                    "final_score",
                    0.0,
                ),
            )

        else:

            def mmr_score(item):

                relevance = item.get(
                    "final_score",
                    0.0,
                )

                redundancy = max(
                    (
                        text_similarity(
                            item.get(
                                "text",
                                "",
                            ),
                            selected_item.get(
                                "text",
                                "",
                            ),
                        )
                        for selected_item
                        in selected
                    ),
                    default=0.0,
                )

                return (
                    0.80 * relevance
                    - 0.20 * redundancy
                )

            best = max(
                remaining,
                key=mmr_score,
            )

        selected.append(best)
        remaining.remove(best)

    return selected


# ============================================================
# 26. EVIDENCE COMPLETENESS
# ============================================================

def evidence_completeness(
    query,
    domains,
    intents,
    sub_intents,
    candidates,
):

    if not candidates:
        return 0.0

    texts = [
        normalize_text(
            x.get("text", "")
        )
        for x in candidates
    ]

    combined = " ".join(texts)

    # --------------------------------------------------------
    # Definition
    # --------------------------------------------------------

    if "definition" in intents:

        definition_terms = [
            "defined",
            "definition",
            "means",
            "refers to",
            "is an important",
            "is a process",
            "is the",
        ]

        hits = sum(
            term in combined
            for term in definition_terms
        )

        return min(
            1.0,
            0.60 + hits * 0.10,
        )

    # --------------------------------------------------------
    # Documents
    # --------------------------------------------------------

    if "documents" in intents:

        document_terms = [
            "documents",
            "document",
            "aadhaar",
            "aadhar",
            "application",
            "form",
            "proof",
            "certificate",
            "passbook",
            "land record",
            "kyc",
        ]

        hits = sum(
            term in combined
            for term in document_terms
        )

        # Actual list evidence is important.
        if hits >= 5:
            return 1.0

        if hits >= 3:
            return 0.75

        if hits >= 1:
            return 0.45

        return 0.20

    # --------------------------------------------------------
    # Procedure
    # --------------------------------------------------------

    if "procedure" in intents:

        procedure_terms = [
            "procedure",
            "process",
            "steps",
            "apply",
            "application",
            "submit",
            "registration",
            "register",
            "forwarded",
            "received",
            "authority",
        ]

        hits = sum(
            term in combined
            for term in procedure_terms
        )

        if hits >= 5:
            return 1.0

        if hits >= 3:
            return 0.75

        if hits >= 1:
            return 0.45

        return 0.20

    # --------------------------------------------------------
    # Eligibility
    # --------------------------------------------------------

    if "eligibility" in intents:

        eligibility_terms = [
            "eligible",
            "eligibility",
            "who can",
            "criteria",
            "farmer",
            "member",
            "loanee",
            "non-loanee",
            "qualification",
        ]

        hits = sum(
            term in combined
            for term in eligibility_terms
        )

        if hits >= 4:
            return 1.0

        if hits >= 2:
            return 0.70

        if hits >= 1:
            return 0.45

        return 0.20

    # --------------------------------------------------------
    # Claim
    # --------------------------------------------------------

    if "claim" in intents:

        claim_terms = [
            "claim",
            "loss",
            "assessment",
            "intimation",
            "documentary evidence",
            "claim payment",
        ]

        hits = sum(
            term in combined
            for term in claim_terms
        )

        if hits >= 4:
            return 1.0

        if hits >= 2:
            return 0.70

        if hits >= 1:
            return 0.45

        return 0.20

    # --------------------------------------------------------
    # Generic evidence
    # --------------------------------------------------------

    high_quality = [
        x
        for x in candidates
        if x.get(
            "final_score",
            0.0
        ) >= STRONG_FINAL_SCORE
    ]

    if len(high_quality) >= 2:
        return 0.80

    if len(high_quality) == 1:
        return 0.65

    return 0.40


# ============================================================
# 27. STATUS DECISION
# ============================================================

def determine_status(
    candidates,
    completeness,
):

    if not candidates:
        return "INSUFFICIENT"

    best = candidates[0]

    final_score = best.get(
        "final_score",
        0.0,
    )

    rerank_score = best.get(
        "rerank_score",
        0.0,
    )

    # Strong requires both retrieval quality
    # AND evidence completeness.
    if (
        final_score >= STRONG_FINAL_SCORE
        and rerank_score >= STRONG_RERANK_SCORE
        and completeness >= STRONG_EVIDENCE
    ):
        return "STRONG"

    # Partial means useful evidence exists,
    # but it may not be complete enough.
    if (
        final_score >= PARTIAL_FINAL_SCORE
        and rerank_score >= PARTIAL_RERANK_SCORE
        and completeness >= PARTIAL_EVIDENCE
    ):
        return "PARTIAL"

    return "INSUFFICIENT"


# ============================================================
# 28. GEMINI GATE
# ============================================================

def gemini_allowed(status):

    return status in [
        "STRONG",
        "PARTIAL",
    ]


# ============================================================
# 29. MAIN RETRIEVAL FUNCTION
# ============================================================

def retrieve(
    query,
    final_top_k=FINAL_TOP_K,
):

    print("\n")
    print("=" * 80)
    print("SANYUKT VAANI V5.1 RETRIEVER")
    print("=" * 80)

    # --------------------------------------------------------
    # Query cleaning
    # --------------------------------------------------------

    query = normalize_query(query)

    print(f"\nUSER QUERY:")
    print(query)

    if not query:

        return {
            "query": query,
            "domains": [],
            "intents": [],
            "sub_intents": [],
            "status": "OUT_OF_SCOPE",
            "documents": [],
            "gemini_allowed": False,
        }

    # --------------------------------------------------------
    # Domain detection
    # --------------------------------------------------------

    domains = detect_domains(query)

    intents = detect_intents(query)

    sub_intents = detect_pmfby_sub_intents(
        query,
        intents,
    )

    print(
        f"\nDetected Domains : {domains}"
    )

    print(
        f"Detected Intents : {intents}"
    )

    print(
        f"Detected Sub-Intents : {sub_intents}"
    )

    # --------------------------------------------------------
    # HARD OUT-OF-SCOPE GATE
    # --------------------------------------------------------

    if not domains:

        print("\nSTATUS: OUT_OF_SCOPE")
        print("FINAL DOCUMENT COUNT: 0")
        print("Gemini Allowed: False")

        return {
            "query": query,
            "domains": [],
            "intents": intents,
            "sub_intents": sub_intents,
            "status": "OUT_OF_SCOPE",
            "documents": [],
            "gemini_allowed": False,
            "evidence_completeness": 0.0,
        }

    # --------------------------------------------------------
    # Query expansion
    # --------------------------------------------------------

    query_terms = expand_query(
        query,
        domains,
        intents,
        sub_intents,
    )

    print(
        f"\nExpanded Query Terms: {len(query_terms)}"
    )

    # --------------------------------------------------------
    # Semantic retrieval
    # --------------------------------------------------------

    print("\nRunning Qdrant semantic retrieval...")

    qdrant_results = []

    for term in query_terms[:8]:

        try:

            results = qdrant_search(
                term,
                top_k=QDRANT_TOP_K // 2,
            )

            qdrant_results.extend(results)

        except Exception as e:

            print(
                f"Qdrant search warning: {e}"
            )

    # Remove duplicate semantic results.
    temp = {}

    for item in qdrant_results:

        key = candidate_key(item)

        if (
            key not in temp
            or item.get(
                "semantic_score",
                0.0,
            )
            > temp[key].get(
                "semantic_score",
                0.0,
            )
        ):

            temp[key] = item

    qdrant_results = list(temp.values())

    print(
        f"Qdrant candidates: "
        f"{len(qdrant_results)}"
    )

    # --------------------------------------------------------
    # Local lexical retrieval
    # --------------------------------------------------------

    print("\nRunning local lexical retrieval...")

    lexical_results = local_lexical_search(
        query_terms,
        top_k=LEXICAL_TOP_K,
    )

    print(
        f"Lexical candidates: "
        f"{len(lexical_results)}"
    )

    # --------------------------------------------------------
    # Merge
    # --------------------------------------------------------

    candidates = merge_candidates(
        qdrant_results,
        lexical_results,
    )

    print(
        f"Combined candidates: "
        f"{len(candidates)}"
    )

    # --------------------------------------------------------
    # Domain filter
    # --------------------------------------------------------

    candidates = hard_domain_filter(
        candidates,
        domains,
    )

    print(
        f"After hard domain filter: "
        f"{len(candidates)}"
    )

    if not candidates:

        print("\nSTATUS: INSUFFICIENT")
        print("FINAL DOCUMENT COUNT: 0")
        print("Gemini Allowed: False")

        return {
            "query": query,
            "domains": domains,
            "intents": intents,
            "sub_intents": sub_intents,
            "status": "INSUFFICIENT",
            "documents": [],
            "gemini_allowed": False,
            "evidence_completeness": 0.0,
        }

    # --------------------------------------------------------
    # Negative-topic penalty
    # --------------------------------------------------------

    candidates = apply_negative_penalty(
        candidates,
        domains,
        sub_intents,
    )

    # --------------------------------------------------------
    # PMFBY sub-intent filtering
    # --------------------------------------------------------

    candidates = apply_pmfby_subintent_filter(
        candidates,
        sub_intents,
    )

    # --------------------------------------------------------
    # Pre-rerank sorting
    # --------------------------------------------------------

    candidates = sorted(
        candidates,
        key=lambda x: (
            0.55 * x.get(
                "semantic_score",
                0.0,
            )
            + 0.25 * x.get(
                "lexical_score",
                0.0,
            )
            + x.get(
                "subintent_boost",
                0.0,
            )
            - x.get(
                "subintent_penalty",
                0.0,
            )
            - x.get(
                "negative_penalty",
                0.0,
            )
        ),
        reverse=True,
    )

    candidates = candidates[
        :RERANK_TOP_K
    ]

    # --------------------------------------------------------
    # Jina reranking
    # --------------------------------------------------------

    print("\nRunning Jina multilingual reranker...")

    candidates = rerank_candidates(
        query,
        candidates,
        top_k=RERANK_TOP_K,
    )

    # --------------------------------------------------------
    # Remove duplicates
    # --------------------------------------------------------

    candidates = remove_duplicates(
        candidates
    )

    # --------------------------------------------------------
    # Neighbor expansion
    # --------------------------------------------------------

    candidates = expand_neighbors(
        candidates
    )

    # Re-sort after expansion.
    candidates = sorted(
        candidates,
        key=lambda x: x.get(
            "final_score",
            0.0,
        ),
        reverse=True,
    )

    # --------------------------------------------------------
    # Diversity selection
    # --------------------------------------------------------

    final_candidates = diverse_select(
        candidates,
        top_k=final_top_k,
    )

    # --------------------------------------------------------
    # Evidence completeness
    # --------------------------------------------------------

    completeness = evidence_completeness(
        query,
        domains,
        intents,
        sub_intents,
        final_candidates,
    )

    # --------------------------------------------------------
    # Final status
    # --------------------------------------------------------

    status = determine_status(
        final_candidates,
        completeness,
    )

    allowed = gemini_allowed(
        status
    )

    # --------------------------------------------------------
    # FINAL OUTPUT
    # --------------------------------------------------------

    print("\n" + "-" * 80)

    print(
        f"STATUS: {status}"
    )

    if final_candidates:

        print(
            f"Best Rerank Score: "
            f"{final_candidates[0].get('rerank_score', 0):.4f}"
        )

        print(
            f"Best Final Score: "
            f"{final_candidates[0].get('final_score', 0):.4f}"
        )

    print(
        f"Evidence Completeness: "
        f"{completeness:.4f}"
    )

    print(
        f"FINAL DOCUMENT COUNT: "
        f"{len(final_candidates)}"
    )

    print(
        f"Gemini Allowed: "
        f"{allowed}"
    )

    # --------------------------------------------------------
    # Print evidence
    # --------------------------------------------------------

    print("\nFINAL EVIDENCE:")

    for i, item in enumerate(
        final_candidates,
        start=1,
    ):

        metadata = item.get(
            "metadata",
            {},
        )

        print("\n" + "=" * 80)

        print(
            f"[{i}] "
            f"Final Score: "
            f"{item.get('final_score', 0):.4f}"
        )

        print(
            f"Rerank Score: "
            f"{item.get('rerank_score', 0):.4f}"
        )

        print(
            f"Semantic Score: "
            f"{item.get('semantic_score', 0):.4f}"
        )

        print(
            f"Lexical Score: "
            f"{item.get('lexical_score', 0):.4f}"
        )

        print(
            f"Candidate Domain: "
            f"{item.get('candidate_domain')}"
        )

        print(
            f"Source File: "
            f"{metadata.get('source_file', 'N/A')}"
        )

        print(
            f"Chunk Index: "
            f"{metadata.get('chunk_index', 'N/A')}"
        )

        print("\nTEXT:")

        print(
            item.get(
                "text",
                "",
            )[:1500]
        )

    print("\n" + "=" * 80)

    return {
        "query": query,
        "domains": domains,
        "intents": intents,
        "sub_intents": sub_intents,
        "status": status,
        "documents": final_candidates,
        "gemini_allowed": allowed,
        "evidence_completeness": completeness,
    }


# ============================================================
# 30. SIMPLE TEST LOOP
# ============================================================

if __name__ == "__main__":

    print("\n")
    print("=" * 80)
    print("SANYUKT VAANI V5.1")
    print("FINAL RAG RETRIEVER TEST")
    print("=" * 80)

    while True:

        try:

            query = input(
                "\nEnter your question "
                "(type 'exit' to stop): "
            ).strip()

        except KeyboardInterrupt:

            print("\nExiting...")
            break

        if query.lower() in [
            "exit",
            "quit",
            "q",
        ]:
            print("\nExiting...")
            break

        if not query:
            continue

        try:

            result = retrieve(query)

            print("\nFINAL RESULT:")
            print(
                f"Status           : "
                f"{result['status']}"
            )

            print(
                f"Documents        : "
                f"{len(result['documents'])}"
            )

            print(
                f"Gemini Allowed   : "
                f"{result['gemini_allowed']}"
            )

            print(
                f"Evidence Score   : "
                f"{result['evidence_completeness']:.4f}"
            )

        except Exception as e:

            print("\nERROR:")
            print(str(e))

            import traceback
            traceback.print_exc()