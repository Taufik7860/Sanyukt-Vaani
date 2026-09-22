from __future__ import annotations

from fastapi import Header, HTTPException, status

from backend.services.officer_auth import Officer, verify_session_token


def require_officer(
    authorization: str | None = Header(default=None),
) -> Officer:
    """
    FastAPI dependency for officer authentication.

    Expects:
        Authorization: Bearer <session_token>

    Returns:
        Authenticated Officer object.

    Raises:
        401 if the authorization header is missing,
        malformed, expired, or invalid.
    """

    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Officer login required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization format.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.removeprefix("Bearer ").strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Officer login required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    officer = verify_session_token(token)

    if not officer:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Officer session expired or invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return officer
