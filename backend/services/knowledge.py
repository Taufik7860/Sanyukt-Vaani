from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from uuid import uuid4

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "knowledge_updates.json"
_LOCK = Lock()

CATEGORIES = {
    "policy", "insurance", "scheme", "law", "farmer_loan", "circular"
}


def _read() -> list[dict]:
    if not DATA_PATH.exists():
        return []
    return json.loads(DATA_PATH.read_text(encoding="utf-8"))


def _write(items: list[dict]):
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    DATA_PATH.write_text(
        json.dumps(items, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def list_updates(status: str | None = None):
    with _LOCK:
        items = _read()
    if status:
        items = [x for x in items if x.get("status") == status]
    return sorted(items, key=lambda x: x.get("updated_at", ""), reverse=True)


def create_update(payload: dict, officer_email: str):
    if payload["category"] not in CATEGORIES:
        raise ValueError("Unsupported knowledge category")
    if not payload["title"].strip() or not payload["authority"].strip():
        raise ValueError("Title and authority are required")

    now = datetime.now(timezone.utc).isoformat()
    item = {
        "id": str(uuid4()),
        **payload,
        "status": "pending",
        "updated_at": now,
        "updated_by": officer_email,
    }
    with _LOCK:
        items = _read()
        items.append(item)
        _write(items)
    return item


def approve_update(update_id: str, officer_email: str):
    with _LOCK:
        items = _read()
        for item in items:
            if item["id"] == update_id:
                item["status"] = "approved"
                item["approved_at"] = datetime.now(timezone.utc).isoformat()
                item["approved_by"] = officer_email
                _write(items)
                return item
    return None
