"""Application configuration loaded from .env."""

from __future__ import annotations

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Google Gemini
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    GEMINI_EMBEDDING_MODEL: str = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")
    EMBEDDING_DIMENSION: int = int(os.getenv("EMBEDDING_DIMENSION", "768"))

    # Qdrant
    QDRANT_URL: str = os.getenv("QDRANT_URL", "")
    QDRANT_API_KEY: str = os.getenv("QDRANT_API_KEY", "")
    QDRANT_COLLECTION: str = os.getenv("QDRANT_COLLECTION", "kb_docs")

    # Supabase (optional)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    SUPABASE_BUCKET: str = os.getenv("SUPABASE_BUCKET", "user-audio-vault")

    # BHASHINI / ULCA
    BHASHINI_USER_ID: str = os.getenv("BHASHINI_USER_ID", "")
    BHASHINI_API_KEY: str = os.getenv("BHASHINI_API_KEY", "")
    BHASHINI_PIPELINE_ID: str = os.getenv(
        "BHASHINI_PIPELINE_ID",
        "64392f96daac500b55c543cd",
    )
    BHASHINI_CONFIG_URL: str = os.getenv(
        "BHASHINI_CONFIG_URL",
        "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline",
    )
    BHASHINI_INFERENCE_URL: str = os.getenv(
        "BHASHINI_INFERENCE_URL",
        "https://dhruva-api.bhashini.gov.in/services/inference/pipeline",
    )

    # Officer auth
    OFFICER_EMAIL: str = os.getenv(
        "OFFICER_EMAIL", "officer@sanyuktvaani.gov.in"
    ).strip().lower()
    OFFICER_PASSWORD: str = os.getenv("OFFICER_PASSWORD", "change-me")
    OFFICER_SESSION_SECRET: str = os.getenv(
        "OFFICER_SESSION_SECRET", "change-this-in-production"
    )

    # Runtime
    FRONTEND_ORIGINS: str = os.getenv(
        "FRONTEND_ORIGINS",
        "http://127.0.0.1:5173,http://localhost:5173",
    )


settings = Settings()
