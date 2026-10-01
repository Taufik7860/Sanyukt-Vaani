from __future__ import annotations

import json
import logging
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from uuid import uuid4

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "knowledge_updates.json"
DOCUMENTS_PATH = DATA_PATH.parent / "knowledge_documents"
_LOCK = Lock()
logger = logging.getLogger(__name__)

CATEGORIES = {
    "policy", "insurance", "scheme", "law", "farmer_loan", "circular"
}


def _read() -> list[dict]:
    if not DATA_PATH.exists():
        return []
    return json.loads(DATA_PATH.read_text(encoding="utf-8"))


def _write(items: list[dict]):
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=DATA_PATH.parent,
            delete=False,
        ) as temporary_file:
            temporary_path = Path(temporary_file.name)
            json.dump(items, temporary_file, ensure_ascii=False, indent=2)
            temporary_file.flush()
            os.fsync(temporary_file.fileno())
        temporary_path.replace(DATA_PATH)
    except OSError:
        if temporary_path:
            temporary_path.unlink(missing_ok=True)
        logger.exception("Unable to persist officer knowledge updates.")
        raise


def get_update(update_id: str):
    with _LOCK:
        return next((item for item in _read() if item.get("id") == update_id), None)


def remove_update(update_id: str):
    with _LOCK:
        items = _read()
        item = next((entry for entry in items if entry.get("id") == update_id), None)
        if not item:
            return
        items = [entry for entry in items if entry.get("id") != update_id]
        _write(items)
    document_path = get_document_path(item)
    if document_path:
        document_path.unlink(missing_ok=True)


def validate_approval(update_id: str):
    with _LOCK:
        items = _read()
        item = next((entry for entry in items if entry.get("id") == update_id), None)
        if not item:
            return None
        if not item.get("stored_file"):
            raise ValueError("Upload the official PDF before approving this update.")

        key = (item.get("category", ""), " ".join(item.get("title", "").casefold().split()))
        newer_updates = [
            entry
            for entry in items
            if entry.get("id") != update_id
            and entry.get("status") == "approved"
            and (
                entry.get("category", ""),
                " ".join(entry.get("title", "").casefold().split()),
            ) == key
            and int(entry.get("year", 0)) > int(item.get("year", 0))
        ]
        if newer_updates:
            raise ValueError(
                f"A newer {max(int(entry['year']) for entry in newer_updates)} update "
                "is already approved for this document."
            )
        return item


def get_document_path(item: dict) -> Path | None:
    stored_path = item.get("stored_file")
    if not stored_path:
        return None

    path = (DATA_PATH.parent / stored_path).resolve()
    if DOCUMENTS_PATH.resolve() not in path.parents:
        raise ValueError("Stored document path is invalid.")
    return path


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
        item = next((entry for entry in items if entry.get("id") == update_id), None)
        if not item:
            return None
        if not item.get("stored_file"):
            raise ValueError("Upload the official PDF before approving this update.")

        key = (item.get("category", ""), " ".join(item.get("title", "").casefold().split()))
        newer_updates = [
            entry
            for entry in items
            if entry.get("id") != update_id
            and entry.get("status") == "approved"
            and (
                entry.get("category", ""),
                " ".join(entry.get("title", "").casefold().split()),
            ) == key
            and int(entry.get("year", 0)) > int(item.get("year", 0))
        ]
        if newer_updates:
            raise ValueError(
                f"A newer {max(int(entry['year']) for entry in newer_updates)} update "
                "is already approved for this document."
            )

        now = datetime.now(timezone.utc).isoformat()
        for entry in items:
            if (
                entry.get("id") != update_id
                and entry.get("status") == "approved"
                and (
                    entry.get("category", ""),
                    " ".join(entry.get("title", "").casefold().split()),
                ) == key
                and int(entry.get("year", 0)) <= int(item.get("year", 0))
            ):
                entry["status"] = "archived"
                entry["superseded_by"] = update_id
                entry["archived_at"] = now

        item["status"] = "approved"
        item["approved_at"] = now
        item["approved_by"] = officer_email
        _write(items)
        return item
    return None
