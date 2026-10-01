import json
import asyncio
import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import UploadFile

from backend.routes import officer as officer_routes
from backend.routes.officer import (
    _chunk_pages,
    _document_points,
    _extract_pdf_pages,
    approve_knowledge,
    upload_knowledge,
)
from backend.services.officer_auth import Officer
from backend.services import knowledge


class OfficerKnowledgeTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary_directory.name)
        self.data_path = self.root / "knowledge_updates.json"
        self.documents_path = self.root / "knowledge_documents"
        self.path_patches = (
            patch.object(knowledge, "DATA_PATH", self.data_path),
            patch.object(knowledge, "DOCUMENTS_PATH", self.documents_path),
            patch.object(officer_routes, "DOCUMENTS_PATH", self.documents_path),
        )
        for path_patch in self.path_patches:
            path_patch.start()
        self.addCleanup(self.temporary_directory.cleanup)
        for path_patch in reversed(self.path_patches):
            self.addCleanup(path_patch.stop)

    @staticmethod
    def _text_pdf(text):
        content = (
            f"BT /F1 12 Tf 72 720 Td ({text}) Tj ET"
        ).encode("ascii")
        objects = [
            b"<< /Type /Catalog /Pages 2 0 R >>",
            b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            b"/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
            b"<< /Length " + str(len(content)).encode() + b" >>\nstream\n"
            + content + b"\nendstream",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        ]
        pdf = bytearray(b"%PDF-1.4\n")
        offsets = [0]
        for index, object_body in enumerate(objects, start=1):
            offsets.append(len(pdf))
            pdf.extend(f"{index} 0 obj\n".encode())
            pdf.extend(object_body)
            pdf.extend(b"\nendobj\n")
        xref_offset = len(pdf)
        pdf.extend(f"xref\n0 {len(offsets)}\n".encode())
        pdf.extend(b"0000000000 65535 f \n")
        for offset in offsets[1:]:
            pdf.extend(f"{offset:010} 00000 n \n".encode())
        pdf.extend(
            (
                f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\n"
                f"startxref\n{xref_offset}\n%%EOF"
            ).encode()
        )
        return bytes(pdf)

    def _create_update(self, year, title="Crop Insurance Guidelines"):
        stored_file = f"knowledge_documents/{year}.pdf"
        self.documents_path.mkdir(parents=True, exist_ok=True)
        (self.documents_path / f"{year}.pdf").write_bytes(b"test")
        return knowledge.create_update(
            {
                "title": title,
                "category": "insurance",
                "year": year,
                "authority": "Agriculture Department",
                "version": str(year),
                "summary": "",
                "source_url": "",
                "file_name": f"guidelines-{year}.pdf",
                "file_size": 4,
                "page_count": 1,
                "stored_file": stored_file,
            },
            "officer@example.gov",
        )

    def test_approving_new_year_archives_previous_version(self):
        previous = self._create_update(2025)
        knowledge.approve_update(previous["id"], "officer@example.gov")
        current = self._create_update(2026, "  crop   insurance guidelines ")

        knowledge.validate_approval(current["id"])
        approved = knowledge.approve_update(current["id"], "officer@example.gov")
        by_id = {item["id"]: item for item in knowledge.list_updates()}

        self.assertEqual(approved["status"], "approved")
        self.assertEqual(by_id[previous["id"]]["status"], "archived")
        self.assertEqual(by_id[previous["id"]]["superseded_by"], current["id"])

    def test_older_year_cannot_replace_newer_approved_version(self):
        current = self._create_update(2026)
        knowledge.approve_update(current["id"], "officer@example.gov")
        outdated = self._create_update(2025)

        with self.assertRaisesRegex(ValueError, "newer 2026 update"):
            knowledge.validate_approval(outdated["id"])

    def test_update_requires_an_uploaded_pdf_before_approval(self):
        update = knowledge.create_update(
            {
                "title": "Crop Insurance Guidelines",
                "category": "insurance",
                "year": 2026,
                "authority": "Agriculture Department",
                "version": "1.0",
            },
            "officer@example.gov",
        )

        with self.assertRaisesRegex(ValueError, "Upload the official PDF"):
            knowledge.validate_approval(update["id"])

    def test_chunks_retain_page_numbers_and_include_document_metadata(self):
        pages = ["A" * 1500, "Second page of the notice."]
        chunks = _chunk_pages(pages)
        item = {
            "id": "update-123",
            "title": "Scheme Circular",
            "category": "scheme",
            "year": 2026,
            "authority": "Cooperation Department",
            "version": "2.0",
            "file_name": "scheme.pdf",
            "source_url": "https://example.gov/scheme.pdf",
        }
        points = _document_points(item, pages)

        self.assertGreaterEqual(len(chunks), 3)
        self.assertEqual(points[0]["status"], "pending")
        self.assertEqual(points[0]["metadata"]["update_id"], "update-123")
        self.assertEqual(points[-1]["metadata"]["page"], 2)

    def test_pdf_validation_rejects_non_pdf_and_empty_text_documents(self):
        with self.assertRaisesRegex(ValueError, "not a valid PDF"):
            _extract_pdf_pages(b"not a pdf")

        from io import BytesIO
        from pypdf import PdfWriter

        output = BytesIO()
        writer = PdfWriter()
        writer.add_blank_page(width=612, height=792)
        writer.write(output)

        with self.assertRaisesRegex(ValueError, "No selectable text"):
            _extract_pdf_pages(output.getvalue())

    def test_metadata_is_persisted_as_valid_json(self):
        update = self._create_update(2026)

        stored = json.loads(self.data_path.read_text(encoding="utf-8"))
        self.assertEqual(stored[0]["id"], update["id"])
        self.assertEqual(stored[0]["file_name"], "guidelines-2026.pdf")

    def test_pdf_upload_and_approval_index_the_document_and_archive_old_version(self):
        previous = self._create_update(2025)
        knowledge.approve_update(previous["id"], "officer@example.gov")
        pdf_bytes = self._text_pdf("Current cooperative insurance policy for farmers")
        upload = UploadFile(filename="insurance-2026.pdf", file=io.BytesIO(pdf_bytes))
        officer = Officer(email="officer@example.gov")

        uploaded = asyncio.run(
            upload_knowledge(
                title="Crop Insurance Guidelines",
                category="insurance",
                year=2026,
                authority="Agriculture Department",
                version="2026.1",
                summary="Annual policy update",
                source_url="https://example.gov/insurance",
                file=upload,
                officer=officer,
            )
        )
        with (
            patch.object(officer_routes.qdrant_service, "upsert_documents") as upsert,
            patch.object(officer_routes.qdrant_service, "set_update_status") as set_status,
        ):
            approved = asyncio.run(approve_knowledge(uploaded["id"], officer))

        self.assertEqual(approved["status"], "approved")
        self.assertTrue(knowledge.get_document_path(approved).is_file())
        self.assertGreater(len(upsert.call_args.args[0]), 0)
        self.assertEqual(upsert.call_args.args[0][0]["text"], "Current cooperative insurance policy for farmers")
        set_status.assert_any_call(previous["id"], "archived")
        set_status.assert_any_call(uploaded["id"], "approved")
        self.assertEqual(knowledge.get_update(previous["id"])["status"], "archived")


if __name__ == "__main__":
    unittest.main()
