"""Backend configuration loaded from environment variables."""

import os

try:
	from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional in minimal deployments
	load_dotenv = None

if load_dotenv:
	load_dotenv()


class Settings:
	QDRANT_URL = os.getenv("QDRANT_URL", "")
	QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")
	GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


settings = Settings()
