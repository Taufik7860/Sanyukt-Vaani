from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.main_auth import require_officer

router = APIRouter(prefix="/api/officer", tags=["Officer"])


class OfficerLoginPayload(BaseModel):
    email: str
    password: str


@router.get("/dashboard-data")
async def dashboard_data(_officer=Depends(require_officer)):
    return {"status": "success", "message": "Officer dashboard is ready."}
