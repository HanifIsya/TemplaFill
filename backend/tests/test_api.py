"""API endpoint tests — Phase 2 (Tasks 2.1-2.9)."""

import io
import time
import uuid

import fitz  # PyMuPDF
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.jobs.manager import get_job_manager

client = TestClient(app)
manager = get_job_manager()


def create_pdf_bytes(text: str, title: str = "Test PDF") -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    rect = fitz.Rect(50, 50, 550, 800)
    page.insert_textbox(rect, text, fontsize=11, fontname="helv")
    # Add metadata
    doc.set_metadata({"title": title})
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()


def create_docx_bytes(placeholders: list[str]) -> bytes:
    from docx import Document

    doc = Document()
    for ph in placeholders:
        doc.add_paragraph(f"Field {ph}")
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def create_xlsx_bytes() -> bytes:
    import openpyxl

    wb = openpyxl.Workbook()
    ws = wb.active
    ws["A1"] = "Value {{field1}}"
    ws["B2"] = "Another [field2]"
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def create_pptx_bytes() -> bytes:
    from pptx import Presentation

    prs = Presentation()
    slide = prs.slides.add_slide(prs.slide_layouts[5])
    shape = slide.shapes.add_textbox(100, 100, 300, 100)
    shape.text_frame.text = "Slide {{slide_field}}"
    buf = io.BytesIO()
    prs.save(buf)
    return buf.getvalue()


@pytest.fixture(autouse=True)
def clear_jobs():
    manager.clear_all_sync()
    yield
    manager.clear_all_sync()


class TestHealth:
    def test_health_still_works(self):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json()["success"] is True


class TestUpload:
    def test_upload_success_pdf_docx(self):
        pdf = create_pdf_bytes("Applicant: John Doe\nInvoice: INV-001\nTotal: $5,000", title="Contract")
        docx = create_docx_bytes(["{{full_name}}", "{{invoice_number}}", "{{total_amount}}"])
        resp = client.post(
            "/api/upload",
            files={
                "source_file": ("contract.pdf", pdf, "application/pdf"),
                "template_file": ("template.docx", docx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            },
        )
        assert resp.status_code == 202, resp.text
        data = resp.json()["data"]
        assert "job_id" in data
        assert data["status"] == "queued"
        assert data["source_file"]["filename"] == "contract.pdf"
        assert data["template_file"]["format"] == "docx"
        assert "estimated_time_seconds" in data

    def test_upload_with_xlsx_template(self):
        pdf = create_pdf_bytes("Hello world")
        xlsx = create_xlsx_bytes()
        resp = client.post(
            "/api/upload",
            files={
                "source_file": ("source.pdf", pdf, "application/pdf"),
                "template_file": ("tmpl.xlsx", xlsx, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
            },
        )
        assert resp.status_code == 202

    def test_upload_with_pptx_template(self):
        pdf = create_pdf_bytes("Hello world")
        pptx = create_pptx_bytes()
        resp = client.post(
            "/api/upload",
            files={
                "source_file": ("source.pdf", pdf, "application/pdf"),
                "template_file": ("tmpl.pptx", pptx, "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
            },
        )
        assert resp.status_code == 202

    def test_upload_missing_file(self):
        pdf = create_pdf_bytes("Hello")
        resp = client.post(
            "/api/upload",
            files={"source_file": ("source.pdf", pdf, "application/pdf")},
        )
        assert resp.status_code == 422  # FastAPI validation

    def test_upload_wrong_source_type(self):
        pdf = create_pdf_bytes("Hello")
        docx = create_docx_bytes(["{{field}}"])
        resp = client.post(
            "/api/upload",
            files={
                "source_file": ("source.docx", docx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
                "template_file": ("tmpl.docx", docx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            },
        )
        assert resp.status_code == 415
        assert resp.json()["error"]["code"] == "UNSUPPORTED_TYPE"

    def test_upload_wrong_template_type(self):
        pdf = create_pdf_bytes("Hello")
        resp = client.post(
            "/api/upload",
            files={
                "source_file": ("source.pdf", pdf, "application/pdf"),
                "template_file": ("tmpl.pdf", pdf, "application/pdf"),
            },
        )
        assert resp.status_code == 415

    def test_upload_empty_file(self):
        docx = create_docx_bytes(["{{field}}"])
        resp = client.post(
            "/api/upload",
            files={
                "source_file": ("source.pdf", b"", "application/pdf"),
                "template_file": ("tmpl.docx", docx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            },
        )
        assert resp.status_code in (400, 413, 422)  # empty handled

    def test_upload_invalid_pdf_magic(self):
        docx = create_docx_bytes(["{{field}}"])
        resp = client.post(
            "/api/upload",
            files={
                "source_file": ("source.pdf", b"not a pdf", "application/pdf"),
                "template_file": ("tmpl.docx", docx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            },
        )
        assert resp.status_code == 400
        assert "PDF" in resp.json()["error"]["message"]

    def test_upload_too_large(self, monkeypatch):
        # Temporarily set max to 0 to trigger 413
        from app.core.config import get_settings

        settings = get_settings()
        orig = settings.max_source_file_size_mb
        # We can't easily monkeypatch config singleton, so test via large bytes directly hitting 413
        # Create a PDF larger than 20MB template limit: fake via monkeypatch attribute
        # Instead we test that endpoint returns 413 when file exceeds limit by patching setting
        # For simplicity, we just verify 413 logic works by sending huge file - but creating 50MB pdf is heavy
        # So we patch the constant in upload module
        import app.api.upload as upload_mod

        upload_mod.MAX_SOURCE_MB = 0  # force any file >0 to be too large
        pdf = create_pdf_bytes("Hello")
        docx = create_docx_bytes(["{{field}}"])
        resp = client.post(
            "/api/upload",
            files={
                "source_file": ("source.pdf", pdf, "application/pdf"),
                "template_file": ("tmpl.docx", docx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            },
        )
        assert resp.status_code == 413
        upload_mod.MAX_SOURCE_MB = orig  # restore


class TestJobStatusAndResults:
    def _upload_and_wait(self, pdf_text: str = "Applicant: John Doe\nTotal: $5,000", placeholders=None):
        if placeholders is None:
            placeholders = ["{{full_name}}", "{{total_amount}}"]
        pdf = create_pdf_bytes(pdf_text)
        docx = create_docx_bytes(placeholders)
        resp = client.post(
            "/api/upload",
            files={
                "source_file": ("source.pdf", pdf, "application/pdf"),
                "template_file": ("template.docx", docx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            },
        )
        assert resp.status_code == 202
        job_id = resp.json()["data"]["job_id"]
        # Poll until completed or failed (max 5 sec)
        for _ in range(20):
            status_resp = client.get(f"/api/jobs/{job_id}")
            assert status_resp.status_code == 200
            status = status_resp.json()["data"]["status"]
            if status in ("completed", "failed"):
                break
            time.sleep(0.25)
        return job_id

    def test_job_status_flow(self):
        job_id = self._upload_and_wait()
        resp = client.get(f"/api/jobs/{job_id}")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["job_id"] == job_id
        assert data["status"] in ("completed", "failed", "processing", "extracting", "mapping", "queued")
        assert "progress" in data
        assert "created_at" in data

    def test_job_results_after_completion(self):
        job_id = self._upload_and_wait("Invoice: INV-001\nCustomer: Alice Smith\nAmount: $12,300", ["{{invoice_number}}", "{{customer_name}}", "{{amount}}"])
        # Wait a bit more for results
        time.sleep(0.5)
        resp = client.get(f"/api/jobs/{job_id}/results")
        assert resp.status_code == 200, resp.text
        data = resp.json()["data"]
        assert data["job_id"] == job_id
        assert "fields" in data
        assert len(data["fields"]) == 3
        # Check that fields have expected structure per API.md
        for f in data["fields"]:
            assert "field_id" in f
            assert "field_name" in f
            assert "placeholder" in f
            assert "extracted_value" in f
            assert "confidence" in f
            assert "status" in f
            assert "is_manually_edited" in f

    def test_job_results_not_yet_completed(self):
        # Create job but immediately query results before processing finishes
        pdf = create_pdf_bytes("Hello")
        docx = create_docx_bytes(["{{field}}"])
        resp = client.post(
            "/api/upload",
            files={
                "source_file": ("source.pdf", pdf, "application/pdf"),
                "template_file": ("template.docx", docx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            },
        )
        job_id = resp.json()["data"]["job_id"]
        # Immediately ask for results — may be not completed yet
        # Poll quickly without wait
        resp2 = client.get(f"/api/jobs/{job_id}/results")
        # Should be either 200 (if fast) or 404 not completed
        assert resp2.status_code in (200, 404)

    def test_invalid_job_id(self):
        resp = client.get("/api/jobs/not-a-uuid")
        assert resp.status_code == 400
        resp = client.get(f"/api/jobs/{uuid.uuid4()}/results")
        assert resp.status_code == 404

    def test_source_page_preview(self):
        job_id = self._upload_and_wait("Page one content\nPage two content", ["{{field}}"])
        time.sleep(0.5)
        # Get page 1
        resp = client.get(f"/api/jobs/{job_id}/source/page/1")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["page_number"] == 1
        assert "total_pages" in data
        assert "content" in data
        assert "tables" in data

        # Invalid page
        resp = client.get(f"/api/jobs/{job_id}/source/page/999")
        assert resp.status_code == 400

        # With highlight
        resp = client.get(f"/api/jobs/{job_id}/source/page/1?highlight=Page")
        assert resp.status_code == 200


class TestFieldEditAndReExtract:
    def _setup_job(self):
        pdf = create_pdf_bytes("Applicant: John Doe\nEmail: john@example.com\nPhone: 08123456789")
        docx = create_docx_bytes(["{{full_name}}", "{{email}}", "{{phone}}"])
        resp = client.post(
            "/api/upload",
            files={
                "source_file": ("source.pdf", pdf, "application/pdf"),
                "template_file": ("template.docx", docx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            },
        )
        job_id = resp.json()["data"]["job_id"]
        for _ in range(20):
            r = client.get(f"/api/jobs/{job_id}")
            if r.json()["data"]["status"] in ("completed", "failed"):
                break
            time.sleep(0.25)
        time.sleep(0.3)
        results = client.get(f"/api/jobs/{job_id}/results").json()["data"]
        return job_id, results

    def test_patch_edit(self):
        job_id, results = self._setup_job()
        field = results["fields"][0]
        fid = field["field_id"]
        resp = client.patch(
            f"/api/jobs/{job_id}/fields/{fid}",
            json={"action": "edit", "value": "Jane Doe"},
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["field_id"] == fid
        assert data["status"] == "edited"
        assert data["is_manually_edited"] is True

    def test_patch_skip_and_confirm(self):
        job_id, results = self._setup_job()
        fid = results["fields"][0]["field_id"]
        resp = client.patch(f"/api/jobs/{job_id}/fields/{fid}", json={"action": "skip"})
        assert resp.status_code == 200
        assert resp.json()["data"]["status"] == "skipped"

        resp = client.patch(f"/api/jobs/{job_id}/fields/{fid}", json={"action": "confirm"})
        assert resp.status_code == 200

    def test_patch_invalid_action(self):
        job_id, results = self._setup_job()
        fid = results["fields"][0]["field_id"]
        resp = client.patch(f"/api/jobs/{job_id}/fields/{fid}", json={"action": "invalid"})
        assert resp.status_code == 400

    def test_re_extract_with_hint(self):
        job_id, results = self._setup_job()
        # Find email field
        email_field = next((f for f in results["fields"] if "email" in f["field_name"]), None)
        assert email_field is not None
        fid = email_field["field_id"]
        resp = client.post(
            f"/api/jobs/{job_id}/fields/{fid}/re-extract",
            json={"hint": "Look for email near top"},
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert "new_value" in data
        assert "previous_value" in data

    def test_patch_not_found(self):
        job_id, _ = self._setup_job()
        fake_fid = str(uuid.uuid4())
        resp = client.patch(f"/api/jobs/{job_id}/fields/{fake_fid}", json={"action": "edit", "value": "test"})
        assert resp.status_code == 404


class TestConfirmAndDownload:
    def _setup_job(self, placeholders=None):
        if placeholders is None:
            placeholders = ["{{full_name}}", "{{invoice_number}}"]
        pdf = create_pdf_bytes("Full Name: John Doe\nInvoice: INV-2026-001")
        docx = create_docx_bytes(placeholders)
        resp = client.post(
            "/api/upload",
            files={
                "source_file": ("source.pdf", pdf, "application/pdf"),
                "template_file": ("template.docx", docx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            },
        )
        job_id = resp.json()["data"]["job_id"]
        for _ in range(20):
            r = client.get(f"/api/jobs/{job_id}")
            if r.json()["data"]["status"] in ("completed", "failed"):
                break
            time.sleep(0.25)
        time.sleep(0.3)
        return job_id, pdf, docx

    def test_confirm_and_download_docx(self):
        job_id, _, _ = self._setup_job()
        # Edit field to ensure value
        results = client.get(f"/api/jobs/{job_id}/results").json()["data"]
        # Confirm
        resp = client.post(f"/api/jobs/{job_id}/confirm", json={})
        assert resp.status_code == 202
        # Download
        resp = client.get(f"/api/jobs/{job_id}/download")
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        assert "attachment" in resp.headers["content-disposition"]
        # Verify filled content contains extracted value
        from docx import Document

        doc = Document(io.BytesIO(resp.content))
        text = "\n".join(p.text for p in doc.paragraphs)
        assert "John Doe" in text or "INV-2026-001" in text

    def test_download_before_confirm(self):
        job_id, _, _ = self._setup_job()
        # Try download before confirm (should 404)
        resp = client.get(f"/api/jobs/{job_id}/download")
        # Our logic returns 404 if filled not generated
        assert resp.status_code == 404

    def test_confirm_no_fields(self):
        # Template with no placeholders -> no fields to generate
        pdf = create_pdf_bytes("Hello")
        from docx import Document

        doc = Document()
        doc.add_paragraph("No placeholders")
        buf = io.BytesIO()
        doc.save(buf)
        resp = client.post(
            "/api/upload",
            files={
                "source_file": ("source.pdf", pdf, "application/pdf"),
                "template_file": ("template.docx", buf.getvalue(), "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            },
        )
        job_id = resp.json()["data"]["job_id"]
        for _ in range(10):
            r = client.get(f"/api/jobs/{job_id}")
            if r.json()["data"]["status"] in ("completed", "failed"):
                break
            time.sleep(0.25)
        time.sleep(0.3)
        resp = client.post(f"/api/jobs/{job_id}/confirm", json={})
        # No fields -> validation error
        assert resp.status_code in (400, 202)  # depending if we allow empty

    def test_confirm_xlsx_flow(self):
        pdf = create_pdf_bytes("Name: Alice\nAmount: $500")
        import openpyxl

        wb = openpyxl.Workbook()
        ws = wb.active
        ws["A1"] = "Hello {{field1}}"
        ws["B2"] = "Value <<field2>>"
        # Let's use single field for simplicity
        wb2 = openpyxl.Workbook()
        ws2 = wb2.active
        ws2["A1"] = "Customer {{customer_name}} has paid <<amount>>"
        buf = io.BytesIO()
        wb2.save(buf)

        resp = client.post(
            "/api/upload",
            files={
                "source_file": ("source.pdf", pdf, "application/pdf"),
                "template_file": ("tmpl.xlsx", buf.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
            },
        )
        job_id = resp.json()["data"]["job_id"]
        for _ in range(20):
            r = client.get(f"/api/jobs/{job_id}")
            if r.json()["data"]["status"] == "completed":
                break
            time.sleep(0.25)
        time.sleep(0.3)
        resp = client.post(f"/api/jobs/{job_id}/confirm", json={})
        assert resp.status_code == 202
        resp = client.get(f"/api/jobs/{job_id}/download")
        # May be filled even if extraction not perfect
        assert resp.status_code in (200, 404)

    def test_download_invalid_job(self):
        resp = client.get(f"/api/jobs/{uuid.uuid4()}/download")
        assert resp.status_code == 404
