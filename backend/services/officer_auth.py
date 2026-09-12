"""Local officer authentication for the knowledge-management portal."""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
import time
from dataclasses import dataclass

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional in minimal deployments
    load_dotenv = None

if load_dotenv:
    load_dotenv()


@dataclass(frozen=True)
class Officer:
    email: str


OFFICER_EMAIL = os.getenv("OFFICER_EMAIL", "officer@sanyuktvaani.gov.in").strip().lower()
OFFICER_PASSWORD = os.getenv("OFFICER_PASSWORD", "Sanyukt@2026!")
SESSION_SECRET = os.getenv("OFFICER_SESSION_SECRET", "change-this-officer-session-secret")
TOKEN_TTL_SECONDS = 8 * 60 * 60


def authenticate_officer(email: str, password: str) -> Officer | None:
    normalized_email = email.strip().lower()
    if not hmac.compare_digest(normalized_email, OFFICER_EMAIL):
        return None
    if not hmac.compare_digest(password, OFFICER_PASSWORD):
        return None
    return Officer(email=normalized_email)


def create_session_token(officer: Officer) -> str:
    expires_at = int(time.time()) + TOKEN_TTL_SECONDS
    payload = f"{officer.email}:{expires_at}".encode()
    signature = hmac.new(SESSION_SECRET.encode(), payload, hashlib.sha256).digest()
    encoded_payload = base64.urlsafe_b64encode(payload).decode().rstrip("=")
    encoded_signature = base64.urlsafe_b64encode(signature).decode().rstrip("=")
    return f"{encoded_payload}.{encoded_signature}"


def verify_session_token(token: str) -> Officer | None:
    try:
        encoded_payload, encoded_signature = token.split(".", maxsplit=1)
        payload = base64.urlsafe_b64decode(encoded_payload + "==")
        provided_signature = base64.urlsafe_b64decode(encoded_signature + "==")
        expected_signature = hmac.new(SESSION_SECRET.encode(), payload, hashlib.sha256).digest()
        if not hmac.compare_digest(provided_signature, expected_signature):
            return None
        email, expires_at = payload.decode().split(":", maxsplit=1)
        if int(expires_at) < int(time.time()) or email != OFFICER_EMAIL:
            return None
        return Officer(email=email)
    except (ValueError, UnicodeDecodeError, TypeError):
        return None