"""Persistent local knowledge-update store for officer submissions."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from uuid import uuid4

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "knowledge_updates.json"
_STORE_LOCK = Lock()

CATEGORIES = {
    "policy",
    "insurance",
    "scheme",
    "law",
    "farmer_loan",
    "circular",
}


def _read_updates() -> list[dict]:
    if not DATA_PATH.exists():
        return []
    return json.loads(DATA_PATH.read_text(encoding="utf-8"))


def _write_updates(updates: list[dict]) -> None:
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    DATA_PATH.write_text(json.dumps(updates, ensure_ascii=False, indent=2), encoding="utf-8")


def list_updates(status: str | None = None) -> list[dict]:
    with _STORE_LOCK:
        updates = _read_updates()
    if status:
        updates = [item for item in updates if item["status"] == status]
    return sorted(updates, key=lambda item: item["updated_at"], reverse=True)


def create_update(payload: dict, officer_email: str) -> dict:
    category = payload["category"]
    if category not in CATEGORIES:
        raise ValueError("Unsupported knowledge category")

    if not payload["title"].strip() or not payload["authority"].strip():
        raise ValueError("Title and issuing authority are required")

    now = datetime.now(timezone.utc).isoformat()
    update = {
        "id": str(uuid4()),
        "title": payload["title"].strip(),
        "category": category,
        "year": payload["year"],
        "authority": payload["authority"].strip(),
        "version": payload["version"].strip(),
        "summary": payload.get("summary", "").strip(),
        "source_url": payload.get("source_url", "").strip(),
        "status": "pending",
        "updated_at": now,
        "updated_by": officer_email,
    }
    with _STORE_LOCK:
        updates = _read_updates()
        updates.append(update)
        _write_updates(updates)
    return update


def approve_update(update_id: str, officer_email: str) -> dict | None:
    with _STORE_LOCK:
        updates = _read_updates()
        for update in updates:
            if update["id"] == update_id:
                update["status"] = "approved"
                update["approved_at"] = datetime.now(timezone.utc).isoformat()
                update["approved_by"] = officer_email
                _write_updates(updates)
                return update
    return None
