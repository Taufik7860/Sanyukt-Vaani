_from fastapi import Header, HTTPException, status

from backend.services.officer_auth import Officer, verify_session_token


def require_officer(
    authorization: str | None = Header(default=None),
) -> Officer:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Officer login required.",
        )
    token = authorization.removeprefix("Bearer ").strip()
    officer = verify_session_token(token)
    if not officer:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Officer session expired or invalid.",
        )
    return officer
