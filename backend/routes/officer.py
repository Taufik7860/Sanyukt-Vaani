from __future__ import annotations

import logging
import re
from io import BytesIO
from pathlib import Path
from uuid import NAMESPACE_URL, uuid4, uuid5

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pypdf import PdfReader
from pypdf.errors import PdfReadError

from backend.main_auth import require_officer
from backend.services.knowledge import (
    DOCUMENTS_PATH,
    approve_update,
    create_update,
    get_document_path,
    get_update,
    list_updates,
    remove_update,
    validate_approval,
)
from backend.services.officer_auth import Officer
from backend.services.qdrant import qdrant_service

router = APIRouter(prefix="/api/officer", tags=["Officer"])
logger = logging.getLogger(__name__)

MAX_PDF_SIZE = 15 * 1024 * 1024
MAX_PDF_PAGES = 500
CHUNK_SIZE = 1200
CHUNK_OVERLAP = 180

CATEGORIES = {"policy", "insurance", "scheme", "law", "farmer_loan", "circular"}


def _extract_pdf_pages(content: bytes) -> list[str]:
    if not content.startswith(b"%PDF-"):
        raise ValueError("The uploaded file is not a valid PDF.")

    try:
        reader = PdfReader(BytesIO(content), strict=False)
    except (PdfReadError, ValueError) as exc:
        raise ValueError("The uploaded PDF could not be read.") from exc

    if reader.is_encrypted:
        raise ValueError("Password-protected PDFs are not supported.")
    if len(reader.pages) == 0:
        raise ValueError("The uploaded PDF does not contain any pages.")
    if len(reader.pages) > MAX_PDF_PAGES:
        raise ValueError(f"PDFs must contain no more than {MAX_PDF_PAGES} pages.")

    pages = [page.extract_text() or "" for page in reader.pages]
    if not any(text.strip() for text in pages):
        raise ValueError(
            "No selectable text was found. Upload a text-based PDF; scanned PDFs "
            "need OCR before they can be added to the knowledge base."
        )
    return pages


def _chunk_pages(pages: list[str]) -> list[dict]:
    chunks = []
    for page_number, page_text in enumerate(pages, start=1):
        normalized_text = re.sub(r"\s+", " ", page_text).strip()
        if not normalized_text:
            continue

        start = 0
        while start < len(normalized_text):
            end = min(start + CHUNK_SIZE, len(normalized_text))
            if end < len(normalized_text):
                paragraph_end = normalized_text.rfind(" ", start + CHUNK_SIZE // 2, end)
                if paragraph_end > start:
                    end = paragraph_end
            chunk_text = normalized_text[start:end].strip()
            if chunk_text:
                chunks.append({"page": page_number, "text": chunk_text})
            if end == len(normalized_text):
                break
            start = max(end - CHUNK_OVERLAP, start + 1)
    return chunks


def _document_points(item: dict, pages: list[str]) -> list[dict]:
    chunks = _chunk_pages(pages)
    if not chunks:
        raise ValueError("No indexable text was found in the uploaded PDF.")

    original_name = item["file_name"]
    points = []
    for chunk_index, chunk in enumerate(chunks):
        point_id = str(uuid5(NAMESPACE_URL, f"{item['id']}:{chunk_index}"))
        points.append(
            {
                "id": point_id,
                "text": chunk["text"],
                "status": "pending",
                "metadata": {
                    "update_id": item["id"],
                    "title": item["title"],
                    "document": item["title"],
                    "source": item.get("source_url") or original_name,
                    "source_file": original_name,
                    "page": chunk["page"],
                    "chunk_id": point_id,
                    "chunk_index": chunk_index,
                    "category": item["category"],
                    "year": item["year"],
                    "authority": item["authority"],
                    "version": item["version"],
                },
            }
        )
    return points


@router.get("/dashboard-data")
async def dashboard_data(_officer: Officer = Depends(require_officer)):
    items = list_updates()
    approved = [item for item in items if item.get("status") == "approved"]
    return {
        "status": "success",
        "total_documents": len(items),
        "approved_documents": len(approved),
        "pending_documents": sum(item.get("status") == "pending" for item in items),
        "archived_documents": sum(item.get("status") == "archived" for item in items),
        "latest_update": approved[0].get("approved_at") if approved else None,
    }


@router.get("/knowledge")
async def get_knowledge(_officer: Officer = Depends(require_officer)):
    return {"items": list_updates()}


@router.post("/knowledge/upload", status_code=status.HTTP_201_CREATED)
async def upload_knowledge(
    title: str = Form(min_length=3, max_length=200),
    category: str = Form(),
    year: int = Form(ge=2000, le=2100),
    authority: str = Form(min_length=2, max_length=160),
    version: str = Form(default="1.0", min_length=1, max_length=40),
    summary: str = Form(default="", max_length=2000),
    source_url: str = Form(default="", max_length=500),
    file: UploadFile = File(),
    officer: Officer = Depends(require_officer),
):
    if category not in CATEGORIES:
        raise HTTPException(status_code=422, detail="Unsupported knowledge category.")

    original_name = Path((file.filename or "").replace("\\", "/")).name
    try:
        if not original_name.lower().endswith(".pdf"):
            raise HTTPException(status_code=415, detail="Upload an official PDF document.")

        content = await file.read(MAX_PDF_SIZE + 1)
        if len(content) > MAX_PDF_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"PDF size must not exceed {MAX_PDF_SIZE // (1024 * 1024)} MB.",
            )
        pages = _extract_pdf_pages(content)
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    finally:
        await file.close()

    update_id = None
    stored_name = None
    try:
        DOCUMENTS_PATH.mkdir(parents=True, exist_ok=True)
        metadata = {
            "title": title.strip(),
            "category": category,
            "year": year,
            "authority": authority.strip(),
            "version": version.strip(),
            "summary": summary.strip(),
            "source_url": source_url.strip(),
            "file_name": original_name,
            "file_size": len(content),
            "page_count": len(pages),
        }
        update = create_update(
            {
                **metadata,
                "stored_file": f"knowledge_documents/{uuid4()}.pdf",
            },
            officer.email,
        )
        update_id = update["id"]
        stored_name = get_document_path(update)
        if stored_name is None:
            raise RuntimeError("Unable to resolve the uploaded document path.")
        stored_name.write_bytes(content)
        return update
    except OSError as exc:
        if update_id:
            logger.exception("Could not persist uploaded officer document.")
            remove_update(update_id)
        raise HTTPException(
            status_code=500,
            detail="The document could not be saved. Please retry the upload.",
        ) from exc
    except Exception:
        if update_id:
            logger.exception("Officer document upload failed after metadata creation.")
            if stored_name:
                stored_name.unlink(missing_ok=True)
            remove_update(update_id)
        raise


@router.get("/knowledge/{update_id}/document")
async def preview_knowledge_document(
    update_id: str,
    _officer: Officer = Depends(require_officer),
):
    item = get_update(update_id)
    if not item:
        raise HTTPException(status_code=404, detail="Knowledge update not found.")
    file_path = get_document_path(item)
    if not file_path or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Uploaded document file not found.")
    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=Path(item["file_name"]).name,
        content_disposition_type="inline",
    )


@router.post("/knowledge/{update_id}/approve")
async def approve_knowledge(
    update_id: str,
    officer: Officer = Depends(require_officer),
):
    try:
        item = validate_approval(update_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if not item:
        raise HTTPException(status_code=404, detail="Knowledge update not found.")
    if item.get("status") == "approved":
        return item
    if item.get("status") != "pending":
        raise HTTPException(
            status_code=409,
            detail="Only pending documents can be approved.",
        )

    document_path = get_document_path(item)
    if not document_path or not document_path.is_file():
        raise HTTPException(status_code=422, detail="Uploaded document file not found.")
    try:
        pages = _extract_pdf_pages(document_path.read_bytes())
    except (OSError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    superseded = [
        existing
        for existing in list_updates(status="approved")
        if existing.get("category") == item.get("category")
        and " ".join(existing.get("title", "").casefold().split())
        == " ".join(item.get("title", "").casefold().split())
        and int(existing.get("year", 0)) <= int(item.get("year", 0))
    ]

    archived_in_index = []
    try:
        qdrant_service.upsert_documents(
            _document_points(item, pages),
            collection_name=None,
        )
        for old_item in superseded:
            qdrant_service.set_update_status(old_item["id"], "archived")
            archived_in_index.append(old_item["id"])
        qdrant_service.set_update_status(update_id, "approved")
        approved = approve_update(update_id, officer.email)
        if not approved:
            raise RuntimeError("Knowledge update disappeared during approval.")
        return approved
    except ValueError as exc:
        try:
            for old_id in archived_in_index:
                qdrant_service.set_update_status(old_id, "approved")
            qdrant_service.set_update_status(update_id, "pending")
        except Exception:
            logger.exception("Unable to roll back a rejected document approval.")
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unable to publish officer document %s to Qdrant.", update_id)
        try:
            for old_id in archived_in_index:
                qdrant_service.set_update_status(old_id, "approved")
            qdrant_service.set_update_status(update_id, "pending")
        except Exception:
            logger.exception("Unable to roll back a partially published document.")
        raise HTTPException(
            status_code=503,
            detail=(
                "The update could not be published to the knowledge index. "
                "Check the Qdrant connection and retry approval."
            ),
        ) from exc
